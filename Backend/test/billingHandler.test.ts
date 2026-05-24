import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildInvoiceItem,
  buildMembershipItem,
  buildUserProfileItem,
  createBillingHandler,
  pk,
  type BillingRepository,
  type ClientProfileItem,
  type InvoiceItem,
  type MembershipItem,
  type PortalTableItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|billing';
const clientId = 'client_billing';
const otherClientId = 'client_other';
const now = '2026-05-23T10:00:00.000Z';
const requestId = 'request-billing-phase-41';

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt: now,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'Billing Owner',
    ...overrides,
  });
}

function clientItem(overrides: Partial<ClientProfileItem> = {}) {
  return buildClientProfileItem({
    businessName: 'North Star Remodeling',
    clientId,
    createdAt: now,
    primaryContactUserId: auth0Sub,
    status: 'active',
    updatedAt: now,
    ...overrides,
  });
}

function membershipItem(overrides: Partial<MembershipItem> = {}) {
  return buildMembershipItem({
    auth0Sub,
    clientId,
    createdAt: now,
    role: 'client_owner',
    status: 'active',
    updatedAt: now,
    ...overrides,
  });
}

function invoiceItem(index: number, overrides: Partial<InvoiceItem> = {}) {
  const resolvedClientId = overrides.clientId ?? clientId;

  return buildInvoiceItem({
    amountDue: 12000 + index,
    clientId: resolvedClientId,
    createdAt: now,
    currency: 'usd',
    dueDate: `2026-06-0${index}`,
    invoiceId: `invoice_${index}`,
    provider: 'stripe',
    status: 'open',
    stripeCustomerId: 'cus_client',
    stripeInvoiceId: `in_${index}`,
    updatedAt: now,
    ...overrides,
  });
}

function fakeRepository(initialItems: PortalTableItem[] = [
  userItem(),
  clientItem(),
  membershipItem(),
]) {
  const itemsByKey = new Map<string, PortalTableItem>();

  for (const item of initialItems) {
    itemsByKey.set(itemKey(item), item);
  }

  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
    queryByIndex: vi.fn(async (options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
    }) => {
      if (options.indexName !== 'GSI1') {
        return [];
      }

      return [...itemsByKey.values()].filter((item): item is MembershipItem => (
        item.type === 'MEMBERSHIP'
        && item.GSI1PK === options.pk
        && (!options.skBeginsWith || item.GSI1SK.startsWith(options.skBeginsWith))
      ));
    }),
    queryByPartition: vi.fn(async (options: {
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    }) => {
      const items = [...itemsByKey.values()]
        .filter((item): item is InvoiceItem => (
          item.type === 'INVOICE'
          && item.PK === options.pk
          && item.SK.startsWith(options.skBeginsWith ?? '')
        ))
        .sort((left, right) => left.SK.localeCompare(right.SK));
      const orderedItems = options.scanIndexForward === false ? items.reverse() : items;

      return orderedItems.slice(0, options.limit ?? orderedItems.length);
    }),
    itemsByKey,
  } satisfies BillingRepository & {
    itemsByKey: Map<string, PortalTableItem>;
  };

  return repository;
}

function apiEvent({
  body,
  routeKey,
  scopes = ['read:billing'],
}: {
  body?: unknown;
  routeKey: string;
  scopes?: string[];
}) {
  const [method, routePath] = routeKey.split(' ');

  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    rawPath: routePath,
    routeKey,
    requestContext: {
      requestId,
      http: {
        method,
        path: routePath,
      },
      authorizer: {
        jwt: {
          claims: {
            sub: auth0Sub,
            scope: scopes.join(' '),
          },
          scopes,
        },
      },
    },
  } as unknown as APIGatewayProxyEventV2;
}

const context = {
  awsRequestId: 'lambda-request-id',
} as Context;

function responseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('billing handler routes', () => {
  it('returns bounded invoice metadata for the resolved client only', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      invoiceItem(2),
      invoiceItem(1),
      invoiceItem(1, {
        amountDue: 99999,
        clientId: otherClientId,
        invoiceId: 'invoice_other',
        stripeCustomerId: 'cus_other',
      }),
    ]);
    const handler = createBillingHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
      },
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/billing',
    }), context);
    const body = responseBody(response) as {
      invoices?: Array<{ invoiceId: string; stripeCustomerId?: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.invoices?.map((invoice) => invoice.invoiceId)).toEqual([
      'invoice_1',
      'invoice_2',
    ]);
    expect(body.invoices?.[0]).not.toHaveProperty('stripeCustomerId');
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 50,
      pk: pk.client(clientId),
      scanIndexForward: true,
      skBeginsWith: 'INVOICE#',
    });
  });

  it('returns a clear 501 fallback when Stripe is not configured', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      invoiceItem(1, {
        stripeCustomerId: 'cus_client',
      }),
    ]);
    const createStripePortalSession = vi.fn();
    const handler = createBillingHandler({
      createStripePortalSession,
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
      },
      repository,
    });

    const response = await handler(apiEvent({
      body: {
        returnUrl: 'https://apopto.test/dashboard',
      },
      routeKey: 'POST /api/billing/stripe-portal-session',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(501);
    expect(body).toMatchObject({
      error: 'stripe_not_configured',
      message: 'Stripe billing portal sessions are not configured for this environment.',
    });
    expect(createStripePortalSession).not.toHaveBeenCalled();
  });

  it('does not use another client invoice to create a Stripe portal session', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      invoiceItem(1, {
        stripeCustomerId: undefined,
      }),
      invoiceItem(1, {
        clientId: otherClientId,
        invoiceId: 'invoice_other',
        stripeCustomerId: 'cus_other',
      }),
    ]);
    const createStripePortalSession = vi.fn(async () => ({
      url: 'https://billing.stripe.test/session',
    }));
    const handler = createBillingHandler({
      createStripePortalSession,
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        STRIPE_SECRET_KEY: 'sk_test_123',
      },
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/billing/stripe-portal-session',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(409);
    expect(body).toMatchObject({
      error: 'stripe_customer_missing',
    });
    expect(createStripePortalSession).not.toHaveBeenCalled();
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 50,
      pk: pk.client(clientId),
      scanIndexForward: true,
      skBeginsWith: 'INVOICE#',
    });
  });

  it('creates a Stripe portal session with the resolved client customer ID', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      invoiceItem(1, {
        stripeCustomerId: 'cus_client',
      }),
    ]);
    const createStripePortalSession = vi.fn(async () => ({
      url: 'https://billing.stripe.test/session',
    }));
    const handler = createBillingHandler({
      createStripePortalSession,
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        STRIPE_SECRET_KEY: 'sk_test_123',
      },
      repository,
    });

    const response = await handler(apiEvent({
      body: {
        returnUrl: 'https://apopto.test/dashboard',
      },
      routeKey: 'POST /api/billing/stripe-portal-session',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      url: 'https://billing.stripe.test/session',
    });
    expect(createStripePortalSession).toHaveBeenCalledWith({
      customerId: 'cus_client',
      returnUrl: 'https://apopto.test/dashboard',
      stripeSecretKey: 'sk_test_123',
    });
  });

  it('requires the read:billing scope', async () => {
    const repository = fakeRepository();
    const handler = createBillingHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
      },
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/billing',
      scopes: ['read:messages'],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'insufficient_scope',
      details: {
        missingScopes: ['read:billing'],
      },
    });
    expect(repository.queryByPartition).not.toHaveBeenCalled();
  });
});

import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildCurrentIntakeItem,
  buildMembershipItem,
  buildUserProfileItem,
  clientProfileKey,
  createIdentityIntakeHandler,
  currentIntakeKey,
  type ClientProfileItem,
  type CurrentIntakeItem,
  type IntakeRepository,
  type MembershipItem,
  type PortalTableItem,
  type TransactPutItem,
  type TransactWriteItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|intake';
const clientId = 'client_intake';
const createdAt = '2026-05-21T15:00:00.000Z';
const now = '2026-05-21T15:30:00.000Z';
const requestId = 'request-intake-phase-23';

const validIntake = {
  acceptedNoSecretsWarning: true,
  acceptedTerms: true,
  additionalNotes: 'Launch before the busy season.',
  analyticsTools: 'Google Analytics',
  budgetRange: '$5,000-$10,000',
  businessDescription: 'A local service business focused on premium installs.',
  businessName: 'North Star Remodeling',
  contactEmail: 'owner@example.com',
  contactName: 'Sam Rivera',
  contentReadiness: 'partial',
  currentHostingProvider: 'CurrentHost',
  dataSensitivity: 'basic_contact_info',
  desiredFeatures: ['contact form', 'project gallery'],
  desiredTimeline: '8-12 weeks',
  designPreferences: 'Clean, trustworthy, and easy to scan on mobile.',
  domainRegistrar: 'Namecheap',
  emailProvider: 'Google Workspace',
  goals: ['get more leads', 'look more professional'],
  hasBrandGuide: false,
  hasLogo: true,
  industry: 'Home services',
  integrationsNeeded: ['CRM'],
  maintenanceInterest: 'not_sure',
  mustHaveFeatures: 'Mobile-first pages, contact form, and gallery.',
  needsCopywriting: true,
  niceToHaveFeatures: 'Client dashboard later.',
  phone: '555-555-1212',
  projectType: 'business_website',
  referenceSites: [
    {
      notes: 'The service page layout is clear.',
      url: 'https://example.com',
      whatTheyLike: 'Simple navigation and strong calls to action.',
    },
  ],
  targetAudience: 'Homeowners within 40 miles looking for remodeling help.',
  website: 'https://northstar.example',
};

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'Sam Rivera',
    ...overrides,
  });
}

function clientItem(overrides: Partial<ClientProfileItem> = {}) {
  return buildClientProfileItem({
    businessName: 'North Star Remodeling',
    clientId,
    createdAt,
    primaryContactUserId: auth0Sub,
    status: 'lead',
    updatedAt: createdAt,
    ...overrides,
  });
}

function membershipItem(overrides: Partial<MembershipItem> = {}) {
  return buildMembershipItem({
    auth0Sub,
    clientId,
    createdAt,
    role: 'client_owner',
    status: 'active',
    updatedAt: createdAt,
    ...overrides,
  });
}

function currentIntake(overrides: Partial<CurrentIntakeItem> = {}) {
  return buildCurrentIntakeItem({
    clientId,
    createdAt,
    formData: validIntake,
    updatedAt: now,
    updatedBy: auth0Sub,
    version: 1,
    ...overrides,
  });
}

function applyUpdate(
  itemsByKey: Map<string, PortalTableItem>,
  entry: Extract<TransactWriteItem, { action: 'update' }>,
) {
  const existing = itemsByKey.get(itemKey(entry.key));

  if (!existing) {
    const error = new Error('Conditional request failed');
    error.name = 'TransactionCanceledException';
    throw error;
  }

  const setters = entry.updateExpression.replace(/^SET\s+/, '').split(',');
  const nextItem = {
    ...existing,
  } as Record<string, unknown>;

  for (const setter of setters) {
    const [nameKey, valueKey] = setter.trim().split(/\s*=\s*/);
    const attributeName = entry.expressionAttributeNames?.[nameKey];
    const attributeValue = entry.expressionAttributeValues?.[valueKey];

    if (!attributeName) {
      throw new Error(`Missing expression name for ${nameKey}.`);
    }

    nextItem[attributeName] = attributeValue;
  }

  itemsByKey.set(itemKey(entry.key), nextItem as PortalTableItem);
}

function fakeRepository(initialItems: PortalTableItem[] = []) {
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
    transactPutItems: vi.fn(async (entries: TransactPutItem[]) => {
      for (const entry of entries) {
        itemsByKey.set(itemKey(entry.item), entry.item);
      }
    }),
    transactWriteItems: vi.fn(async (entries: TransactWriteItem[]) => {
      for (const entry of entries) {
        if (entry.action === 'update') {
          applyUpdate(itemsByKey, entry);
        } else {
          itemsByKey.set(itemKey(entry.item), entry.item);
        }
      }
    }),
    itemsByKey,
  } satisfies IntakeRepository & {
    itemsByKey: Map<string, PortalTableItem>;
    transactPutItems: (entries: TransactPutItem[]) => Promise<void>;
  };

  return repository;
}

function apiEvent({
  body,
  claims = { sub: auth0Sub, email: 'owner@example.com', name: 'Sam Rivera' },
  routeKey,
}: {
  body?: unknown;
  claims?: Record<string, unknown>;
  routeKey: string;
}) {
  const [, rawPath] = routeKey.split(' ');

  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    rawPath,
    routeKey,
    requestContext: {
      requestId,
      http: {
        method: routeKey.split(' ')[0],
        path: rawPath,
      },
      authorizer: {
        jwt: {
          claims,
          scopes: ['read:me', 'read:client', 'write:intake', 'write:client'],
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

function handlerWith(repository: ReturnType<typeof fakeRepository>) {
  return createIdentityIntakeHandler({
    newAuditId: () => 'audit_fixed',
    now: () => now,
    repository,
  });
}

describe('identity intake handler', () => {
  it('returns null intake for an authenticated client with no current intake', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'lead' }),
      membershipItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      routeKey: 'GET /api/intake',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        clientId,
        status: 'lead',
      },
      intake: null,
      requestId,
    });
    expect(repository.getItem).toHaveBeenCalledWith(currentIntakeKey(clientId), {
      consistentRead: true,
    });
  });

  it('returns the current intake record when present', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'intake_submitted' }),
      membershipItem(),
      currentIntake({ version: 2 }),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      routeKey: 'GET /api/intake',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      intake: {
        clientId,
        formData: {
          businessName: 'North Star Remodeling',
        },
        version: 2,
      },
    });
  });

  it('upserts intake, writes audit, and moves lead clients to intake_submitted', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'lead' }),
      membershipItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        clientId: 'client_from_frontend_should_be_ignored',
        formData: validIntake,
      },
      routeKey: 'PUT /api/intake',
    }), context);
    const body = responseBody(response);
    const savedIntake = repository.itemsByKey.get(itemKey(currentIntakeKey(clientId)));
    const savedClient = repository.itemsByKey.get(itemKey(clientProfileKey(clientId)));

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        clientId,
        status: 'intake_submitted',
      },
      intake: {
        clientId,
        version: 1,
      },
    });
    expect(savedIntake).toMatchObject({
      type: 'INTAKE',
      clientId,
      formData: {
        businessName: 'North Star Remodeling',
      },
      updatedBy: auth0Sub,
      version: 1,
    });
    expect(savedClient).toMatchObject({
      type: 'CLIENT',
      status: 'intake_submitted',
    });
    expect(JSON.stringify([...repository.itemsByKey.values()]))
      .toContain('intake.updated');
    expect(JSON.stringify(savedIntake)).not.toContain('client_from_frontend_should_be_ignored');
  });

  it('increments existing intake versions without changing non-lead client status', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'qualified' }),
      membershipItem(),
      currentIntake({ version: 4 }),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        formData: validIntake,
      },
      routeKey: 'PUT /api/intake',
    }), context);
    const body = responseBody(response);
    const savedIntake = repository.itemsByKey.get(itemKey(currentIntakeKey(clientId)));
    const savedClient = repository.itemsByKey.get(itemKey(clientProfileKey(clientId)));

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        status: 'qualified',
      },
      intake: {
        version: 5,
      },
    });
    expect(savedIntake).toMatchObject({ version: 5 });
    expect(savedClient).toMatchObject({ status: 'qualified' });
  });

  it('rejects invalid intake payloads before writing', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'lead' }),
      membershipItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        formData: {
          ...validIntake,
          acceptedTerms: false,
        },
      },
      routeKey: 'PUT /api/intake',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      error: 'validation_failed',
      requestId,
    });
    expect(repository.transactWriteItems).not.toHaveBeenCalled();
  });

  it('updates editable client profile fields and writes audit', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'active' }),
      membershipItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        businessName: 'Updated Brand',
        contactEmail: 'updated@example.com',
        phone: '555-555-4545',
      },
      routeKey: 'PATCH /api/client/profile',
    }), context);
    const body = responseBody(response);
    const savedClient = repository.itemsByKey.get(itemKey(clientProfileKey(clientId)));

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        businessName: 'Updated Brand',
        clientId,
        status: 'active',
      },
      requestId,
    });
    expect(savedClient).toMatchObject({
      businessName: 'Updated Brand',
      contactEmail: 'updated@example.com',
      phone: '555-555-4545',
    });
    expect(JSON.stringify([...repository.itemsByKey.values()]))
      .toContain('client.profile_updated');
  });
});

import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildMembershipItem,
  buildUserProfileItem,
  clientProfileKey,
  createIdentityIntakeHandler,
  userProfileKey,
  type ClientProfileItem,
  type MeBootstrapRepository,
  type MembershipItem,
  type PortalTableItem,
  type TransactPutItem,
  type TransactWriteItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|phase18';
const now = '2026-05-21T15:30:00.000Z';
const requestId = 'request-phase-18';

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt: now,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'Avery Client',
    ...overrides,
  });
}

function clientItem(clientId: string, overrides: Partial<ClientProfileItem> = {}) {
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

function membershipItem(clientId: string, overrides: Partial<MembershipItem> = {}) {
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
      if (entries.some((entry) => itemsByKey.has(itemKey(entry.item)))) {
        const error = new Error('Conditional request failed');
        error.name = 'TransactionCanceledException';
        throw error;
      }

      for (const entry of entries) {
        itemsByKey.set(itemKey(entry.item), entry.item);
      }
    }),
    transactWriteItems: vi.fn(async (entries: TransactWriteItem[]) => {
      for (const entry of entries) {
        if (entry.action === 'update') {
          continue;
        }

        itemsByKey.set(itemKey(entry.item), entry.item);
      }
    }),
    itemsByKey,
  } satisfies MeBootstrapRepository & {
    itemsByKey: Map<string, PortalTableItem>;
  };

  return repository;
}

function apiEvent({
  claims,
  routeKey = 'GET /api/me',
  scopes = ['read:me'],
}: {
  claims?: Record<string, unknown>;
  routeKey?: string;
  scopes?: string[];
} = {}) {
  return {
    body: JSON.stringify({ clientId: 'client_from_frontend_should_be_ignored' }),
    rawPath: routeKey.replace('GET ', ''),
    routeKey,
    queryStringParameters: {
      clientId: 'client_from_frontend_should_be_ignored',
    },
    requestContext: {
      requestId,
      http: {
        method: 'GET',
        path: routeKey.replace('GET ', ''),
      },
      authorizer: claims
        ? {
          jwt: {
            claims,
            scopes,
          },
        }
        : undefined,
    },
  } as unknown as APIGatewayProxyEventV2;
}

const context = {
  awsRequestId: 'lambda-request-id',
} as Context;

function responseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('GET /api/me handler', () => {
  it('bootstraps a first-time Auth0 user with server-generated tenant records', async () => {
    const repository = fakeRepository();
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
        name: 'Avery Client',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      user: {
        auth0Sub,
        email: 'owner@example.com',
        name: 'Avery Client',
      },
      client: {
        clientId: 'client_server_generated',
        businessName: 'New Client',
        status: 'lead',
      },
      membership: {
        role: 'client_owner',
        status: 'active',
      },
      featureFlags: {
        canEditIntake: true,
        canUploadFiles: false,
        canAccessAdmin: false,
      },
      requestId,
    });
    expect(repository.transactPutItems).toHaveBeenCalledTimes(1);
    expect(repository.transactPutItems.mock.calls[0][0].map((entry) => entry.item.type))
      .toEqual(['USER', 'CLIENT', 'MEMBERSHIP']);
    expect(repository.itemsByKey.get(itemKey(userProfileKey(auth0Sub)))).toMatchObject({
      type: 'USER',
      auth0Sub,
    });
    expect(repository.itemsByKey.get(itemKey(clientProfileKey('client_server_generated'))))
      .toMatchObject({
        type: 'CLIENT',
        clientId: 'client_server_generated',
        status: 'lead',
      });
    expect(JSON.stringify([...repository.itemsByKey.values()]))
      .not.toContain('client_from_frontend_should_be_ignored');
  });

  it('bootstraps a first-time Auth0 user even when the API access token omits email', async () => {
    const repository = fakeRepository();
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        permissions: ['read:me'],
      },
      scopes: [],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      user: {
        auth0Sub,
      },
      client: {
        clientId: 'client_server_generated',
        status: 'lead',
      },
    });
    expect(body.user).not.toHaveProperty('email');
    expect(repository.itemsByKey.get(itemKey(userProfileKey(auth0Sub)))).toMatchObject({
      type: 'USER',
      auth0Sub,
    });
  });

  it('returns existing client context for returning users without writing bootstrap records', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem('client_existing'),
      membershipItem('client_existing'),
    ]);
    const newClientId = vi.fn(() => 'client_new_should_not_be_used');
    const handler = createIdentityIntakeHandler({
      repository,
      newClientId,
      now: () => now,
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'different-token-email@example.com',
        name: 'Different Token Name',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      user: {
        auth0Sub,
        email: 'owner@example.com',
        name: 'Avery Client',
      },
      client: {
        clientId: 'client_existing',
        businessName: 'North Star Remodeling',
        status: 'active',
      },
      featureFlags: {
        canUploadFiles: true,
        canViewBilling: true,
        canViewProjects: true,
      },
    });
    expect(repository.transactPutItems).not.toHaveBeenCalled();
    expect(newClientId).not.toHaveBeenCalled();
  });

  it('accepts Auth0 permissions when API Gateway route scopes are absent', async () => {
    const repository = fakeRepository();
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
        permissions: ['read:me'],
      },
      scopes: [],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body.client).toMatchObject({
      clientId: 'client_server_generated',
      status: 'lead',
    });
  });

  it('accepts Auth0 permissions when API Gateway stringifies array claims', async () => {
    const repository = fakeRepository();
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
        permissions: '["read:me"]',
      },
      scopes: [],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body.client).toMatchObject({
      clientId: 'client_server_generated',
      status: 'lead',
    });
  });

  it('rejects /api/me when the token has no matching route permission', async () => {
    const repository = fakeRepository();
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
      },
      scopes: [],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'insufficient_scope',
      details: {
        missingScopes: ['read:me'],
      },
      requestId,
    });
    expect(repository.transactPutItems).not.toHaveBeenCalled();
  });

  it('repairs an existing user with no memberships by creating a lead client and owner membership', async () => {
    const repository = fakeRepository([userItem()]);
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_repaired',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body.client).toMatchObject({
      clientId: 'client_repaired',
      status: 'lead',
    });
    expect(repository.transactPutItems).toHaveBeenCalledTimes(1);
    expect(repository.transactPutItems.mock.calls[0][0].map((entry) => entry.item.type))
      .toEqual(['CLIENT', 'MEMBERSHIP']);
  });

  it('does not create a new tenant when the user has only inactive memberships', async () => {
    const repository = fakeRepository([
      userItem(),
      membershipItem('client_removed', { status: 'removed' }),
    ]);
    const handler = createIdentityIntakeHandler({
      repository,
      now: () => now,
      newClientId: () => 'client_should_not_be_created',
    });

    const response = await handler(apiEvent({
      claims: {
        sub: auth0Sub,
        email: 'owner@example.com',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'no_active_membership',
      requestId,
    });
    expect(repository.transactPutItems).not.toHaveBeenCalled();
  });

  it('returns unauthorized when API Gateway JWT claims are missing', async () => {
    const handler = createIdentityIntakeHandler({
      repository: fakeRepository(),
      now: () => now,
      newClientId: () => 'client_server_generated',
    });

    const response = await handler(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(401);
    expect(body).toMatchObject({
      error: 'unauthorized',
      requestId,
    });
  });
});

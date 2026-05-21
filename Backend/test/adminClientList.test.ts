import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildInternalAdminItem,
  createAdminHandler,
  internalAdminKey,
  pk,
  type AdminHandlerDependencies,
  type ClientProfileItem,
  type InternalAdminItem,
  type PortalTableItem,
} from '../src/index.js';

const auth0Sub = 'auth0|admin-list';
const createdAt = '2026-05-21T14:00:00.000Z';
const requestId = 'request-admin-list-phase-29';

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function adminItem(overrides: Partial<InternalAdminItem> = {}) {
  return buildInternalAdminItem({
    auth0Sub,
    createdAt,
    createdBy: 'manual_seed',
    status: 'active',
    updatedAt: createdAt,
    ...overrides,
  });
}

function clientItem(
  clientId: string,
  overrides: Partial<ClientProfileItem> = {},
) {
  return buildClientProfileItem({
    businessName: `Client ${clientId}`,
    clientId,
    createdAt,
    primaryContactUserId: `auth0|${clientId}`,
    status: 'lead',
    updatedAt: createdAt,
    ...overrides,
  });
}

function fakeRepository(initialItems: PortalTableItem[] = []) {
  const itemsByKey = new Map(initialItems.map((item) => [itemKey(item), item]));
  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
    queryByIndex: vi.fn(async (options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    }) => {
      const items = [...itemsByKey.values()]
        .filter((item) => (
          'GSI1PK' in item
          && 'GSI1SK' in item
          && item.GSI1PK === options.pk
          && (!options.skBeginsWith || item.GSI1SK.startsWith(options.skBeginsWith))
        ))
        .sort((left, right) => {
          const leftSk = 'GSI1SK' in left ? left.GSI1SK : '';
          const rightSk = 'GSI1SK' in right ? right.GSI1SK : '';

          return leftSk.localeCompare(rightSk);
        });
      const orderedItems = options.scanIndexForward === false ? items.reverse() : items;

      return orderedItems.slice(0, options.limit);
    }),
    queryByPartition: vi.fn(async () => {
      throw new Error('Admin client list must not query or scan table partitions.');
    }),
    transactWriteItems: vi.fn(async () => {
      throw new Error('Admin client list must not write records.');
    }),
  } satisfies AdminHandlerDependencies['repository'] & {
    queryByPartition: ReturnType<typeof vi.fn>;
  };

  return repository;
}

function apiEvent({
  claims = {
    permissions: ['admin:clients'],
    sub: auth0Sub,
  },
  queryStringParameters,
}: {
  claims?: Record<string, unknown>;
  queryStringParameters?: Record<string, string>;
} = {}) {
  return {
    rawPath: '/api/admin/clients',
    routeKey: 'GET /api/admin/clients',
    queryStringParameters,
    requestContext: {
      requestId,
      http: {
        method: 'GET',
        path: '/api/admin/clients',
      },
      authorizer: {
        jwt: {
          claims,
          scopes: [],
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

describe('GET /api/admin/clients handler', () => {
  it('lists clients for active internal admins through the status index', async () => {
    const newerLead = clientItem('client_newer', {
      createdAt: '2026-05-21T15:00:00.000Z',
      status: 'lead',
    });
    const olderLead = clientItem('client_older', {
      createdAt: '2026-05-21T13:00:00.000Z',
      status: 'lead',
    });
    const activeClient = clientItem('client_active', {
      createdAt: '2026-05-21T16:00:00.000Z',
      status: 'active',
    });
    const repository = fakeRepository([
      adminItem(),
      newerLead,
      olderLead,
      activeClient,
    ]);
    const response = await createAdminHandler({ repository })(apiEvent({
      queryStringParameters: {
        limit: '2',
        status: 'lead',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      clients: [
        {
          clientId: 'client_newer',
          status: 'lead',
        },
        {
          clientId: 'client_older',
          status: 'lead',
        },
      ],
      count: 2,
      filters: {
        limit: 2,
        status: 'lead',
      },
      requestId,
    });
    expect(repository.getItem).toHaveBeenCalledWith(internalAdminKey(auth0Sub), {
      consistentRead: true,
    });
    expect(repository.queryByIndex).toHaveBeenCalledTimes(1);
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI1',
      limit: 2,
      pk: pk.clientStatus('lead'),
      scanIndexForward: false,
      skBeginsWith: 'CLIENT#',
    });
    expect(repository.queryByPartition).not.toHaveBeenCalled();
  });

  it('queries every status index partition when no status filter is provided', async () => {
    const repository = fakeRepository([
      adminItem(),
      clientItem('client_lead', { status: 'lead' }),
      clientItem('client_active', { status: 'active' }),
    ]);
    const response = await createAdminHandler({ repository })(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      count: 2,
      filters: {
        limit: 50,
      },
    });
    expect(repository.queryByIndex).toHaveBeenCalledTimes(8);
    expect(repository.queryByPartition).not.toHaveBeenCalled();
  });

  it('rejects callers without admin scope before reading DynamoDB', async () => {
    const repository = fakeRepository([adminItem()]);
    const response = await createAdminHandler({ repository })(apiEvent({
      claims: {
        permissions: ['read:me'],
        sub: auth0Sub,
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'insufficient_scope',
      details: {
        missingScopes: ['admin:clients'],
      },
      requestId,
    });
    expect(repository.getItem).not.toHaveBeenCalled();
    expect(repository.queryByIndex).not.toHaveBeenCalled();
    expect(repository.queryByPartition).not.toHaveBeenCalled();
  });

  it('rejects admin-scoped callers without an active internal admin item', async () => {
    const repository = fakeRepository();
    const response = await createAdminHandler({ repository })(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'admin_access_denied',
      details: {
        reason: 'internal_admin_not_found',
      },
      requestId,
    });
    expect(repository.queryByIndex).not.toHaveBeenCalled();
    expect(repository.queryByPartition).not.toHaveBeenCalled();
  });
});

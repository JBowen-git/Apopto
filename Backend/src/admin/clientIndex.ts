import {
  AdminClientListQuerySchema,
  AdminClientListResponseSchema,
  clientStatuses,
  type AdminClientListQuery,
  type AdminClientListResponse,
  type ClientStatus,
} from '@apopto/shared';

import {
  pk,
  type ClientProfileItem,
  type PortalTableItem,
} from '../dynamodb/index.js';
import { validateWithSchema } from '../shared/validation.js';

export const adminClientListDefaultLimit = 50;

export type AdminClientIndexRepository = {
  queryByIndex<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    },
  ): Promise<TItem[]>;
};

export type AdminClientListFailure = {
  ok: false;
  statusCode: 400 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type AdminClientListResult =
  | {
    ok: true;
    response: AdminClientListResponse;
  }
  | AdminClientListFailure;

function isClientProfileItem(item: PortalTableItem): item is ClientProfileItem {
  return item.type === 'CLIENT';
}

function clientSummary(client: ClientProfileItem) {
  return {
    businessName: client.businessName,
    clientId: client.clientId,
    contactEmail: client.contactEmail,
    contactName: client.contactName,
    createdAt: client.createdAt,
    industry: client.industry,
    phone: client.phone,
    primaryContactUserId: client.primaryContactUserId,
    status: client.status,
    updatedAt: client.updatedAt,
    website: client.website,
  };
}

function validationFailure(issues: unknown[]): AdminClientListFailure {
  return {
    ok: false,
    statusCode: 400,
    error: 'validation_failed',
    message: 'The admin client list filters did not match the expected schema.',
    details: {
      issues,
    },
  };
}

function queryFailure(error: unknown): AdminClientListFailure {
  return {
    ok: false,
    statusCode: 500,
    error: 'admin_client_list_failed',
    message: 'The admin client list could not be loaded.',
    details: {
      errorName: (error as { name?: string }).name ?? 'UnknownError',
    },
  };
}

function statusesForQuery(filters: AdminClientListQuery): ClientStatus[] {
  return filters.status ? [filters.status] : [...clientStatuses];
}

function sortClientsNewestFirst(clients: ClientProfileItem[]) {
  return [...clients].sort((left, right) => {
    const createdAtComparison = right.createdAt.localeCompare(left.createdAt);

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.clientId.localeCompare(right.clientId);
  });
}

export async function listAdminClients({
  query,
  repository,
}: {
  query: unknown;
  repository: AdminClientIndexRepository;
}): Promise<AdminClientListResult> {
  const parsed = validateWithSchema<AdminClientListQuery>(
    AdminClientListQuerySchema,
    query,
  );

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const limit = parsed.data.limit ?? adminClientListDefaultLimit;

  try {
    const statusResults = await Promise.all(statusesForQuery(parsed.data).map(async (status) => (
      repository.queryByIndex<ClientProfileItem>({
        indexName: 'GSI1',
        limit,
        pk: pk.clientStatus(status),
        scanIndexForward: false,
        skBeginsWith: 'CLIENT#',
      })
    )));
    const clients = sortClientsNewestFirst(
      statusResults.flat().filter(isClientProfileItem),
    ).slice(0, limit);

    return {
      ok: true,
      response: AdminClientListResponseSchema.parse({
        clients: clients.map(clientSummary),
        count: clients.length,
        filters: {
          limit,
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
        },
      }),
    };
  } catch (error) {
    return queryFailure(error);
  }
}

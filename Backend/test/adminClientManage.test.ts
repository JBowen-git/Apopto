import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildAuditEventItem,
  buildClientProfileItem,
  buildCurrentIntakeItem,
  buildFileMetadataItem,
  buildInternalAdminItem,
  buildInvoiceItem,
  buildMembershipItem,
  buildProjectItem,
  buildThreadItem,
  buildUserProfileItem,
  clientByStatusGsiKey,
  clientProfileKey,
  createAdminHandler,
  currentIntakeKey,
  projectKey,
  type AdminHandlerDependencies,
  type AuditEventItem,
  type ClientProfileItem,
  type PortalTableItem,
  type TransactWriteItem,
} from '../src/index.js';

const auth0Sub = 'auth0|admin-manage';
const clientId = 'client_admin_manage';
const createdAt = '2026-05-21T14:00:00.000Z';
const now = '2026-05-21T14:30:00.000Z';
const requestId = 'request-admin-manage-phase-30';

const validIntake = {
  acceptedNoSecretsWarning: true,
  acceptedTerms: true,
  businessDescription: 'A local service business.',
  businessName: 'North Star Remodeling',
  budgetRange: '$5,000-$10,000',
  contactEmail: 'owner@example.com',
  contactName: 'Sam Rivera',
  contentReadiness: 'partial',
  dataSensitivity: 'basic_contact_info',
  desiredFeatures: ['contact form'],
  desiredTimeline: '8-12 weeks',
  designPreferences: 'Clean and direct.',
  goals: ['get more leads'],
  hasBrandGuide: false,
  hasLogo: true,
  industry: 'Home services',
  integrationsNeeded: [],
  maintenanceInterest: 'not_sure',
  mustHaveFeatures: 'Contact form.',
  needsCopywriting: true,
  projectType: 'business_website',
  referenceSites: [],
  targetAudience: 'Local homeowners.',
} as const;

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function adminItem() {
  return buildInternalAdminItem({
    auth0Sub,
    createdAt,
    createdBy: 'manual_seed',
    status: 'active',
    updatedAt: createdAt,
  });
}

function userItem() {
  return buildUserProfileItem({
    auth0Sub: 'auth0|client-owner',
    createdAt,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'Sam Rivera',
  });
}

function clientItem(overrides: Partial<ClientProfileItem> = {}) {
  return buildClientProfileItem({
    businessName: 'North Star Remodeling',
    clientId,
    contactEmail: 'owner@example.com',
    contactName: 'Sam Rivera',
    createdAt,
    primaryContactUserId: 'auth0|client-owner',
    status: 'active',
    updatedAt: createdAt,
    ...overrides,
  });
}

function membershipItem() {
  return buildMembershipItem({
    auth0Sub: 'auth0|client-owner',
    clientId,
    createdAt,
    role: 'client_owner',
    status: 'active',
    updatedAt: createdAt,
  });
}

function projectItem(index: number) {
  return buildProjectItem({
    clientId,
    createdAt,
    name: `Project ${index}`,
    projectId: `project_${index}`,
    status: 'active',
    updatedAt: now,
  });
}

function fileItem(index: number) {
  return buildFileMetadataItem({
    bucket: 'bucket',
    category: 'images',
    clientId,
    createdAt: `2026-05-21T14:${String(index).padStart(2, '0')}:00.000Z`,
    fileId: `file_${index}`,
    key: `clients/${clientId}/general/${index}.png`,
    mimeType: 'image/png',
    originalFilename: `${index}.png`,
    safeFilename: `${index}.png`,
    sizeBytes: index,
    updatedAt: now,
    uploadedBy: 'auth0|client-owner',
    uploadStatus: 'uploaded',
  });
}

function auditItem(index: number, overrides: Partial<AuditEventItem> = {}) {
  return buildAuditEventItem({
    action: 'client.reviewed',
    actorUserId: auth0Sub,
    clientId,
    createdAt: `2026-05-21T13:${String(index).padStart(2, '0')}:00.000Z`,
    entityId: clientId,
    entityType: 'CLIENT',
    eventId: `audit_${index}`,
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

  const currentStatus = entry.expressionAttributeValues?.[':currentStatus'];

  if (
    currentStatus
    && 'status' in existing
    && existing.status !== currentStatus
  ) {
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
  const itemsByKey = new Map(initialItems.map((item) => [itemKey(item), item]));
  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
    queryByIndex: vi.fn(async () => []),
    queryByPartition: vi.fn(async (options: {
      pk: string;
      skBeginsWith: string;
      limit: number;
      scanIndexForward?: boolean;
    }) => {
      const items = [...itemsByKey.values()]
        .filter((item) => item.PK === options.pk && item.SK.startsWith(options.skBeginsWith))
        .sort((left, right) => left.SK.localeCompare(right.SK));
      const orderedItems = options.scanIndexForward === false ? items.reverse() : items;

      return orderedItems.slice(0, options.limit);
    }),
    transactWriteItems: vi.fn(async (entries: TransactWriteItem[]) => {
      for (const entry of entries) {
        if (entry.action === 'update') {
          applyUpdate(itemsByKey, entry);
        } else {
          if (itemsByKey.has(itemKey(entry.item))) {
            const error = new Error('Conditional request failed');
            error.name = 'TransactionCanceledException';
            throw error;
          }

          itemsByKey.set(itemKey(entry.item), entry.item);
        }
      }
    }),
    itemsByKey,
  } satisfies AdminHandlerDependencies['repository'] & {
    itemsByKey: Map<string, PortalTableItem>;
  };

  return repository;
}

function apiEvent({
  body,
  claims = {
    permissions: ['admin:clients'],
    sub: auth0Sub,
  },
  method = 'GET',
  rawPath = `/api/admin/clients/${clientId}`,
  routeKey = 'GET /api/admin/clients/{clientId}',
}: {
  body?: unknown;
  claims?: Record<string, unknown>;
  method?: string;
  rawPath?: string;
  routeKey?: string;
} = {}) {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters: {
      clientId,
    },
    rawPath,
    routeKey,
    requestContext: {
      requestId,
      http: {
        method,
        path: rawPath,
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

function handlerWith(repository: ReturnType<typeof fakeRepository>) {
  return createAdminHandler({
    newAuditId: () => 'audit_fixed',
    newProjectId: () => 'project_fixed',
    now: () => now,
    repository,
  });
}

function responseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('admin client detail, status, and project endpoints', () => {
  it('returns bounded client detail slices without scanning', async () => {
    const repository = fakeRepository([
      adminItem(),
      clientItem(),
      userItem(),
      membershipItem(),
      buildCurrentIntakeItem({
        clientId,
        createdAt,
        formData: validIntake,
        updatedAt: now,
        updatedBy: 'auth0|client-owner',
        version: 1,
      }),
      ...Array.from({ length: 12 }, (_, index) => projectItem(index)),
      fileItem(1),
      buildThreadItem({
        clientId,
        createdAt,
        createdBy: 'auth0|client-owner',
        lastMessageAt: now,
        lastMessagePreview: 'Hello',
        subject: 'Kickoff',
        threadId: 'thread_1',
        updatedAt: now,
      }),
      buildInvoiceItem({
        amountDue: 5000,
        clientId,
        createdAt,
        currency: 'usd',
        dueDate: '2026-06-01',
        invoiceId: 'invoice_1',
        provider: 'stripe',
        status: 'open',
        updatedAt: now,
      }),
      ...Array.from({ length: 12 }, (_, index) => auditItem(index)),
    ]);

    const response = await handlerWith(repository)(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        clientId,
        status: 'active',
      },
      intake: {
        clientId,
        version: 1,
      },
      sliceLimits: {
        auditEvents: 10,
        files: 10,
        invoices: 10,
        projects: 10,
        threads: 10,
        users: 25,
      },
      requestId,
    });
    expect((body.projects as unknown[])).toHaveLength(10);
    expect((body.auditEvents as unknown[])).toHaveLength(10);
    expect(repository.queryByIndex).not.toHaveBeenCalled();
    expect(repository.queryByPartition).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      pk: `CLIENT#${clientId}`,
      skBeginsWith: 'PROJECT#',
    }));
  });

  it('updates client status, status index fields, and writes an audit event', async () => {
    const repository = fakeRepository([
      adminItem(),
      clientItem({ status: 'active' }),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        status: 'maintenance',
      },
      method: 'PATCH',
      rawPath: `/api/admin/clients/${clientId}/status`,
      routeKey: 'PATCH /api/admin/clients/{clientId}/status',
    }), context);
    const body = responseBody(response);
    const savedClient = repository.itemsByKey.get(itemKey(clientProfileKey(clientId)));
    const audit = repository.itemsByKey.get(itemKey({
      PK: `CLIENT#${clientId}`,
      SK: `AUDIT#${now}#audit_fixed`,
    }));

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        clientId,
        status: 'maintenance',
      },
      nextStatus: 'maintenance',
      previousStatus: 'active',
      requestId,
    });
    expect(savedClient).toMatchObject({
      ...clientByStatusGsiKey('maintenance', createdAt, clientId),
      status: 'maintenance',
      updatedAt: now,
    });
    expect(audit).toMatchObject({
      action: 'client.status.updated',
      metadata: {
        statusTransition: {
          from: 'active',
          to: 'maintenance',
        },
      },
      type: 'AUDIT',
    });
  });

  it('rejects invalid and unchanged status updates', async () => {
    const repository = fakeRepository([
      adminItem(),
      clientItem({ status: 'active' }),
    ]);

    const invalidResponse = await handlerWith(repository)(apiEvent({
      body: {
        status: 'bogus',
      },
      method: 'PATCH',
      rawPath: `/api/admin/clients/${clientId}/status`,
      routeKey: 'PATCH /api/admin/clients/{clientId}/status',
    }), context);
    const unchangedResponse = await handlerWith(repository)(apiEvent({
      body: {
        status: 'active',
      },
      method: 'PATCH',
      rawPath: `/api/admin/clients/${clientId}/status`,
      routeKey: 'PATCH /api/admin/clients/{clientId}/status',
    }), context);

    expect(invalidResponse.statusCode).toBe(400);
    expect(responseBody(invalidResponse)).toMatchObject({
      error: 'validation_failed',
    });
    expect(unchangedResponse.statusCode).toBe(400);
    expect(responseBody(unchangedResponse)).toMatchObject({
      error: 'status_unchanged',
    });
  });

  it('creates a project and writes an audit event', async () => {
    const repository = fakeRepository([
      adminItem(),
      clientItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent({
      body: {
        description: 'Main website rebuild.',
        name: 'Website Rebuild',
        status: 'planning',
        targetLaunchDate: '2026-07-01',
      },
      method: 'POST',
      rawPath: `/api/admin/clients/${clientId}/projects`,
      routeKey: 'POST /api/admin/clients/{clientId}/projects',
    }), context);
    const body = responseBody(response);
    const savedProject = repository.itemsByKey.get(itemKey(projectKey(clientId, 'project_fixed')));
    const audit = repository.itemsByKey.get(itemKey({
      PK: `CLIENT#${clientId}`,
      SK: `AUDIT#${now}#audit_fixed`,
    }));

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      project: {
        name: 'Website Rebuild',
        projectId: 'project_fixed',
        status: 'planning',
      },
      requestId,
    });
    expect(savedProject).toMatchObject({
      clientId,
      description: 'Main website rebuild.',
      projectId: 'project_fixed',
      targetLaunchDate: '2026-07-01',
      type: 'PROJECT',
    });
    expect(audit).toMatchObject({
      action: 'project.created',
      entityId: 'project_fixed',
      entityType: 'PROJECT',
      type: 'AUDIT',
    });
  });

  it('rejects admin detail requests without an active internal admin item', async () => {
    const repository = fakeRepository([
      clientItem(),
    ]);
    const response = await handlerWith(repository)(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'admin_access_denied',
      requestId,
    });
    expect(repository.queryByPartition).not.toHaveBeenCalled();
    expect(repository.transactWriteItems).not.toHaveBeenCalled();
  });
});

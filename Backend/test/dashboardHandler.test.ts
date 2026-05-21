import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildCurrentIntakeItem,
  buildFileMetadataItem,
  buildInvoiceItem,
  buildMembershipItem,
  buildProjectItem,
  buildThreadItem,
  buildUserProfileItem,
  clientProfileKey,
  createIdentityIntakeHandler,
  currentIntakeKey,
  pk,
  type ClientProfileItem,
  type CurrentIntakeItem,
  type DashboardRepository,
  type FileMetadataItem,
  type InvoiceItem,
  type MembershipItem,
  type PortalTableItem,
  type ProjectItem,
  type ThreadItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|dashboard';
const clientId = 'client_dashboard';
const createdAt = '2026-05-21T15:00:00.000Z';
const now = '2026-05-21T15:30:00.000Z';
const requestId = 'request-dashboard-phase-26';

const validIntake = {
  acceptedNoSecretsWarning: true,
  acceptedTerms: true,
  additionalNotes: 'The site needs to feel trustworthy and direct.',
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
  referenceSites: [],
  targetAudience: 'Homeowners within 40 miles looking for remodeling help.',
  website: 'https://northstar.example',
} as const;

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
    contactEmail: 'owner@example.com',
    contactName: 'Sam Rivera',
    createdAt,
    industry: 'Home services',
    phone: '555-555-1212',
    primaryContactUserId: auth0Sub,
    status: 'active',
    updatedAt: now,
    website: 'https://northstar.example',
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
    version: 2,
    ...overrides,
  });
}

function projectItem(index: number, overrides: Partial<ProjectItem> = {}) {
  return buildProjectItem({
    clientId,
    createdAt,
    description: `Project ${index} description`,
    name: `Project ${index}`,
    projectId: `project_${index}`,
    status: 'active',
    updatedAt: now,
    ...overrides,
  });
}

function fileItem(index: number, overrides: Partial<FileMetadataItem> = {}) {
  return buildFileMetadataItem({
    bucket: 'client-portal-uploads-test',
    category: 'images',
    clientId,
    createdAt: `2026-05-21T15:0${index}:00.000Z`,
    fileId: `file_${index}`,
    key: `clients/${clientId}/uploads/file_${index}/image-${index}.png`,
    mimeType: 'image/png',
    originalFilename: `image-${index}.png`,
    safeFilename: `image-${index}.png`,
    sizeBytes: 1024 + index,
    updatedAt: now,
    uploadedBy: auth0Sub,
    uploadStatus: 'uploaded',
    ...overrides,
  });
}

function threadItem(index: number, overrides: Partial<ThreadItem> = {}) {
  return buildThreadItem({
    clientId,
    createdAt,
    createdBy: auth0Sub,
    lastMessageAt: `2026-05-21T16:0${index}:00.000Z`,
    lastMessagePreview: `Message ${index}`,
    subject: `Thread ${index}`,
    threadId: `thread_${index}`,
    updatedAt: `2026-05-21T16:0${index}:00.000Z`,
    ...overrides,
  });
}

function invoiceItem(index: number, overrides: Partial<InvoiceItem> = {}) {
  return buildInvoiceItem({
    amountDue: 10000 + index,
    clientId,
    createdAt,
    currency: 'usd',
    dueDate: `2026-06-0${index}`,
    invoiceId: `invoice_${index}`,
    provider: 'stripe',
    status: 'open',
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
    queryByPartition: vi.fn(async (options: {
      pk: string;
      skBeginsWith: string;
      limit: number;
      scanIndexForward?: boolean;
    }) => {
      if (!options.skBeginsWith) {
        throw new Error('Dashboard queries must specify an SK prefix.');
      }

      const items = [...itemsByKey.values()]
        .filter((item) => item.PK === options.pk && item.SK.startsWith(options.skBeginsWith))
        .sort((left, right) => left.SK.localeCompare(right.SK));
      const orderedItems = options.scanIndexForward === false ? items.reverse() : items;

      return orderedItems.slice(0, options.limit);
    }),
  } satisfies DashboardRepository;

  return {
    ...repository,
    itemsByKey,
  };
}

function apiEvent({
  claims = { sub: auth0Sub, email: 'owner@example.com', name: 'Sam Rivera' },
  routeKey = 'GET /api/dashboard',
}: {
  claims?: Record<string, unknown>;
  routeKey?: string;
} = {}) {
  const [, rawPath] = routeKey.split(' ');

  return {
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
          scopes: ['read:me', 'read:client'],
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

function dashboardItems(overrides: Partial<ClientProfileItem> = {}) {
  return [
    userItem(),
    clientItem(overrides),
    membershipItem(),
    currentIntake(),
    projectItem(1),
    projectItem(2),
    fileItem(1),
    fileItem(2),
    fileItem(3),
    fileItem(4),
    fileItem(5),
    fileItem(6),
    threadItem(1),
    invoiceItem(1),
  ];
}

describe('GET /api/dashboard handler', () => {
  it('returns lifecycle flags, next steps, profile, intake, and bounded dashboard slices', async () => {
    const repository = fakeRepository(dashboardItems({ status: 'active' }));
    const handler = createIdentityIntakeHandler({ repository });
    const response = await handler(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        businessName: 'North Star Remodeling',
        clientId,
        contactEmail: 'owner@example.com',
        status: 'active',
      },
      featureFlags: {
        canSendMessages: true,
        canUploadFiles: true,
        canViewBilling: true,
        canViewProjects: true,
      },
      intake: {
        clientId,
        version: 2,
      },
      membership: {
        role: 'client_owner',
        status: 'active',
      },
      requestId,
      sliceLimits: {
        files: 5,
        invoices: 5,
        projects: 5,
        threads: 5,
      },
    });
    expect(body.nextSteps).toEqual([
      expect.objectContaining({
        id: 'project-workspace',
      }),
    ]);
    expect(body.projects).toHaveLength(2);
    expect(body.recentFiles).toHaveLength(5);
    expect(body.recentThreads).toHaveLength(1);
    expect(body.invoices).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('primaryContactUserId');
  });

  it('uses direct item reads and prefixed limited queries instead of a full client partition query', async () => {
    const repository = fakeRepository(dashboardItems({ status: 'intake_submitted' }));
    const handler = createIdentityIntakeHandler({ repository });

    await handler(apiEvent(), context);

    expect(repository.getItem).toHaveBeenCalledWith(currentIntakeKey(clientId), {
      consistentRead: true,
    });
    expect(repository.getItem).toHaveBeenCalledWith(clientProfileKey(clientId), {
      consistentRead: true,
    });
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI1',
      pk: pk.user(auth0Sub),
      skBeginsWith: 'CLIENT#',
    });
    expect(repository.queryByPartition).toHaveBeenCalledTimes(4);
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 5,
      pk: pk.client(clientId),
      scanIndexForward: false,
      skBeginsWith: 'PROJECT#',
    });
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 5,
      pk: pk.client(clientId),
      scanIndexForward: false,
      skBeginsWith: 'FILE#',
    });
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 5,
      pk: pk.client(clientId),
      scanIndexForward: false,
      skBeginsWith: 'THREAD#',
    });
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 5,
      pk: pk.client(clientId),
      scanIndexForward: true,
      skBeginsWith: 'INVOICE#',
    });

    for (const [options] of repository.queryByPartition.mock.calls) {
      expect(options.skBeginsWith).toMatch(/^(PROJECT|FILE|THREAD|INVOICE)#$/);
      expect(options.limit).toBeLessThanOrEqual(5);
    }
  });

  it('returns lead dashboard flags and intake-focused next steps', async () => {
    const repository = fakeRepository(dashboardItems({ status: 'lead' }));
    const handler = createIdentityIntakeHandler({ repository });
    const response = await handler(apiEvent(), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      client: {
        status: 'lead',
      },
      featureFlags: {
        canEditIntake: true,
        canSendMessages: false,
        canUploadFiles: false,
        canViewBilling: false,
        canViewProjects: false,
      },
    });
    expect(body.nextSteps).toEqual([
      expect.objectContaining({
        href: '/intake',
        id: 'complete-intake',
      }),
      expect.objectContaining({
        id: 'review-profile',
      }),
    ]);
  });
});

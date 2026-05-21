import {
  DashboardResponseSchema,
  type ClientStatus,
  type DashboardNextStep,
  type DashboardResponse,
} from '@apopto/shared';

import {
  currentIntakeKey,
  pk,
  type ClientProfileItem,
  type CurrentIntakeItem,
  type FileMetadataItem,
  type InvoiceItem,
  type PortalTableItem,
  type ProjectItem,
  type ThreadItem,
} from '../dynamodb/index.js';
import {
  resolveClientContext,
  type ResolvedClientContext,
  type TenantResolverRepository,
} from './resolver.js';

export const dashboardSliceLimits = {
  projects: 5,
  files: 5,
  threads: 5,
  invoices: 5,
} as const;

export type DashboardRepository = TenantResolverRepository & {
  queryByPartition<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      pk: string;
      skBeginsWith: string;
      limit: number;
      scanIndexForward?: boolean;
      consistentRead?: boolean;
    },
  ): Promise<TItem[]>;
};

export type DashboardApiFailure = {
  ok: false;
  statusCode: 401 | 403 | 409 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type GetDashboardResult =
  | { ok: true; response: DashboardResponse }
  | DashboardApiFailure;

type GetDashboardInput = {
  auth0Sub: string;
  repository: DashboardRepository;
};

function isCurrentIntakeItem(item: PortalTableItem | null): item is CurrentIntakeItem {
  return item?.type === 'INTAKE';
}

function isProjectItem(item: PortalTableItem): item is ProjectItem {
  return item.type === 'PROJECT';
}

function isFileMetadataItem(item: PortalTableItem): item is FileMetadataItem {
  return item.type === 'FILE';
}

function isThreadItem(item: PortalTableItem): item is ThreadItem {
  return item.type === 'THREAD';
}

function isInvoiceItem(item: PortalTableItem): item is InvoiceItem {
  return item.type === 'INVOICE';
}

function failureFromTenantResolution(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): DashboardApiFailure {
  if (result.ok) {
    throw new Error('Resolved tenant context cannot be converted to a failure.');
  }

  if (result.reason === 'user_not_found') {
    return {
      ok: false,
      statusCode: 401,
      error: 'user_not_found',
      message: 'The authenticated user has not been initialized in the client portal.',
    };
  }

  if (result.reason === 'no_active_membership') {
    return {
      ok: false,
      statusCode: 403,
      error: 'no_active_membership',
      message: 'The authenticated user does not have an active client membership.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  if (result.reason === 'multiple_active_memberships') {
    return {
      ok: false,
      statusCode: 409,
      error: 'tenant_context_not_ready',
      message: 'The authenticated user could not be mapped to exactly one active client.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'client_profile_missing',
    message: 'The active client membership points to a missing client profile.',
    details: {
      clientId: result.membership.clientId,
    },
  };
}

function intakeRecord(intake: CurrentIntakeItem) {
  return {
    clientId: intake.clientId,
    createdAt: intake.createdAt,
    formData: intake.formData,
    updatedAt: intake.updatedAt,
    updatedBy: intake.updatedBy,
    version: intake.version,
  };
}

function clientProfile(client: ClientProfileItem) {
  return {
    businessName: client.businessName,
    clientId: client.clientId,
    contactEmail: client.contactEmail,
    contactName: client.contactName,
    createdAt: client.createdAt,
    industry: client.industry,
    phone: client.phone,
    status: client.status,
    updatedAt: client.updatedAt,
    website: client.website,
  };
}

function projectSummary(project: ProjectItem) {
  return {
    createdAt: project.createdAt,
    description: project.description,
    name: project.name,
    projectId: project.projectId,
    status: project.status,
    targetLaunchDate: project.targetLaunchDate,
    updatedAt: project.updatedAt,
  };
}

function fileSummary(file: FileMetadataItem) {
  return {
    category: file.category,
    createdAt: file.createdAt,
    fileId: file.fileId,
    mimeType: file.mimeType,
    originalFilename: file.originalFilename,
    projectId: file.projectId,
    safeFilename: file.safeFilename,
    sizeBytes: file.sizeBytes,
    updatedAt: file.updatedAt,
    uploadStatus: file.uploadStatus,
  };
}

function threadSummary(thread: ThreadItem) {
  return {
    createdAt: thread.createdAt,
    lastMessageAt: thread.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview,
    subject: thread.subject,
    threadId: thread.threadId,
    updatedAt: thread.updatedAt,
  };
}

function invoiceSummary(invoice: InvoiceItem) {
  return {
    amountDue: invoice.amountDue,
    createdAt: invoice.createdAt,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    invoiceId: invoice.invoiceId,
    provider: invoice.provider,
    status: invoice.status,
    updatedAt: invoice.updatedAt,
  };
}

function nextStepsForStatus(status: ClientStatus): DashboardNextStep[] {
  if (status === 'lead') {
    return [
      {
        id: 'complete-intake',
        label: 'Complete project intake',
        description: 'Share the business, audience, goals, content readiness, and project scope.',
        href: '/intake',
      },
      {
        id: 'review-profile',
        label: 'Review client profile',
        description: 'Confirm the client profile fields that Apopto will use for project planning.',
      },
    ];
  }

  if (status === 'intake_submitted') {
    return [
      {
        id: 'intake-review',
        label: 'Intake ready for review',
        description: 'Your submitted intake is available for Apopto to review before the next recommendation.',
      },
      {
        id: 'keep-intake-current',
        label: 'Keep intake current',
        description: 'Update the intake if goals, timeline, budget, or technical details change.',
        href: '/intake',
      },
    ];
  }

  if (status === 'active') {
    return [
      {
        id: 'project-workspace',
        label: 'Project workspace',
        description: 'Project details, files, messages, and billing modules will appear as later phases come online.',
      },
    ];
  }

  if (status === 'maintenance') {
    return [
      {
        id: 'maintenance-support',
        label: 'Maintenance support',
        description: 'Support, historical files, messages, and billing access will expand in later portal phases.',
      },
    ];
  }

  if (status === 'archived') {
    return [
      {
        id: 'archive-reference',
        label: 'Archive reference',
        description: 'Past files, messages, and invoices will be available as read-only modules in later phases.',
      },
    ];
  }

  return [
    {
      id: 'project-prep',
      label: 'Project preparation',
      description: 'Apopto will use the intake and profile details to shape the next planning milestone.',
    },
  ];
}

async function queryClientSlice<TItem extends PortalTableItem>({
  clientId,
  limit,
  repository,
  scanIndexForward = false,
  skBeginsWith,
}: {
  clientId: string;
  limit: number;
  repository: DashboardRepository;
  scanIndexForward?: boolean;
  skBeginsWith: string;
}) {
  return repository.queryByPartition<TItem>({
    limit,
    pk: pk.client(clientId),
    scanIndexForward,
    skBeginsWith,
  });
}

function dashboardResponse({
  context,
  files,
  intake,
  invoices,
  projects,
  threads,
}: {
  context: ResolvedClientContext;
  files: FileMetadataItem[];
  intake: CurrentIntakeItem | null;
  invoices: InvoiceItem[];
  projects: ProjectItem[];
  threads: ThreadItem[];
}) {
  return DashboardResponseSchema.parse({
    client: clientProfile(context.client),
    featureFlags: context.featureFlags,
    intake: intake ? intakeRecord(intake) : null,
    invoices: invoices.map(invoiceSummary),
    membership: {
      role: context.membership.role,
      status: context.membership.status,
    },
    nextSteps: nextStepsForStatus(context.client.status),
    projects: projects.map(projectSummary),
    recentFiles: files.map(fileSummary),
    recentThreads: threads.map(threadSummary),
    sliceLimits: dashboardSliceLimits,
    user: {
      auth0Sub: context.user.auth0Sub,
      email: context.user.email,
      name: context.user.name,
    },
  });
}

export async function getDashboard({
  auth0Sub,
  repository,
}: GetDashboardInput): Promise<GetDashboardResult> {
  const resolved = await resolveClientContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return failureFromTenantResolution(resolved);
  }

  const { client } = resolved.context;
  const [intake, projects, files, threads, invoices] = await Promise.all([
    repository.getItem<CurrentIntakeItem>(currentIntakeKey(client.clientId), {
      consistentRead: true,
    }),
    queryClientSlice<ProjectItem>({
      clientId: client.clientId,
      limit: dashboardSliceLimits.projects,
      repository,
      skBeginsWith: 'PROJECT#',
    }),
    queryClientSlice<FileMetadataItem>({
      clientId: client.clientId,
      limit: dashboardSliceLimits.files,
      repository,
      skBeginsWith: 'FILE#',
    }),
    queryClientSlice<ThreadItem>({
      clientId: client.clientId,
      limit: dashboardSliceLimits.threads,
      repository,
      skBeginsWith: 'THREAD#',
    }),
    queryClientSlice<InvoiceItem>({
      clientId: client.clientId,
      limit: dashboardSliceLimits.invoices,
      repository,
      scanIndexForward: true,
      skBeginsWith: 'INVOICE#',
    }),
  ]);

  return {
    ok: true,
    response: dashboardResponse({
      context: resolved.context,
      files: files.filter(isFileMetadataItem),
      intake: isCurrentIntakeItem(intake) ? intake : null,
      invoices: invoices.filter(isInvoiceItem),
      projects: projects.filter(isProjectItem),
      threads: threads.filter(isThreadItem),
    }),
  };
}

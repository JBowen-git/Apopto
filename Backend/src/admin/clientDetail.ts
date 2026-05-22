import {
  AdminClientDetailResponseSchema,
  AdminCreateProjectRequestSchema,
  AdminCreateProjectResponseSchema,
  AdminUpdateClientStatusRequestSchema,
  AdminUpdateClientStatusResponseSchema,
  type AdminClientDetailResponse,
  type AdminCreateProjectRequest,
  type AdminCreateProjectResponse,
  type AdminUpdateClientStatusRequest,
  type AdminUpdateClientStatusResponse,
} from '@apopto/shared';

import {
  buildAuditEventItem,
  buildProjectItem,
  clientByStatusGsiKey,
  clientProfileKey,
  currentIntakeKey,
  pk,
  type AuditEventItem,
  type ClientProfileItem,
  type CurrentIntakeItem,
  type FileMetadataItem,
  type InvoiceItem,
  type MembershipItem,
  type PortalTableItem,
  type ProjectItem,
  type ThreadItem,
  type TransactWriteItem,
  type UserProfileItem,
  userProfileKey,
} from '../dynamodb/index.js';
import { newId } from '../shared/ids.js';
import { validateWithSchema } from '../shared/validation.js';

export const adminDetailSliceLimits = {
  users: 25,
  projects: 10,
  files: 10,
  threads: 10,
  invoices: 10,
  auditEvents: 10,
} as const;

export type AdminClientDetailRepository = {
  getItem<TItem extends PortalTableItem = PortalTableItem>(
    key: { PK: string; SK: string },
    options?: { consistentRead?: boolean },
  ): Promise<TItem | null>;
  queryByPartition<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      pk: string;
      skBeginsWith: string;
      limit: number;
      scanIndexForward?: boolean;
      consistentRead?: boolean;
    },
  ): Promise<TItem[]>;
  transactWriteItems<TItem extends PortalTableItem = PortalTableItem>(
    items: TransactWriteItem<TItem>[],
  ): Promise<void>;
};

export type AdminClientDetailFailure = {
  ok: false;
  statusCode: 400 | 404 | 409 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type AdminClientDetailResult =
  | { ok: true; response: AdminClientDetailResponse }
  | AdminClientDetailFailure;

export type AdminUpdateClientStatusResult =
  | { ok: true; response: AdminUpdateClientStatusResponse }
  | AdminClientDetailFailure;

export type AdminCreateProjectResult =
  | { ok: true; response: AdminCreateProjectResponse }
  | AdminClientDetailFailure;

function isClientProfileItem(item: PortalTableItem | null): item is ClientProfileItem {
  return item?.type === 'CLIENT';
}

function isCurrentIntakeItem(item: PortalTableItem | null): item is CurrentIntakeItem {
  return item?.type === 'INTAKE';
}

function isMembershipItem(item: PortalTableItem): item is MembershipItem {
  return item.type === 'MEMBERSHIP';
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

function isAuditEventItem(item: PortalTableItem): item is AuditEventItem {
  return item.type === 'AUDIT';
}

function isUserProfileItem(item: PortalTableItem | null): item is UserProfileItem {
  return item?.type === 'USER';
}

function validationFailure(issues: unknown[]): AdminClientDetailFailure {
  return {
    ok: false,
    statusCode: 400,
    error: 'validation_failed',
    message: 'The request body did not match the expected schema.',
    details: {
      issues,
    },
  };
}

function clientNotFound(clientId: string): AdminClientDetailFailure {
  return {
    ok: false,
    statusCode: 404,
    error: 'client_not_found',
    message: 'The requested client profile was not found.',
    details: {
      clientId,
    },
  };
}

function transactionFailure(error: unknown): AdminClientDetailFailure {
  const errorName = (error as { name?: string }).name ?? 'UnknownError';

  if (
    errorName === 'ConditionalCheckFailedException'
    || errorName === 'TransactionCanceledException'
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: 'write_conflict',
      message: 'The client portal record changed while this admin request was being saved. Please retry.',
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'admin_write_failed',
    message: 'The admin client update could not be saved.',
    details: {
      errorName,
    },
  };
}

function readFailure(error: unknown): AdminClientDetailFailure {
  return {
    ok: false,
    statusCode: 500,
    error: 'admin_client_detail_failed',
    message: 'The admin client detail could not be loaded.',
    details: {
      errorName: (error as { name?: string }).name ?? 'UnknownError',
    },
  };
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

function membershipSummary(membership: MembershipItem) {
  return {
    auth0Sub: membership.auth0Sub,
    clientId: membership.clientId,
    createdAt: membership.createdAt,
    role: membership.role,
    status: membership.status,
    updatedAt: membership.updatedAt,
  };
}

function userSummary(user: UserProfileItem) {
  return {
    auth0Sub: user.auth0Sub,
    createdAt: user.createdAt,
    email: user.email,
    lastLoginAt: user.lastLoginAt,
    name: user.name,
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
    cleanStorageKey: file.cleanStorageKey,
    category: file.category,
    createdAt: file.createdAt,
    fileId: file.fileId,
    mimeType: file.mimeType,
    originalFilename: file.originalFilename,
    projectId: file.projectId,
    safeFilename: file.safeFilename,
    scanStatus: file.scanStatus ?? 'pending',
    scannedAt: file.scannedAt,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey ?? file.key,
    storagePrefix: file.storagePrefix ?? 'quarantine',
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

function auditSummary(audit: AuditEventItem) {
  return {
    action: audit.action,
    actorUserId: audit.actorUserId,
    createdAt: audit.createdAt,
    entityId: audit.entityId,
    entityType: audit.entityType,
    eventId: audit.eventId,
    metadata: audit.metadata,
  };
}

function auditPut({
  action,
  actorUserId,
  clientId,
  createdAt,
  entityId,
  entityType,
  metadata,
  newAuditId,
}: {
  action: string;
  actorUserId: string;
  clientId: string;
  createdAt: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
  newAuditId: () => string;
}): TransactWriteItem<AuditEventItem> {
  return {
    item: buildAuditEventItem({
      action,
      actorUserId,
      clientId,
      createdAt,
      entityId,
      entityType,
      eventId: newAuditId(),
      ...(metadata ? { metadata } : {}),
    }),
    conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };
}

async function getClient({
  clientId,
  repository,
}: {
  clientId: string;
  repository: Pick<AdminClientDetailRepository, 'getItem'>;
}) {
  const client = await repository.getItem<ClientProfileItem>(
    clientProfileKey(clientId),
    { consistentRead: true },
  );

  return isClientProfileItem(client) ? client : null;
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
  repository: Pick<AdminClientDetailRepository, 'queryByPartition'>;
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

async function userProfilesForMemberships({
  memberships,
  repository,
}: {
  memberships: MembershipItem[];
  repository: Pick<AdminClientDetailRepository, 'getItem'>;
}) {
  const users = await Promise.all(memberships.map((membership) => (
    repository.getItem<UserProfileItem>(
      userProfileKey(membership.auth0Sub),
      { consistentRead: true },
    )
  )));

  return users.filter(isUserProfileItem);
}

export async function getAdminClientDetail({
  clientId,
  repository,
}: {
  clientId: string;
  repository: AdminClientDetailRepository;
}): Promise<AdminClientDetailResult> {
  try {
    const client = await getClient({ clientId, repository });

    if (!client) {
      return clientNotFound(clientId);
    }

    const [
      intake,
      memberships,
      projects,
      files,
      threads,
      invoices,
      auditEvents,
    ] = await Promise.all([
      repository.getItem<CurrentIntakeItem>(currentIntakeKey(clientId), {
        consistentRead: true,
      }),
      queryClientSlice<MembershipItem>({
        clientId,
        limit: adminDetailSliceLimits.users,
        repository,
        scanIndexForward: true,
        skBeginsWith: 'USER#',
      }),
      queryClientSlice<ProjectItem>({
        clientId,
        limit: adminDetailSliceLimits.projects,
        repository,
        skBeginsWith: 'PROJECT#',
      }),
      queryClientSlice<FileMetadataItem>({
        clientId,
        limit: adminDetailSliceLimits.files,
        repository,
        skBeginsWith: 'FILE#',
      }),
      queryClientSlice<ThreadItem>({
        clientId,
        limit: adminDetailSliceLimits.threads,
        repository,
        skBeginsWith: 'THREAD#',
      }),
      queryClientSlice<InvoiceItem>({
        clientId,
        limit: adminDetailSliceLimits.invoices,
        repository,
        scanIndexForward: true,
        skBeginsWith: 'INVOICE#',
      }),
      queryClientSlice<AuditEventItem>({
        clientId,
        limit: adminDetailSliceLimits.auditEvents,
        repository,
        skBeginsWith: 'AUDIT#',
      }),
    ]);
    const validMemberships = memberships.filter(isMembershipItem);
    const users = await userProfilesForMemberships({
      memberships: validMemberships,
      repository,
    });

    return {
      ok: true,
      response: AdminClientDetailResponseSchema.parse({
        auditEvents: auditEvents.filter(isAuditEventItem).map(auditSummary),
        client: clientSummary(client),
        files: files.filter(isFileMetadataItem).map(fileSummary),
        intake: isCurrentIntakeItem(intake) ? intakeRecord(intake) : null,
        invoices: invoices.filter(isInvoiceItem).map(invoiceSummary),
        memberships: validMemberships.map(membershipSummary),
        projects: projects.filter(isProjectItem).map(projectSummary),
        sliceLimits: adminDetailSliceLimits,
        threads: threads.filter(isThreadItem).map(threadSummary),
        users: users.map(userSummary),
      }),
    };
  } catch (error) {
    return readFailure(error);
  }
}

export async function updateAdminClientStatus({
  actorUserId,
  body,
  clientId,
  newAuditId = () => newId('audit'),
  now = () => new Date().toISOString(),
  repository,
}: {
  actorUserId: string;
  body: unknown;
  clientId: string;
  newAuditId?: () => string;
  now?: () => string;
  repository: AdminClientDetailRepository;
}): Promise<AdminUpdateClientStatusResult> {
  const parsed = validateWithSchema<AdminUpdateClientStatusRequest>(
    AdminUpdateClientStatusRequestSchema,
    body,
  );

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const client = await getClient({ clientId, repository });

  if (!client) {
    return clientNotFound(clientId);
  }

  if (client.status === parsed.data.status) {
    return {
      ok: false,
      statusCode: 400,
      error: 'status_unchanged',
      message: 'The requested client status is already set.',
      details: {
        status: parsed.data.status,
      },
    };
  }

  const timestamp = now();
  const nextStatusIndex = clientByStatusGsiKey(
    parsed.data.status,
    client.createdAt,
    client.clientId,
  );
  const nextClient: ClientProfileItem = {
    ...client,
    ...nextStatusIndex,
    status: parsed.data.status,
    updatedAt: timestamp,
  };

  const writes: TransactWriteItem[] = [
    {
        action: 'update',
        key: clientProfileKey(clientId),
        conditionExpression: '#type = :clientType AND #status = :currentStatus',
        expressionAttributeNames: {
          '#gsi1pk': 'GSI1PK',
          '#gsi1sk': 'GSI1SK',
          '#status': 'status',
          '#type': 'type',
          '#updatedAt': 'updatedAt',
        },
        expressionAttributeValues: {
          ':clientType': 'CLIENT',
          ':currentStatus': client.status,
          ':gsi1pk': nextStatusIndex.GSI1PK,
          ':gsi1sk': nextStatusIndex.GSI1SK,
          ':nextStatus': parsed.data.status,
          ':updatedAt': timestamp,
        },
        updateExpression: 'SET #status = :nextStatus, #updatedAt = :updatedAt, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
      },
      auditPut({
        action: 'client.status.updated',
        actorUserId,
        clientId,
        createdAt: timestamp,
        entityId: clientId,
        entityType: 'CLIENT',
        metadata: {
          statusTransition: {
            from: client.status,
            to: parsed.data.status,
          },
        },
        newAuditId,
      }),
    ];

  try {
    await repository.transactWriteItems(writes);
  } catch (error) {
    return transactionFailure(error);
  }

  return {
    ok: true,
    response: AdminUpdateClientStatusResponseSchema.parse({
      client: clientSummary(nextClient),
      nextStatus: parsed.data.status,
      previousStatus: client.status,
    }),
  };
}

export async function createAdminClientProject({
  actorUserId,
  body,
  clientId,
  newAuditId = () => newId('audit'),
  newProjectId = () => newId('project'),
  now = () => new Date().toISOString(),
  repository,
}: {
  actorUserId: string;
  body: unknown;
  clientId: string;
  newAuditId?: () => string;
  newProjectId?: () => string;
  now?: () => string;
  repository: AdminClientDetailRepository;
}): Promise<AdminCreateProjectResult> {
  const parsed = validateWithSchema<AdminCreateProjectRequest>(
    AdminCreateProjectRequestSchema,
    body,
  );

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const client = await getClient({ clientId, repository });

  if (!client) {
    return clientNotFound(clientId);
  }

  const timestamp = now();
  const project = buildProjectItem({
    clientId,
    createdAt: timestamp,
    name: parsed.data.name,
    projectId: newProjectId(),
    status: parsed.data.status,
    updatedAt: timestamp,
    ...(parsed.data.description ? { description: parsed.data.description } : {}),
    ...(parsed.data.targetLaunchDate ? { targetLaunchDate: parsed.data.targetLaunchDate } : {}),
  });

  const writes: TransactWriteItem[] = [
    {
      item: project,
      conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    },
    auditPut({
      action: 'project.created',
      actorUserId,
      clientId,
      createdAt: timestamp,
      entityId: project.projectId,
      entityType: 'PROJECT',
      metadata: {
        projectId: project.projectId,
        status: project.status,
      },
      newAuditId,
    }),
  ];

  try {
    await repository.transactWriteItems(writes);
  } catch (error) {
    return transactionFailure(error);
  }

  return {
    ok: true,
    response: AdminCreateProjectResponseSchema.parse({
      project: projectSummary(project),
    }),
  };
}

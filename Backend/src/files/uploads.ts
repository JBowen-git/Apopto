import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CompleteUploadRequestSchema,
  CompleteUploadResponseSchema,
  CreateUploadUrlRequestSchema,
  CreateUploadUrlResponseSchema,
  FileMetadataSummarySchema,
  type CompleteUploadResponse,
  type CreateUploadUrlRequest,
  type CreateUploadUrlResponse,
  type FileMetadataSummary,
} from '@apopto/shared';

import {
  buildAuditEventItem,
  fileByIdGsiKey,
  projectKey,
  type AuditEventItem,
  type FileMetadataItem,
  type PortalTableItem,
  type ProjectItem,
  type PutItemOptions,
  type TransactWriteItem,
} from '../dynamodb/index.js';
import { newId } from '../shared/ids.js';
import { validateWithSchema } from '../shared/validation.js';
import {
  resolveClientContext,
  type ResolvedClientContext,
  type TenantResolverRepository,
} from '../tenant/index.js';
import { buildPendingFileMetadataItem } from './metadata.js';
import { FileSafetyError, resolveMaxUploadBytes } from './safety.js';

export const DEFAULT_PRESIGNED_UPLOAD_EXPIRES_SECONDS = 15 * 60;

export type FilesRepository = TenantResolverRepository & {
  getItem<TItem extends PortalTableItem = PortalTableItem>(
    key: { PK: string; SK: string },
    options?: { consistentRead?: boolean },
  ): Promise<TItem | null>;
  putItem<TItem extends PortalTableItem>(
    item: TItem,
    options?: PutItemOptions,
  ): Promise<void>;
  queryByIndex<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    },
  ): Promise<TItem[]>;
  transactWriteItems<TItem extends PortalTableItem>(
    items: TransactWriteItem<TItem>[],
  ): Promise<void>;
};

export type S3HeadObjectClient = {
  send(command: HeadObjectCommand): Promise<{
    ContentLength?: number;
    ContentType?: string;
  }>;
};

export type PresignPutObject = (
  command: PutObjectCommand,
  expiresInSeconds: number,
) => Promise<string>;

export type FilesServiceInput = {
  auth0Sub: string;
  bucket: string;
  repository: FilesRepository;
  maxUploadBytes?: number;
  newAuditId?: () => string;
  newFileId?: () => string;
  now?: () => string;
  presignPutObject?: PresignPutObject;
  presignedUploadExpiresSeconds?: number;
  s3Client?: S3HeadObjectClient;
};

export type FilesApiFailure = {
  ok: false;
  statusCode: 400 | 401 | 403 | 404 | 409 | 413 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type CreatePresignedUploadResult =
  | { ok: true; response: CreateUploadUrlResponse }
  | FilesApiFailure;

export type CompleteUploadResult =
  | { ok: true; response: CompleteUploadResponse }
  | FilesApiFailure;

function defaultPresignPutObject(command: PutObjectCommand, expiresInSeconds: number) {
  return getSignedUrl(new S3Client({}), command, {
    expiresIn: expiresInSeconds,
  });
}

function fileSummary(file: FileMetadataItem): FileMetadataSummary {
  return FileMetadataSummarySchema.parse({
    cleanStorageKey: file.cleanStorageKey,
    fileId: file.fileId,
    projectId: file.projectId,
    originalFilename: file.originalFilename,
    safeFilename: file.safeFilename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    category: file.category,
    scanStatus: file.scanStatus,
    scannedAt: file.scannedAt,
    storageKey: file.storageKey,
    storagePrefix: file.storagePrefix,
    uploadStatus: file.uploadStatus,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  });
}

function isProjectItem(item: PortalTableItem | null): item is ProjectItem {
  return item?.type === 'PROJECT';
}

function isFileMetadataItem(item: PortalTableItem): item is FileMetadataItem {
  return item.type === 'FILE';
}

function failureFromTenantResolution(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): FilesApiFailure {
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

async function resolveUploadContext({
  auth0Sub,
  repository,
}: Pick<FilesServiceInput, 'auth0Sub' | 'repository'>): Promise<
  | { ok: true; context: ResolvedClientContext }
  | FilesApiFailure
> {
  const result = await resolveClientContext({ auth0Sub, repository });

  if (!result.ok) {
    return failureFromTenantResolution(result);
  }

  if (!result.context.featureFlags.canUploadFiles) {
    return {
      ok: false,
      statusCode: 403,
      error: 'file_upload_not_available',
      message: 'File uploads are available only for active or maintenance clients.',
      details: {
        clientStatus: result.context.client.status,
      },
    };
  }

  return {
    ok: true,
    context: result.context,
  };
}

function validationFailure(issues: unknown[]): FilesApiFailure {
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

function fileSafetyFailure(error: FileSafetyError): FilesApiFailure {
  return {
    ok: false,
    statusCode: error.code === 'upload_too_large' ? 413 : 400,
    error: error.code,
    message: error.message,
  };
}

function writeFailure(error: unknown): FilesApiFailure {
  const errorName = (error as { name?: string }).name ?? 'UnknownError';

  if (
    errorName === 'ConditionalCheckFailedException'
    || errorName === 'TransactionCanceledException'
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: 'write_conflict',
      message: 'The file metadata changed while this request was being saved. Please try again.',
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'write_failed',
    message: 'The file metadata could not be saved.',
    details: {
      errorName,
    },
  };
}

function s3ObjectMissing(error: unknown) {
  const shaped = error as {
    name?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return shaped.name === 'NotFound'
    || shaped.name === 'NoSuchKey'
    || shaped.$metadata?.httpStatusCode === 404;
}

function addSeconds(timestamp: string, seconds: number) {
  return new Date(new Date(timestamp).getTime() + seconds * 1000).toISOString();
}

async function assertProjectBelongsToClient({
  clientId,
  projectId,
  repository,
}: {
  clientId: string;
  projectId: string | undefined;
  repository: FilesRepository;
}): Promise<FilesApiFailure | null> {
  if (!projectId) {
    return null;
  }

  const project = await repository.getItem<ProjectItem>(projectKey(clientId, projectId), {
    consistentRead: true,
  });

  if (!isProjectItem(project) || project.clientId !== clientId) {
    return {
      ok: false,
      statusCode: 404,
      error: 'project_not_found',
      message: 'The selected project was not found for this client.',
    };
  }

  return null;
}

async function getFileForClient({
  clientId,
  fileId,
  repository,
}: {
  clientId: string;
  fileId: string;
  repository: FilesRepository;
}) {
  const key = fileByIdGsiKey(fileId, clientId);
  const files = await repository.queryByIndex<FileMetadataItem>({
    indexName: 'GSI2',
    limit: 1,
    pk: key.GSI2PK,
    skBeginsWith: key.GSI2SK,
  });

  return files.find((file) => (
    isFileMetadataItem(file)
    && file.clientId === clientId
    && file.fileId === fileId
  )) ?? null;
}

function auditPut({
  action,
  actorUserId,
  clientId,
  createdAt,
  entityId,
  metadata,
  newAuditId,
}: {
  action: string;
  actorUserId: string;
  clientId: string;
  createdAt: string;
  entityId: string;
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
      entityType: 'FILE',
      eventId: newAuditId(),
      ...(metadata ? { metadata } : {}),
    }),
    conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };
}

export async function createPresignedUpload({
  auth0Sub,
  bucket,
  body,
  maxUploadBytes = resolveMaxUploadBytes(),
  newFileId = () => newId('file'),
  now = () => new Date().toISOString(),
  presignPutObject = defaultPresignPutObject,
  presignedUploadExpiresSeconds = DEFAULT_PRESIGNED_UPLOAD_EXPIRES_SECONDS,
  repository,
}: FilesServiceInput & {
  body: unknown;
}): Promise<CreatePresignedUploadResult> {
  const parsed = validateWithSchema<CreateUploadUrlRequest>(CreateUploadUrlRequestSchema, body);

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const resolved = await resolveUploadContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const projectFailure = await assertProjectBelongsToClient({
    clientId: client.clientId,
    projectId: parsed.data.projectId,
    repository,
  });

  if (projectFailure) {
    return projectFailure;
  }

  const timestamp = now();
  let file: FileMetadataItem;

  try {
    file = buildPendingFileMetadataItem({
      bucket,
      category: parsed.data.category,
      clientId: client.clientId,
      createdAt: timestamp,
      fileId: newFileId(),
      maxUploadBytes,
      mimeType: parsed.data.mimeType,
      originalFilename: parsed.data.originalFilename,
      projectId: parsed.data.projectId,
      sizeBytes: parsed.data.sizeBytes,
      updatedAt: timestamp,
      uploadedBy: user.auth0Sub,
    });
  } catch (error) {
    if (error instanceof FileSafetyError) {
      return fileSafetyFailure(error);
    }

    throw error;
  }

  const requiredHeaders = {
    'content-type': file.mimeType,
  };
  const command = new PutObjectCommand({
    Bucket: bucket,
    ContentType: file.mimeType,
    Key: file.storageKey,
  });
  const uploadUrl = await presignPutObject(command, presignedUploadExpiresSeconds);

  try {
    await repository.putItem(file, {
      conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    });
  } catch (error) {
    return writeFailure(error);
  }

  return {
    ok: true,
    response: CreateUploadUrlResponseSchema.parse({
      fileId: file.fileId,
      key: file.storageKey,
      uploadUrl,
      requiredHeaders,
      expiresAt: addSeconds(timestamp, presignedUploadExpiresSeconds),
    }),
  };
}

export async function completeUpload({
  auth0Sub,
  body,
  bucket,
  newAuditId = () => newId('audit'),
  now = () => new Date().toISOString(),
  repository,
  s3Client = new S3Client({}),
}: FilesServiceInput & {
  body: unknown;
}): Promise<CompleteUploadResult> {
  const parsed = validateWithSchema(CompleteUploadRequestSchema, body);

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const resolved = await resolveUploadContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const file = await getFileForClient({
    clientId: client.clientId,
    fileId: parsed.data.fileId,
    repository,
  });

  if (!file) {
    return {
      ok: false,
      statusCode: 404,
      error: 'file_not_found',
      message: 'The requested file was not found for this client.',
    };
  }

  if (
    file.bucket !== bucket
    || file.storagePrefix !== 'quarantine'
    || file.scanStatus !== 'pending'
    || file.uploadStatus !== 'pending'
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: 'file_upload_state_conflict',
      message: 'This file is not waiting for upload completion.',
      details: {
        scanStatus: file.scanStatus,
        storagePrefix: file.storagePrefix,
        uploadStatus: file.uploadStatus,
      },
    };
  }

  let headObject: Awaited<ReturnType<S3HeadObjectClient['send']>>;

  try {
    headObject = await s3Client.send(new HeadObjectCommand({
      Bucket: file.bucket,
      Key: file.storageKey,
    }));
  } catch (error) {
    if (s3ObjectMissing(error)) {
      return {
        ok: false,
        statusCode: 409,
        error: 'uploaded_object_not_found',
        message: 'The uploaded object was not found in S3. Upload the file before completing it.',
      };
    }

    return {
      ok: false,
      statusCode: 500,
      error: 'uploaded_object_verification_failed',
      message: 'The uploaded object could not be verified in S3.',
      details: {
        errorName: (error as { name?: string }).name ?? 'UnknownError',
      },
    };
  }

  if (headObject.ContentLength !== file.sizeBytes) {
    return {
      ok: false,
      statusCode: 409,
      error: 'uploaded_object_size_mismatch',
      message: 'The uploaded object size does not match the presigned upload request.',
      details: {
        expectedSizeBytes: file.sizeBytes,
        actualSizeBytes: headObject.ContentLength,
      },
    };
  }

  if (
    headObject.ContentType
    && headObject.ContentType.toLowerCase() !== file.mimeType.toLowerCase()
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: 'uploaded_object_type_mismatch',
      message: 'The uploaded object content type does not match the presigned upload request.',
      details: {
        expectedMimeType: file.mimeType,
        actualMimeType: headObject.ContentType,
      },
    };
  }

  const timestamp = now();

  try {
    await repository.transactWriteItems([
      {
        action: 'update',
        key: {
          PK: file.PK,
          SK: file.SK,
        },
        conditionExpression: [
          '#type = :type',
          '#clientId = :clientId',
          '#fileId = :fileId',
          '#scanStatus = :scanPending',
          '#uploadStatus = :uploadPending',
        ].join(' AND '),
        expressionAttributeNames: {
          '#clientId': 'clientId',
          '#fileId': 'fileId',
          '#scanStatus': 'scanStatus',
          '#type': 'type',
          '#updatedAt': 'updatedAt',
          '#uploadStatus': 'uploadStatus',
        },
        expressionAttributeValues: {
          ':clientId': client.clientId,
          ':fileId': file.fileId,
          ':scanPending': 'pending',
          ':type': 'FILE',
          ':updatedAt': timestamp,
          ':uploadPending': 'pending',
          ':uploaded': 'uploaded',
        },
        updateExpression: 'SET #uploadStatus = :uploaded, #updatedAt = :updatedAt',
      },
      auditPut({
        action: 'file.upload.completed',
        actorUserId: user.auth0Sub,
        clientId: client.clientId,
        createdAt: timestamp,
        entityId: file.fileId,
        metadata: {
          category: file.category,
          sizeBytes: file.sizeBytes,
          storageKey: file.storageKey,
        },
        newAuditId,
      }),
    ]);
  } catch (error) {
    return writeFailure(error);
  }

  return {
    ok: true,
    response: CompleteUploadResponseSchema.parse({
      file: fileSummary({
        ...file,
        updatedAt: timestamp,
        uploadStatus: 'uploaded',
      }),
    }),
  };
}

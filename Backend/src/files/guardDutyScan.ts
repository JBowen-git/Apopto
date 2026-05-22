import {
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type { EventBridgeEvent } from 'aws-lambda';

import { fileByIdGsiKey, type FileMetadataItem } from '../dynamodb/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
  type PortalRepositoryConfig,
} from '../dynamodb/index.js';
import { buildAuditEventItem } from '../dynamodb/items.js';
import { newId } from '../shared/ids.js';
import { nowIso } from '../shared/time.js';
import { buildClientFileStorageKey } from './safety.js';

export const GUARD_DUTY_SCAN_RESULT_DETAIL_TYPE = 'GuardDuty Malware Protection Object Scan Result';
export const GUARD_DUTY_SOURCE = 'aws.guardduty';
export const GUARD_DUTY_SCAN_STATUS_TAG = 'GuardDutyMalwareScanStatus';

export type GuardDutyScanResultStatus =
  | 'NO_THREATS_FOUND'
  | 'THREATS_FOUND'
  | 'UNSUPPORTED'
  | 'ACCESS_DENIED'
  | 'FAILED';

export type GuardDutyObjectScanDetail = {
  scanStatus?: string;
  resourceType?: string;
  s3ObjectDetails?: {
    bucketName?: string;
    objectKey?: string;
    versionId?: string;
    eTag?: string;
  };
  scanResultDetails?: {
    scanResultStatus?: string;
    statusReasons?: string[] | null;
    threats?: Array<{ name?: string }> | null;
  };
};

export type GuardDutyObjectScanEvent = EventBridgeEvent<
  typeof GUARD_DUTY_SCAN_RESULT_DETAIL_TYPE,
  GuardDutyObjectScanDetail
>;

export type ParsedQuarantineStorageKey = {
  clientId: string;
  fileId: string;
  safeFilename: string;
};

export type ScanResultAction = {
  cleanStorageKey?: string;
  guardDutyMalwareScanStatus: string;
  scanStatus: FileMetadataItem['scanStatus'];
  scanStatusReason?: string;
  storageKey: string;
  storagePrefix: FileMetadataItem['storagePrefix'];
  uploadStatus: FileMetadataItem['uploadStatus'];
};

export type GuardDutyScanHandlerEnvironment = {
  CLIENT_PORTAL_TABLE?: string;
  DELETE_QUARANTINE_AFTER_PROMOTION?: string;
  PROMOTE_SCANNED_FILES?: string;
  UPLOAD_BUCKET?: string;
};

export type GuardDutyScanHandlerDependencies = {
  environment?: GuardDutyScanHandlerEnvironment;
  now?: () => string;
  repository?: ReturnType<typeof createPortalRepository>;
  s3Client?: Pick<S3Client, 'send'>;
};

export type GuardDutyScanHandlerResult = {
  action: 'ignored' | 'updated';
  fileId?: string;
  reason?: string;
  scanStatus?: FileMetadataItem['scanStatus'];
  uploadStatus?: FileMetadataItem['uploadStatus'];
};

function shouldPromoteScannedFiles(environment: GuardDutyScanHandlerEnvironment) {
  return environment.PROMOTE_SCANNED_FILES?.trim().toLowerCase() !== 'false';
}

function shouldDeleteQuarantineObject(environment: GuardDutyScanHandlerEnvironment) {
  return environment.DELETE_QUARANTINE_AFTER_PROMOTION?.trim().toLowerCase() !== 'false';
}

function copySource(bucket: string, key: string) {
  return `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function createDefaultRepository(environment: GuardDutyScanHandlerEnvironment) {
  return createPortalRepository({
    client: createDynamoDocumentClient(),
    tableName: getClientPortalTableName(environment),
  } satisfies PortalRepositoryConfig);
}

function createDefaultS3Client(config: S3ClientConfig = {}) {
  return new S3Client(config);
}

export function parseQuarantineStorageKey(storageKey: string): ParsedQuarantineStorageKey | null {
  const decodedKey = decodeURIComponent(storageKey.replace(/\+/g, '%20'));
  const [storagePrefix, clientId, fileId, ...filenameParts] = decodedKey.split('/');
  const safeFilename = filenameParts.join('/');

  if (
    storagePrefix !== 'quarantine'
    || !clientId
    || !fileId
    || !safeFilename
    || safeFilename.includes('/')
  ) {
    return null;
  }

  return {
    clientId,
    fileId,
    safeFilename,
  };
}

export function scanResultActionForStatus(
  scanResultStatus: string | undefined,
  parsedKey: ParsedQuarantineStorageKey,
  statusReasons: string[] | null | undefined,
): ScanResultAction {
  const reason = statusReasons?.filter(Boolean).join(', ');

  if (scanResultStatus === 'NO_THREATS_FOUND') {
    const cleanStorageKey = buildClientFileStorageKey({
      clientId: parsedKey.clientId,
      fileId: parsedKey.fileId,
      safeFilename: parsedKey.safeFilename,
      storagePrefix: 'clean',
    });

    return {
      cleanStorageKey,
      guardDutyMalwareScanStatus: scanResultStatus,
      scanStatus: 'clean',
      scanStatusReason: reason,
      storageKey: cleanStorageKey,
      storagePrefix: 'clean',
      uploadStatus: 'available',
    };
  }

  if (scanResultStatus === 'THREATS_FOUND') {
    const infectedStorageKey = buildClientFileStorageKey({
      clientId: parsedKey.clientId,
      fileId: parsedKey.fileId,
      safeFilename: parsedKey.safeFilename,
      storagePrefix: 'infected',
    });

    return {
      guardDutyMalwareScanStatus: scanResultStatus,
      scanStatus: 'infected',
      scanStatusReason: reason,
      storageKey: infectedStorageKey,
      storagePrefix: 'infected',
      uploadStatus: 'blocked',
    };
  }

  if (scanResultStatus === 'UNSUPPORTED') {
    return {
      guardDutyMalwareScanStatus: scanResultStatus,
      scanStatus: 'unsupported',
      scanStatusReason: reason,
      storageKey: buildClientFileStorageKey({ ...parsedKey, storagePrefix: 'quarantine' }),
      storagePrefix: 'quarantine',
      uploadStatus: 'pending_review',
    };
  }

  if (scanResultStatus === 'ACCESS_DENIED' || scanResultStatus === 'FAILED') {
    return {
      guardDutyMalwareScanStatus: scanResultStatus,
      scanStatus: 'failed',
      scanStatusReason: reason,
      storageKey: buildClientFileStorageKey({ ...parsedKey, storagePrefix: 'quarantine' }),
      storagePrefix: 'quarantine',
      uploadStatus: 'blocked',
    };
  }

  return {
    guardDutyMalwareScanStatus: scanResultStatus ?? 'UNKNOWN',
    scanStatus: 'unknown',
    scanStatusReason: reason,
    storageKey: buildClientFileStorageKey({ ...parsedKey, storagePrefix: 'quarantine' }),
    storagePrefix: 'quarantine',
    uploadStatus: 'pending_review',
  };
}

async function promoteScannedObject(input: {
  action: ScanResultAction;
  bucket: string;
  deleteQuarantineObject: boolean;
  promoteScannedFiles: boolean;
  quarantineKey: string;
  s3Client: Pick<S3Client, 'send'>;
}) {
  if (
    !input.promoteScannedFiles
    || input.action.storagePrefix === 'quarantine'
    || input.action.storageKey === input.quarantineKey
  ) {
    return;
  }

  await input.s3Client.send(new CopyObjectCommand({
    Bucket: input.bucket,
    CopySource: copySource(input.bucket, input.quarantineKey),
    Key: input.action.storageKey,
    TaggingDirective: 'COPY',
  }));

  if (input.deleteQuarantineObject) {
    await input.s3Client.send(new DeleteObjectCommand({
      Bucket: input.bucket,
      Key: input.quarantineKey,
    }));
  }
}

export function createGuardDutyScanResultHandler(
  dependencies: GuardDutyScanHandlerDependencies = {},
) {
  const environment = dependencies.environment ?? process.env;
  const repository = dependencies.repository ?? createDefaultRepository(environment);
  const s3Client = dependencies.s3Client ?? createDefaultS3Client();
  const now = dependencies.now ?? nowIso;

  return async function handleGuardDutyScanResult(
    event: GuardDutyObjectScanEvent,
  ): Promise<GuardDutyScanHandlerResult> {
    if (event.source !== GUARD_DUTY_SOURCE || event['detail-type'] !== GUARD_DUTY_SCAN_RESULT_DETAIL_TYPE) {
      return { action: 'ignored', reason: 'unsupported_event_type' };
    }

    const bucketName = event.detail.s3ObjectDetails?.bucketName;
    const uploadBucket = environment.UPLOAD_BUCKET?.trim();

    if (!bucketName || !uploadBucket || bucketName !== uploadBucket) {
      return { action: 'ignored', reason: 'bucket_mismatch' };
    }

    const objectKey = event.detail.s3ObjectDetails?.objectKey;
    const parsedKey = objectKey ? parseQuarantineStorageKey(objectKey) : null;

    if (!objectKey || !parsedKey) {
      return { action: 'ignored', reason: 'not_quarantine_object' };
    }

    const fileLookup = fileByIdGsiKey(parsedKey.fileId, parsedKey.clientId);
    const files = await repository.queryByIndex<FileMetadataItem>({
      indexName: 'GSI2',
      limit: 1,
      pk: fileLookup.GSI2PK,
      skBeginsWith: fileLookup.GSI2SK,
    });
    const file = files[0];

    if (!file) {
      return {
        action: 'ignored',
        fileId: parsedKey.fileId,
        reason: 'file_metadata_not_found',
      };
    }

    const scannedAt = now();
    const action = scanResultActionForStatus(
      event.detail.scanResultDetails?.scanResultStatus,
      parsedKey,
      event.detail.scanResultDetails?.statusReasons,
    );

    await promoteScannedObject({
      action,
      bucket: bucketName,
      deleteQuarantineObject: shouldDeleteQuarantineObject(environment),
      promoteScannedFiles: shouldPromoteScannedFiles(environment),
      quarantineKey: objectKey,
      s3Client,
    });

    const setExpressions = [
      '#guardDutyMalwareScanStatus = :guardDutyMalwareScanStatus',
      '#scanStatus = :scanStatus',
      '#scannedAt = :scannedAt',
      '#storageKey = :storageKey',
      '#storagePrefix = :storagePrefix',
      '#updatedAt = :updatedAt',
      '#uploadStatus = :uploadStatus',
    ];
    const removeExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {
      '#guardDutyMalwareScanStatus': 'guardDutyMalwareScanStatus',
      '#scanStatus': 'scanStatus',
      '#scannedAt': 'scannedAt',
      '#storageKey': 'storageKey',
      '#storagePrefix': 'storagePrefix',
      '#updatedAt': 'updatedAt',
      '#uploadStatus': 'uploadStatus',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':guardDutyMalwareScanStatus': action.guardDutyMalwareScanStatus,
      ':scanStatus': action.scanStatus,
      ':scannedAt': scannedAt,
      ':storageKey': action.storageKey,
      ':storagePrefix': action.storagePrefix,
      ':updatedAt': scannedAt,
      ':uploadStatus': action.uploadStatus,
    };

    if (action.cleanStorageKey) {
      expressionAttributeNames['#cleanStorageKey'] = 'cleanStorageKey';
      expressionAttributeValues[':cleanStorageKey'] = action.cleanStorageKey;
      setExpressions.push('#cleanStorageKey = :cleanStorageKey');
    } else {
      expressionAttributeNames['#cleanStorageKey'] = 'cleanStorageKey';
      removeExpressions.push('#cleanStorageKey');
    }

    if (action.scanStatusReason) {
      expressionAttributeNames['#scanStatusReason'] = 'scanStatusReason';
      expressionAttributeValues[':scanStatusReason'] = action.scanStatusReason;
      setExpressions.push('#scanStatusReason = :scanStatusReason');
    } else {
      expressionAttributeNames['#scanStatusReason'] = 'scanStatusReason';
      removeExpressions.push('#scanStatusReason');
    }

    await repository.transactWriteItems([
      {
        action: 'update',
        conditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
        expressionAttributeNames,
        expressionAttributeValues,
        key: {
          PK: file.PK,
          SK: file.SK,
        },
        updateExpression: [
          `SET ${setExpressions.join(', ')}`,
          ...(removeExpressions.length > 0 ? [`REMOVE ${removeExpressions.join(', ')}`] : []),
        ].join(' '),
      },
      {
        item: buildAuditEventItem({
          action: `file.scan.${action.scanStatus}`,
          actorUserId: 'aws.guardduty',
          clientId: parsedKey.clientId,
          createdAt: scannedAt,
          entityId: parsedKey.fileId,
          entityType: 'FILE',
          eventId: newId('audit'),
          metadata: {
            bucketName,
            objectKey,
            scanResultStatus: action.guardDutyMalwareScanStatus,
            scanStatus: event.detail.scanStatus,
            statusReasons: event.detail.scanResultDetails?.statusReasons ?? null,
            threats: event.detail.scanResultDetails?.threats ?? null,
          },
        }),
      },
    ]);

    return {
      action: 'updated',
      fileId: parsedKey.fileId,
      scanStatus: action.scanStatus,
      uploadStatus: action.uploadStatus,
    };
  };
}

export async function handler(event: GuardDutyObjectScanEvent) {
  return createGuardDutyScanResultHandler()(event);
}

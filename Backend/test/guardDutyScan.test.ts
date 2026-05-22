import {
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import { buildFileMetadataItem } from '../src/dynamodb/index.js';
import {
  GUARD_DUTY_SCAN_RESULT_DETAIL_TYPE,
  createGuardDutyScanResultHandler,
  parseQuarantineStorageKey,
  scanResultActionForStatus,
  type GuardDutyObjectScanEvent,
} from '../src/files/guardDutyScan.js';

const clientId = 'client_123';
const fileId = 'file_123';
const safeFilename = 'hero.png';
const now = '2026-05-22T15:30:00.000Z';

function fileMetadataItem() {
  return buildFileMetadataItem({
    bucket: 'client-portal-uploads-test',
    category: 'images',
    clientId,
    createdAt: '2026-05-22T15:00:00.000Z',
    fileId,
    key: `quarantine/${clientId}/${fileId}/${safeFilename}`,
    mimeType: 'image/png',
    originalFilename: safeFilename,
    safeFilename,
    scanStatus: 'pending',
    sizeBytes: 1024,
    storageKey: `quarantine/${clientId}/${fileId}/${safeFilename}`,
    storagePrefix: 'quarantine',
    updatedAt: '2026-05-22T15:00:00.000Z',
    uploadedBy: 'auth0|abc',
    uploadStatus: 'pending',
  });
}

function scanEvent(overrides: Partial<GuardDutyObjectScanEvent['detail']> = {}): GuardDutyObjectScanEvent {
  return {
    account: '123456789012',
    detail: {
      resourceType: 'S3_OBJECT',
      s3ObjectDetails: {
        bucketName: 'client-portal-uploads-test',
        objectKey: `quarantine/${clientId}/${fileId}/${safeFilename}`,
      },
      scanResultDetails: {
        scanResultStatus: 'NO_THREATS_FOUND',
        statusReasons: null,
        threats: null,
      },
      scanStatus: 'COMPLETED',
      ...overrides,
    },
    'detail-type': GUARD_DUTY_SCAN_RESULT_DETAIL_TYPE,
    id: 'event_123',
    region: 'us-east-2',
    resources: [],
    source: 'aws.guardduty',
    time: now,
    version: '0',
  };
}

function commandInput(command: unknown) {
  return (command as { input: Record<string, unknown> }).input;
}

describe('GuardDuty malware scan result handling', () => {
  it('parses quarantine object keys', () => {
    expect(parseQuarantineStorageKey('quarantine/client_123/file_123/hero.png')).toEqual({
      clientId,
      fileId,
      safeFilename,
    });
    expect(parseQuarantineStorageKey('clean/client_123/file_123/hero.png')).toBeNull();
    expect(parseQuarantineStorageKey('quarantine/client_123/file_123/folder/hero.png')).toBeNull();
  });

  it('maps GuardDuty scan results to internal lifecycle statuses', () => {
    const parsedKey = { clientId, fileId, safeFilename };

    expect(scanResultActionForStatus('NO_THREATS_FOUND', parsedKey, null)).toMatchObject({
      cleanStorageKey: `clean/${clientId}/${fileId}/${safeFilename}`,
      scanStatus: 'clean',
      storagePrefix: 'clean',
      uploadStatus: 'available',
    });
    expect(scanResultActionForStatus('THREATS_FOUND', parsedKey, null)).toMatchObject({
      scanStatus: 'infected',
      storageKey: `infected/${clientId}/${fileId}/${safeFilename}`,
      uploadStatus: 'blocked',
    });
    expect(scanResultActionForStatus('UNSUPPORTED', parsedKey, ['PASSWORD_PROTECTED'])).toMatchObject({
      scanStatus: 'unsupported',
      scanStatusReason: 'PASSWORD_PROTECTED',
      storagePrefix: 'quarantine',
      uploadStatus: 'pending_review',
    });
    expect(scanResultActionForStatus('FAILED', parsedKey, null)).toMatchObject({
      scanStatus: 'failed',
      uploadStatus: 'blocked',
    });
  });

  it('promotes clean files, updates metadata, and writes an audit event', async () => {
    const file = fileMetadataItem();
    const transactWriteItems = vi.fn(async () => undefined);
    const repository = {
      queryByIndex: vi.fn(async () => [file]),
      transactWriteItems,
    };
    const sentS3Commands: unknown[] = [];
    const s3Client = {
      send: vi.fn(async (command: unknown) => {
        sentS3Commands.push(command);
        return {};
      }),
    };
    const handler = createGuardDutyScanResultHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: 'client-portal-uploads-test',
      },
      now: () => now,
      repository: repository as never,
      s3Client: s3Client as never,
    });

    await expect(handler(scanEvent())).resolves.toEqual({
      action: 'updated',
      fileId,
      scanStatus: 'clean',
      uploadStatus: 'available',
    });

    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI2',
      limit: 1,
      pk: `FILE#${fileId}`,
      skBeginsWith: `CLIENT#${clientId}`,
    });
    expect(sentS3Commands[0]).toBeInstanceOf(CopyObjectCommand);
    expect(sentS3Commands[1]).toBeInstanceOf(DeleteObjectCommand);
    expect(commandInput(sentS3Commands[0])).toMatchObject({
      Bucket: 'client-portal-uploads-test',
      Key: `clean/${clientId}/${fileId}/${safeFilename}`,
      TaggingDirective: 'COPY',
    });

    expect(transactWriteItems).toHaveBeenCalledTimes(1);
    const transaction = transactWriteItems.mock.calls[0]?.[0];
    expect(transaction[0]).toMatchObject({
      action: 'update',
      key: {
        PK: `CLIENT#${clientId}`,
        SK: file.SK,
      },
    });
    expect(transaction[0].expressionAttributeValues).toMatchObject({
      ':cleanStorageKey': `clean/${clientId}/${fileId}/${safeFilename}`,
      ':guardDutyMalwareScanStatus': 'NO_THREATS_FOUND',
      ':scanStatus': 'clean',
      ':storageKey': `clean/${clientId}/${fileId}/${safeFilename}`,
      ':storagePrefix': 'clean',
      ':uploadStatus': 'available',
    });
    expect(transaction[1].item).toMatchObject({
      action: 'file.scan.clean',
      actorUserId: 'aws.guardduty',
      clientId,
      entityId: fileId,
      entityType: 'FILE',
      type: 'AUDIT',
    });
  });

  it('blocks infected files without issuing clean metadata', async () => {
    const transactWriteItems = vi.fn(async () => undefined);
    const repository = {
      queryByIndex: vi.fn(async () => [fileMetadataItem()]),
      transactWriteItems,
    };
    const s3Client = {
      send: vi.fn(async () => ({})),
    };
    const handler = createGuardDutyScanResultHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        DELETE_QUARANTINE_AFTER_PROMOTION: 'false',
        UPLOAD_BUCKET: 'client-portal-uploads-test',
      },
      now: () => now,
      repository: repository as never,
      s3Client: s3Client as never,
    });

    await expect(handler(scanEvent({
      scanResultDetails: {
        scanResultStatus: 'THREATS_FOUND',
        statusReasons: null,
        threats: [{ name: 'EICAR-Test-File' }],
      },
    }))).resolves.toMatchObject({
      action: 'updated',
      scanStatus: 'infected',
      uploadStatus: 'blocked',
    });

    expect(s3Client.send).toHaveBeenCalledTimes(1);
    const transaction = transactWriteItems.mock.calls[0]?.[0];
    expect(transaction[0].expressionAttributeValues).toMatchObject({
      ':guardDutyMalwareScanStatus': 'THREATS_FOUND',
      ':scanStatus': 'infected',
      ':storageKey': `infected/${clientId}/${fileId}/${safeFilename}`,
      ':storagePrefix': 'infected',
      ':uploadStatus': 'blocked',
    });
    expect(transaction[0].updateExpression).toContain('REMOVE #cleanStorageKey');
  });
});

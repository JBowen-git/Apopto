import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildFileMetadataItem,
  buildMembershipItem,
  buildUserProfileItem,
  createFilesHandler,
  type ClientProfileItem,
  type FileMetadataItem,
  type FilesRepository,
  type MembershipItem,
  type PortalTableItem,
  type TransactWriteItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|files';
const clientId = 'client_files';
const otherClientId = 'client_other';
const now = '2026-05-22T16:00:00.000Z';
const requestId = 'request-files';
const uploadBucket = 'client-portal-uploads-test';

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt: now,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'File Owner',
    ...overrides,
  });
}

function clientItem(overrides: Partial<ClientProfileItem> = {}) {
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

function membershipItem(overrides: Partial<MembershipItem> = {}) {
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

function fileItem(overrides: Partial<FileMetadataItem> = {}) {
  const resolvedClientId = overrides.clientId ?? clientId;
  const fileId = overrides.fileId ?? 'file_123';
  const safeFilename = overrides.safeFilename ?? 'brand-guide.pdf';

  return buildFileMetadataItem({
    bucket: uploadBucket,
    category: 'brand_guidelines',
    clientId: resolvedClientId,
    createdAt: '2026-05-22T15:30:00.000Z',
    fileId,
    key: `quarantine/${resolvedClientId}/${fileId}/${safeFilename}`,
    mimeType: 'application/pdf',
    originalFilename: safeFilename,
    safeFilename,
    scanStatus: 'pending',
    sizeBytes: 4096,
    storageKey: `quarantine/${resolvedClientId}/${fileId}/${safeFilename}`,
    storagePrefix: 'quarantine',
    updatedAt: '2026-05-22T15:30:00.000Z',
    uploadedBy: auth0Sub,
    uploadStatus: 'pending',
    ...overrides,
  });
}

function fakeRepository(initialItems: PortalTableItem[] = [
  userItem(),
  clientItem(),
  membershipItem(),
]) {
  const itemsByKey = new Map<string, PortalTableItem>();

  for (const item of initialItems) {
    itemsByKey.set(itemKey(item), item);
  }

  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
    putItem: vi.fn(async (item: PortalTableItem) => {
      itemsByKey.set(itemKey(item), item);
    }),
    queryByIndex: vi.fn(async (options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
    }) => {
      if (options.indexName === 'GSI1') {
        return [...itemsByKey.values()].filter((item): item is MembershipItem => (
          item.type === 'MEMBERSHIP'
          && item.GSI1PK === options.pk
          && (!options.skBeginsWith || item.GSI1SK.startsWith(options.skBeginsWith))
        ));
      }

      return [...itemsByKey.values()].filter((item): item is FileMetadataItem => (
        item.type === 'FILE'
        && item.GSI2PK === options.pk
        && item.GSI2SK.startsWith(options.skBeginsWith ?? '')
      ));
    }),
    queryByPartition: vi.fn(async (options: {
      pk: string;
      skBeginsWith?: string;
    }) => (
      [...itemsByKey.values()].filter((item): item is FileMetadataItem => (
        item.type === 'FILE'
        && item.PK === options.pk
        && item.SK.startsWith(options.skBeginsWith ?? '')
      ))
    )),
    transactWriteItems: vi.fn(async (entries: TransactWriteItem[]) => {
      for (const entry of entries) {
        if (entry.action !== 'update') {
          itemsByKey.set(itemKey(entry.item), entry.item);
        }
      }
    }),
    itemsByKey,
  } satisfies FilesRepository & {
    itemsByKey: Map<string, PortalTableItem>;
  };

  return repository;
}

function apiEvent({
  body,
  pathParameters,
  rawPath,
  routeKey,
  scopes = ['write:files'],
}: {
  body?: unknown;
  pathParameters?: Record<string, string>;
  rawPath?: string;
  routeKey: string;
  scopes?: string[];
}) {
  const [method, routePath] = routeKey.split(' ');

  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    rawPath: rawPath ?? routePath,
    routeKey,
    pathParameters,
    requestContext: {
      requestId,
      http: {
        method,
        path: rawPath ?? routePath,
      },
      authorizer: {
        jwt: {
          claims: {
            sub: auth0Sub,
            scope: scopes.join(' '),
          },
          scopes,
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

function commandInput(command: unknown) {
  return (command as { input: Record<string, unknown> }).input;
}

describe('files handler upload routes', () => {
  it('creates a quarantine-only presigned upload URL and pending metadata', async () => {
    const repository = fakeRepository();
    const presignPutObject = vi.fn(async () => 'https://uploads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        MAX_UPLOAD_BYTES: '50000000',
        UPLOAD_BUCKET: uploadBucket,
      },
      newFileId: () => 'file_new',
      now: () => now,
      presignPutObject,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/presign-upload',
      body: {
        category: 'images',
        mimeType: 'IMAGE/PNG',
        originalFilename: ' ACME Logo.png ',
        sizeBytes: 2048,
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      fileId: 'file_new',
      key: 'quarantine/client_files/file_new/ACME-Logo.png',
      requiredHeaders: {
        'content-type': 'image/png',
      },
      uploadUrl: 'https://uploads.example.test/signed',
    });
    expect(presignPutObject.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect(commandInput(presignPutObject.mock.calls[0]?.[0])).toMatchObject({
      Bucket: uploadBucket,
      ContentType: 'image/png',
      Key: 'quarantine/client_files/file_new/ACME-Logo.png',
    });
    expect(repository.putItem).toHaveBeenCalledWith(expect.objectContaining({
      fileId: 'file_new',
      scanStatus: 'pending',
      storageKey: 'quarantine/client_files/file_new/ACME-Logo.png',
      storagePrefix: 'quarantine',
      uploadStatus: 'pending',
    }), {
      conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    });
  });

  it('rejects blocked extensions before creating metadata or presigning', async () => {
    const repository = fakeRepository();
    const presignPutObject = vi.fn(async () => 'https://uploads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      presignPutObject,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/presign-upload',
      body: {
        category: 'other',
        mimeType: 'application/octet-stream',
        originalFilename: 'payload.exe',
        sizeBytes: 1024,
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      error: 'blocked_extension',
    });
    expect(presignPutObject).not.toHaveBeenCalled();
    expect(repository.putItem).not.toHaveBeenCalled();
  });

  it.each([
    ['inline-script.js', 'application/javascript'],
    ['deploy.SH', 'text/x-shellscript'],
    ['cleanup.cmd', 'application/octet-stream'],
    ['report.pdf.bat', 'application/octet-stream'],
  ])('rejects blocked script extension %s before storage work', async (originalFilename, mimeType) => {
    const repository = fakeRepository();
    const presignPutObject = vi.fn(async () => 'https://uploads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      presignPutObject,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/presign-upload',
      body: {
        category: 'other',
        mimeType,
        originalFilename,
        sizeBytes: 1024,
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      error: 'blocked_extension',
    });
    expect(presignPutObject).not.toHaveBeenCalled();
    expect(repository.putItem).not.toHaveBeenCalled();
  });

  it('rejects uploads while the client lifecycle is not eligible', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'proposal_sent' }),
      membershipItem(),
    ]);
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/presign-upload',
      body: {
        category: 'images',
        mimeType: 'image/png',
        originalFilename: 'logo.png',
        sizeBytes: 1024,
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'file_upload_not_available',
      details: {
        clientStatus: 'proposal_sent',
      },
    });
    expect(repository.putItem).not.toHaveBeenCalled();
  });

  it('completes a pending upload after verifying the quarantine object with S3 HeadObject', async () => {
    const file = fileItem();
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      file,
    ]);
    const s3Client = {
      send: vi.fn(async () => ({
        ContentLength: file.sizeBytes,
        ContentType: file.mimeType,
      })),
    };
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      newAuditId: () => 'audit_upload_completed',
      now: () => now,
      repository,
      s3Client,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/{fileId}/complete',
      rawPath: '/api/files/file_123/complete',
      pathParameters: {
        fileId: 'file_123',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      file: {
        fileId: 'file_123',
        scanStatus: 'pending',
        storageKey: file.storageKey,
        uploadStatus: 'uploaded',
      },
    });
    expect(s3Client.send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(commandInput(s3Client.send.mock.calls[0]?.[0])).toMatchObject({
      Bucket: uploadBucket,
      Key: file.storageKey,
    });
    expect(repository.transactWriteItems).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'update',
        key: {
          PK: file.PK,
          SK: file.SK,
        },
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          action: 'file.upload.completed',
          actorUserId: auth0Sub,
          clientId,
          entityId: 'file_123',
          entityType: 'FILE',
        }),
      }),
    ]);
  });

  it('does not complete a file that belongs to another client', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      fileItem({
        clientId: otherClientId,
        fileId: 'file_shared_name',
      }),
    ]);
    const s3Client = {
      send: vi.fn(async () => ({
        ContentLength: 4096,
        ContentType: 'application/pdf',
      })),
    };
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      repository,
      s3Client,
    });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/files/{fileId}/complete',
      rawPath: '/api/files/file_shared_name/complete',
      pathParameters: {
        fileId: 'file_shared_name',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      error: 'file_not_found',
    });
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI2',
      limit: 1,
      pk: 'FILE#file_shared_name',
      skBeginsWith: 'CLIENT#client_files',
    });
    expect(s3Client.send).not.toHaveBeenCalled();
    expect(repository.transactWriteItems).not.toHaveBeenCalled();
  });

  it('lists non-deleted files for the resolved tenant only', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      fileItem({
        fileId: 'file_visible',
        originalFilename: 'visible.pdf',
        safeFilename: 'visible.pdf',
      }),
      fileItem({
        fileId: 'file_deleted',
        originalFilename: 'deleted.pdf',
        safeFilename: 'deleted.pdf',
        uploadStatus: 'deleted',
      }),
      fileItem({
        clientId: otherClientId,
        fileId: 'file_other',
        originalFilename: 'other.pdf',
        safeFilename: 'other.pdf',
      }),
    ]);
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/files',
      scopes: ['read:files'],
    }), context);
    const body = responseBody(response) as {
      files?: Array<{ fileId: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.files?.map((file) => file.fileId)).toEqual(['file_visible']);
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 50,
      pk: 'CLIENT#client_files',
      skBeginsWith: 'FILE#',
      scanIndexForward: false,
    });
  });

  it('creates a download URL only for a clean available file owned by the tenant', async () => {
    const cleanStorageKey = 'clean/client_files/file_clean/brand-guide.pdf';
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      fileItem({
        cleanStorageKey,
        fileId: 'file_clean',
        scanStatus: 'clean',
        storageKey: cleanStorageKey,
        storagePrefix: 'clean',
        uploadStatus: 'available',
      }),
    ]);
    const presignGetObject = vi.fn(async () => 'https://downloads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      now: () => now,
      presignGetObject,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/files/{fileId}/download-url',
      rawPath: '/api/files/file_clean/download-url',
      pathParameters: {
        fileId: 'file_clean',
      },
      scopes: ['read:files'],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      url: 'https://downloads.example.test/signed',
    });
    expect(presignGetObject.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
    expect(commandInput(presignGetObject.mock.calls[0]?.[0])).toMatchObject({
      Bucket: uploadBucket,
      Key: cleanStorageKey,
      ResponseContentDisposition: 'attachment; filename="brand-guide.pdf"',
    });
  });

  it('does not create download URLs for cross-client files', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      fileItem({
        clientId: otherClientId,
        fileId: 'file_cross_client',
        scanStatus: 'clean',
        storageKey: 'clean/client_other/file_cross_client/other.pdf',
        storagePrefix: 'clean',
        uploadStatus: 'available',
      }),
    ]);
    const presignGetObject = vi.fn(async () => 'https://downloads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      presignGetObject,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/files/{fileId}/download-url',
      rawPath: '/api/files/file_cross_client/download-url',
      pathParameters: {
        fileId: 'file_cross_client',
      },
      scopes: ['read:files'],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      error: 'file_not_found',
    });
    expect(presignGetObject).not.toHaveBeenCalled();
  });

  it('does not create download URLs for quarantined or deleted files', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      fileItem({
        fileId: 'file_quarantined',
        scanStatus: 'pending',
        storagePrefix: 'quarantine',
        uploadStatus: 'uploaded',
      }),
      fileItem({
        fileId: 'file_deleted',
        scanStatus: 'clean',
        storageKey: 'clean/client_files/file_deleted/deleted.pdf',
        storagePrefix: 'clean',
        uploadStatus: 'deleted',
      }),
    ]);
    const presignGetObject = vi.fn(async () => 'https://downloads.example.test/signed');
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      presignGetObject,
      repository,
    });

    const quarantinedResponse = await handler(apiEvent({
      routeKey: 'GET /api/files/{fileId}/download-url',
      rawPath: '/api/files/file_quarantined/download-url',
      pathParameters: {
        fileId: 'file_quarantined',
      },
      scopes: ['read:files'],
    }), context);
    const deletedResponse = await handler(apiEvent({
      routeKey: 'GET /api/files/{fileId}/download-url',
      rawPath: '/api/files/file_deleted/download-url',
      pathParameters: {
        fileId: 'file_deleted',
      },
      scopes: ['read:files'],
    }), context);

    expect(quarantinedResponse.statusCode).toBe(409);
    expect(responseBody(quarantinedResponse)).toMatchObject({
      error: 'file_not_available_for_download',
      details: {
        scanStatus: 'pending',
        storagePrefix: 'quarantine',
        uploadStatus: 'uploaded',
      },
    });
    expect(deletedResponse.statusCode).toBe(409);
    expect(responseBody(deletedResponse)).toMatchObject({
      error: 'file_not_available_for_download',
      details: {
        uploadStatus: 'deleted',
      },
    });
    expect(presignGetObject).not.toHaveBeenCalled();
  });

  it('soft deletes file metadata without deleting the S3 object', async () => {
    const file = fileItem({
      fileId: 'file_delete_me',
      scanStatus: 'clean',
      storageKey: 'clean/client_files/file_delete_me/brand-guide.pdf',
      storagePrefix: 'clean',
      uploadStatus: 'available',
    });
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      file,
    ]);
    const handler = createFilesHandler({
      environment: {
        CLIENT_PORTAL_TABLE: 'ClientPortal-test',
        UPLOAD_BUCKET: uploadBucket,
      },
      newAuditId: () => 'audit_file_deleted',
      now: () => now,
      repository,
    });

    const response = await handler(apiEvent({
      routeKey: 'DELETE /api/files/{fileId}',
      rawPath: '/api/files/file_delete_me',
      pathParameters: {
        fileId: 'file_delete_me',
      },
      scopes: ['write:files'],
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      file: {
        fileId: 'file_delete_me',
        uploadStatus: 'deleted',
      },
    });
    expect(repository.transactWriteItems).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'update',
        key: {
          PK: file.PK,
          SK: file.SK,
        },
        updateExpression: 'SET #uploadStatus = :deleted, #updatedAt = :updatedAt',
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          action: 'file.deleted',
          actorUserId: auth0Sub,
          clientId,
          entityId: 'file_delete_me',
          entityType: 'FILE',
        }),
      }),
    ]);
  });
});

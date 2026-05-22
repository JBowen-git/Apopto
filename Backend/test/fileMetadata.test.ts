import { describe, expect, it } from 'vitest';

import {
  FileSafetyError,
  buildPendingFileMetadataItem,
} from '../src/files/index.js';

const createdAt = '2026-05-22T10:15:30.000Z';
const updatedAt = '2026-05-22T10:20:30.000Z';

describe('file metadata model helpers', () => {
  it('builds a pending file metadata item for a project upload', () => {
    expect(buildPendingFileMetadataItem({
      bucket: 'client-portal-uploads-staging-543035741420',
      category: 'images',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_123',
      maxUploadBytes: 10_000,
      mimeType: 'IMAGE/PNG',
      originalFilename: ' ACME Logo Final (1).PNG ',
      projectId: 'project_123',
      sizeBytes: 4096,
      updatedAt,
      uploadedBy: 'auth0|abc',
    })).toEqual({
      PK: 'CLIENT#client_123',
      SK: `FILE#${createdAt}#file_123`,
      GSI1PK: 'PROJECT#project_123',
      GSI1SK: `FILE#${createdAt}#file_123`,
      GSI2PK: 'FILE#file_123',
      GSI2SK: 'CLIENT#client_123',
      bucket: 'client-portal-uploads-staging-543035741420',
      category: 'images',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_123',
      key: 'quarantine/client_123/file_123/ACME-Logo-Final-1.PNG',
      mimeType: 'image/png',
      originalFilename: ' ACME Logo Final (1).PNG ',
      projectId: 'project_123',
      safeFilename: 'ACME-Logo-Final-1.PNG',
      scanStatus: 'pending',
      sizeBytes: 4096,
      storageKey: 'quarantine/client_123/file_123/ACME-Logo-Final-1.PNG',
      storagePrefix: 'quarantine',
      type: 'FILE',
      updatedAt,
      uploadedBy: 'auth0|abc',
      uploadStatus: 'pending',
    });
  });

  it('builds a pending general file item without a project index key', () => {
    const item = buildPendingFileMetadataItem({
      bucket: 'client-portal-uploads-staging-543035741420',
      category: 'technical_documents',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_general',
      mimeType: 'application/pdf',
      originalFilename: 'site notes.pdf',
      safeFilename: 'site-notes-v2.pdf',
      sizeBytes: 2048,
      updatedAt,
      uploadedBy: 'auth0|abc',
    });

    expect(item).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: `FILE#${createdAt}#file_general`,
      GSI2PK: 'FILE#file_general',
      GSI2SK: 'CLIENT#client_123',
      key: 'quarantine/client_123/file_general/site-notes-v2.pdf',
      safeFilename: 'site-notes-v2.pdf',
      scanStatus: 'pending',
      storageKey: 'quarantine/client_123/file_general/site-notes-v2.pdf',
      storagePrefix: 'quarantine',
      uploadStatus: 'pending',
    });
    expect(item).not.toHaveProperty('GSI1PK');
    expect(item).not.toHaveProperty('GSI1SK');
  });

  it('rejects unsafe originals even if a safe filename override is supplied', () => {
    expect(() => buildPendingFileMetadataItem({
      bucket: 'client-portal-uploads-staging-543035741420',
      category: 'other',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_blocked',
      mimeType: 'application/octet-stream',
      originalFilename: 'payload.exe',
      safeFilename: 'payload.pdf',
      sizeBytes: 2048,
      updatedAt,
      uploadedBy: 'auth0|abc',
    })).toThrow(FileSafetyError);
  });
});

import type { FileCategory } from '@apopto/shared';

import {
  buildFileMetadataItem,
  type FileMetadataItem,
} from '../dynamodb/index.js';
import {
  assertAllowedFilename,
  buildClientUploadS3Key,
  validateUploadFile,
} from './safety.js';

export type BuildPendingFileMetadataInput = {
  bucket: string;
  category: FileCategory;
  clientId: string;
  createdAt: string;
  fileId: string;
  mimeType: string;
  originalFilename: string;
  sizeBytes: number;
  updatedAt: string;
  uploadedBy: string;
  maxUploadBytes?: number;
  projectId?: string;
  safeFilename?: string;
};

export function buildPendingFileMetadataItem(input: BuildPendingFileMetadataInput): FileMetadataItem {
  const validated = validateUploadFile({
    category: input.category,
    maxUploadBytes: input.maxUploadBytes,
    mimeType: input.mimeType,
    originalFilename: input.originalFilename,
    sizeBytes: input.sizeBytes,
  });
  const safeFilename = input.safeFilename
    ? assertAllowedFilename(input.safeFilename)
    : validated.safeFilename;

  return buildFileMetadataItem({
    bucket: input.bucket,
    category: validated.category,
    clientId: input.clientId,
    createdAt: input.createdAt,
    fileId: input.fileId,
    key: buildClientUploadS3Key({
      clientId: input.clientId,
      fileId: input.fileId,
      safeFilename,
    }),
    mimeType: validated.mimeType,
    originalFilename: input.originalFilename,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    safeFilename,
    scanStatus: 'pending',
    storageKey: buildClientUploadS3Key({
      clientId: input.clientId,
      fileId: input.fileId,
      safeFilename,
    }),
    storagePrefix: 'quarantine',
    sizeBytes: validated.sizeBytes,
    updatedAt: input.updatedAt,
    uploadedBy: input.uploadedBy,
    uploadStatus: 'pending',
  });
}

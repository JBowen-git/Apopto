import { z } from 'zod';
import {
  FileCategorySchema,
  FileScanStatusSchema,
  FileStoragePrefixSchema,
  UploadStatusSchema,
} from './core.js';
import { isoDateTimeString, nonEmptyString, optionalTrimmedString } from './common.js';

export const CreateUploadUrlRequestSchema = z.object({
  originalFilename: nonEmptyString,
  mimeType: nonEmptyString,
  sizeBytes: z.number().int().positive(),
  category: FileCategorySchema,
  projectId: optionalTrimmedString,
});

export const CompleteUploadRequestSchema = z.object({
  fileId: nonEmptyString,
});

export const FileMetadataSummarySchema = z.object({
  cleanStorageKey: optionalTrimmedString,
  fileId: nonEmptyString,
  projectId: optionalTrimmedString,
  originalFilename: nonEmptyString,
  safeFilename: nonEmptyString,
  mimeType: nonEmptyString,
  sizeBytes: z.number().int().nonnegative(),
  category: FileCategorySchema,
  scanStatus: FileScanStatusSchema,
  scannedAt: optionalTrimmedString,
  storageKey: nonEmptyString,
  storagePrefix: FileStoragePrefixSchema,
  uploadStatus: UploadStatusSchema,
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
});

export const CreateUploadUrlResponseSchema = z.object({
  fileId: nonEmptyString,
  key: nonEmptyString,
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresAt: isoDateTimeString,
});

export const CompleteUploadResponseSchema = z.object({
  file: FileMetadataSummarySchema,
});

export const ListFilesResponseSchema = z.object({
  files: z.array(FileMetadataSummarySchema),
});

export const DownloadUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: isoDateTimeString,
});

export type CreateUploadUrlRequest = z.infer<typeof CreateUploadUrlRequestSchema>;
export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequestSchema>;
export type FileMetadataSummary = z.infer<typeof FileMetadataSummarySchema>;
export type CreateUploadUrlResponse = z.infer<typeof CreateUploadUrlResponseSchema>;
export type CompleteUploadResponse = z.infer<typeof CompleteUploadResponseSchema>;
export type ListFilesResponse = z.infer<typeof ListFilesResponseSchema>;
export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponseSchema>;

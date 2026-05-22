import {
  CompleteUploadResponseSchema,
  CreateUploadUrlResponseSchema,
  DeleteFileResponseSchema,
  DownloadUrlResponseSchema,
  ListFilesResponseSchema,
  type CreateUploadUrlRequest,
  type CreateUploadUrlResponse,
  type FileCategory,
} from '@apopto/shared';
import type { ApiClient } from './client';

export const filePortalScopes = [
  'read:client',
  'read:files',
  'write:files',
] as const;

export type ListFileFilters = {
  category?: FileCategory | '';
  projectId?: string;
};

function fileQueryString(filters: ListFileFilters = {}) {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set('category', filters.category);
  }

  if (filters.projectId) {
    params.set('projectId', filters.projectId);
  }

  const query = params.toString();

  return query ? `?${query}` : '';
}

export async function listClientFiles(apiClient: ApiClient, filters?: ListFileFilters) {
  return ListFilesResponseSchema.parse(
    await apiClient.get(`/api/files${fileQueryString(filters)}`),
  );
}

export async function createUploadUrl(
  apiClient: ApiClient,
  request: CreateUploadUrlRequest,
) {
  return CreateUploadUrlResponseSchema.parse(
    await apiClient.post('/api/files/presign-upload', request),
  );
}

export async function completeUpload(apiClient: ApiClient, fileId: string) {
  return CompleteUploadResponseSchema.parse(
    await apiClient.post(`/api/files/${encodeURIComponent(fileId)}/complete`),
  );
}

export async function getDownloadUrl(apiClient: ApiClient, fileId: string) {
  return DownloadUrlResponseSchema.parse(
    await apiClient.get(`/api/files/${encodeURIComponent(fileId)}/download-url`),
  );
}

export async function deleteClientFile(apiClient: ApiClient, fileId: string) {
  return DeleteFileResponseSchema.parse(
    await apiClient.delete(`/api/files/${encodeURIComponent(fileId)}`),
  );
}

export async function putFileDirectlyToS3(
  file: File,
  upload: CreateUploadUrlResponse,
) {
  const headers = new Headers(upload.requiredHeaders);

  const response = await fetch(upload.uploadUrl, {
    body: file,
    headers,
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed with status ${response.status}.`);
  }
}

import {
  CreateMessageRequestSchema,
  CreateThreadRequestSchema,
  ListThreadsResponseSchema,
  ThreadMessagesResponseSchema,
  type CreateMessageRequest,
  type CreateThreadRequest,
} from '@apopto/shared';
import type { ApiClient } from './client';

export const messagePortalScopes = [
  'read:client',
  'read:messages',
  'write:messages',
] as const;

export async function listThreads(apiClient: ApiClient) {
  return ListThreadsResponseSchema.parse(await apiClient.get('/api/threads'));
}

export async function createThread(apiClient: ApiClient, request: CreateThreadRequest) {
  const body = CreateThreadRequestSchema.parse(request);

  return ThreadMessagesResponseSchema.parse(await apiClient.post('/api/threads', body));
}

export async function listThreadMessages(apiClient: ApiClient, threadId: string) {
  return ThreadMessagesResponseSchema.parse(
    await apiClient.get(`/api/threads/${encodeURIComponent(threadId)}/messages`),
  );
}

export async function createMessage(
  apiClient: ApiClient,
  threadId: string,
  request: CreateMessageRequest,
) {
  const body = CreateMessageRequestSchema.parse(request);

  return ThreadMessagesResponseSchema.parse(
    await apiClient.post(`/api/threads/${encodeURIComponent(threadId)}/messages`, body),
  );
}

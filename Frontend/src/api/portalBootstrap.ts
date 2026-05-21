import { MeResponseSchema } from '@apopto/shared';
import type { ApiClient } from './client';

function previewResponse(response: unknown) {
  if (typeof response === 'string') {
    return response.slice(0, 260);
  }

  try {
    return JSON.stringify(response).slice(0, 260);
  } catch {
    return String(response).slice(0, 260);
  }
}

export async function bootstrapPortalContext(apiClient: ApiClient) {
  const response = await apiClient.get('/api/me');
  const result = MeResponseSchema.safeParse(response);

  if (!result.success) {
    throw new Error(
      `Unexpected /api/me response. Received ${typeof response}: ${previewResponse(response)}`,
    );
  }

  return result.data;
}

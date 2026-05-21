import {
  AdminClientDetailResponseSchema,
  AdminClientListResponseSchema,
  AdminUpdateClientStatusResponseSchema,
  ClientStatusSchema,
  type AdminClientDetailResponse,
  type AdminClientListResponse,
  type AdminUpdateClientStatusResponse,
  type ClientStatus,
} from '@apopto/shared';
import type { ApiClient } from './client';

export const adminClientScopes = ['admin:clients'] as const;

type AdminClientListOptions = {
  status?: ClientStatus;
};

function adminClientPath(clientId: string) {
  return `/api/admin/clients/${encodeURIComponent(clientId)}`;
}

export function parseClientStatus(value: string | null): ClientStatus | undefined {
  const parsed = ClientStatusSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

export async function listAdminClients(
  apiClient: ApiClient,
  { status }: AdminClientListOptions = {},
): Promise<AdminClientListResponse> {
  const searchParams = new URLSearchParams();

  if (status) {
    searchParams.set('status', status);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return AdminClientListResponseSchema.parse(
    await apiClient.get(`/api/admin/clients${suffix}`),
  );
}

export async function getAdminClientDetail(
  apiClient: ApiClient,
  clientId: string,
): Promise<AdminClientDetailResponse> {
  return AdminClientDetailResponseSchema.parse(
    await apiClient.get(adminClientPath(clientId)),
  );
}

export async function updateAdminClientStatus(
  apiClient: ApiClient,
  clientId: string,
  status: ClientStatus,
): Promise<AdminUpdateClientStatusResponse> {
  return AdminUpdateClientStatusResponseSchema.parse(
    await apiClient.patch(`${adminClientPath(clientId)}/status`, { status }),
  );
}

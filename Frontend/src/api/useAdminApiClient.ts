import { adminClientScopes } from './admin';
import { useApiClient } from './useApiClient';

export function useAdminApiClient() {
  return useApiClient({ scopes: adminClientScopes });
}

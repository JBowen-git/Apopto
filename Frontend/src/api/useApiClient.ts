import { useMemo } from 'react';
import { useApoptoAuth } from '../auth.jsx';
import { createApiClient } from './client';

type AuthContextWithToken = {
  getAccessToken?: () => Promise<string | undefined>;
};

export function useApiClient() {
  const { getAccessToken } = useApoptoAuth() as AuthContextWithToken;

  return useMemo(() => createApiClient({
    getAccessToken,
  }), [getAccessToken]);
}

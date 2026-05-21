import { useMemo } from 'react';
import { useApoptoAuth } from '../auth.jsx';
import { createApiClient } from './client';

type AuthContextWithToken = {
  getAccessToken?: (extraScopes?: readonly string[]) => Promise<string | undefined>;
};

type UseApiClientOptions = {
  scopes?: readonly string[];
};

const emptyScopes: readonly string[] = [];

export function useApiClient({ scopes = [] }: UseApiClientOptions = {}) {
  const { getAccessToken } = useApoptoAuth() as AuthContextWithToken;
  const requestedScopes = scopes.length > 0 ? scopes : emptyScopes;
  const scopeKey = scopes.join(' ');

  return useMemo(() => createApiClient({
    getAccessToken: async () => getAccessToken?.(requestedScopes),
  }), [getAccessToken, requestedScopes, scopeKey]);
}

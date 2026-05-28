function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  return atob(padded);
}

function stringsFrom(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(/[\s,]+/)
      .map((entry) => entry.trim().replace(/^['"]/, '').replace(/['"]$/, ''))
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function scopesFromAccessToken(token?: string) {
  if (!token) {
    return new Set<string>();
  }

  const [, payload] = token.split('.');

  if (!payload) {
    return new Set<string>();
  }

  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;

    return new Set([
      ...stringsFrom(claims.scope),
      ...stringsFrom(claims.permissions),
    ]);
  } catch {
    return new Set<string>();
  }
}

export function resolvePostLoginReturnTo(returnTo: string, token?: string) {
  const scopes = scopesFromAccessToken(token);
  const hasAdminAccess = scopes.has('admin:clients');
  const hasClientAccess = scopes.has('read:me') || scopes.has('read:client');

  if (hasAdminAccess && !hasClientAccess && !returnTo.startsWith('/admin')) {
    return '/admin/clients';
  }

  return returnTo;
}

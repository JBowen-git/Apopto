import {
  internalAdminKey,
  type InternalAdminItem,
  type PortalTableItem,
} from '../dynamodb/index.js';
import { missingScopes, type Auth0Claims } from './claims.js';

export const adminScopes = [
  'admin:clients',
  'admin:messages',
  'admin:billing',
  'admin:files',
] as const;

export type AdminScope = (typeof adminScopes)[number];

export type AdminAuthorizationRepository = {
  getItem<TItem extends PortalTableItem = PortalTableItem>(
    key: { PK: string; SK: string },
    options?: { consistentRead?: boolean },
  ): Promise<TItem | null>;
};

export type RequireAdminInput = {
  claims: Auth0Claims;
  repository: AdminAuthorizationRepository;
  requiredScopes: readonly AdminScope[];
};

export type RequireAdminFailure = {
  ok: false;
  statusCode: 403;
  error: 'insufficient_scope' | 'admin_access_denied';
  message: string;
  details?: unknown;
};

export type RequireAdminResult =
  | {
    ok: true;
    admin: InternalAdminItem;
  }
  | RequireAdminFailure;

function isInternalAdminItem(item: PortalTableItem | null): item is InternalAdminItem {
  return item?.type === 'INTERNAL_ADMIN';
}

export async function requireAdmin({
  claims,
  repository,
  requiredScopes,
}: RequireAdminInput): Promise<RequireAdminResult> {
  const missing = missingScopes(claims, requiredScopes);

  if (missing.length > 0) {
    return {
      ok: false,
      statusCode: 403,
      error: 'insufficient_scope',
      message: 'The access token does not include the admin permissions required for this route.',
      details: {
        missingScopes: missing,
        requiredScopes,
      },
    };
  }

  const admin = await repository.getItem<InternalAdminItem>(
    internalAdminKey(claims.sub),
    { consistentRead: true },
  );

  if (!isInternalAdminItem(admin)) {
    return {
      ok: false,
      statusCode: 403,
      error: 'admin_access_denied',
      message: 'The authenticated user is not an active internal admin.',
      details: {
        reason: 'internal_admin_not_found',
      },
    };
  }

  if (admin.status !== 'active') {
    return {
      ok: false,
      statusCode: 403,
      error: 'admin_access_denied',
      message: 'The authenticated user is not an active internal admin.',
      details: {
        reason: 'internal_admin_inactive',
        status: admin.status,
      },
    };
  }

  return {
    ok: true,
    admin,
  };
}

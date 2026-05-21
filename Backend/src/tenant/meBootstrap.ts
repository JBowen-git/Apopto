import { MeResponseSchema, type MeResponse } from '@apopto/shared';

import type { Auth0Claims } from '../auth/index.js';
import {
  buildClientProfileItem,
  buildMembershipItem,
  buildUserProfileItem,
  type ClientProfileItem,
  type MembershipItem,
  type PortalTableItem,
  type TransactPutItem,
  type UserProfileItem,
} from '../dynamodb/index.js';
import { newId } from '../shared/ids.js';
import {
  resolveClientContext,
  type ResolvedClientContext,
  type TenantResolverRepository,
} from './resolver.js';

export type MeBootstrapRepository = TenantResolverRepository & {
  transactPutItems<TItem extends PortalTableItem>(
    items: TransactPutItem<TItem>[],
  ): Promise<void>;
};

export type MeBootstrapFailure = {
  ok: false;
  statusCode: 401 | 403 | 409 | 422 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type MeBootstrapSuccess = {
  ok: true;
  response: MeResponse;
  created: boolean;
};

export type MeBootstrapResult = MeBootstrapSuccess | MeBootstrapFailure;

export type GetOrBootstrapMeInput = {
  claims: Auth0Claims;
  repository: MeBootstrapRepository;
  now?: () => string;
  newClientId?: () => string;
};

const conditionalCreateExpression = 'attribute_not_exists(PK) AND attribute_not_exists(SK)';

function isConditionalWriteConflict(error: unknown) {
  const errorName = (error as { name?: string }).name;

  return errorName === 'ConditionalCheckFailedException'
    || errorName === 'TransactionCanceledException';
}

function userSummary(user: UserProfileItem) {
  return {
    auth0Sub: user.auth0Sub,
    ...(user.email ? { email: user.email } : {}),
    ...(user.name ? { name: user.name } : {}),
  };
}

function toMeResponse(context: ResolvedClientContext): MeResponse {
  return MeResponseSchema.parse({
    user: userSummary(context.user),
    client: {
      clientId: context.client.clientId,
      businessName: context.client.businessName,
      status: context.client.status,
    },
    membership: {
      role: context.membership.role,
      status: context.membership.status,
    },
    featureFlags: context.featureFlags,
  });
}

function success(context: ResolvedClientContext, created: boolean): MeBootstrapSuccess {
  return {
    ok: true,
    response: toMeResponse(context),
    created,
  };
}

function conflictFailure(details: unknown): MeBootstrapFailure {
  return {
    ok: false,
    statusCode: 409,
    error: 'tenant_context_not_ready',
    message: 'The authenticated user could not be mapped to exactly one active client.',
    details,
  };
}

function bootstrapFailure(error: unknown): MeBootstrapFailure {
  return {
    ok: false,
    statusCode: 500,
    error: 'bootstrap_failed',
    message: 'The client portal context could not be created.',
    details: {
      errorName: (error as { name?: string }).name ?? 'UnknownError',
    },
  };
}

function conditionalPut<TItem extends PortalTableItem>(item: TItem): TransactPutItem<TItem> {
  return {
    item,
    conditionExpression: conditionalCreateExpression,
  };
}

function buildBootstrapItems({
  auth0Sub,
  claims,
  clientId,
  createdAt,
  user,
}: {
  auth0Sub: string;
  claims: Auth0Claims;
  clientId: string;
  createdAt: string;
  user?: UserProfileItem;
}) {
  const client = buildClientProfileItem({
    businessName: 'New Client',
    clientId,
    createdAt,
    primaryContactUserId: auth0Sub,
    status: 'lead',
    updatedAt: createdAt,
  });
  const membership = buildMembershipItem({
    auth0Sub,
    clientId,
    createdAt,
    role: 'client_owner',
    status: 'active',
    updatedAt: createdAt,
  });
  const items: Array<UserProfileItem | ClientProfileItem | MembershipItem> = [
    client,
    membership,
  ];

  if (!user) {
    items.unshift(buildUserProfileItem({
      auth0Sub,
      createdAt,
      lastLoginAt: createdAt,
      ...(claims.email ? { email: claims.email } : {}),
      ...(claims.name ? { name: claims.name } : {}),
    }));
  }

  return items;
}

async function createBootstrapContext({
  claims,
  existingUser,
  newClientId,
  now,
  repository,
}: {
  claims: Auth0Claims;
  existingUser?: UserProfileItem;
  newClientId: () => string;
  now: () => string;
  repository: MeBootstrapRepository;
}): Promise<MeBootstrapResult | null> {
  try {
    await repository.transactPutItems(buildBootstrapItems({
      auth0Sub: claims.sub,
      claims,
      clientId: newClientId(),
      createdAt: now(),
      user: existingUser,
    }).map(conditionalPut));

    return null;
  } catch (error) {
    if (isConditionalWriteConflict(error)) {
      return null;
    }

    return bootstrapFailure(error);
  }
}

function resultFromUnresolvedContext(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): MeBootstrapFailure {
  if (result.ok) {
    throw new Error('Resolved context cannot be converted to a failure.');
  }

  if (result.reason === 'no_active_membership') {
    return {
      ok: false,
      statusCode: 403,
      error: 'no_active_membership',
      message: 'The authenticated user does not have an active client membership.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  if (result.reason === 'multiple_active_memberships') {
    return conflictFailure({
      reason: result.reason,
      memberships: result.memberships,
    });
  }

  if (result.reason === 'client_not_found') {
    return {
      ok: false,
      statusCode: 500,
      error: 'client_profile_missing',
      message: 'The active client membership points to a missing client profile.',
      details: {
        clientId: result.membership.clientId,
      },
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'tenant_resolution_failed',
    message: 'The authenticated user could not be resolved.',
    details: {
      reason: result.reason,
    },
  };
}

export async function getOrBootstrapMe({
  claims,
  repository,
  now = () => new Date().toISOString(),
  newClientId = () => newId('client'),
}: GetOrBootstrapMeInput): Promise<MeBootstrapResult> {
  const initialResult = await resolveClientContext({
    auth0Sub: claims.sub,
    repository,
  });

  if (initialResult.ok) {
    return success(initialResult.context, false);
  }

  if (initialResult.reason === 'user_not_found') {
    const writeResult = await createBootstrapContext({
      claims,
      newClientId,
      now,
      repository,
    });

    if (writeResult) {
      return writeResult;
    }
  } else if (
    initialResult.reason === 'no_active_membership'
    && initialResult.memberships.length === 0
  ) {
    const writeResult = await createBootstrapContext({
      claims,
      existingUser: initialResult.user,
      newClientId,
      now,
      repository,
    });

    if (writeResult) {
      return writeResult;
    }
  } else {
    return resultFromUnresolvedContext(initialResult);
  }

  const resolvedAfterBootstrap = await resolveClientContext({
    auth0Sub: claims.sub,
    repository,
  });

  if (resolvedAfterBootstrap.ok) {
    return success(resolvedAfterBootstrap.context, true);
  }

  return resultFromUnresolvedContext(resolvedAfterBootstrap);
}

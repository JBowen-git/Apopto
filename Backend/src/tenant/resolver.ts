import type { FeatureFlags } from '@apopto/shared';

import type {
  ClientProfileItem,
  MembershipItem,
  PortalTableItem,
  UserProfileItem,
} from '../dynamodb/index.js';
import {
  clientProfileKey,
  pk,
  userProfileKey,
} from '../dynamodb/index.js';
import { featureFlagsForClientStatus } from './featureFlags.js';

export type TenantResolverRepository = {
  getItem<TItem extends PortalTableItem = PortalTableItem>(
    key: { PK: string; SK: string },
    options?: { consistentRead?: boolean },
  ): Promise<TItem | null>;
  queryByIndex<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    },
  ): Promise<TItem[]>;
};

export type ResolvedClientContext = {
  user: UserProfileItem;
  membership: MembershipItem;
  client: ClientProfileItem;
  featureFlags: FeatureFlags;
};

export type MembershipSelectionOption = {
  clientId: string;
  role: MembershipItem['role'];
  status: MembershipItem['status'];
};

export type TenantResolverFailureReason =
  | 'user_not_found'
  | 'no_active_membership'
  | 'multiple_active_memberships'
  | 'client_not_found';

export type ResolveClientContextResult =
  | {
    ok: true;
    context: ResolvedClientContext;
  }
  | {
    ok: false;
    reason: 'user_not_found';
  }
  | {
    ok: false;
    reason: 'no_active_membership';
    user: UserProfileItem;
    memberships: MembershipSelectionOption[];
  }
  | {
    ok: false;
    reason: 'multiple_active_memberships';
    user: UserProfileItem;
    memberships: MembershipSelectionOption[];
  }
  | {
    ok: false;
    reason: 'client_not_found';
    user: UserProfileItem;
    membership: MembershipItem;
  };

export type ResolveClientContextInput = {
  auth0Sub: string;
  repository: TenantResolverRepository;
};

function isUserProfileItem(item: PortalTableItem | null): item is UserProfileItem {
  return item?.type === 'USER';
}

function isMembershipItem(item: PortalTableItem): item is MembershipItem {
  return item.type === 'MEMBERSHIP';
}

function isClientProfileItem(item: PortalTableItem | null): item is ClientProfileItem {
  return item?.type === 'CLIENT';
}

function membershipSelectionOption(membership: MembershipItem): MembershipSelectionOption {
  return {
    clientId: membership.clientId,
    role: membership.role,
    status: membership.status,
  };
}

function sortMembershipsForStableSelection(memberships: MembershipItem[]) {
  return [...memberships].sort((left, right) => (
    left.clientId.localeCompare(right.clientId)
  ));
}

export async function resolveClientContext({
  auth0Sub,
  repository,
}: ResolveClientContextInput): Promise<ResolveClientContextResult> {
  const user = await repository.getItem<UserProfileItem>(userProfileKey(auth0Sub), {
    consistentRead: true,
  });

  if (!isUserProfileItem(user)) {
    return {
      ok: false,
      reason: 'user_not_found',
    };
  }

  const memberships = await repository.queryByIndex<MembershipItem>({
    indexName: 'GSI1',
    pk: pk.user(auth0Sub),
    skBeginsWith: 'CLIENT#',
  });
  const userMemberships = sortMembershipsForStableSelection(
    memberships.filter((membership) => (
      isMembershipItem(membership)
      && membership.auth0Sub === auth0Sub
    )),
  );
  const activeMemberships = userMemberships.filter((membership) => membership.status === 'active');

  if (activeMemberships.length === 0) {
    return {
      ok: false,
      reason: 'no_active_membership',
      user,
      memberships: userMemberships.map(membershipSelectionOption),
    };
  }

  if (activeMemberships.length > 1) {
    return {
      ok: false,
      reason: 'multiple_active_memberships',
      user,
      memberships: activeMemberships.map(membershipSelectionOption),
    };
  }

  const membership = activeMemberships[0];
  const client = await repository.getItem<ClientProfileItem>(
    clientProfileKey(membership.clientId),
    { consistentRead: true },
  );

  if (!isClientProfileItem(client)) {
    return {
      ok: false,
      reason: 'client_not_found',
      user,
      membership,
    };
  }

  return {
    ok: true,
    context: {
      user,
      membership,
      client,
      featureFlags: featureFlagsForClientStatus(client.status),
    },
  };
}

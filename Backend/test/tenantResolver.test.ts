import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildMembershipItem,
  buildUserProfileItem,
  clientProfileKey,
  resolveClientContext,
  userProfileKey,
  type ClientProfileItem,
  type MembershipItem,
  type PortalTableItem,
  type TenantResolverRepository,
  type UserProfileItem,
} from '../src/index.js';

const createdAt = '2026-05-21T10:15:30.000Z';
const updatedAt = '2026-05-21T10:20:30.000Z';
const auth0Sub = 'auth0|abc';

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt,
    email: 'owner@example.com',
    lastLoginAt: updatedAt,
    name: 'Sam Rivera',
    ...overrides,
  });
}

function membershipItem(
  clientId: string,
  overrides: Partial<MembershipItem> = {},
) {
  return buildMembershipItem({
    auth0Sub,
    clientId,
    createdAt,
    role: 'client_owner',
    status: 'active',
    updatedAt,
    ...overrides,
  });
}

function clientItem(
  clientId: string,
  overrides: Partial<ClientProfileItem> = {},
) {
  return buildClientProfileItem({
    businessName: 'North Star Remodeling',
    clientId,
    createdAt,
    primaryContactUserId: auth0Sub,
    status: 'active',
    updatedAt,
    ...overrides,
  });
}

function fakeRepository({
  clients = [],
  memberships = [],
  user = userItem(),
}: {
  clients?: ClientProfileItem[];
  memberships?: MembershipItem[];
  user?: UserProfileItem | null;
} = {}) {
  const itemsByKey = new Map<string, PortalTableItem>();

  if (user) {
    itemsByKey.set(`${user.PK}|${user.SK}`, user);
  }

  for (const client of clients) {
    itemsByKey.set(`${client.PK}|${client.SK}`, client);
  }

  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(`${key.PK}|${key.SK}`) ?? null
    )),
    queryByIndex: vi.fn(async (options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
    }) => {
      if (options.indexName !== 'GSI1' || options.pk !== `USER#${auth0Sub}`) {
        return [];
      }

      return memberships.filter((membership) => (
        membership.GSI1PK === options.pk
        && (!options.skBeginsWith || membership.GSI1SK.startsWith(options.skBeginsWith))
      ));
    }),
  } satisfies TenantResolverRepository;

  return repository;
}

describe('tenant resolver', () => {
  it('resolves Auth0 subject to one active membership and its client profile', async () => {
    const membership = membershipItem('client_123');
    const client = clientItem('client_123');
    const repository = fakeRepository({
      clients: [client],
      memberships: [membership],
    });

    const result = await resolveClientContext({ auth0Sub, repository });

    expect(result).toMatchObject({
      ok: true,
      context: {
        user: { auth0Sub },
        membership: { clientId: 'client_123', status: 'active' },
        client: { clientId: 'client_123', status: 'active' },
        featureFlags: {
          canUploadFiles: true,
          canViewBilling: true,
          canViewProjects: true,
        },
      },
    });
    expect(repository.getItem).toHaveBeenNthCalledWith(1, userProfileKey(auth0Sub), {
      consistentRead: true,
    });
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI1',
      pk: `USER#${auth0Sub}`,
      skBeginsWith: 'CLIENT#',
    });
    expect(repository.getItem).toHaveBeenNthCalledWith(2, clientProfileKey('client_123'), {
      consistentRead: true,
    });
  });

  it('returns user_not_found when the Auth0 subject has no user profile', async () => {
    const repository = fakeRepository({
      user: null,
    });

    await expect(resolveClientContext({ auth0Sub, repository })).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
    expect(repository.queryByIndex).not.toHaveBeenCalled();
  });

  it('returns no_active_membership for users with no memberships', async () => {
    const repository = fakeRepository({
      memberships: [],
    });

    await expect(resolveClientContext({ auth0Sub, repository })).resolves.toMatchObject({
      ok: false,
      reason: 'no_active_membership',
      memberships: [],
    });
  });

  it('returns no_active_membership while exposing inactive membership options', async () => {
    const repository = fakeRepository({
      memberships: [
        membershipItem('client_removed', { status: 'removed' }),
        membershipItem('client_invited', { status: 'invited' }),
      ],
    });

    await expect(resolveClientContext({ auth0Sub, repository })).resolves.toMatchObject({
      ok: false,
      reason: 'no_active_membership',
      memberships: [
        {
          clientId: 'client_invited',
          role: 'client_owner',
          status: 'invited',
        },
        {
          clientId: 'client_removed',
          role: 'client_owner',
          status: 'removed',
        },
      ],
    });
  });

  it('returns multiple_active_memberships instead of accepting a frontend clientId', async () => {
    const repository = fakeRepository({
      clients: [
        clientItem('client_a'),
        clientItem('client_b'),
      ],
      memberships: [
        membershipItem('client_b'),
        membershipItem('client_a'),
      ],
    });

    const result = await resolveClientContext({ auth0Sub, repository });

    expect(result).toEqual({
      ok: false,
      reason: 'multiple_active_memberships',
      user: userItem(),
      memberships: [
        {
          clientId: 'client_a',
          role: 'client_owner',
          status: 'active',
        },
        {
          clientId: 'client_b',
          role: 'client_owner',
          status: 'active',
        },
      ],
    });
    expect(repository.getItem).toHaveBeenCalledTimes(1);
  });

  it('returns client_not_found when the active membership points at a missing client', async () => {
    const membership = membershipItem('client_missing');
    const repository = fakeRepository({
      clients: [],
      memberships: [membership],
    });

    const result = await resolveClientContext({ auth0Sub, repository });

    expect(result).toMatchObject({
      ok: false,
      reason: 'client_not_found',
      membership: {
        clientId: 'client_missing',
      },
    });
    expect(repository.getItem).toHaveBeenNthCalledWith(2, clientProfileKey('client_missing'), {
      consistentRead: true,
    });
  });
});

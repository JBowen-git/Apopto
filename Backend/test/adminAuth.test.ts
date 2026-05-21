import { describe, expect, it, vi } from 'vitest';

import {
  buildInternalAdminItem,
  buildMembershipItem,
  internalAdminKey,
  requireAdmin,
  type Auth0Claims,
  type PortalTableItem,
} from '../src/index.js';

const auth0Sub = 'auth0|admin';
const createdAt = '2026-05-21T12:00:00.000Z';

function adminItem(overrides: Partial<ReturnType<typeof buildInternalAdminItem>> = {}) {
  return buildInternalAdminItem({
    auth0Sub,
    createdAt,
    createdBy: 'manual_seed',
    status: 'active',
    updatedAt: createdAt,
    ...overrides,
  });
}

function claims(scopes: string[] = ['admin:clients']): Auth0Claims {
  return {
    rawClaims: {
      sub: auth0Sub,
    },
    scopes,
    sub: auth0Sub,
  };
}

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function fakeRepository(items: PortalTableItem[] = []) {
  const itemsByKey = new Map(items.map((item) => [itemKey(item), item]));

  return {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
  };
}

describe('requireAdmin', () => {
  it('allows access only when the token has the required admin scope and an active admin item', async () => {
    const admin = adminItem();
    const repository = fakeRepository([admin]);

    const result = await requireAdmin({
      claims: claims(['admin:clients', 'read:me']),
      repository,
      requiredScopes: ['admin:clients'],
    });

    expect(result).toEqual({
      ok: true,
      admin,
    });
    expect(repository.getItem).toHaveBeenCalledWith(
      internalAdminKey(auth0Sub),
      { consistentRead: true },
    );
  });

  it('rejects missing Auth0 admin scopes before reading DynamoDB', async () => {
    const repository = fakeRepository([adminItem()]);

    const result = await requireAdmin({
      claims: claims(['read:me']),
      repository,
      requiredScopes: ['admin:clients'],
    });

    expect(result).toMatchObject({
      ok: false,
      error: 'insufficient_scope',
      details: {
        missingScopes: ['admin:clients'],
        requiredScopes: ['admin:clients'],
      },
    });
    expect(repository.getItem).not.toHaveBeenCalled();
  });

  it('rejects admin-scoped users without an internal admin item', async () => {
    const repository = fakeRepository();

    const result = await requireAdmin({
      claims: claims(['admin:clients']),
      repository,
      requiredScopes: ['admin:clients'],
    });

    expect(result).toMatchObject({
      ok: false,
      statusCode: 403,
      error: 'admin_access_denied',
      details: {
        reason: 'internal_admin_not_found',
      },
    });
  });

  it('rejects disabled internal admin items', async () => {
    const repository = fakeRepository([adminItem({ status: 'disabled' })]);

    const result = await requireAdmin({
      claims: claims(['admin:clients']),
      repository,
      requiredScopes: ['admin:clients'],
    });

    expect(result).toMatchObject({
      ok: false,
      statusCode: 403,
      error: 'admin_access_denied',
      details: {
        reason: 'internal_admin_inactive',
        status: 'disabled',
      },
    });
  });

  it('does not grant admin access from a reserved or fake client membership', async () => {
    const repository = fakeRepository([
      buildMembershipItem({
        auth0Sub,
        clientId: 'internal_admin',
        createdAt,
        role: 'client_owner',
        status: 'active',
        updatedAt: createdAt,
      }),
    ]);

    const result = await requireAdmin({
      claims: claims(['admin:clients']),
      repository,
      requiredScopes: ['admin:clients'],
    });

    expect(result).toMatchObject({
      ok: false,
      error: 'admin_access_denied',
      details: {
        reason: 'internal_admin_not_found',
      },
    });
  });
});

import { describe, expect, it } from 'vitest';

import {
  AuthClaimError,
  hasAllScopes,
  hasAnyScope,
  hasScope,
  missingScopes,
  parseAuth0Claims,
  tryParseAuth0Claims,
} from '../src/auth/index.js';

function eventWithJwt(claims: Record<string, unknown>, scopes?: string[]) {
  return {
    requestContext: {
      authorizer: {
        jwt: {
          claims,
          ...(scopes ? { scopes } : {}),
        },
      },
    },
  };
}

describe('Auth0 claim parsing', () => {
  it('parses Auth0 identity claims and normalizes scopes', () => {
    const parsed = parseAuth0Claims(eventWithJwt(
      {
        email: ' owner@example.com ',
        name: ' Jake Bowen ',
        permissions: ['admin:clients', ' read:me ', '', 42],
        scope: 'read:me write:intake',
        sub: ' auth0|abc ',
      },
      ['openid', 'profile', 'read:me'],
    ));

    expect(parsed).toEqual({
      sub: 'auth0|abc',
      email: 'owner@example.com',
      name: 'Jake Bowen',
      scopes: [
        'openid',
        'profile',
        'read:me',
        'write:intake',
        'admin:clients',
      ],
      rawClaims: {
        email: ' owner@example.com ',
        name: ' Jake Bowen ',
        permissions: ['admin:clients', ' read:me ', '', 42],
        scope: 'read:me write:intake',
        sub: ' auth0|abc ',
      },
    });
  });

  it('normalizes permissions when API Gateway provides array claims as strings', () => {
    expect(parseAuth0Claims(eventWithJwt({
      permissions: '["read:me","write:intake"]',
      sub: 'auth0|json-array',
    })).scopes).toEqual(['read:me', 'write:intake']);

    expect(parseAuth0Claims(eventWithJwt({
      permissions: '[read:me, read:client]',
      sub: 'auth0|bracket-list',
    })).scopes).toEqual(['read:me', 'read:client']);

    expect(parseAuth0Claims(eventWithJwt({
      permissions: 'read:me,write:intake read:client',
      sub: 'auth0|string-list',
    })).scopes).toEqual(['read:me', 'write:intake', 'read:client']);
  });

  it('checks individual, any, all, and missing scopes', () => {
    const claims = parseAuth0Claims(eventWithJwt({
      scope: 'read:me write:intake read:files',
      sub: 'auth0|abc',
    }));

    expect(hasScope(claims, 'read:me')).toBe(true);
    expect(hasScope(claims, 'admin:clients')).toBe(false);
    expect(hasAnyScope(claims, ['admin:clients', 'read:files'])).toBe(true);
    expect(hasAllScopes(claims, ['read:me', 'write:intake'])).toBe(true);
    expect(hasAllScopes(claims, ['read:me', 'admin:clients'])).toBe(false);
    expect(missingScopes(claims, ['read:me', 'admin:clients'])).toEqual(['admin:clients']);
  });

  it('throws typed errors for missing or invalid subject claims', () => {
    expect(() => parseAuth0Claims({})).toThrow(AuthClaimError);

    try {
      parseAuth0Claims(eventWithJwt({ scope: 'read:me' }));
      throw new Error('Expected missing sub claim to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthClaimError);
      expect((error as AuthClaimError).code).toBe('missing_sub_claim');
    }

    try {
      parseAuth0Claims(eventWithJwt({ sub: '   ' }));
      throw new Error('Expected invalid sub claim to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthClaimError);
      expect((error as AuthClaimError).code).toBe('invalid_sub_claim');
    }
  });

  it('offers a null-returning parser for authorization branches', () => {
    expect(tryParseAuth0Claims({})).toBeNull();
    expect(tryParseAuth0Claims(eventWithJwt({ sub: 'auth0|abc' }))).toMatchObject({
      sub: 'auth0|abc',
    });
  });
});

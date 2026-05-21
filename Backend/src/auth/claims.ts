import type { APIGatewayProxyEventV2 } from 'aws-lambda';

type JwtAuthorizerShape = {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: Record<string, unknown>;
        scopes?: string[];
      };
    };
  };
};

export type Auth0Claims = {
  sub: string;
  email?: string;
  name?: string;
  scopes: string[];
  rawClaims: Record<string, unknown>;
};

export type AuthClaimErrorCode =
  | 'missing_jwt_authorizer'
  | 'missing_sub_claim'
  | 'invalid_sub_claim';

export class AuthClaimError extends Error {
  readonly code: AuthClaimErrorCode;

  constructor(code: AuthClaimErrorCode, message: string) {
    super(message);
    this.name = 'AuthClaimError';
    this.code = code;
  }
}

function getJwtAuthorizer(event: unknown) {
  const shapedEvent = event as JwtAuthorizerShape;

  return shapedEvent.requestContext?.authorizer?.jwt;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeScopesFromClaim(scopeClaim: unknown) {
  if (typeof scopeClaim !== 'string') {
    return [];
  }

  return scopeClaim
    .split(' ')
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function uniqueScopes(scopes: string[]) {
  return [...new Set(scopes)];
}

export function parseAuth0Claims(event: APIGatewayProxyEventV2 | JwtAuthorizerShape): Auth0Claims {
  const jwt = getJwtAuthorizer(event);

  if (!jwt?.claims) {
    throw new AuthClaimError(
      'missing_jwt_authorizer',
      'Authenticated API Gateway request is missing JWT authorizer claims.',
    );
  }

  const sub = optionalString(jwt.claims.sub);

  if (jwt.claims.sub === undefined) {
    throw new AuthClaimError('missing_sub_claim', 'JWT claims are missing the Auth0 subject.');
  }

  if (!sub) {
    throw new AuthClaimError('invalid_sub_claim', 'JWT Auth0 subject claim must be a non-empty string.');
  }

  return {
    sub,
    email: optionalString(jwt.claims.email),
    name: optionalString(jwt.claims.name),
    scopes: uniqueScopes([
      ...normalizeStringArray(jwt.scopes),
      ...normalizeScopesFromClaim(jwt.claims.scope),
      ...normalizeStringArray(jwt.claims.permissions),
    ]),
    rawClaims: jwt.claims,
  };
}

export function tryParseAuth0Claims(
  event: APIGatewayProxyEventV2 | JwtAuthorizerShape,
): Auth0Claims | null {
  try {
    return parseAuth0Claims(event);
  } catch (error) {
    if (error instanceof AuthClaimError) {
      return null;
    }

    throw error;
  }
}

export function hasScope(claims: Pick<Auth0Claims, 'scopes'>, scope: string) {
  return claims.scopes.includes(scope);
}

export function hasAnyScope(claims: Pick<Auth0Claims, 'scopes'>, scopes: readonly string[]) {
  return scopes.some((scope) => hasScope(claims, scope));
}

export function hasAllScopes(claims: Pick<Auth0Claims, 'scopes'>, scopes: readonly string[]) {
  return scopes.every((scope) => hasScope(claims, scope));
}

export function missingScopes(claims: Pick<Auth0Claims, 'scopes'>, scopes: readonly string[]) {
  return scopes.filter((scope) => !hasScope(claims, scope));
}

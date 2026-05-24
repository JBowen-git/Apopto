import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { AuthClaimError, missingScopes, parseAuth0Claims, type Auth0Claims } from '../auth/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { identityIntakeRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  jsonResponse,
  requestMetadata,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
  type ResponseRequestContext,
} from '../shared/response.js';
import {
  getDashboard,
  getOrBootstrapMe,
  getCurrentIntake,
  updateClientProfile,
  updateCurrentIntake,
  type DashboardApiFailure,
  type DashboardRepository,
  type IntakeRepository,
  type IntakeApiFailure,
  type MeBootstrapRepository,
} from '../tenant/index.js';

type IdentityIntakeRepository = MeBootstrapRepository & IntakeRepository & DashboardRepository;

export type IdentityIntakeHandlerDependencies = {
  repository?: IdentityIntakeRepository;
  now?: () => string;
  newAuditId?: () => string;
  newClientId?: () => string;
};

const notImplementedHandler = createNotImplementedHandler('identityIntake', identityIntakeRoutes);
const routeScopes: Record<string, string[]> = {
  'GET /api/me': ['read:me'],
  'GET /api/dashboard': ['read:client'],
  'GET /api/intake': ['read:client'],
  'PUT /api/intake': ['write:intake'],
  'PATCH /api/client/profile': ['write:client'],
};

function getRouteKey(event: APIGatewayProxyEventV2) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  return `${event.requestContext.http.method} ${event.rawPath}`;
}

function defaultRepository(): IdentityIntakeRepository {
  return createPortalRepository({
    tableName: getClientPortalTableName(),
    client: createDynamoDocumentClient(),
  });
}

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  return JSON.parse(body) as unknown;
}

function failureResponse(
  result: IntakeApiFailure | DashboardApiFailure,
  responseContext: ResponseRequestContext,
) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    responseContext,
  );
}

function scopeFailureResponse(
  routeKey: string,
  claims: Auth0Claims,
  responseContext: ResponseRequestContext,
) {
  const requiredScopes = routeScopes[routeKey] ?? [];
  const missing = missingScopes(claims, requiredScopes);

  if (missing.length === 0) {
    return null;
  }

  return errorResponse(
    403,
    'insufficient_scope',
    'The access token does not include the permissions required for this route.',
    {
      missingScopes: missing,
      requiredScopes,
    },
    responseContext,
  );
}

export function createIdentityIntakeHandler(
  dependencies: IdentityIntakeHandlerDependencies = {},
) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const routeKey = getRouteKey(event);
    const responseContext = { ...requestMetadata(event, context), routeKey };
    const repository = dependencies.repository ?? defaultRepository();

    if (![
      'GET /api/me',
      'GET /api/dashboard',
      'GET /api/intake',
      'PUT /api/intake',
      'PATCH /api/client/profile',
    ].includes(routeKey)) {
      return notImplementedHandler(event, context);
    }

    try {
      const claims = parseAuth0Claims(event);
      const routeScopeFailure = scopeFailureResponse(routeKey, claims, responseContext);

      if (routeScopeFailure) {
        return routeScopeFailure;
      }

      if (routeKey === 'GET /api/dashboard') {
        const result = await getDashboard({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, responseContext);
        }

        return jsonResponse(200, result.response, responseContext);
      }

      if (routeKey === 'GET /api/intake') {
        const result = await getCurrentIntake({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, responseContext);
        }

        return jsonResponse(200, result.response, responseContext);
      }

      if (routeKey === 'PUT /api/intake') {
        const result = await updateCurrentIntake({
          auth0Sub: claims.sub,
          body: parseJsonBody(event),
          newAuditId: dependencies.newAuditId,
          now: dependencies.now,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, responseContext);
        }

        return jsonResponse(200, result.response, responseContext);
      }

      if (routeKey === 'PATCH /api/client/profile') {
        const result = await updateClientProfile({
          auth0Sub: claims.sub,
          body: parseJsonBody(event),
          newAuditId: dependencies.newAuditId,
          now: dependencies.now,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, responseContext);
        }

        return jsonResponse(200, result.response, responseContext);
      }

      const result = await getOrBootstrapMe({
        claims,
        repository,
        now: dependencies.now,
        newClientId: dependencies.newClientId,
      });

      if (!result.ok) {
        return errorResponse(
          result.statusCode,
          result.error,
          result.message,
          result.details,
          responseContext,
        );
      }

      return jsonResponse(200, result.response, responseContext);
    } catch (error) {
      if (error instanceof AuthClaimError) {
        return unauthorizedResponse(responseContext, error.message);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(
          400,
          'invalid_json',
          'The request body must be valid JSON.',
          undefined,
          responseContext,
        );
      }

      return errorResponse(
        500,
        'internal_error',
        'The identity/intake request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        responseContext,
      );
    }
  };
}

export const handler = createIdentityIntakeHandler();

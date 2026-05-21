import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { AuthClaimError, parseAuth0Claims } from '../auth/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { identityIntakeRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
} from '../shared/response.js';
import {
  getOrBootstrapMe,
  getCurrentIntake,
  updateClientProfile,
  updateCurrentIntake,
  type IntakeRepository,
  type IntakeApiFailure,
  type MeBootstrapRepository,
} from '../tenant/index.js';

type IdentityIntakeRepository = MeBootstrapRepository & IntakeRepository;

export type IdentityIntakeHandlerDependencies = {
  repository?: IdentityIntakeRepository;
  now?: () => string;
  newAuditId?: () => string;
  newClientId?: () => string;
};

const notImplementedHandler = createNotImplementedHandler('identityIntake', identityIntakeRoutes);

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

function failureResponse(result: IntakeApiFailure, requestId: string | undefined) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    { requestId },
  );
}

export function createIdentityIntakeHandler(
  dependencies: IdentityIntakeHandlerDependencies = {},
) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const requestId = getRequestId(event, context);
    const routeKey = getRouteKey(event);
    const repository = dependencies.repository ?? defaultRepository();

    if (![
      'GET /api/me',
      'GET /api/intake',
      'PUT /api/intake',
      'PATCH /api/client/profile',
    ].includes(routeKey)) {
      return notImplementedHandler(event, context);
    }

    try {
      const claims = parseAuth0Claims(event);

      if (routeKey === 'GET /api/intake') {
        const result = await getCurrentIntake({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
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
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
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
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
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
          { requestId },
        );
      }

      return jsonResponse(200, result.response, { requestId });
    } catch (error) {
      if (error instanceof AuthClaimError) {
        return unauthorizedResponse(requestId, error.message);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(
          400,
          'invalid_json',
          'The request body must be valid JSON.',
          undefined,
          { requestId },
        );
      }

      return errorResponse(
        500,
        'internal_error',
        'The identity/intake request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        { requestId },
      );
    }
  };
}

export const handler = createIdentityIntakeHandler();

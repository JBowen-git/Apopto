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
  type MeBootstrapRepository,
} from '../tenant/index.js';

export type IdentityIntakeHandlerDependencies = {
  repository?: MeBootstrapRepository;
  now?: () => string;
  newClientId?: () => string;
};

const notImplementedHandler = createNotImplementedHandler('identityIntake', identityIntakeRoutes);

function getRouteKey(event: APIGatewayProxyEventV2) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  return `${event.requestContext.http.method} ${event.rawPath}`;
}

function defaultRepository(): MeBootstrapRepository {
  return createPortalRepository({
    tableName: getClientPortalTableName(),
    client: createDynamoDocumentClient(),
  });
}

export function createIdentityIntakeHandler(
  dependencies: IdentityIntakeHandlerDependencies = {},
) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const requestId = getRequestId(event, context);

    if (getRouteKey(event) !== 'GET /api/me') {
      return notImplementedHandler(event, context);
    }

    try {
      const claims = parseAuth0Claims(event);
      const result = await getOrBootstrapMe({
        claims,
        repository: dependencies.repository ?? defaultRepository(),
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

      return errorResponse(
        500,
        'internal_error',
        'The /api/me request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        { requestId },
      );
    }
  };
}

export const handler = createIdentityIntakeHandler();

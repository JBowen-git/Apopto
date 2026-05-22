import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { AuthClaimError, missingScopes, parseAuth0Claims, type Auth0Claims } from '../auth/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import {
  createMessage,
  createThread,
  listThreadMessages,
  listThreads,
  type MessagesApiFailure,
  type MessagesRepository,
} from '../messages/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { messageRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
} from '../shared/response.js';

export type MessagesHandlerDependencies = {
  newAuditId?: () => string;
  newMessageId?: () => string;
  newThreadId?: () => string;
  now?: () => string;
  repository?: MessagesRepository;
};

const notImplementedHandler = createNotImplementedHandler('messages', messageRoutes);

const routeScopes: Record<string, string[]> = {
  'GET /api/threads': ['read:messages'],
  'POST /api/threads': ['write:messages'],
  'GET /api/threads/{threadId}/messages': ['read:messages'],
  'POST /api/threads/{threadId}/messages': ['write:messages'],
};

function getRouteKey(event: APIGatewayProxyEventV2) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  return `${event.requestContext.http.method} ${event.rawPath}`;
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

function defaultRepository(): MessagesRepository {
  return createPortalRepository({
    tableName: getClientPortalTableName(),
    client: createDynamoDocumentClient(),
  });
}

function scopeFailureResponse(
  routeKey: string,
  claims: Auth0Claims,
  requestId: string | undefined,
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
    { requestId },
  );
}

function failureResponse(result: MessagesApiFailure, requestId: string | undefined) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    { requestId },
  );
}

function getThreadId(event: APIGatewayProxyEventV2) {
  const threadId = event.pathParameters?.threadId?.trim();

  if (threadId) {
    return threadId;
  }

  const match = event.rawPath.match(/^\/api\/threads\/([^/]+)\/messages$/);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function createMessagesHandler(dependencies: MessagesHandlerDependencies = {}) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const requestId = getRequestId(event, context);
    const routeKey = getRouteKey(event);

    if (!routeScopes[routeKey]) {
      return notImplementedHandler(event, context);
    }

    try {
      const repository = dependencies.repository ?? defaultRepository();
      const claims = parseAuth0Claims(event);
      const routeScopeFailure = scopeFailureResponse(routeKey, claims, requestId);

      if (routeScopeFailure) {
        return routeScopeFailure;
      }

      if (routeKey === 'GET /api/threads') {
        const result = await listThreads({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      if (routeKey === 'POST /api/threads') {
        const result = await createThread({
          auth0Sub: claims.sub,
          body: parseJsonBody(event),
          newAuditId: dependencies.newAuditId,
          newMessageId: dependencies.newMessageId,
          newThreadId: dependencies.newThreadId,
          now: dependencies.now,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(201, result.response, { requestId });
      }

      const threadId = getThreadId(event);

      if (!threadId) {
        return errorResponse(
          400,
          'thread_id_required',
          'A threadId path parameter is required.',
          undefined,
          { requestId },
        );
      }

      if (routeKey === 'GET /api/threads/{threadId}/messages') {
        const result = await listThreadMessages({
          auth0Sub: claims.sub,
          repository,
          threadId,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      const result = await createMessage({
        auth0Sub: claims.sub,
        body: parseJsonBody(event),
        newAuditId: dependencies.newAuditId,
        newMessageId: dependencies.newMessageId,
        now: dependencies.now,
        repository,
        threadId,
      });

      if (!result.ok) {
        return failureResponse(result, requestId);
      }

      return jsonResponse(201, result.response, { requestId });
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
        'The messages request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        { requestId },
      );
    }
  };
}

export const handler = createMessagesHandler();

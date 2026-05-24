import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import {
  createAdminClientProject,
  getAdminClientDetail,
  listAdminClients,
  updateAdminClientStatus,
  type AdminClientDetailFailure,
  type AdminClientDetailRepository,
  type AdminClientIndexRepository,
  type AdminClientListFailure,
} from '../admin/index.js';
import {
  AuthClaimError,
  parseAuth0Claims,
  requireAdmin,
  type AdminAuthorizationRepository,
  type AdminScope,
} from '../auth/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { adminRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  jsonResponse,
  requestMetadata,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
  type ResponseRequestContext,
} from '../shared/response.js';

type AdminRepository =
  & AdminAuthorizationRepository
  & AdminClientIndexRepository
  & AdminClientDetailRepository;

export type AdminHandlerDependencies = {
  repository?: AdminRepository;
  newAuditId?: () => string;
  newProjectId?: () => string;
  now?: () => string;
};

const notImplementedHandler = createNotImplementedHandler('admin', adminRoutes);

const routeScopes: Record<string, AdminScope[]> = {
  'GET /api/admin/clients': ['admin:clients'],
  'GET /api/admin/clients/{clientId}': ['admin:clients'],
  'PATCH /api/admin/clients/{clientId}/status': ['admin:clients'],
  'POST /api/admin/clients/{clientId}/projects': ['admin:clients'],
};

function getRouteKey(event: APIGatewayProxyEventV2) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  return `${event.requestContext.http.method} ${event.rawPath}`;
}

function defaultRepository(): AdminRepository {
  return createPortalRepository({
    tableName: getClientPortalTableName(),
    client: createDynamoDocumentClient(),
  }) as AdminRepository;
}

function adminFailureResponse(
  result: AdminClientListFailure | AdminClientDetailFailure,
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

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  return JSON.parse(body) as unknown;
}

function getClientId(event: APIGatewayProxyEventV2) {
  const clientId = event.pathParameters?.clientId?.trim();

  if (clientId) {
    return clientId;
  }

  const match = event.rawPath.match(/^\/api\/admin\/clients\/([^/]+)/);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function createAdminHandler(dependencies: AdminHandlerDependencies = {}) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const routeKey = getRouteKey(event);
    const responseContext = { ...requestMetadata(event, context), routeKey };
    const requiredScopes = routeScopes[routeKey];

    if (!requiredScopes) {
      return notImplementedHandler(event, context);
    }

    try {
      const repository = dependencies.repository ?? defaultRepository();
      const claims = parseAuth0Claims(event);
      const adminResult = await requireAdmin({
        claims,
        repository,
        requiredScopes,
      });

      if (!adminResult.ok) {
        return errorResponse(
          adminResult.statusCode,
          adminResult.error,
          adminResult.message,
          adminResult.details,
          responseContext,
        );
      }

      if (routeKey === 'GET /api/admin/clients') {
        const listResult = await listAdminClients({
          query: event.queryStringParameters ?? {},
          repository,
        });

        if (!listResult.ok) {
          return adminFailureResponse(listResult, responseContext);
        }

        return jsonResponse(200, listResult.response, responseContext);
      }

      if (routeKey === 'GET /api/admin/clients/{clientId}') {
        const clientId = getClientId(event);

        if (!clientId) {
          return errorResponse(
            400,
            'client_id_required',
            'A clientId path parameter is required.',
            undefined,
            responseContext,
          );
        }

        const detailResult = await getAdminClientDetail({
          clientId,
          repository,
        });

        if (!detailResult.ok) {
          return adminFailureResponse(detailResult, responseContext);
        }

        return jsonResponse(200, detailResult.response, responseContext);
      }

      if (routeKey === 'PATCH /api/admin/clients/{clientId}/status') {
        const clientId = getClientId(event);

        if (!clientId) {
          return errorResponse(
            400,
            'client_id_required',
            'A clientId path parameter is required.',
            undefined,
            responseContext,
          );
        }

        const updateResult = await updateAdminClientStatus({
          actorUserId: claims.sub,
          body: parseJsonBody(event),
          clientId,
          newAuditId: dependencies.newAuditId,
          now: dependencies.now,
          repository,
        });

        if (!updateResult.ok) {
          return adminFailureResponse(updateResult, responseContext);
        }

        return jsonResponse(200, updateResult.response, responseContext);
      }

      if (routeKey === 'POST /api/admin/clients/{clientId}/projects') {
        const clientId = getClientId(event);

        if (!clientId) {
          return errorResponse(
            400,
            'client_id_required',
            'A clientId path parameter is required.',
            undefined,
            responseContext,
          );
        }

        const projectResult = await createAdminClientProject({
          actorUserId: claims.sub,
          body: parseJsonBody(event),
          clientId,
          newAuditId: dependencies.newAuditId,
          newProjectId: dependencies.newProjectId,
          now: dependencies.now,
          repository,
        });

        if (!projectResult.ok) {
          return adminFailureResponse(projectResult, responseContext);
        }

        return jsonResponse(201, projectResult.response, responseContext);
      }

      return notImplementedHandler(event, context);
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
        'The admin request could not be authorized.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        responseContext,
      );
    }
  };
}

export const handler = createAdminHandler();

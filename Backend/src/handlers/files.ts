import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { AuthClaimError, missingScopes, parseAuth0Claims, type Auth0Claims } from '../auth/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import {
  completeUpload,
  createDownloadUrl,
  createPresignedUpload,
  listFiles,
  resolveMaxUploadBytes,
  softDeleteFile,
  type FilesApiFailure,
  type FilesRepository,
  type PresignGetObject,
  type PresignPutObject,
  type S3HeadObjectClient,
} from '../files/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { fileRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
} from '../shared/response.js';

export type FilesHandlerEnvironment = {
  CLIENT_PORTAL_TABLE?: string;
  MAX_UPLOAD_BYTES?: string;
  UPLOAD_BUCKET?: string;
};

export type FilesHandlerDependencies = {
  environment?: FilesHandlerEnvironment;
  maxUploadBytes?: number;
  newAuditId?: () => string;
  newFileId?: () => string;
  now?: () => string;
  presignGetObject?: PresignGetObject;
  presignPutObject?: PresignPutObject;
  presignedDownloadExpiresSeconds?: number;
  presignedUploadExpiresSeconds?: number;
  repository?: FilesRepository;
  s3Client?: S3HeadObjectClient;
};

const notImplementedHandler = createNotImplementedHandler('files', fileRoutes);

const routeScopes: Record<string, string[]> = {
  'GET /api/files': ['read:files'],
  'GET /api/files/{fileId}/download-url': ['read:files'],
  'DELETE /api/files/{fileId}': ['write:files'],
  'POST /api/files/presign-upload': ['write:files'],
  'POST /api/files/{fileId}/complete': ['write:files'],
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

function defaultRepository(tableName: string): FilesRepository {
  return createPortalRepository({
    tableName,
    client: createDynamoDocumentClient(),
  });
}

function getRequiredEnvironment(environment: FilesHandlerEnvironment) {
  const tableName = environment.CLIENT_PORTAL_TABLE?.trim();
  const uploadBucket = environment.UPLOAD_BUCKET?.trim();

  if (!tableName) {
    throw new Error('CLIENT_PORTAL_TABLE is required for the files handler.');
  }

  if (!uploadBucket) {
    throw new Error('UPLOAD_BUCKET is required for the files handler.');
  }

  return {
    tableName,
    uploadBucket,
  };
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

function failureResponse(result: FilesApiFailure, requestId: string | undefined) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    { requestId },
  );
}

function getFileId(event: APIGatewayProxyEventV2) {
  const fileId = event.pathParameters?.fileId?.trim();

  if (fileId) {
    return fileId;
  }

  const match = event.rawPath.match(/^\/api\/files\/([^/]+)(?:\/(?:complete|download-url))?$/);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function createFilesHandler(dependencies: FilesHandlerDependencies = {}) {
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
      const environment = dependencies.environment ?? process.env;
      const { tableName, uploadBucket } = getRequiredEnvironment(environment);
      const repository = dependencies.repository ?? defaultRepository(tableName);
      const claims = parseAuth0Claims(event);
      const routeScopeFailure = scopeFailureResponse(routeKey, claims, requestId);

      if (routeScopeFailure) {
        return routeScopeFailure;
      }

      const maxUploadBytes = dependencies.maxUploadBytes
        ?? resolveMaxUploadBytes(environment);

      if (routeKey === 'GET /api/files') {
        const result = await listFiles({
          auth0Sub: claims.sub,
          query: event.queryStringParameters ?? {},
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      if (routeKey === 'POST /api/files/presign-upload') {
        const result = await createPresignedUpload({
          auth0Sub: claims.sub,
          body: parseJsonBody(event),
          bucket: uploadBucket,
          maxUploadBytes,
          newFileId: dependencies.newFileId,
          now: dependencies.now,
          presignPutObject: dependencies.presignPutObject,
          presignedUploadExpiresSeconds: dependencies.presignedUploadExpiresSeconds,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(201, result.response, { requestId });
      }

      const fileId = getFileId(event);

      if (!fileId) {
        return errorResponse(
          400,
          'file_id_required',
          'A fileId path parameter is required.',
          undefined,
          { requestId },
        );
      }

      if (routeKey === 'GET /api/files/{fileId}/download-url') {
        const result = await createDownloadUrl({
          auth0Sub: claims.sub,
          bucket: uploadBucket,
          fileId,
          now: dependencies.now,
          presignGetObject: dependencies.presignGetObject,
          presignedDownloadExpiresSeconds: dependencies.presignedDownloadExpiresSeconds,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      if (routeKey === 'DELETE /api/files/{fileId}') {
        const result = await softDeleteFile({
          auth0Sub: claims.sub,
          bucket: uploadBucket,
          fileId,
          newAuditId: dependencies.newAuditId,
          now: dependencies.now,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      const result = await completeUpload({
        auth0Sub: claims.sub,
        body: { fileId },
        bucket: uploadBucket,
        maxUploadBytes,
        newAuditId: dependencies.newAuditId,
        now: dependencies.now,
        repository,
        s3Client: dependencies.s3Client,
      });

      if (!result.ok) {
        return failureResponse(result, requestId);
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
        'The files request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        { requestId },
      );
    }
  };
}

export const handler = createFilesHandler();

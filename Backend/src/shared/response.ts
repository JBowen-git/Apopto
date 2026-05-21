import type { ApiErrorResponse } from '@apopto/shared';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

export type ApiGatewayLikeResponse = APIGatewayProxyResultV2;

export type ResponseRequestContext = {
  requestId?: string;
};

export type JsonResponseOptions = {
  headers?: Record<string, string>;
  requestId?: string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function isJsonResponseOptions(
  value: JsonResponseOptions | Record<string, string>,
): value is JsonResponseOptions {
  return 'headers' in value || 'requestId' in value;
}

function responseOptions(
  optionsOrHeaders: JsonResponseOptions | Record<string, string> = {},
): JsonResponseOptions {
  if (isJsonResponseOptions(optionsOrHeaders)) {
    return optionsOrHeaders;
  }

  return {
    headers: optionsOrHeaders,
  };
}

function bodyWithRequestId(body: unknown, requestId: string | undefined) {
  if (!requestId) {
    return body;
  }

  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return {
      ...body,
      requestId,
    };
  }

  return {
    data: body,
    requestId,
  };
}

export function getRequestId(
  event?: Pick<APIGatewayProxyEventV2, 'requestContext'>,
  context?: Pick<Context, 'awsRequestId'>,
) {
  return event?.requestContext?.requestId ?? context?.awsRequestId;
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  optionsOrHeaders: JsonResponseOptions | Record<string, string> = {},
): ApiGatewayLikeResponse {
  const options = responseOptions(optionsOrHeaders);

  return {
    statusCode,
    headers: {
      ...jsonHeaders,
      ...options.headers,
    },
    body: JSON.stringify(bodyWithRequestId(body, options.requestId)),
  };
}

export function errorResponse(
  statusCode: number,
  error: string,
  message?: string,
  details?: unknown,
  options: JsonResponseOptions = {},
): ApiGatewayLikeResponse {
  const body: ApiErrorResponse = {
    error,
    ...(message ? { message } : {}),
    ...(details === undefined ? {} : { details }),
  };

  return jsonResponse(statusCode, body, options);
}

export function unauthorizedResponse(
  requestId?: string,
  message = 'Authentication is required.',
): ApiGatewayLikeResponse {
  return errorResponse(401, 'unauthorized', message, undefined, { requestId });
}

export function forbiddenResponse(
  requestId?: string,
  message = 'You do not have permission to access this resource.',
  details?: unknown,
): ApiGatewayLikeResponse {
  return errorResponse(403, 'forbidden', message, details, { requestId });
}

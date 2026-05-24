import type { ApiErrorResponse } from '@apopto/shared';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

import { logError, logWarn } from './logger.js';

export type ApiGatewayLikeResponse = APIGatewayProxyResultV2;

export type ResponseRequestContext = {
  correlationId?: string;
  method?: string;
  path?: string;
  requestId?: string;
  routeKey?: string;
};

export type JsonResponseOptions = {
  headers?: Record<string, string>;
} & ResponseRequestContext;

type RequestContextInput = ResponseRequestContext | string | undefined;

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  pragma: 'no-cache',
  expires: '0',
};

function isJsonResponseOptions(
  value: JsonResponseOptions | Record<string, string>,
): value is JsonResponseOptions {
  return (
    'headers' in value
    || 'requestId' in value
    || 'correlationId' in value
    || 'method' in value
    || 'path' in value
    || 'routeKey' in value
  );
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

function responseContextFrom(input: RequestContextInput): ResponseRequestContext {
  if (!input) {
    return {};
  }

  if (typeof input === 'string') {
    return {
      requestId: input,
    };
  }

  return input;
}

function bodyWithRequestContext(body: unknown, context: ResponseRequestContext) {
  const requestContext = {
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
  };

  if (Object.keys(requestContext).length === 0) {
    return body;
  }

  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return {
      ...body,
      ...requestContext,
    };
  }

  return {
    data: body,
    ...requestContext,
  };
}

export function getRequestId(
  event?: Pick<APIGatewayProxyEventV2, 'requestContext'>,
  context?: Pick<Context, 'awsRequestId'>,
) {
  return event?.requestContext?.requestId ?? context?.awsRequestId;
}

function getHeaderValue(
  event: Pick<APIGatewayProxyEventV2, 'headers'> | undefined,
  headerName: string,
) {
  const headers = event?.headers;

  if (!headers) {
    return undefined;
  }

  const header = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === headerName.toLowerCase(),
  );

  return header?.[1]?.trim() || undefined;
}

export function getCorrelationId(
  event?: Pick<APIGatewayProxyEventV2, 'headers' | 'requestContext'>,
  context?: Pick<Context, 'awsRequestId'>,
) {
  return getHeaderValue(event, 'x-correlation-id')
    ?? getHeaderValue(event, 'x-request-id')
    ?? getRequestId(event, context);
}

export function requestMetadata(
  event?: Pick<APIGatewayProxyEventV2, 'headers' | 'rawPath' | 'requestContext' | 'routeKey'>,
  context?: Pick<Context, 'awsRequestId'>,
): ResponseRequestContext {
  const requestId = getRequestId(event, context);

  return {
    requestId,
    correlationId: getCorrelationId(event, context),
    method: event?.requestContext?.http?.method,
    path: event?.rawPath ?? event?.requestContext?.http?.path,
    routeKey: event?.routeKey,
  };
}

function responseHeaders(options: JsonResponseOptions) {
  return {
    ...jsonHeaders,
    ...(options.requestId ? { 'x-request-id': options.requestId } : {}),
    ...(options.correlationId ? { 'x-correlation-id': options.correlationId } : {}),
    ...options.headers,
  };
}

function logResponse(statusCode: number, options: JsonResponseOptions) {
  if (statusCode < 400) {
    return;
  }

  const logContext = {
    requestId: options.requestId,
    correlationId: options.correlationId,
    method: options.method,
    path: options.path,
    routeKey: options.routeKey,
    statusCode,
  };

  if (statusCode >= 500) {
    logError('api.response.error', logContext);
    return;
  }

  logWarn('api.response.rejected', logContext);
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  optionsOrHeaders: JsonResponseOptions | Record<string, string> = {},
): ApiGatewayLikeResponse {
  const options = responseOptions(optionsOrHeaders);
  logResponse(statusCode, options);

  return {
    statusCode,
    headers: responseHeaders(options),
    body: JSON.stringify(bodyWithRequestContext(body, options)),
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
    message: message ?? 'The request could not be completed.',
    ...(details === undefined ? {} : { details }),
  };

  return jsonResponse(statusCode, body, options);
}

export function unauthorizedResponse(
  context?: RequestContextInput,
  message = 'Authentication is required.',
): ApiGatewayLikeResponse {
  return errorResponse(401, 'unauthorized', message, undefined, responseContextFrom(context));
}

export function forbiddenResponse(
  context?: RequestContextInput,
  message = 'You do not have permission to access this resource.',
  details?: unknown,
): ApiGatewayLikeResponse {
  return errorResponse(403, 'forbidden', message, details, responseContextFrom(context));
}

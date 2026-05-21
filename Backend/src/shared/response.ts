import type { ApiErrorResponse } from '@apopto/shared';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export type ApiGatewayLikeResponse = APIGatewayProxyResultV2;

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): ApiGatewayLikeResponse {
  return {
    statusCode,
    headers: {
      ...jsonHeaders,
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  statusCode: number,
  error: string,
  message?: string,
  details?: unknown,
): ApiGatewayLikeResponse {
  const body: ApiErrorResponse = {
    error,
    ...(message ? { message } : {}),
    ...(details === undefined ? {} : { details }),
  };

  return jsonResponse(statusCode, body);
}

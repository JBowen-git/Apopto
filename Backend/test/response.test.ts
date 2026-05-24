import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  errorResponse,
  forbiddenResponse,
  getCorrelationId,
  getRequestId,
  jsonResponse,
  requestMetadata,
  unauthorizedResponse,
} from '../src/shared/response.js';

function parseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('response utilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds private JSON headers and request metadata to object responses', () => {
    const response = jsonResponse(200, { ok: true }, {
      requestId: 'request-123',
      correlationId: 'correlation-123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      pragma: 'no-cache',
      expires: '0',
      'x-request-id': 'request-123',
      'x-correlation-id': 'correlation-123',
    });
    expect(parseBody(response)).toEqual({
      ok: true,
      requestId: 'request-123',
      correlationId: 'correlation-123',
    });
  });

  it('wraps primitive JSON responses when request metadata is present', () => {
    const response = jsonResponse(200, 'pong', {
      requestId: 'request-123',
      correlationId: 'correlation-123',
    });

    expect(parseBody(response)).toEqual({
      data: 'pong',
      requestId: 'request-123',
      correlationId: 'correlation-123',
    });
  });

  it('preserves legacy header override calls', () => {
    const response = jsonResponse(204, {}, {
      'x-custom-header': 'yes',
    });

    expect(response.headers).toMatchObject({
      'cache-control': 'no-store',
      'x-custom-header': 'yes',
    });
  });

  it('returns consistent error bodies with request metadata', () => {
    const response = errorResponse(
      422,
      'validation_error',
      'Request body failed validation.',
      { field: 'email' },
      { requestId: 'request-123', correlationId: 'correlation-123' },
    );

    expect(response.statusCode).toBe(422);
    expect(response.headers).toMatchObject({
      'x-request-id': 'request-123',
      'x-correlation-id': 'correlation-123',
    });
    expect(parseBody(response)).toEqual({
      error: 'validation_error',
      message: 'Request body failed validation.',
      details: { field: 'email' },
      requestId: 'request-123',
      correlationId: 'correlation-123',
    });
  });

  it('keeps error bodies consistent when no message is provided', () => {
    const response = errorResponse(500, 'internal_error', undefined, undefined, {
      requestId: 'request-500',
    });

    expect(parseBody(response)).toEqual({
      error: 'internal_error',
      message: 'The request could not be completed.',
      requestId: 'request-500',
    });
  });

  it('returns standard unauthorized and forbidden responses', () => {
    expect(parseBody(unauthorizedResponse('request-401'))).toEqual({
      error: 'unauthorized',
      message: 'Authentication is required.',
      requestId: 'request-401',
    });

    expect(parseBody(forbiddenResponse('request-403', undefined, {
      requiredScopes: ['admin:clients'],
    }))).toEqual({
      error: 'forbidden',
      message: 'You do not have permission to access this resource.',
      details: {
        requiredScopes: ['admin:clients'],
      },
      requestId: 'request-403',
    });
  });

  it('extracts request IDs from API Gateway events before Lambda context fallback', () => {
    expect(getRequestId({
      requestContext: {
        requestId: 'api-gateway-request',
      },
    }, {
      awsRequestId: 'lambda-request',
    })).toBe('api-gateway-request');

    expect(getRequestId(undefined, {
      awsRequestId: 'lambda-request',
    })).toBe('lambda-request');
  });

  it('extracts correlation IDs from incoming headers before falling back to request ID', () => {
    expect(getCorrelationId({
      headers: {
        'x-correlation-id': 'correlation-header',
      },
      requestContext: {
        requestId: 'api-gateway-request',
      },
    })).toBe('correlation-header');

    expect(getCorrelationId({
      headers: {
        'X-Request-ID': 'viewer-request',
      },
      requestContext: {
        requestId: 'api-gateway-request',
      },
    })).toBe('viewer-request');

    expect(getCorrelationId({
      headers: {},
      requestContext: {
        requestId: 'api-gateway-request',
      },
    })).toBe('api-gateway-request');
  });

  it('builds response metadata from API Gateway events and Lambda context', () => {
    expect(requestMetadata({
      headers: {
        'x-correlation-id': 'correlation-header',
      },
      rawPath: '/api/me',
      routeKey: 'GET /api/me',
      requestContext: {
        requestId: 'api-gateway-request',
        http: {
          method: 'GET',
          path: '/api/me',
        },
      },
    }, {
      awsRequestId: 'lambda-request',
    })).toEqual({
      requestId: 'api-gateway-request',
      correlationId: 'correlation-header',
      method: 'GET',
      path: '/api/me',
      routeKey: 'GET /api/me',
    });
  });
});

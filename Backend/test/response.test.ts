import { describe, expect, it } from 'vitest';

import {
  errorResponse,
  forbiddenResponse,
  getRequestId,
  jsonResponse,
  unauthorizedResponse,
} from '../src/shared/response.js';

function parseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('response utilities', () => {
  it('adds private JSON headers and request IDs to object responses', () => {
    const response = jsonResponse(200, { ok: true }, { requestId: 'request-123' });

    expect(response.statusCode).toBe(200);
    expect(response.headers).toMatchObject({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    expect(parseBody(response)).toEqual({
      ok: true,
      requestId: 'request-123',
    });
  });

  it('wraps primitive JSON responses when a request ID is present', () => {
    const response = jsonResponse(200, 'pong', { requestId: 'request-123' });

    expect(parseBody(response)).toEqual({
      data: 'pong',
      requestId: 'request-123',
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

  it('returns consistent error bodies with request IDs', () => {
    const response = errorResponse(
      422,
      'validation_error',
      'Request body failed validation.',
      { field: 'email' },
      { requestId: 'request-123' },
    );

    expect(response.statusCode).toBe(422);
    expect(parseBody(response)).toEqual({
      error: 'validation_error',
      message: 'Request body failed validation.',
      details: { field: 'email' },
      requestId: 'request-123',
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
});

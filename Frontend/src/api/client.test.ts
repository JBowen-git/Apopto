import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('createApiClient', () => {
  it('attaches bearer tokens and JSON request bodies to authenticated requests', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({
      ok: true,
    }), {
      headers: {
        'content-type': 'application/json',
      },
      status: 200,
    }));
    const client = createApiClient({
      baseUrl: 'https://api.apopto.test/',
      getAccessToken: async () => 'token_123',
    });

    await expect(client.post('/api/intake', {
      businessName: 'North Star',
    })).resolves.toEqual({
      ok: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.apopto.test/api/intake');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({
      businessName: 'North Star',
    }));
    expect(headers.get('authorization')).toBe('Bearer token_123');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('throws an unauthorized ApiClientError before fetch when a token is missing', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const client = createApiClient({
      getAccessToken: async () => undefined,
    });

    await expect(client.get('/api/me')).rejects.toMatchObject({
      error: 'unauthorized',
      message: 'Authentication is required before calling this API.',
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports unauthenticated public requests', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({
      ok: true,
    }), {
      headers: {
        'content-type': 'application/json',
      },
      status: 202,
    }));
    const client = createApiClient({
      baseUrl: 'https://api.apopto.test',
      getAccessToken: async () => undefined,
    });

    await expect(client.post('/api/contact', {
      email: 'owner@example.com',
    }, {
      authenticated: false,
    })).resolves.toEqual({
      ok: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.apopto.test/api/contact');
    expect(init.method).toBe('POST');
    expect(headers.has('authorization')).toBe(false);
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('preserves structured API error codes and request IDs', async () => {
    stubFetch(new Response(JSON.stringify({
      details: {
        missingScopes: ['read:files'],
      },
      error: 'insufficient_scope',
      message: 'Missing required scope.',
      requestId: 'request_123',
    }), {
      headers: {
        'content-type': 'application/json',
      },
      status: 403,
    }));
    const client = createApiClient({
      getAccessToken: async () => 'token_123',
    });

    await expect(client.get('/api/files')).rejects.toMatchObject({
      details: {
        missingScopes: ['read:files'],
      },
      error: 'insufficient_scope',
      message: 'Missing required scope.',
      requestId: 'request_123',
      status: 403,
    });
  });

  it('uses safe fallback messages and request ID headers for non-JSON failures', async () => {
    stubFetch(new Response('<!doctype html>', {
      headers: {
        'x-request-id': 'edge_request_123',
      },
      status: 401,
    }));
    const client = createApiClient({
      getAccessToken: async () => 'token_123',
    });

    try {
      await client.get('/api/me');
      throw new Error('Expected request to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect(error).toMatchObject({
        error: 'unauthorized',
        message: 'Your session has expired. Please sign in again.',
        requestId: 'edge_request_123',
        status: 401,
      });
    }
  });
});

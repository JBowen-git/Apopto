import { ApiErrorResponseSchema, type ApiErrorResponse } from '@apopto/shared';

type AccessTokenProvider = () => Promise<string | undefined>;

type ApiClientConfig = {
  baseUrl?: string;
  getAccessToken?: AccessTokenProvider;
};

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  authenticated?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
};

type ParsedResponseBody = ApiErrorResponse | Record<string, unknown> | string | null;

export class ApiClientError extends Error {
  readonly details?: unknown;
  readonly error: string;
  readonly requestId?: string;
  readonly status: number;

  constructor({
    details,
    error,
    message,
    requestId,
    status,
  }: {
    details?: unknown;
    error: string;
    message: string;
    requestId?: string;
    status: number;
  }) {
    super(message);
    this.name = 'ApiClientError';
    this.details = details;
    this.error = error;
    this.requestId = requestId;
    this.status = status;
  }
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

function buildUrl(path: string, baseUrl: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!baseUrl) {
    return normalizePath(path);
  }

  return `${trimTrailingSlash(baseUrl)}${normalizePath(path)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string'
    || (typeof Blob !== 'undefined' && value instanceof Blob)
    || (typeof FormData !== 'undefined' && value instanceof FormData)
    || (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams)
    || (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
  );
}

function serializeBody(body: ApiRequestOptions['body']) {
  if (body === undefined || body === null) {
    return undefined;
  }

  return isBodyInit(body) ? body : JSON.stringify(body);
}

function shouldAddJsonContentType(body: ApiRequestOptions['body']) {
  return body !== undefined && body !== null && !isBodyInit(body);
}

async function parseResponseBody(response: Response): Promise<ParsedResponseBody> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ParsedResponseBody;
  } catch {
    return text;
  }
}

function requestIdFrom(response: Response, body: ParsedResponseBody) {
  if (isRecord(body) && typeof body.requestId === 'string') {
    return body.requestId;
  }

  return response.headers.get('x-request-id')
    ?? response.headers.get('x-amzn-requestid')
    ?? undefined;
}

function toApiClientError(response: Response, body: ParsedResponseBody) {
  const parsedError = ApiErrorResponseSchema.safeParse(body);

  if (parsedError.success) {
    return new ApiClientError({
      details: parsedError.data.details,
      error: parsedError.data.error,
      message: parsedError.data.message ?? fallbackErrorMessage(response.status),
      requestId: parsedError.data.requestId,
      status: response.status,
    });
  }

  return new ApiClientError({
    error: response.status === 401
      ? 'unauthorized'
      : response.status === 403
        ? 'forbidden'
        : 'request_failed',
    message: fallbackErrorMessage(response.status),
    requestId: requestIdFrom(response, body),
    status: response.status,
  });
}

function fallbackErrorMessage(status: number) {
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission to access this resource.';
  }

  return 'The request could not be completed.';
}

export function createApiClient({
  baseUrl = import.meta.env.VITE_API_BASE_URL ?? '',
  getAccessToken,
}: ApiClientConfig = {}) {
  async function request<TResponse = unknown>(
    path: string,
    {
      authenticated = true,
      body,
      headers,
      ...init
    }: ApiRequestOptions = {},
  ): Promise<TResponse> {
    const requestHeaders = new Headers(headers);

    if (authenticated) {
      const token = await getAccessToken?.();

      if (!token) {
        throw new ApiClientError({
          error: 'unauthorized',
          message: 'Authentication is required before calling this API.',
          status: 401,
        });
      }

      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    if (shouldAddJsonContentType(body) && !requestHeaders.has('content-type')) {
      requestHeaders.set('content-type', 'application/json');
    }

    const response = await fetch(buildUrl(path, baseUrl), {
      ...init,
      body: serializeBody(body),
      headers: requestHeaders,
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw toApiClientError(response, responseBody);
    }

    return responseBody as TResponse;
  }

  return {
    delete: <TResponse = unknown>(path: string, options?: ApiRequestOptions) => (
      request<TResponse>(path, { ...options, method: 'DELETE' })
    ),
    get: <TResponse = unknown>(path: string, options?: ApiRequestOptions) => (
      request<TResponse>(path, { ...options, method: 'GET' })
    ),
    patch: <TResponse = unknown>(path: string, body?: ApiRequestOptions['body'], options?: ApiRequestOptions) => (
      request<TResponse>(path, { ...options, body, method: 'PATCH' })
    ),
    post: <TResponse = unknown>(path: string, body?: ApiRequestOptions['body'], options?: ApiRequestOptions) => (
      request<TResponse>(path, { ...options, body, method: 'POST' })
    ),
    put: <TResponse = unknown>(path: string, body?: ApiRequestOptions['body'], options?: ApiRequestOptions) => (
      request<TResponse>(path, { ...options, body, method: 'PUT' })
    ),
    request,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

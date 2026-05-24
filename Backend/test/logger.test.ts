import { afterEach, describe, expect, it, vi } from 'vitest';

import { logError, logInfo, logWarn } from '../src/shared/logger.js';

describe('structured logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes structured JSON logs with standard fields', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logInfo('portal.request', {
      requestId: 'request-123',
      correlationId: 'correlation-123',
      routeKey: 'GET /api/me',
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(infoSpy.mock.calls[0]?.[0] ?? '{}') as Record<string, unknown>;

    expect(payload).toMatchObject({
      level: 'info',
      message: 'portal.request',
      requestId: 'request-123',
      correlationId: 'correlation-123',
      routeKey: 'GET /api/me',
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('redacts tokens, secrets, request bodies, user contact data, and URLs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logWarn('portal.warning', {
      authorization: 'Bearer secret-token',
      email: 'client@example.com',
      nested: {
        downloadUrl: 'https://example.com/presigned-download',
        requestId: 'request-123',
      },
      requestBody: {
        businessName: 'Private Client',
      },
      stripeSecretKey: 'sk_test_secret',
    });

    const payload = JSON.parse(warnSpy.mock.calls[0]?.[0] ?? '{}') as Record<string, unknown>;

    expect(payload.authorization).toBe('[redacted]');
    expect(payload.email).toBe('[redacted]');
    expect(payload.requestBody).toBe('[redacted]');
    expect(payload.stripeSecretKey).toBe('[redacted]');
    expect(payload.nested).toEqual({
      downloadUrl: '[redacted]',
      requestId: 'request-123',
    });
  });

  it('logs errors without stack traces or error messages', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logError('portal.error', {
      error: new Error('could contain sensitive context'),
      requestId: 'request-123',
    });

    const payload = JSON.parse(errorSpy.mock.calls[0]?.[0] ?? '{}') as Record<string, unknown>;

    expect(payload.error).toEqual({
      name: 'Error',
    });
    expect(JSON.stringify(payload)).not.toContain('could contain sensitive context');
  });
});

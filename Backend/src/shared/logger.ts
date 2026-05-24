type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const redactedKeys = [
  'authorization',
  'body',
  'business',
  'company',
  'contact',
  'cookie',
  'details',
  'email',
  'formdata',
  'password',
  'payload',
  'phone',
  'presigned',
  'secret',
  'set-cookie',
  'stripe',
  'token',
  'url',
];

function shouldRedactKey(key: string) {
  const normalized = key.toLowerCase();

  return redactedKeys.some((sensitiveKey) => normalized.includes(sensitiveKey));
}

function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[max-depth]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
    };
  }

  if (typeof value === 'string') {
    return value.length > 1000 ? `${value.slice(0, 1000)}...` : value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      shouldRedactKey(key) ? '[redacted]' : sanitizeLogValue(entryValue, depth + 1),
    ]),
  );
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const safeContext = sanitizeLogValue(context) as LogContext;
  const payload = {
    ...safeContext,
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  const serializedPayload = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serializedPayload);
    return;
  }

  if (level === 'warn') {
    console.warn(serializedPayload);
    return;
  }

  console.info(serializedPayload);
}

export function logInfo(message: string, context?: LogContext) {
  writeLog('info', message, context);
}

export function logWarn(message: string, context?: LogContext) {
  writeLog('warn', message, context);
}

export function logError(message: string, context?: LogContext) {
  writeLog('error', message, context);
}

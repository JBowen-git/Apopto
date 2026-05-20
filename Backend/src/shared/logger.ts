type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    ...context,
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
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

type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = import.meta.env.PROD;

function emit(level: ClientLogLevel, message: string, meta?: unknown) {
  if (isProd && level !== 'error') return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };

  if (level === 'error') {
    console.error(payload);
    return;
  }
  if (level === 'warn') {
    console.warn(payload);
    return;
  }
  console.log(payload);
}

export const clientLogger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};

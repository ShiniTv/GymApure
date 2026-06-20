type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const order: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'warn';
}

const minLevel = resolveMinLevel();

function shouldLog(level: LogLevel): boolean {
  return order[level] >= order[minLevel];
}

function serializeMeta(meta?: Record<string, unknown>): string | undefined {
  if (!meta) return undefined;
  try {
    return JSON.stringify(meta);
  } catch {
    return JSON.stringify({ meta_error: 'No se pudo serializar metadata' });
  }
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = serializeMeta(payload) ?? `{"level":"${level}","message":"${message}"}`;
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};

import type { ErrorEvent, EventHint } from '@sentry/core';

type BeforeSend = (event: ErrorEvent, hint: EventHint) => ErrorEvent | null;

const SW_LOAD_FAILED =
  /service worker|serviceworker|sw\.js|Script .*sw\.js.* load failed|Failed to register a ServiceWorker/i;

const CHUNK_LOAD_FAILED =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\dA-Za-z_-]+ failed/i;

const TRANSIENT_NETWORK =
  /\b(ECONNABORTED|ECONNRESET|ETIMEDOUT|ESOCKET|EPIPE|socket hang up|read ECONNABORTED)\b/i;

function eventText(event: ErrorEvent, hint?: EventHint): string {
  const parts: string[] = [];
  if (event.message) parts.push(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.type) parts.push(ex.type);
    if (ex.value) parts.push(ex.value);
  }
  const original = hint?.originalException;
  if (original instanceof Error) {
    parts.push(original.name, original.message);
  } else if (typeof original === 'string') {
    parts.push(original);
  }
  if (event.request?.url) parts.push(event.request.url);
  return parts.join(' ');
}

/** Drop known deploy / cache / SW noise on the browser project. */
export const browserBeforeSend: BeforeSend = (event, hint) => {
  const text = eventText(event, hint);
  if (SW_LOAD_FAILED.test(text) || CHUNK_LOAD_FAILED.test(text)) {
    return null;
  }
  return event;
};

/** Drop expected operational noise on the Node project (same DSN today). */
export const serverBeforeSend: BeforeSend = (event, hint) => {
  const text = eventText(event, hint);

  if (TRANSIENT_NETWORK.test(text)) {
    return null;
  }

  // Pool pressure is logged locally; only alert Sentry when saturation is severe.
  if (event.message === 'Database pool waiting' || text.includes('Database pool waiting')) {
    const extra = (event as ErrorEvent & { extra?: { waitingCount?: number; totalCount?: number } })
      .extra;
    const waiting = extra?.waitingCount;
    const total = extra?.totalCount;
    if (typeof waiting === 'number' && typeof total === 'number') {
      if (waiting < 3 || total < 8) {
        return null;
      }
    }
  }

  return event;
};

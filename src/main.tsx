import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { queryClient } from './lib/queryClient.ts';
import '@fontsource/inter/latin.css';
import '@fontsource/jetbrains-mono/latin.css';
import './index.css';

const CHUNK_RELOAD_KEY = 'cg-chunk-reload';
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\dA-Za-z_-]+ failed/i;

const rawSentryDsn: unknown = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_DSN = typeof rawSentryDsn === 'string' ? rawSentryDsn : undefined;
if (SENTRY_DSN) {
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.01,
      replaysOnErrorSampleRate: 0.1,
    });
  });
}

function shouldReloadForChunkError(reason: unknown) {
  const message =
    reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : typeof reason === 'string'
        ? reason
        : JSON.stringify(reason);

  return CHUNK_ERROR_RE.test(message);
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function hasReloadedForChunkError() {
  return getSessionStorage()?.getItem(CHUNK_RELOAD_KEY) === '1';
}

function markChunkReload() {
  getSessionStorage()?.setItem(CHUNK_RELOAD_KEY, '1');
}

function clearChunkReloadMarker() {
  getSessionStorage()?.removeItem(CHUNK_RELOAD_KEY);
}

async function recoverFromChunkError() {
  if (hasReloadedForChunkError()) return;

  markChunkReload();

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Ignore cleanup failures and still retry the page load.
    }
  }

  if ('caches' in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    } catch {
      // Ignore cache cleanup failures and still retry the page load.
    }
  }

  window.location.reload();
}

window.addEventListener('unhandledrejection', (event) => {
  if (!shouldReloadForChunkError(event.reason)) return;
  void recoverFromChunkError();
});

window.addEventListener('load', () => {
  clearChunkReloadMarker();
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update().then(() => registration))
      .catch(() => {
        /* sw registration skipped */
      });
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

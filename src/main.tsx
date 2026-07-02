import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { queryClient } from './lib/queryClient.ts';
import '@fontsource/inter/latin.css';
import '@fontsource/jetbrains-mono/latin.css';
import './index.css';

const CHUNK_RELOAD_KEY = 'cg-chunk-reload';
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\dA-Za-z_-]+ failed/i;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
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

window.addEventListener('unhandledrejection', (event) => {
  if (!shouldReloadForChunkError(event.reason)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
});

window.addEventListener('load', () => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sw registration skipped */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

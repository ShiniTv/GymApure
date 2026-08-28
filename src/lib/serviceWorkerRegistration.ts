let registered = false;
let controllerChangeBound = false;

const MAX_REGISTER_ATTEMPTS = 3;
const REGISTER_RETRY_MS = 2_000;

function bindControllerChangeReload(): void {
  if (controllerChangeBound || !('serviceWorker' in navigator)) return;
  controllerChangeBound = true;

  // When a new SW takes control (skipWaiting + clients.claim), reload once so
  // hashed assets match the HTML document and we leave stale bundles behind.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function isTransientSwRegisterError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return /load failed|network|failed to fetch|securityerror|timeout/i.test(message);
}

async function registerWithRetry(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_REGISTER_ATTEMPTS; attempt++) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });
      void registration.update();
      window.setInterval(() => {
        void registration.update();
      }, 5 * 60_000);
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientSwRegisterError(error) || attempt >= MAX_REGISTER_ATTEMPTS) {
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, REGISTER_RETRY_MS * attempt));
    }
  }

  registered = false;
  if (import.meta.env.DEV) {
    console.warn('[sw] Registro omitido tras reintentos', lastError);
  }
}

export function registerServiceWorkerWhenReady(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registered) return;

  const schedule = () => {
    registered = true;
    bindControllerChangeReload();
    void registerWithRetry();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(schedule, { timeout: 5000 });
  } else {
    setTimeout(schedule, 2000);
  }
}

export function onRouteChangeForServiceWorker(_pathname: string): void {
  if (registered) return;
  registerServiceWorkerWhenReady();
}

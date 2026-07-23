let registered = false;
let controllerChangeBound = false;

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

export function registerServiceWorkerWhenReady(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registered) return;

  const schedule = () => {
    registered = true;
    bindControllerChangeReload();
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        void registration.update();
        // Re-check periodically while the tab stays open (deploy mid-session).
        window.setInterval(() => {
          void registration.update();
        }, 5 * 60_000);
        return registration;
      })
      .catch(() => {
        registered = false;
      });
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

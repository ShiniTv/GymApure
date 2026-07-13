let registered = false;

export function registerServiceWorkerWhenReady(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || registered) return;

  const schedule = () => {
    registered = true;
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update().then(() => registration))
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

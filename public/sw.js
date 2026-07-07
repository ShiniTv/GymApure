const STATIC_CACHE = 'gymapure-static-v7';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/offline.html',
  '/theme-init.js',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo-mark-light.jpg',
  '/logo-mark-dark.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // API — network only (avoid stale authenticated responses)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Images and fonts can be safely reused offline.
  if (request.destination === 'font' || request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Scripts and styles must prefer the network after deploys to avoid old chunks.
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigations — network first, fallback to offline page only.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Everything else — network first
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached ?? new Response('', { status: 504, statusText: 'Offline' });
    })
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('', { status: 504, statusText: 'Offline' });
  }
}

function isCacheableResponse(response) {
  return response.ok && response.type !== 'opaque';
}

// ─── Push notifications ──────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const { title, body, url } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title || 'Caribean Gym', {
        body: body || '',
        icon: '/logo-mark-light.jpg',
        badge: '/favicon.svg',
        data: { url: url || '/' },
        vibrate: [200, 100, 200],
      })
    );
  } catch { /* ignore */ }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

const STATIC_CACHE = 'gymapure-static-v12';
const OFFLINE_URL = '/offline.html';
const REST_TAG = 'workout-rest';

const STATIC_ASSETS = [
  '/offline.html',
  '/theme-init.js',
  '/manifest.webmanifest',
  '/favicon.svg',
];

const PRECACHE_PATHS = new Set(STATIC_ASSETS);

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

  // Never hijack non-GET or cross-origin traffic.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API must bypass the SW entirely (auth cookies, no stale JSON, no DevTools noise).
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Chrome may issue only-if-cached probes; re-fetching them yields net::ERR_CACHE_MISS.
  if (request.cache === 'only-if-cached') {
    return;
  }

  // Images and fonts can be safely reused offline.
  if (request.destination === 'font' || request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Shell assets we precache — serve cache-first for offline/install reliability.
  if (PRECACHE_PATHS.has(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigations / HTML documents — network first, offline page fallback.
  // Do not wrap scripts, styles, hashed /assets/*, or misc GETs in respondWith(fetch):
  // that catch-all caused net::ERR_CACHE_MISS (e.g. /login) under DevTools / cache modes.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkOnlyWithOfflineFallback(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await safeFetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await safeFetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

/** Re-issue fetch without propagating only-if-cached (ERR_CACHE_MISS). */
function safeFetch(request) {
  if (request.cache === 'only-if-cached') {
    return fetch(request, { cache: 'default' });
  }
  return fetch(request);
}

function isCacheableResponse(response) {
  return response.ok && response.type !== 'opaque';
}

function focusOrOpen(url) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }
    for (const client of windowClients) {
      if ('focus' in client) {
        return client.focus();
      }
    }
    return clients.openWindow(url);
  });
}

function broadcastToClients(message) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage(message);
    }
  });
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

/** Ask open clients to re-subscribe after browser rotates the push endpoint. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(broadcastToClients({ type: 'push-subscription-change' }));
});

// ─── Local rest timer (workout lock screen) ───────────────

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  if (data.type === 'rest-start' || data.type === 'rest-update') {
    const isStart = data.type === 'rest-start';
    event.waitUntil(
      self.registration.showNotification('Descanso', {
        body: data.body || '',
        tag: REST_TAG,
        renotify: isStart,
        silent: !isStart,
        icon: '/logo-mark-light.jpg',
        badge: '/favicon.svg',
        data: { url: data.url || '/', kind: 'rest' },
        actions: [
          { action: 'rest-add30', title: '+30s' },
          { action: 'rest-skip', title: 'Saltar' },
        ],
      })
    );
    return;
  }

  if (data.type === 'rest-end') {
    event.waitUntil(
      self.registration.showNotification('Descanso terminado', {
        body: '¡Listo para la siguiente serie!',
        tag: REST_TAG,
        renotify: true,
        icon: '/logo-mark-light.jpg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/', kind: 'rest-done' },
      })
    );
    return;
  }

  if (data.type === 'rest-clear') {
    event.waitUntil(
      self.registration.getNotifications({ tag: REST_TAG }).then((notifs) => {
        for (const n of notifs) n.close();
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || '/';
  event.notification.close();

  if (action === 'rest-add30' || action === 'rest-skip') {
    const msgType = action === 'rest-add30' ? 'rest-action-add30' : 'rest-action-skip';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: msgType });
        }
        if (windowClients.length > 0 && 'focus' in windowClients[0]) {
          return windowClients[0].focus();
        }
        return clients.openWindow(url);
      })
    );
    return;
  }

  event.waitUntil(focusOrOpen(url));
});

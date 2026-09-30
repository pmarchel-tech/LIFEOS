// Life OS Service Worker for Mobile PWA, Instant Caching & Push Notifications
const CACHE_NAME = 'life-os-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Cache strategy: Cache-first for hashed static assets, Network-first for app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Supabase or external API requests: do not intercept in service worker
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return;

  // Static hashed assets & media: Cache-first with background update
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (e) {
          return cached;
        }
      })
    );
    return;
  }

  // HTML / App shell: Network-first (get latest deployed version) with cache fallback
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
  }
});

// Listen for messages from client app to display local notifications on mobile/desktop
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        badge: '/icon-192.png',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        ...options
      })
    );
  }
});

// When user taps/clicks the notification on their phone
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});


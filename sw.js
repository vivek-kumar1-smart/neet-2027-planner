const CACHE_NAME = 'neet-planner-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// Install new service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate new service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith('neet-planner-') &&
              cacheName !== CACHE_NAME
            ) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Handle only GET requests
  if (request.method !== 'GET') return;

  // Network-first strategy for page navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put('./index.html', responseClone);
            });

          return response;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );

    return;
  }

  // Cache-first strategy for other same-origin files
  const requestURL = new URL(request.url);

  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }

            return response;
          });
        })
    );
  }
});

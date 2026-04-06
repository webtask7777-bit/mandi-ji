const CACHE_NAME = 'mandiji-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first for API and navigation (HTML)
  if (e.request.url.includes('/api/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else if (url.pathname.startsWith('/assets/')) {
    // Cache-first for hashed assets (they have unique filenames per build)
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      }))
    );
  } else {
    // Network-first for everything else
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});

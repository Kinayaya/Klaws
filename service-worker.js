const CACHE_VERSION = 'klaws-pwa-v2-2026-05-12';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/klaws-icon.svg',
  './utility.js',
  './storage.js',
  './data.js',
  './init.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isHtmlRequest = event.request.mode === 'navigate' || requestUrl.pathname.endsWith('/index.html');
  event.respondWith(
    (async () => {
      if (isHtmlRequest) {
        try {
          const networkResponse = await fetch(event.request);
          const copy = networkResponse.clone();
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(event.request, copy);
          return networkResponse;
        } catch (error) {
          return (await caches.match(event.request)) || caches.match('./index.html');
        }
      }
      const cached = await caches.match(event.request);
      if (cached) {
        void fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => null);
        return cached;
      }
      try {
        const response = await fetch(event.request);
        const copy = response.clone();
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(event.request, copy);
        return response;
      } catch (error) {
        return caches.match('./index.html');
      }
    })()
  );
});

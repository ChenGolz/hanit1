const STATIC_CACHE = 'petconnect-animal-static-v14';
const RUNTIME_CACHE = 'petconnect-animal-runtime-v14';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './search.html',
  './enroll.html',
  './offline.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './assets/styles.css',
  './assets/common.js',
  './assets/app.js',
  './assets/i18n.js',
  './search.inline.js',
  './enroll.inline.js',
  './data/library.json',
];
const RUNTIME_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'unpkg.com',
]);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(ASSETS_TO_CACHE.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch (error) {
        // Ignore a single failed precache so installation can still complete.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function putResponseInCache(cache, request, response) {
  if (!response || request.method !== 'GET' || !response.ok) return;
  try {
    await cache.put(request, response.clone());
    const normalizedUrl = new URL(request.url);
    normalizedUrl.search = '';
    if (normalizedUrl.toString() !== request.url) {
      await cache.put(new Request(normalizedUrl.toString(), { method: 'GET' }), response.clone());
    }
  } catch (error) {
    // ignore opaque/cache write failures
  }
}

async function matchWithFallback(cache, request) {
  const direct = await cache.match(request, { ignoreSearch: true });
  if (direct) return direct;
  const normalizedUrl = new URL(request.url);
  normalizedUrl.search = '';
  return cache.match(normalizedUrl.toString(), { ignoreSearch: true });
}

function isStaticAssetRequest(request) {
  const url = new URL(request.url);
  if (RUNTIME_HOSTS.has(url.host)) return true;
  if (url.origin !== self.location.origin) return false;
  if (request.mode === 'navigate') return false;
  return /\.(?:css|js|png|svg|ico|webmanifest|woff2?|json|html)$/i.test(url.pathname) || url.pathname.includes('/assets/');
}

async function cacheFirst(request) {
  const cacheName = request.url.startsWith(self.location.origin) ? STATIC_CACHE : RUNTIME_CACHE;
  const cache = await caches.open(cacheName);
  const cached = await matchWithFallback(cache, request);
  if (cached) return cached;
  const response = await fetch(request);
  await putResponseInCache(cache, request, response);
  return response;
}

async function networkFirst(request) {
  const cacheName = request.url.startsWith(self.location.origin) ? STATIC_CACHE : RUNTIME_CACHE;
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    await putResponseInCache(cache, request, response);
    return response;
  } catch (error) {
    const cached = await matchWithFallback(cache, request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return (await cache.match('./offline.html', { ignoreSearch: true }))
        || (await caches.match('./offline.html', { ignoreSearch: true }))
        || (await caches.match('./index.html', { ignoreSearch: true }));
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isStaticAssetRequest(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate' || url.origin === self.location.origin || RUNTIME_HOSTS.has(url.host)) {
    event.respondWith(networkFirst(request));
  }
});

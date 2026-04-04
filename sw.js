const STATIC_CACHE = 'petconnect-animal-static-v48';
const RUNTIME_CACHE = 'petconnect-animal-runtime-v48';
const SYNC_DB_NAME = 'petconnect-sync-db';
const SYNC_STORE = 'pending-json-posts';
const ASSETS_TO_CACHE = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
  './',
  './index.html',
  './search.html',
  './enroll.html',
  './report-found.html',
  './offline.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './assets/styles.css',
  './assets/common.js',
  './assets/app.js',
  './assets/global.js',
  './assets/i18n.js',
  './search.inline.js',
  './enroll.inline.js',
  './report-found.inline.js',
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
    await flushPendingJsonPosts();
  })());
});

function openSyncDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
  });
}

async function addPendingJsonPost(payload) {
  const db = await openSyncDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, 'readwrite');
    tx.objectStore(SYNC_STORE).add({
      createdAt: Date.now(),
      url: payload.url,
      method: payload.method || 'POST',
      headers: payload.headers || { 'Content-Type': 'application/json' },
      body: payload.body || {},
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('indexedDB write failed'));
  });
  db.close();
}

async function listPendingJsonPosts() {
  const db = await openSyncDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, 'readonly');
    const request = tx.objectStore(SYNC_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('indexedDB read failed'));
  });
  db.close();
  return items;
}

async function deletePendingJsonPost(id) {
  const db = await openSyncDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_STORE, 'readwrite');
    tx.objectStore(SYNC_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('indexedDB delete failed'));
  });
  db.close();
}

async function flushPendingJsonPosts() {
  const pending = await listPendingJsonPosts();
  for (const item of pending) {
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: item.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body || {}),
      });
      if (response.ok) {
        await deletePendingJsonPost(item.id);
      }
    } catch (error) {
      // Keep the item in the queue for the next sync attempt.
    }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'queue-report' && data.payload?.url) {
    event.waitUntil?.(addPendingJsonPost(data.payload));
    return;
  }
  if (data.type === 'flush-report-queue') {
    event.waitUntil?.(flushPendingJsonPosts());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'send-report') {
    event.waitUntil(flushPendingJsonPosts());
  }
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


self.addEventListener('push', (event) => {
  const payload = (() => {
    try { return event.data?.json?.() || {}; } catch (error) { return {}; }
  })();
  const title = payload.title || 'התראת שכונה';
  const options = {
    body: payload.body || 'יש דיווח חדש באזור שלך.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: payload.data || { url: './search.html' },
    tag: payload.tag || 'petconnect-push',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './search.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
    return null;
  }));
});

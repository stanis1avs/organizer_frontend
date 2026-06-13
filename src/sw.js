/* Service Worker — Organizer Frontend */

const SHELL_CACHE = 'shell-v1';
const MEDIA_CACHE = 'media-v1';

// Predictable filenames from webpack (no content hash in this project's config)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/main.css',
];

// ─── Install: precache shell ──────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean stale caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const VALID = [SHELL_CACHE, MEDIA_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !VALID.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: route by strategy ─────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET — skip POST (upload/search), WS upgrades, etc.
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Media files served from the backend: Stale-While-Revalidate
  if (url.pathname.startsWith('/files/')) {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE));
    return;
  }

  // Same-origin shell assets: Cache First
  if (url.origin === self.location.origin && isShellUrl(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

// ─── Strategies ───────────────────────────────────────────────────────────────

function isShellUrl(pathname) {
  return (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp')
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background; ignore network errors if we have a cached copy
  const networkFetch = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);

  return cached ?? networkFetch;
}

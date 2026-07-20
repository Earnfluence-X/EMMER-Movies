/* EMMER Movies Service Worker
 * - Cache-first for TMDB poster/backdrop images (long-lived).
 * - Stale-while-revalidate for TMDB JSON API responses.
 * - Cache the app shell for offline launch.
 */
const VERSION = "emmer-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const IMG_CACHE = `${VERSION}-images`;
const API_CACHE = `${VERSION}-api`;

const SHELL_URLS = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// Cache-first strategy
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 🖼️ TMDB images — cache first
  if (url.hostname === "image.tmdb.org") {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  // 📦 TMDB API JSON — stale-while-revalidate
  if (url.hostname === "api.themoviedb.org") {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // 🏠 App shell — network falling back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("./index.html").then((r) => r || caches.match("./")),
      ),
    );
    return;
  }
});

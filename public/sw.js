/**
 * Minimal service worker — Phase 6 PWA wrapper.
 * Cache strategy: cache-first for the app shell + Next static assets,
 * network-first for everything else. Bumped on each ahavah-web build.
 */

const CACHE = "ahavah-v1";
const APP_SHELL = ["/", "/design-system", "/manifest.json", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Network-first for API + dynamic data; cache-first for static.
  const url = new URL(req.url);
  const isStatic =
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json";

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() => caches.match("/")))
    );
    return;
  }

  event.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((hit) => hit ?? caches.match("/")))
  );
});

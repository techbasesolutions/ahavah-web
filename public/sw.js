/**
 * Ahavah service worker — PWA wrapper.
 *
 * Cache strategy:
 *   - app shell + Next static assets: cache-first (offline-resilient)
 *   - /api/* + cross-origin requests: NEVER cached (private data + freshness)
 *   - everything else: network-first with cache fallback
 *
 * CACHE name bumps every release that changes static assets (so a
 * stale older bundle gets evicted in `activate`).
 */

const CACHE = "ahavah-v3";

// Routes whose HTML we want available offline. Must all return 200 on
// install or addAll() rejects the whole batch — keep this conservative
// (root only). The /design-system + /paywall + /verify screens used to
// be here and broke addAll when /design-system was removed.
const APP_SHELL = ["/", "/manifest.json", "/icon-192.svg", "/icon-512.svg"];

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

  const url = new URL(req.url);

  // PRIVACY + FRESHNESS: never cache anything under /api/ (proxied
  // backend calls — /me, /profile-info, /matches, photo proxy, etc.).
  // Caching these would leak private data across users on shared
  // devices and serve stale state after sign-out. Let the browser's
  // normal request flow handle them; do not even respondWith.
  if (url.pathname.startsWith("/api/")) return;

  // Cross-origin requests aren't ours to cache (Stripe, Spaces, etc.).
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
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

  // App-shell HTML routes: network-first, fall back to cache, fall
  // back to root shell on full offline.
  event.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((hit) => hit ?? caches.match("/")))
  );
});

"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on mount. Client component so it only
 * runs in the browser. Mounted from RootLayout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Skip in dev — the response cache hides Tailwind/HMR rebuilds and
    // produces stale-CSS hydration mismatches. PWA is a prod-only
    // enhancement; in dev we want every navigation to hit the dev server.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if (window.caches) {
        window.caches.keys().then((keys) => {
          for (const k of keys) window.caches.delete(k);
        });
      }
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // Don't crash the app if SW registration fails — PWA is enhancement,
        // not a hard requirement.
        console.warn("Service worker registration failed:", err);
      });
  }, []);
  return null;
}

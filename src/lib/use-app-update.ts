"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 30 * 60 * 1000; // re-check for a new version every 30 min

/**
 * Reliable PWA update delivery. Registers the service worker, polls for a new
 * version (on re-focus + every 30 min), and applies it:
 *   - reopened from background  -> auto-refresh (seamless, the common case)
 *   - actively in use           -> expose `updateReady` for an in-app
 *                                  "Refresh" bar (don't yank the user)
 *
 * Pairs with public/sw.js, which no longer auto-skipWaiting()s: the new SW
 * installs and WAITS until we post {type:"SKIP_WAITING"}, so we control WHEN
 * the swap (and the reload) happens.
 */
export function useAppUpdate(): {
  updateReady: boolean;
  applyUpdate: () => void;
} {
  const [updateReady, setUpdateReady] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadedRef = useRef(false);
  // Set right before we post SKIP_WAITING, so the controllerchange listener
  // reloads ONLY for an update we applied -- never for the first-install
  // clients.claim() (which also fires controllerchange).
  const applyingRef = useRef(false);

  const applyUpdate = useCallback(() => {
    // The Refresh button must NEVER be a silent no-op (bug 2026-07-08: users
    // clicked it and nothing happened, leaving them pinned to the old
    // bundle). Two failure modes are covered:
    //   - no waiting worker (reference raced away) -> plain hard reload;
    //     HTML is network-first, so a reload alone fetches the new bundle.
    //   - SKIP_WAITING posted but controllerchange never fires (a known
    //     iOS Safari flake) -> reload anyway after a short grace.
    const waiting = regRef.current?.waiting;
    applyingRef.current = true; // controllerchange -> the one reload (effect).
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => {
        if (!reloadedRef.current) {
          reloadedRef.current = true;
          window.location.reload();
        }
      }, 1200);
    } else {
      reloadedRef.current = true;
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (typeof navigator.serviceWorker?.getRegistrations !== "function") return;

    // Dev: keep the PWA off (stale-cache hides HMR rebuilds), as before.
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

    let cancelled = false;
    let cleanup = () => {};
    // True when the next-detected waiting SW should auto-apply (the reopen /
    // re-focus path) instead of surfacing the bar (the interval / active path).
    let applyOnReady = false;

    const reloadOnce = () => {
      if (!applyingRef.current || reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    const onWaiting = () => {
      if (cancelled) return;
      if (applyOnReady) {
        applyOnReady = false;
        applyingRef.current = true;
        regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
      } else {
        setUpdateReady(true);
      }
    };

    // A worker reaching "installed" while a controller already exists is a
    // real update (not the first install).
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const check = () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          onWaiting();
        }
      };
      worker.addEventListener("statechange", check);
      check();
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        regRef.current = reg;
        // A waiting SW may already exist from before this page loaded.
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        reg.addEventListener("updatefound", () => watch(reg.installing));
        // An install already in progress when register() resolved would have
        // fired updatefound before the listener above attached -- watch it too.
        if (reg.installing) watch(reg.installing);

        const poll = (fromFocus: boolean) => {
          // Update already waiting when the user returns -> apply right away.
          if (fromFocus && reg.waiting && navigator.serviceWorker.controller) {
            applyingRef.current = true;
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
            return;
          }
          applyOnReady = fromFocus;
          reg.update().catch(() => {});
        };

        const onVisible = () => {
          if (document.visibilityState === "visible") poll(true);
        };
        document.addEventListener("visibilitychange", onVisible);
        const id = window.setInterval(() => poll(false), POLL_MS);
        cleanup = () => {
          document.removeEventListener("visibilitychange", onVisible);
          window.clearInterval(id);
        };
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnce);
      cleanup();
    };
  }, []);

  return { updateReady, applyUpdate };
}

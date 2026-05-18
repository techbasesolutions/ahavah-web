"use client";

import { useSyncExternalStore } from "react";

const MD_QUERY = "(min-width: 768px)";

/**
 * SSR-safe matchMedia for the `md` Tailwind breakpoint (768px).
 *
 * Uses useSyncExternalStore so the breakpoint state is read directly
 * from window.matchMedia at subscribe time — no setState-inside-effect,
 * no cascading render. The server snapshot is always `false` so the
 * first SSR render is mobile-shaped; the real value flips in on hydration.
 */
function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia(MD_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  return window.matchMedia(MD_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

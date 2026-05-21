"use client";

import { useEffect, useState } from "react";

import { getWaitlistCount } from "@/lib/waitlist";

/** Below this, the raw number is weak social proof, so we hide it and show
 *  "Be among the first" copy instead. */
export const WAITLIST_COUNT_FLOOR = 50;

/** Fetch the live waitlist count once on mount. Returns null while loading or
 *  on error — the count is decorative social proof, never an error surface. */
export function useWaitlistCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getWaitlistCount()
      .then((r) => {
        if (alive) setCount(r.count);
      })
      .catch(() => {
        /* decorative: ignore */
      });
    return () => {
      alive = false;
    };
  }, []);
  return count;
}

/** True when the count is real and above the social-proof floor. */
export function aboveFloor(count: number | null): count is number {
  return typeof count === "number" && count >= WAITLIST_COUNT_FLOOR;
}

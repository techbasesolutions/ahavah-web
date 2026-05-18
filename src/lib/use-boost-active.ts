"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { apiClient } from "@/lib/api-client";

/**
 * Polls `/tokens/active-boost` once per route change. Returns `true`
 * while the user has an in-flight boost. Failures are swallowed and
 * treated as "no active boost" so nav chrome never crashes on a
 * transient 401/404.
 *
 * Shared between BottomNav (mobile) and DesktopSidebar so the
 * boost-active visual lands on whichever surface is active.
 */
export function useBoostActive(): boolean {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<{ active: boolean }>("/tokens/active-boost")
      .then((res) => {
        if (!cancelled) setActive(Boolean(res?.active));
      })
      .catch(() => {
        if (!cancelled) setActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return active;
}

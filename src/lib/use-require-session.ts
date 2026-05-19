"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSessionToken } from "@/lib/api-client";

/**
 * Redirects to /auth/sign-in when no session token is present.
 * Used by behind-auth pages reachable from the URL bar (e.g. /help, /legal/*)
 * to bounce signed-out visitors back to the auth flow instead of letting
 * them see an authenticated chrome they have no business in.
 *
 * Returns nothing — the redirect happens as a side effect. The `next`
 * query param is set to the current pathname so /auth/sign-in can
 * forward back here after a successful sign-in.
 */
export function useRequireSession(returnTo?: string) {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getSessionToken()) {
      const next = returnTo ?? window.location.pathname;
      router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
    }
  }, [router, returnTo]);
}

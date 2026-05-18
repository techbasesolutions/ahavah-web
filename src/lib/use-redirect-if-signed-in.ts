"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient, ApiError, getSessionToken } from "@/lib/api-client";
import { readOnboarded, writeOnboarded } from "@/lib/onboarded-storage";

/**
 * Shared "if the user is already signed in, skip the auth screen"
 * effect. Used by /, /auth/sign-in, /auth/sign-up so a returning user
 * with a still-valid session never has to retype their email and
 * re-do the OTP just to land on /discover.
 *
 * Strategy:
 *   - No session token → nothing to do, render the page normally.
 *   - Session token present → probe /me. If it returns 200 with a
 *     person_uuid, the user IS a fully-onboarded member; redirect to
 *     `target` (default /discover). Self-heal the local onboarded
 *     flag too — same pattern useProfile uses.
 *   - /me 401 → the token is dead; render the page normally so the
 *     user can sign in fresh. We do NOT clear the token here; the
 *     api-client edge handler will route to /banned / /locked / etc.
 *     for status codes that genuinely need it.
 *
 * Returns `{ checking }` so the caller can render a brief neutral
 * placeholder instead of flashing the welcome screen during the probe.
 * The probe is single-roundtrip + bounded by /me's normal latency
 * (~200ms in prod), so the placeholder is barely visible.
 */
export function useRedirectIfSignedIn(target: string = "/discover"): {
  checking: boolean;
} {
  const router = useRouter();
  // Initial state must match between SSR and client's first paint to avoid
  // hydration mismatches. We start `false` on both, then flip to `true`
  // synchronously in the effect below if a session token is present. The
  // brief flash of the welcome surface before the effect runs is
  // intentional — preferable to a hydration error that regenerates the
  // entire tree and re-runs every child effect.
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      // No session — render the page normally; nothing to flip.
      return;
    }
    // Token present — enter the checking branch so the welcome surface
    // doesn't flash to a signed-in user during the /me probe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(true);
    let cancelled = false;
    void apiClient
      .get<Record<string, unknown>>("/me")
      .then((me) => {
        if (cancelled) return;
        const personUuid = typeof me.person_uuid === "string" ? me.person_uuid : null;
        if (personUuid) {
          // Heal the local flag so /discover trusts the session
          // without needing to wait for refreshProfile().
          if (!readOnboarded()) writeOnboarded(true);
          router.replace(target);
          return;
        }
        // /me returned but no person_uuid — the session belongs to a
        // mid-flight onboardee; let the page render so they can pick
        // up where they left off.
        setChecking(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // Token expired — render the page so the user can sign in.
          setChecking(false);
          return;
        }
        // Anything else (network down, 5xx): fail open and render the
        // page so the user isn't trapped behind a perpetual spinner.
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, target]);

  return { checking };
}

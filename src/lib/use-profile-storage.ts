/**
 * Profile cache adapter (Phase W).
 *
 * The backend (`GET /me`) is the source of truth for the current user's
 * profile. localStorage is a CACHE that lets us paint the UI synchronously
 * on first mount, before the server fetch resolves. Cache is never the
 * canonical state — `useProfile` re-fetches `/me` on every mount, then
 * overwrites the cache with the server's response.
 *
 * Design choices:
 *   - `loadProfileFromCache()` returns `Profile | null`, NOT `emptyProfile()`.
 *     An empty cache (`null`) is a meaningful signal to the caller meaning
 *     "nothing cached yet, paint a loading state or empty placeholder".
 *     Conflating "no cache" with "empty profile" hid hydration bugs.
 *   - Corrupted entries (invalid JSON) are dropped synchronously inside
 *     `loadProfileFromCache` so the next save can repopulate. Cache poisoning
 *     never crashes hydration.
 *   - SSR-safe: every export no-ops on the server (typeof window === "undefined")
 *     so importing the module from a server component never throws.
 *
 * The shared key constant lives in `storage-keys.ts` to keep all
 * persistence keys discoverable from one place.
 */

import type { Profile } from "@/lib/profile-schema";
import { PROFILE_CACHE_KEY } from "@/lib/storage-keys";

export function loadProfileFromCache(): Profile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    // Corrupted entry — drop it so the next save self-heals.
    try {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {
      // localStorage can throw on quota / privacy-mode browsers; swallow.
    }
    return null;
  }
}

export function saveProfileToCache(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Quota exceeded / privacy mode — cache is best-effort; never crash.
  }
}

export function clearProfileCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Same rationale as above.
  }
}

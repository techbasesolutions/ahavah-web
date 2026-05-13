"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import type { Profile } from "@/lib/profile-schema";
import {
  loadProfileFromCache,
  saveProfileToCache,
  clearProfileCache,
} from "@/lib/use-profile-storage";
import { apiClient, ApiError, setSessionToken } from "@/lib/api-client";
import { clearChatSession } from "@/lib/chat-session";

// Phase W gap: the frontend Profile schema is the Torah-observant product
// shape (firstName, assembly, tzitzit, ...), but the backend's
// PatchProfileInfo (duotypes/__init__.py:401) is the upstream Duolicious
// shape (name, no Torah fields). For every keystroke / selection in
// onboarding to not 422 with "Field firstName must not be None", we
// translate at this boundary:
//   - outbound (client -> server): rename mapped keys, drop unmapped ones
//     so the PATCH only carries fields the backend understands
//   - inbound (server -> client): rename mapped keys so the Input reading
//     profile.firstName sees the server's `name`
// Backend also enforces "exactly one field per PATCH" (model_validator at
// duotypes/__init__.py:444), so we never bundle multiple changes into a
// single request. Multi-field updates fan out into one PATCH each.
const CLIENT_TO_SERVER: Record<string, string> = {
  firstName: "name",
};
const SERVER_TO_CLIENT: Record<string, string> = Object.fromEntries(
  Object.entries(CLIENT_TO_SERVER).map(([k, v]) => [v, k]),
);

function translateInbound(server: Partial<Profile> | Record<string, unknown>): Partial<Profile> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(server)) {
    const clientKey = SERVER_TO_CLIENT[k] ?? k;
    out[clientKey] = v;
  }
  return out as Partial<Profile>;
}

function translateOutbound(patch: Partial<Profile>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const serverKey = CLIENT_TO_SERVER[k];
    if (serverKey) out[serverKey] = v;
    // Unmapped keys: client-only fields the backend doesn't model yet.
    // Silently dropped so the rest of onboarding can proceed; future
    // backend migrations will fill these in.
  }
  return out;
}

/**
 * Phase W: the backend (`GET /me`) is the source of truth for the current
 * user's profile. localStorage is a CACHE used only to paint the UI
 * synchronously on first mount before the network round-trip resolves.
 *
 * Flow on mount:
 *   1. Initial state seeds from cache via `loadProfileFromCache()` (sync).
 *      May be `{}` if nothing is cached — that is a valid empty render.
 *   2. `refreshProfile()` fires immediately after mount, hits `/me`, and
 *      overwrites state + cache with the server's view. `loaded` flips to
 *      true once that completes (success OR failure).
 *   3. On 401, cache + state are cleared so we don't render stale data
 *      under a logged-out session.
 *
 * Mutations (`update` / `setProfile`) are optimistic-with-rollback:
 *   - State + cache update immediately.
 *   - PATCH `/profile-info` fires in the background.
 *   - On failure the previous values are restored AND the error is
 *     re-thrown so the caller can render an error toast / retry UI.
 *
 * `signOut` POSTs `/sign-out` (best-effort; ignore errors) then clears
 * cache + state. The httpOnly session cookie is killed server-side.
 *
 * External surface preserved: `{ profile, setProfile, update, loaded }`.
 * Added: `signOut`, `refreshProfile`.
 *
 * NOTE on `profile` typing: it is `Partial<Profile>`, not `Profile`. Every
 * Profile field is already optional in the schema, so this is type-compatible
 * with all 27 existing consumers, but the change makes explicit that "no
 * value yet" and "empty profile" can be the same thing during hydration.
 */
export type UseProfileResult = {
  profile: Partial<Profile>;
  setProfile: (next: Partial<Profile>) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  loaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  // Seed from cache. `useState(initFn)` runs the initialiser exactly once
  // per component instance and is SSR-safe because `loadProfileFromCache`
  // no-ops on the server (returns null).
  const [profile, setProfileState] = useState<Partial<Profile>>(
    () => loadProfileFromCache() ?? {},
  );
  const [loaded, setLoaded] = useState(false);
  // Last successful server snapshot — kept for debugging / future
  // reconciliation logic (e.g. server-wins conflict resolution). Not part
  // of the public surface.
  const lastServerSnapshot = useRef<Partial<Profile> | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const server = await apiClient.get<Record<string, unknown>>("/me");
      const translated = translateInbound(server);
      lastServerSnapshot.current = translated;
      setProfileState(translated);
      saveProfileToCache(translated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session expired / never authenticated. Drop the cache so we
        // don't paint stale data on the next mount.
        clearProfileCache();
        setProfileState({});
      }
      // Non-401 errors (network down, 5xx, etc.) are swallowed: we keep
      // the cached state visible so the app stays usable offline. A
      // re-mount or explicit `refreshProfile()` call will retry.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Syncing React state with an external system (the backend) is the
    // canonical use case for `useEffect`. eslint's `set-state-in-effect`
    // rule fires generically because `refreshProfile` eventually calls
    // setState; here that is exactly the intended behavior.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshProfile();
  }, [refreshProfile]);

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      const prev = profile;
      const next = { ...prev, ...patch };
      // Optimistic: paint the patched state immediately.
      setProfileState(next);
      saveProfileToCache(next);
      // Translate to the backend's shape AND respect "exactly one field per
      // PATCH" by fanning out. Empty translation = client-only field, no
      // network call (we keep the optimistic state forever — the local
      // cache becomes source of truth until the backend models the field).
      const translated = translateOutbound(patch);
      const entries = Object.entries(translated);
      if (entries.length === 0) {
        lastServerSnapshot.current = next;
        return;
      }
      try {
        for (const [k, v] of entries) {
          await apiClient.patch("/profile-info", { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        // Rollback to the snapshot we had before the optimistic write.
        setProfileState(prev);
        saveProfileToCache(prev);
        throw err;
      }
    },
    [profile],
  );

  const setProfile = useCallback(
    async (next: Partial<Profile>) => {
      const prev = profile;
      setProfileState(next);
      saveProfileToCache(next);
      try {
        // Only send fields that actually changed. Avoids overwriting
        // server-only fields (id, created_at, etc.) the client never
        // touches but `/me` may echo back.
        const diff: Partial<Profile> = {};
        const prevRec = prev as Record<string, unknown>;
        const nextRec = next as Record<string, unknown>;
        for (const key of Object.keys(next) as Array<keyof Profile>) {
          const k = key as string;
          if (nextRec[k] !== prevRec[k]) {
            (diff as Record<string, unknown>)[k] = nextRec[k];
          }
        }
        // Translate + fan out one-PATCH-per-field (see `update` for why).
        const translated = translateOutbound(diff);
        for (const [k, v] of Object.entries(translated)) {
          await apiClient.patch("/profile-info", { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        setProfileState(prev);
        saveProfileToCache(prev);
        throw err;
      }
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    try {
      await apiClient.post("/sign-out", {});
    } catch {
      // Server-side sign-out may fail (network, already expired session)
      // but the local cleanup below MUST happen regardless or we leave
      // the UI in a logged-in-looking state.
    }
    clearProfileCache();
    clearChatSession();
    setSessionToken(null);
    setProfileState({});
    lastServerSnapshot.current = null;
  }, []);

  return { profile, setProfile, update, loaded, signOut, refreshProfile };
}

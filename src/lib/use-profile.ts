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
import { ALL_COUNTRIES } from "@/lib/countries";
import {
  readOnboarded,
  writeOnboarded,
  clearOnboarded,
} from "@/lib/onboarded-storage";

// Re-export so existing call sites that import { writeOnboarded } from
// "@/lib/use-profile" keep working without churn.
export { writeOnboarded } from "@/lib/onboarded-storage";

// Phase W gap: the frontend Profile schema is the Torah-observant product
// shape (firstName, assembly, tzitzit, ...) but the backend's
// PatchOnboardeeInfo (duotypes/__init__.py:281) / PatchProfileInfo
// (duotypes/__init__.py:401) are the upstream Duolicious shape (name,
// gender, relationship_status, ...). We translate at this boundary:
//   - outbound (client -> server): rename + value-transform mapped keys,
//     fan one input field into multiple PATCHes when needed (e.g. `sex`
//     also sets `other_peoples_genders`), drop unmappable Torah-observant
//     fields (assembly, polygyny, ...) so the rest of onboarding can
//     proceed
//   - inbound (server -> client): rename so profile.firstName reads the
//     server's `name`
// Backend enforces "exactly one field per PATCH" (model_validator at
// duotypes/__init__.py:309 and 444), so update() fans the translated
// entries into one PATCH per key.
type FieldTransform = (value: unknown) => Record<string, unknown> | null;

const MARITAL_STATUS_MAP: Record<string, string> = {
  "never-married": "Single",
  "married": "Married",
  "re-married": "Married",
  "divorced": "Divorced",
  "widowed": "Widowed",
};

const INTENT_TO_LOOKING_FOR_MARRIAGE = new Set([
  "first-wife",
  "additional-wife",
  "marriage-only",
]);

const TRANSFORMS: Record<string, FieldTransform> = {
  // Identity --------------------------------------------------------------
  firstName: (v) => (typeof v === "string" ? { name: v } : null),

  // Date of birth — backend's MIN_AGE is enforced server-side via the
  // computed age. Frontend already filtered <18.
  dob: (v) => (typeof v === "string" ? { date_of_birth: v } : null),

  // `age` alone can't reconstruct date_of_birth. We persist `dob`
  // separately (see /onboarding/dob/page.tsx) and ignore `age` here.
  age: () => null,

  // Sex maps to gender + auto-fills other_peoples_genders. Ahavah is
  // hetero-only per memory/feedback_ahavah_gender_binary.md; we infer
  // the opposite from the user's selection. The other PATCH must go
  // out separately because of the "one field per PATCH" rule.
  sex: (v) => {
    if (v === "female") {
      return { gender: "Woman", other_peoples_genders: ["Man"] };
    }
    if (v === "male") {
      return { gender: "Man", other_peoples_genders: ["Woman"] };
    }
    return null;
  },

  // Location — backend wants a "City, State, Country" string. We only
  // have ISO country code, so send the country name alone for now.
  // refining to include state/city when those fields ship.
  country: (v) => {
    if (typeof v !== "string") return null;
    const country = ALL_COUNTRIES.find((c) => c.cc === v);
    return country ? { location: country.name } : null;
  },

  // Relationship status --------------------------------------------------
  maritalStatus: (v) => {
    if (typeof v !== "string") return null;
    const mapped = MARITAL_STATUS_MAP[v];
    return mapped ? { relationship_status: mapped } : null;
  },

  // Children: integer count -> yes/no for backend's has_kids
  children: (v) => {
    if (typeof v !== "number") return null;
    return { has_kids: v > 0 ? "Yes" : "No" };
  },

  // Looking-for / intent ------------------------------------------------
  intent: (v) => {
    if (typeof v !== "string") return null;
    return {
      looking_for: INTENT_TO_LOOKING_FOR_MARRIAGE.has(v)
        ? "Marriage"
        : "Long-term dating",
    };
  },

  // Bio -----------------------------------------------------------------
  bio: (v) => (typeof v === "string" && v.length > 0 ? { about: v } : null),

  // Occupation / education are 1:1 string renames.
  occupation: (v) =>
    typeof v === "string" && v.length > 0 ? { occupation: v } : null,
  education: (v) =>
    typeof v === "string" && v.length > 0 ? { education: v } : null,

  // Ethnicities — backend takes a single string; send the first entry.
  ethnicities: (v) => {
    if (!Array.isArray(v) || v.length === 0) return null;
    const first = v[0];
    return typeof first === "string" ? { ethnicity: first } : null;
  },

  // Unmappable Torah-observant fields stay client-only. Any onboarding
  // step that updates these will optimistically cache the value in
  // localStorage but skip the PATCH. Listed explicitly so a future
  // reader knows these are KNOWN drops (not unhandled).
  //   assembly, torahLevel, shabbat, feastDays, calendar,
  //   polygyny, headCovering, tzitzit, familyViews, livingPreferences,
  //   healthTags, interests, personalityTraits, relocation,
  //   communicationPrefs, verificationTags, boundaryTags,
  //   voiceIntroUrl, promptCards, showOnMap
  //
  // Photos go through photo-storage.ts (multipart-style PATCH); the
  // `photos` field here is the cached client-side list and should not
  // PATCH directly. Skip.
  photos: () => null,
};

const SERVER_TO_CLIENT_KEY: Record<string, keyof Profile> = {
  name: "firstName",
};

function translateInbound(server: Partial<Profile> | Record<string, unknown>): Partial<Profile> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(server)) {
    const clientKey = SERVER_TO_CLIENT_KEY[k] ?? k;
    out[clientKey] = v;
  }
  return out as Partial<Profile>;
}

function translateOutbound(patch: Partial<Profile>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const transform = TRANSFORMS[k];
    if (!transform) continue; // unmapped → client-only, no PATCH
    const entries = transform(v);
    if (!entries) continue;
    Object.assign(out, entries);
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
  /**
   * Graduate the current onboardee into a full member by POSTing
   * /finish-onboarding, flipping the local ONBOARDED flag so subsequent
   * PATCHes route to /profile-info, and refreshing /me. Idempotent —
   * safe to call from /onboarding/complete on mount.
   */
  finishOnboarding: () => Promise<void>;
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
    // /me requires a person row. Onboardees don't have one yet and the
    // endpoint 401s for them. Hitting it anyway and then clobbering local
    // state on 401 wipes the optimistically-cached answers from earlier
    // onboarding steps (sex, dob, ...), so the next page redirects back
    // to "fix" the now-missing field. During onboarding, the cache *is*
    // the source of truth — don't touch it.
    if (!readOnboarded()) {
      setLoaded(true);
      return;
    }
    try {
      const server = await apiClient.get<Record<string, unknown>>("/me");
      const translated = translateInbound(server);
      lastServerSnapshot.current = translated;
      setProfileState(translated);
      saveProfileToCache(translated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session expired post-onboarding. Drop the cache so we don't
        // paint stale data on the next mount.
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
      // Route to /onboardee-info vs /profile-info based on whether the user
      // has finished onboarding. Backend enforces this distinction via
      // `expected_onboarding_status` decorator — calling the wrong endpoint
      // returns 400 "Not authorized" and we'd roll the input back.
      const endpoint = readOnboarded() ? "/profile-info" : "/onboardee-info";
      try {
        for (const [k, v] of entries) {
          await apiClient.patch(endpoint, { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        // Do NOT rollback the optimistic state. The user just typed
        // "Ehud"; rolling back to prev erases the input visually for a
        // problem they can't see (auth failure, server hiccup, etc.) and
        // makes the wizard feel broken. localStorage cache still holds
        // the latest, and a future successful PATCH (or /finish-onboarding)
        // will sync it. Rethrow so callers that DO care (e.g. final
        // submit) can react.
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
        const endpoint = readOnboarded() ? "/profile-info" : "/onboardee-info";
        for (const [k, v] of Object.entries(translated)) {
          await apiClient.patch(endpoint, { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        // Same reasoning as `update` above — keep the optimistic state.
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
    clearOnboarded();
    setProfileState({});
    lastServerSnapshot.current = null;
  }, []);

  const finishOnboarding = useCallback(async () => {
    await apiClient.post("/finish-onboarding", {});
    writeOnboarded(true);
    await refreshProfile();
  }, [refreshProfile]);

  return {
    profile,
    setProfile,
    update,
    loaded,
    signOut,
    refreshProfile,
    finishOnboarding,
  };
}

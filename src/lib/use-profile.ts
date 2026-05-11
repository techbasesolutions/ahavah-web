"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type Profile,
  emptyProfile,
} from "@/lib/profile-schema";
import {
  loadProfile,
  saveProfile,
} from "@/lib/use-profile-storage";

/**
 * Client-side profile hook. Reads from localStorage on mount, exposes
 * `profile` + `setProfile` + an `update(patch)` helper. Persists every
 * change to localStorage automatically.
 *
 * SSR-safe: returns emptyProfile() on first render server-side and
 * rehydrates from localStorage on mount.
 */
export function useProfile(): {
  profile: Profile;
  setProfile: (p: Profile) => void;
  update: (patch: Partial<Profile>) => void;
  loaded: boolean;
} {
  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Mount-time hydration from localStorage: SSR renders with emptyProfile
    // (matches the server), then the client immediately re-renders with the
    // stored value. eslint's set-state-in-effect rule warns generically;
    // this is the canonical pattern for syncing React state with an
    // external store (localStorage) on first mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileState(loadProfile());
    setLoaded(true);
  }, []);

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    saveProfile(next);
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);

  return { profile, setProfile, update, loaded };
}

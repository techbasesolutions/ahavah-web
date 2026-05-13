/**
 * usePhotoQuota — derives quota state from the user's profile.
 *
 * Backend does NOT surface `usedBytes` or `limitBytes` (the /profile-info
 * shape only tells us position-keyed photo UUIDs). We compute everything
 * from the in-hand profile:
 *
 *   - maxPhotos       = 7  (duotypes MAX_PHOTO_POSITION)
 *   - currentPhotoCount = profile.photos?.length ?? 0
 *   - usedBytes / limitBytes = 0 sentinel (do not render "X/Y MB" UX)
 *
 * `loading` mirrors useProfile().loaded. `refresh` is a callable the
 * consumer can wire to whatever profile-refetch story Agent 1 ships —
 * for now it's a stable no-op so call sites don't break on the eventual
 * backend swap. When useProfile() gains a refresh() method, point this
 * passthrough at it.
 */

"use client";

import { useCallback, useMemo } from "react";

import { getQuota } from "@/lib/photo-storage";
import type { QuotaInfo } from "@/lib/photo-types";
import { useProfile } from "@/lib/use-profile";

export type UsePhotoQuotaResult = {
  quota: QuotaInfo;
  loading: boolean;
  refresh: () => void;
};

export function usePhotoQuota(): UsePhotoQuotaResult {
  const { profile, loaded } = useProfile();

  // profile.photos: PhotoRecord[] (Task 3.8 made this canonical).
  const currentPhotoCount = profile.photos?.length ?? 0;

  const quota = useMemo<QuotaInfo>(
    () => getQuota(currentPhotoCount),
    [currentPhotoCount],
  );

  const refresh = useCallback(() => {
    // No-op passthrough. Agent 1's backend-wired useProfile() will gain
    // a refresh() method; once it lands, wire here. The stable reference
    // means consumers can safely use this in dep arrays today.
  }, []);

  return { quota, loading: !loaded, refresh };
}

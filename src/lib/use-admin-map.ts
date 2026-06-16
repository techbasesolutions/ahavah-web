"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";
import type { DiscoverCandidate } from "@/lib/discover-engine";
import { cdnUrlFor } from "@/lib/photo-storage";
import type { PhotoRecord } from "@/lib/photo-types";

/**
 * Adapt one GET /admin/map row to the DiscoverCandidate shape the map's
 * MapAvatar renders. Mirrors the field mapping in use-discover-deck so an
 * admin pin looks identical to a normal one (the backend returns the same
 * snake_case field names as Q_CACHED_SEARCH on purpose).
 */
function toCandidate(r: Record<string, unknown>): DiscoverCandidate {
  const loc = typeof r.location === "string" ? r.location : "";
  const city = loc.split(",").map((s) => s.trim()).filter(Boolean)[0];
  const countryIso =
    typeof r.country === "string" && r.country.length === 2
      ? (r.country as string).toUpperCase()
      : undefined;
  const rawPhotoUuids = Array.isArray(r.photo_uuids)
    ? (r.photo_uuids as ReadonlyArray<unknown>).filter(
        (u): u is string => typeof u === "string" && u.length > 0,
      )
    : [];
  const photos: PhotoRecord[] = rawPhotoUuids.map((uuid, i) => ({
    uuid,
    cdn_url: cdnUrlFor(uuid),
    position: i + 1,
    moderation_state: "approved",
    nsfw_score: null,
    created_at: "",
  }));
  return {
    ...(r as Partial<DiscoverCandidate>),
    id: (r.prospect_uuid as string | undefined) ?? "",
    firstName: r.name as string | undefined,
    age: typeof r.age === "number" ? r.age : undefined,
    city: city || undefined,
    country: countryIso,
    photos,
    latitude: typeof r.latitude === "number" ? r.latitude : undefined,
    longitude: typeof r.longitude === "number" ? r.longitude : undefined,
    seconds_since_last_online:
      typeof r.seconds_since_last_online === "number"
        ? (r.seconds_since_last_online as number)
        : undefined,
    // Admin view shows opt-outs too, so we keep the real flag but the map
    // page does NOT filter on it in admin mode.
    showOnMap: typeof r.show_on_map === "boolean" ? r.show_on_map : undefined,
  } as DiscoverCandidate;
}

/**
 * Admin-only "show everyone" map data. Fetches GET /admin/map (every
 * activated user, UNFILTERED — no verified-only / gender / age / skip / pill
 * filters) and adapts to DiscoverCandidate[]. No-ops and returns [] when
 * `enabled` is false, so non-admins never hit the admin endpoint.
 */
const EMPTY: readonly DiscoverCandidate[] = [];

export function useAdminMapUsers(
  enabled: boolean,
): readonly DiscoverCandidate[] {
  const [users, setUsers] = useState<readonly DiscoverCandidate[]>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void apiClient
      .get<{ users?: Array<Record<string, unknown>> }>("/admin/map")
      .then((res) => {
        if (cancelled) return;
        setUsers((res.users ?? []).map(toCandidate));
      })
      .catch(() => {
        if (!cancelled) setUsers(EMPTY);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // When disabled, report empty without a synchronous setState in the effect.
  // Any stale `users` from a prior enable is masked until the next fetch.
  return enabled ? users : EMPTY;
}

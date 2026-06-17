"use client";

/**
 * useMapMarkers — marker source for /map.
 *
 * Fetches the viewer's full set of map markers in one call (GET /map/markers,
 * the viewer's compatible matches; or GET /admin/map, all activated users, in
 * admin "show everyone" mode). Each marker is an individual point; the map
 * renders them as avatar pins and lets Leaflet's client-side
 * MarkerClusterGroup cluster + spiderfy them (so same-coordinate users fan
 * apart on tap). Fetched once per filter set (not per pan), so panning is
 * instant and pins are present on first load.
 *
 * A monotonic request-sequence ref drops out-of-order responses (e.g. an
 * admin-toggle flip mid-flight) so a slow earlier fetch can't clobber a newer
 * one.
 */

import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";

export interface MapMarker {
  lat: number;
  lng: number;
  uuid?: string | null;
  name?: string | null;
  photo_uuid?: string | null;
  country?: string | null;
}

export interface UseMapMarkersOptions {
  /** Hit GET /admin/map (all activated users) instead of GET /map/markers. */
  admin?: boolean;
  /** When false, the hook never fetches and returns []. */
  enabled?: boolean;
  /**
   * Opaque value that changes whenever the viewer's search_cache is rebuilt
   * (e.g. the deck re-runs /search after a filter change). Pass the deck's
   * result array so the map re-reads the freshly-filtered cache. Compared by
   * identity.
   */
  refreshKey?: unknown;
}

const EMPTY: readonly MapMarker[] = [];

function toMarker(r: Record<string, unknown>): MapMarker | null {
  if (typeof r.lat !== "number" || typeof r.lng !== "number") return null;
  return {
    lat: r.lat,
    lng: r.lng,
    uuid: typeof r.uuid === "string" ? r.uuid : null,
    name: typeof r.name === "string" ? r.name : null,
    photo_uuid: typeof r.photo_uuid === "string" ? r.photo_uuid : null,
    country: typeof r.country === "string" ? r.country : null,
  };
}

export function useMapMarkers(
  opts?: UseMapMarkersOptions,
): readonly MapMarker[] {
  const admin = opts?.admin ?? false;
  const enabled = opts?.enabled ?? true;
  const refreshKey = opts?.refreshKey;

  const [markers, setMarkers] = useState<readonly MapMarker[]>(EMPTY);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const seq = ++requestSeq.current;
    const path = admin ? "/admin/map" : "/map/markers";

    void apiClient
      .get<{ markers?: Array<Record<string, unknown>> }>(path)
      .then((res) => {
        if (seq !== requestSeq.current) return; // superseded
        setMarkers(
          (res.markers ?? [])
            .map(toMarker)
            .filter((m): m is MapMarker => m !== null),
        );
      })
      .catch(() => {
        if (seq === requestSeq.current) setMarkers(EMPTY);
      });
    // refreshKey re-reads the cache after a filter-driven rebuild (identity).
  }, [admin, enabled, refreshKey]);

  return enabled ? markers : EMPTY;
}

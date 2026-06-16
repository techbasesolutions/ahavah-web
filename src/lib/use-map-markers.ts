"use client";

/**
 * useMapMarkers — viewport-clustered marker source for /map.
 *
 * Replaces the deck-as-marker-source model. The viewport drives the data:
 * every pan/zoom settle emits a fresh bbox + zoom, and this hook fetches a
 * bounded, server-clustered set of markers for exactly what is in view
 * (GET /map/markers, or GET /admin/map in admin "show everyone" mode). The
 * payload is bounded by viewport area / cell size, never by user count, so
 * it scales past /search's 1000-row cap.
 *
 * The backend clusters server-side: `count > 1` is a count bubble at the
 * cell centroid; `count === 1` carries the singleton's uuid/name/photo/
 * country so the frontend can draw a real avatar pin.
 *
 * Debounce + stale-response guard mirror use-discover-deck.ts: rapid
 * panning coalesces into a single ~300ms-debounced fetch, and a monotonic
 * request-sequence ref drops out-of-order responses so a slow earlier
 * fetch can't clobber a fresher viewport's markers.
 */

import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";

export interface MapMarker {
  lat: number;
  lng: number;
  count: number;
  uuid?: string | null;
  name?: string | null;
  photo_uuid?: string | null;
  country?: string | null;
}

export interface MapMarkersBbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface UseMapMarkersOptions {
  /** Hit GET /admin/map (all activated users) instead of GET /map/markers. */
  admin?: boolean;
  /** When false, the hook never fetches and returns []. */
  enabled?: boolean;
  /**
   * Opaque value that changes whenever the viewer's search_cache is rebuilt
   * (e.g. the deck re-runs /search after a filter change). Pass the deck's
   * result array so the map re-reads the freshly-filtered cache without
   * waiting for the next pan. Compared by identity.
   */
  refreshKey?: unknown;
}

const EMPTY: readonly MapMarker[] = [];

// Coerce one raw response item to a MapMarker, dropping anything without
// numeric coordinates + count. The optional detail fields are passed
// through only when present (cnt === 1 rows carry them; cnt > 1 omit them).
function toMarker(r: Record<string, unknown>): MapMarker | null {
  if (
    typeof r.lat !== "number" ||
    typeof r.lng !== "number" ||
    typeof r.count !== "number"
  ) {
    return null;
  }
  return {
    lat: r.lat,
    lng: r.lng,
    count: r.count,
    uuid: typeof r.uuid === "string" ? r.uuid : null,
    name: typeof r.name === "string" ? r.name : null,
    photo_uuid: typeof r.photo_uuid === "string" ? r.photo_uuid : null,
    country: typeof r.country === "string" ? r.country : null,
  };
}

export function useMapMarkers(
  bbox: MapMarkersBbox | null,
  zoom: number,
  opts?: UseMapMarkersOptions,
): readonly MapMarker[] {
  const admin = opts?.admin ?? false;
  const enabled = opts?.enabled ?? true;
  const refreshKey = opts?.refreshKey;

  const [markers, setMarkers] = useState<readonly MapMarker[]>(EMPTY);

  // Monotonic request counter. Each fetch captures its own seq; a stale
  // in-flight response (the viewport changed while the call was in flight)
  // checks the ref after the await and bails before overwriting the
  // fresher response's state. Mirrors use-discover-deck.ts's requestSeq.
  const requestSeq = useRef(0);

  // Round the zoom so a tiny fractional jitter (Leaflet can report
  // non-integer zoom mid-animation) doesn't re-key the effect and refetch.
  const roundedZoom = Math.round(zoom);

  useEffect(() => {
    if (!enabled || !bbox) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarkers(EMPTY);
      return;
    }

    // Debounce: collapse a burst of pan/zoom settles into a single fetch.
    const timer = setTimeout(() => {
      const seq = ++requestSeq.current;
      const params = new URLSearchParams();
      params.set(
        "bbox",
        `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
      );
      params.set("zoom", String(roundedZoom));
      const base = admin ? "/admin/map" : "/map/markers";
      const path = `${base}?${params.toString()}`;

      void apiClient
        .get<{ markers?: Array<Record<string, unknown>> }>(path)
        .then((res) => {
          // Stale-response check: a fresher fetch superseded us — drop this
          // result and let the newer call own the state.
          if (seq !== requestSeq.current) return;
          const next = (res.markers ?? [])
            .map(toMarker)
            .filter((m): m is MapMarker => m !== null);
          setMarkers(next);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          // Quiet fail — empty viewport rather than a stale/error overlay.
          setMarkers(EMPTY);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
    // refreshKey re-reads the cache after a filter-driven rebuild (identity).
  }, [admin, enabled, bbox, roundedZoom, refreshKey]);

  return enabled && bbox ? markers : EMPTY;
}

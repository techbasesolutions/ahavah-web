"use client";

import type { BBox } from "@/lib/continent-bbox";

/**
 * Map lens — viewport-driven discovery (SOT: "Ahavah Map Lens" export,
 * 2026-07-19 brief).
 *
 * The map page persists its last settled viewport bbox here; when the
 * member turns the lens ON (filters.mapLens), the discover deck ranks
 * candidates inside that bbox FIRST. Fully client-side: no extra API
 * calls, no pan-triggered searches (the lag that killed the old
 * bbox-driven country filter).
 *
 * Never-empty rule: the lens RE-ORDERS, it never excludes. Candidates
 * outside the area (or without shared coordinates) rank after, they do
 * not disappear. A world-spanning bbox (the zoomed-all-the-way-out
 * first-visit view) means no lens at all.
 */

export const LENS_BBOX_KEY = "ahavah.map.lens.bbox.v1";

/** Persist the last settled map viewport. Called on every Leaflet
 *  moveend, so "the area you last viewed on the map" is always current
 *  by the time the member leaves the page. */
export function saveLensBbox(bbox: BBox): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LENS_BBOX_KEY, JSON.stringify(bbox));
  } catch {
    /* storage unavailable — lens just won't have an area */
  }
}

export function loadLensBbox(): BBox | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LENS_BBOX_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BBox>;
    if (
      typeof v?.north === "number" &&
      typeof v?.south === "number" &&
      typeof v?.east === "number" &&
      typeof v?.west === "number"
    ) {
      return { north: v.north, south: v.south, east: v.east, west: v.west };
    }
    return null;
  } catch {
    return null;
  }
}

/** A bbox that spans (almost) the whole world carries no locality
 *  signal — the lens is a no-op there rather than "everyone is near". */
export function isWorldSpan(bbox: BBox): boolean {
  return bbox.east - bbox.west >= 300;
}

/** Point-in-bbox with antimeridian handling: Leaflet's world-wrapped
 *  bounds can put east/west outside [-180, 180], so compare longitudes
 *  relative to the western edge modulo 360. */
export function inLensBbox(lat: number, lng: number, bbox: BBox): boolean {
  if (lat < bbox.south || lat > bbox.north) return false;
  const span = bbox.east - bbox.west;
  const rel = (((lng - bbox.west) % 360) + 360) % 360;
  return rel <= span;
}

type LensTarget = {
  latitude?: number | null;
  longitude?: number | null;
};

/** Stable partition: candidates inside the bbox first, everyone else
 *  after in their original order. Missing/hidden coordinates count as
 *  outside — included, never excluded. */
export function applyMapLens<T extends LensTarget>(
  items: readonly T[],
  bbox: BBox | null,
): readonly T[] {
  if (!bbox || isWorldSpan(bbox)) return items;
  const inside: T[] = [];
  const outside: T[] = [];
  for (const item of items) {
    if (
      typeof item.latitude === "number" &&
      typeof item.longitude === "number" &&
      inLensBbox(item.latitude, item.longitude, bbox)
    ) {
      inside.push(item);
    } else {
      outside.push(item);
    }
  }
  return inside.length > 0 ? [...inside, ...outside] : items;
}

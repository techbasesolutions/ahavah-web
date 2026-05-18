"use client";

/**
 * <WorldMap> — react-leaflet + OpenStreetMap raster tile primitive.
 *
 * Renderer swap (2026-05-12): the previous d3-geo SVG implementation
 * letterboxed the world into the upper half of the viewport and looked
 * nothing like a real map. User feedback: "why does the map look like
 * shit? use a real google map interface or some other native map
 * software." This module now hosts a Leaflet MapContainer over OSM
 * raster tiles.
 *
 * Public contract:
 *   - `onBoundsChange(bbox)` fires after every pan/zoom settle (Leaflet's
 *     `moveend` event covers pan inertia + wheel zoom + pinch).
 *   - `bbox` prop — when set, the map calls `fitBounds` to fly to the
 *     given rectangle. Used by T4's continent picker.
 *   - `children` render inside the MapContainer, so MapAvatar markers
 *     (T3) and any future overlay layers get the react-leaflet context
 *     (useMap, useMapEvents) via React context.
 *
 * Coordinate convention: Leaflet uses `[lat, lng]` tuple order
 * everywhere. The previous d3-geo API was `[lng, lat]` (GeoJSON
 * convention); the `Viewport` type is removed entirely in favour of
 * a Bbox-driven prop so we don't have to flip ordering at the seam.
 *
 * SSR / hydration: Leaflet touches `window` at module load. Pages that
 * import this primitive MUST wrap the import in `next/dynamic` with
 * `ssr: false` (see /map/page.tsx).
 *
 * Tile provider: OpenStreetMap, no API key. Production can swap the
 * TileLayer `url` to Mapbox / Carto / Stadia / MapTiler with a paid
 * token if OSM's fair-use policy gets exceeded. Attribution is rendered
 * via Leaflet's built-in attribution control.
 */

import "leaflet/dist/leaflet.css";

import { useEffect, type ReactNode } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { cn } from "@/lib/utils";
import type { BBox } from "@/lib/continent-bbox";

/**
 * Cluster icon factory — replaces the library default red/blue circles
 * with a lavender-on-bg-elevated bubble matching the rest of the app.
 * Cluster bubble size scales mildly with count so a 20-marker cluster
 * looks bigger than a 2-marker one without becoming a sprawling blob.
 */
function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const n = cluster.getChildCount();
  const sz = n < 10 ? 36 : n < 100 ? 44 : 52;
  const html = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:${sz}px;height:${sz}px;
      border-radius:9999px;
      background:#1A1340;
      color:#D7FF81;
      border:2px solid #D7FF81;
      font-weight:800;
      font-size:${n < 100 ? 14 : 12}px;
      box-shadow:0 4px 12px rgba(0,0,0,0.35);
      font-variant-numeric:tabular-nums;
    ">${n}</div>
  `;
  return L.divIcon({
    html,
    className: "ahavah-cluster-icon",
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
  });
}

export type Bbox = BBox;

export interface WorldMapProps {
  /**
   * Fires with the current viewport bbox after every pan/zoom settle.
   */
  onBoundsChange?: (bbox: Bbox) => void;
  /**
   * Programmatic viewport — pass a bbox and Leaflet will `fitBounds`
   * (with animation, unless prefers-reduced-motion).
   */
  bbox?: Bbox;
  /** Overlay children — markers etc. Render inside MapContainer. */
  children?: ReactNode;
  /** Class overrides for the root MapContainer. */
  className?: string;
}

/**
 * Internal helper: lives inside MapContainer so it can call useMap /
 * useMapEvents. Emits bounds on `moveend`, and reacts to programmatic
 * `bbox` prop changes via fitBounds.
 */
function MapEventHandler({
  onBoundsChange,
  bbox,
}: {
  onBoundsChange?: (b: Bbox) => void;
  bbox?: Bbox;
}) {
  const map = useMap();

  // Programmatic bbox → fitBounds. Respect prefers-reduced-motion by
  // disabling the animation. The duration is short either way; the
  // bigger correctness win is killing the animation outright for users
  // who've opted out of motion.
  useEffect(() => {
    if (!bbox) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(
      [
        [bbox.south, bbox.west],
        [bbox.north, bbox.east],
      ],
      { animate: !reduced, duration: 0.6 },
    );
  }, [bbox, map]);

  // Bounds emitter. moveend fires after pan/zoom inertia settles —
  // there's no debounce because Leaflet already coalesces in-flight
  // movement into a single end event.
  useMapEvents({
    moveend: () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });

  return null;
}

export function WorldMap({
  onBoundsChange,
  bbox,
  children,
  className,
}: WorldMapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={10}
      worldCopyJump
      attributionControl
      className={cn("size-full bg-(--card)", className)}
      // z-index 0 so the absolute-positioned top bar overlay (z-20 in
      // /map page) stays above Leaflet's tile + control layers.
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEventHandler onBoundsChange={onBoundsChange} bbox={bbox} />
      {/* MarkerClusterGroup collapses overlapping markers into a single
          numeric bubble. Without this, every additional candidate at a
          country centroid pinned on top of the previous one. Click on a
          cluster zooms in until the children spread out. chunkedLoading
          keeps the UI responsive when there are 100+ markers. */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={45}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        iconCreateFunction={clusterIcon}
      >
        {children}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

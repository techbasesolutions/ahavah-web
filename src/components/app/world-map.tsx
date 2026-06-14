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
 * Tile provider (2026-06-14): CARTO raster basemaps, served from its
 * global CDN over four subdomains ({a,b,c,d}), no API key. Swapped off
 * raw OpenStreetMap tiles because osm.org's servers are rate-limited and
 * not CDN-backed, so panning loaded tiles "in stages". CARTO loads far
 * faster. Theme-aware: Voyager (light) in the light theme, Dark Matter
 * (dark_all) in the dark theme, resolved via the app's useTheme() so the
 * map matches the surrounding UI instead of being a bright rectangle in a
 * dark app. Attribution credits both OSM (data) and CARTO (rendering).
 *
 * Pan is bounded (maxBounds + maxBoundsViscosity=1) so the map can't be
 * dragged off the world into the grey void vertically; `noWrap` keeps a
 * single world copy (replaced the old worldCopyJump infinite horizontal
 * wrap, which fights a hard maxBounds).
 */

import "leaflet/dist/leaflet.css";

import { useEffect, type ReactNode } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { cn } from "@/lib/utils";
import type { BBox } from "@/lib/continent-bbox";
import { useTheme, resolveTheme } from "@/lib/theme";

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

/** Persisted viewport — map center + zoom, restored on next visit. */
export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface WorldMapProps {
  /**
   * Fires with the current viewport bbox after every pan/zoom settle.
   */
  onBoundsChange?: (bbox: Bbox) => void;
  /**
   * Fires with the map center + zoom after every pan/zoom settle. Used by
   * /map to persist the user's last position to localStorage.
   */
  onViewChange?: (view: MapView) => void;
  /**
   * Programmatic viewport — pass a bbox and Leaflet will `fitBounds`
   * (with animation, unless prefers-reduced-motion).
   */
  bbox?: Bbox;
  /**
   * Construction-time center [lat, lng]. Set this from a restored last
   * position so the map STARTS there (no flash + fly-in). Defaults to a
   * world view.
   */
  initialCenter?: [number, number];
  /** Construction-time zoom. Defaults to the most-zoomed-out level. */
  initialZoom?: number;
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
  onViewChange,
  bbox,
}: {
  onBoundsChange?: (b: Bbox) => void;
  onViewChange?: (v: MapView) => void;
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
      if (onBoundsChange) {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }
      if (onViewChange) {
        const c = map.getCenter();
        onViewChange({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
      }
    },
  });

  return null;
}

/**
 * Keeps the tile grid filling the container at every container size by
 * raising minZoom to the smallest zoom whose (square) world still covers
 * the longest container dimension. Without this, a fixed low minZoom lets
 * a large container (desktop) show the small world map letterboxed in
 * grey/themed margins. Recomputes on container resize.
 */
function FillController() {
  const map = useMap();

  useEffect(() => {
    const applyFill = () => {
      const el = map.getContainer();
      const longest = Math.max(el.clientWidth, el.clientHeight);
      if (!longest) return;
      // World tile grid is 256·2^zoom px square (EPSG:3857, 256px tiles).
      // coverZoom = smallest zoom where that square ≥ the longest side, so
      // the map can never zoom out far enough to expose a margin.
      const coverZoom = Math.max(0, Math.ceil(Math.log2(longest / 256)));
      if (map.getMinZoom() !== coverZoom) map.setMinZoom(coverZoom);
      if (map.getZoom() < coverZoom) map.setZoom(coverZoom, { animate: false });
    };
    applyFill();
    map.on("resize", applyFill);
    return () => {
      map.off("resize", applyFill);
    };
  }, [map]);

  return null;
}

export function WorldMap({
  onBoundsChange,
  onViewChange,
  bbox,
  initialCenter,
  initialZoom,
  children,
  className,
}: WorldMapProps) {
  // Theme-aware basemap — Dark Matter in the dark theme, Voyager in light,
  // resolved via the app's own theme store so it tracks live toggles.
  const { mode } = useTheme();
  const tileStyle = resolveTheme(mode) === "dark" ? "dark_all" : "voyager";

  return (
    <MapContainer
      center={initialCenter ?? [20, 0]}
      zoom={initialZoom ?? 1}
      minZoom={1}
      maxZoom={10}
      // Hard pan limit: you can't drag the map off the world. Latitude is
      // clamped to Web Mercator's usable range (±85), longitude to one
      // world copy. Viscosity 1.0 makes the edge solid (no rubber-band
      // past it) — fixes "scroll past the vertical limit into grey void".
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      maxBoundsViscosity={1.0}
      attributionControl
      className={cn("size-full bg-(--card)", className)}
      // z-index 0 so the absolute-positioned top bar overlay (z-20 in
      // /map page) stays above Leaflet's tile + control layers. The inline
      // background overrides Leaflet's default grey .leaflet-container fill
      // so the letterbox bands at the zoomed-all-the-way-out world view
      // match the theme instead of showing grey.
      style={{ zIndex: 0, background: "var(--card)" }}
    >
      <TileLayer
        // key forces a clean tile-layer remount when the theme flips, so
        // the basemap swaps light<->dark instead of blending stale tiles.
        key={tileStyle}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/rastertiles/${tileStyle}/{z}/{x}/{y}.png`}
        subdomains="abcd"
        // Single world copy (pairs with maxBounds).
        noWrap
        // Smoother panning: preload more off-screen tiles (default 2) and
        // fetch during the pan gesture rather than only after it settles,
        // so tiles are already there instead of loading "in stages".
        keepBuffer={4}
        updateWhenIdle={false}
        updateWhenZooming={false}
      />
      <MapEventHandler
        onBoundsChange={onBoundsChange}
        onViewChange={onViewChange}
        bbox={bbox}
      />
      <FillController />
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

"use client";

/**
 * <WorldMap> — pan/zoom SVG world primitive for sub-plan 14 (Discover Map).
 *
 * Architecture (per sub-plan 14 spec, T2):
 *
 *   - Projects ~177 country features (world-atlas/countries-110m) through
 *     d3-geo's geoNaturalEarth1() onto an 800×450 viewBox. The features are
 *     pre-projected once at module load — the SVG <path> `d` strings are
 *     static; only the parent <g>'s CSS transform changes during zoom.
 *
 *   - d3-zoom attaches pan + scroll-zoom + pinch-zoom (touch). The current
 *     ZoomTransform is held in React state so consumer-rendered children
 *     (markers, T3) ride the same transform inside the same <g>.
 *
 *   - onBoundsChange(bbox) — debounced 200ms — fires after pan/zoom settles
 *     so consumers can react to the visible viewport. The bbox shape matches
 *     `BBox` from `@/lib/continent-bbox` ({ north, south, east, west }).
 *
 *   - viewport prop — programmatic pan/zoom triggered by parent state
 *     (e.g. T4's continent picker). Respects prefers-reduced-motion: skips
 *     the 500ms d3 transition when the OS setting is on.
 *
 * Accessibility: <svg role="img" aria-label="World map">. Country paths are
 * aria-hidden — they're decorative geometry; markers (T3) handle aria.
 * Keyboard navigation across regions is delegated to the continent picker
 * (T4) since d3-zoom doesn't ship keyboard handlers.
 *
 * The CSS class names refer to Phase D tokens (bg-bg-elevated, fill-white/5
 * for strokes). If a token name needs to be revisited the consumer can
 * override via the className prop.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { feature } from "topojson-client";
import {
  geoNaturalEarth1,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { select } from "d3-selection";
// d3-transition is imported for its side effect: it patches
// d3-selection.Selection.prototype.transition so `svg.transition()` resolves
// at runtime. The named import keeps tree-shaking honest.
import "d3-transition";
import { zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";

import countries110m from "world-atlas/countries-110m.json";
import { cn } from "@/lib/utils";
import type { BBox } from "@/lib/continent-bbox";

// --- Constants ------------------------------------------------------------

/** Internal SVG coordinate space — viewBox dimensions. */
const WIDTH = 800;
const HEIGHT = 450;

/** Zoom range. 1 = whole world; 10 ≈ one continent. */
const SCALE_MIN = 1;
const SCALE_MAX = 10;

/** Debounce window for onBoundsChange (per sub-plan 14 spec). */
const BOUNDS_DEBOUNCE_MS = 200;

/** Programmatic viewport transition duration. */
const VIEWPORT_TRANSITION_MS = 500;

// --- Feature collection (pre-computed once at module load) ----------------

/**
 * world-atlas ships a TopoJSON Topology object; we extract the `countries`
 * object as a GeoJSON FeatureCollection and freeze it. ~177 features after
 * conversion at the 110m resolution.
 */
const COUNTRIES_FEATURES = feature(
  // The runtime shape of countries-110m.json is `Topology` but the JSON's
  // inferred type from `resolveJsonModule` doesn't have the topojson literal
  // union narrowed correctly. One controlled cast keeps the rest of the file
  // strongly typed.
  countries110m as unknown as Parameters<typeof feature>[0],
  (countries110m as unknown as { objects: { countries: Parameters<typeof feature>[1] } })
    .objects.countries,
) as unknown as FeatureCollection<Geometry, { name: string }>;

/**
 * Single projection instance, fit-sized to the viewBox once. Constant for the
 * lifetime of the module — every WorldMap instance shares the same projection
 * function (read-only).
 */
const PROJECTION: GeoProjection = geoNaturalEarth1().fitSize(
  [WIDTH, HEIGHT],
  COUNTRIES_FEATURES as unknown as GeoPermissibleObjects,
);

const PATH = geoPath(PROJECTION);

/**
 * Tight SVG bbox of the actual projected earth — NaturalEarth1 fitSize'd
 * to 800×450 leaves vertical bands above/below the earth where invert()
 * returns finite-but-bogus lat/lng. We clamp screen corners to this box
 * before inverting in {@link computeBbox} so the reported bbox always
 * corresponds to actual earth that's visible on screen.
 *
 * Derived from `geoPath.bounds(features)`, which returns
 * `[[xMin, yMin], [xMax, yMax]]`.
 */
const EARTH_BOUNDS = PATH.bounds(COUNTRIES_FEATURES as unknown as GeoPermissibleObjects);
const EARTH_X_MIN = EARTH_BOUNDS[0][0];
const EARTH_Y_MIN = EARTH_BOUNDS[0][1];
const EARTH_X_MAX = EARTH_BOUNDS[1][0];
const EARTH_Y_MAX = EARTH_BOUNDS[1][1];

/**
 * Pre-projected `d` attribute for every country. Computed once so the
 * map renders fast on initial paint and React only re-renders the wrapping
 * <g transform=…> during zoom/pan.
 */
const COUNTRY_PATHS: ReadonlyArray<{ id: string | number; d: string }> = (() => {
  const out: Array<{ id: string | number; d: string }> = [];
  for (const f of COUNTRIES_FEATURES.features) {
    const d = PATH(f as unknown as GeoPermissibleObjects);
    if (!d) continue;
    out.push({ id: (f.id ?? f.properties?.name ?? out.length) as string | number, d });
  }
  return out;
})();

/** Public re-export so consumers can read the projection (e.g. for T3 marker placement). */
export const WORLD_MAP_PROJECTION: GeoProjection = PROJECTION;
export const WORLD_MAP_WIDTH = WIDTH;
export const WORLD_MAP_HEIGHT = HEIGHT;

// --- Bbox computation -----------------------------------------------------

/**
 * Given a d3 ZoomTransform, invert the four screen corners of the SVG
 * viewport back to (longitude, latitude) and return the enclosing bbox.
 *
 * The transform maps world-space [0..WIDTH, 0..HEIGHT] → screen-space:
 *   screen.x = transform.x + worldX * transform.k
 * So to find the world coordinate at screen corner (sx, sy):
 *   worldX = (sx - transform.x) / transform.k
 *
 * Then PROJECTION.invert([worldX, worldY]) yields [lng, lat].
 *
 * Returns `null` if any corner inversion fails (projection edge cases).
 */
/**
 * Number of points to sample along each edge of the viewport when computing
 * the bbox. NaturalEarth1 is a non-rectangular projection — its left/right
 * edges curve inward at high latitudes, so corner-only sampling produces
 * geographically incorrect bbox extents at low zoom levels. 16 samples per
 * edge × 4 edges = 64 inversions: fast and accurate enough for the bbox to
 * cover all on-screen earth without false negatives in T3's pin filtering.
 */
const BBOX_EDGE_SAMPLES = 16;

function clampLng(lng: number): number {
  return Math.max(-180, Math.min(180, lng));
}
function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

function computeBbox(transform: ZoomTransform): BBox | null {
  const invert = PROJECTION.invert;
  if (!invert) return null;

  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  const sample = (sx: number, sy: number) => {
    // Map screen-space → world-space (pre-zoom SVG coords).
    let worldX = (sx - transform.x) / transform.k;
    let worldY = (sy - transform.y) / transform.k;
    // Clamp to the actual projected earth's SVG bounding box so we don't
    // sample bogus-finite values outside the projection's valid extent.
    worldX = Math.max(EARTH_X_MIN, Math.min(EARTH_X_MAX, worldX));
    worldY = Math.max(EARTH_Y_MIN, Math.min(EARTH_Y_MAX, worldY));
    const lngLat = invert([worldX, worldY]);
    if (!lngLat) return;
    const lng = clampLng(lngLat[0]);
    const lat = clampLat(lngLat[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  };

  // Sample around the perimeter of the viewport. This handles NaturalEarth1's
  // curved meridians at high latitudes — the leftmost/rightmost on-screen
  // earth at row Y is NOT at SVG x=0 / x=WIDTH unless Y is at the equator.
  for (let i = 0; i <= BBOX_EDGE_SAMPLES; i++) {
    const t = i / BBOX_EDGE_SAMPLES;
    // Top + bottom edges
    sample(t * WIDTH, 0);
    sample(t * WIDTH, HEIGHT);
    // Left + right edges
    sample(0, t * HEIGHT);
    sample(WIDTH, t * HEIGHT);
  }

  if (
    !Number.isFinite(north) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(west)
  ) {
    return null;
  }

  return { north, south, east, west };
}

// --- Types ----------------------------------------------------------------

export type Viewport = {
  /** [longitude, latitude] of the desired viewport center. */
  center: [number, number];
  /** d3-zoom scale factor (1 = whole world, up to SCALE_MAX). */
  zoom: number;
};

export interface WorldMapProps {
  /**
   * Fires (debounced 200ms) with the current viewport bbox whenever the user
   * finishes panning/zooming, or after a programmatic viewport change settles.
   */
  onBoundsChange?: (bbox: BBox) => void;
  /**
   * Programmatic viewport. Setting this prop animates (500ms, or instant if
   * prefers-reduced-motion) to the given center+zoom. Used by T4's continent
   * picker.
   */
  viewport?: Viewport;
  /**
   * Markers / overlays to render inside the same zoom transform. The
   * coordinate space is SVG pixels (the viewBox), not lng/lat — consumers
   * project lng/lat via `WORLD_MAP_PROJECTION([lng, lat])`.
   */
  children?: ReactNode;
  /** Class overrides for the root <svg>. */
  className?: string;
}

// --- Component ------------------------------------------------------------

export function WorldMap({
  onBoundsChange,
  viewport,
  children,
  className,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);

  // Keep the latest callback in a ref so the d3-zoom binding stays stable
  // across renders (we don't want to re-attach the behavior just because the
  // parent passed a new function identity).
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // Mirror the latest transform into a ref so the debounced bounds callback
  // (fired by d3-zoom's `end` event) always reads the most recent value
  // without restarting the timer on every React state update.
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Pre-resolve reduce-motion at mount. Listeners aren't needed for this
  // primitive — the duration only matters at the moment of a viewport change.
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Attach d3-zoom once. We store the behavior instance so the viewport
  // effect can call into it without re-attaching.
  const zoomBehaviorRef = useRef<ReturnType<
    typeof zoom<SVGSVGElement, unknown>
  > | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = select<SVGSVGElement, unknown>(svgEl);

    let boundsTimer: ReturnType<typeof setTimeout> | null = null;
    const fireBoundsDebounced = () => {
      if (boundsTimer !== null) clearTimeout(boundsTimer);
      boundsTimer = setTimeout(() => {
        const cb = onBoundsChangeRef.current;
        if (!cb) return;
        const bbox = computeBbox(transformRef.current);
        if (bbox) cb(bbox);
      }, BOUNDS_DEBOUNCE_MS);
    };

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([SCALE_MIN, SCALE_MAX])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on("zoom", (event) => {
        setTransform(event.transform);
        // Fire on every settled gesture (pan inertia, wheel pause, pinch end).
        // The debounce window absorbs the high-frequency 'zoom' events into a
        // single callback once movement stops.
        fireBoundsDebounced();
      });

    svg.call(behavior);
    zoomBehaviorRef.current = behavior;

    return () => {
      if (boundsTimer !== null) clearTimeout(boundsTimer);
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, []);

  // Programmatic viewport — animate to (center, zoom) whenever the prop
  // changes. Skipped on first render if no viewport was supplied.
  useEffect(() => {
    if (!viewport) return;
    const svgEl = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svgEl || !behavior) return;

    const [lng, lat] = viewport.center;
    const projected = PROJECTION([lng, lat]);
    if (!projected) return;
    const [px, py] = projected;
    const k = Math.max(SCALE_MIN, Math.min(SCALE_MAX, viewport.zoom));

    const target = zoomIdentity
      .translate(WIDTH / 2 - px * k, HEIGHT / 2 - py * k)
      .scale(k);

    const svg = select<SVGSVGElement, unknown>(svgEl);
    const duration = reducedMotion ? 0 : VIEWPORT_TRANSITION_MS;
    svg.transition().duration(duration).call(behavior.transform, target);
  }, [viewport, reducedMotion]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn(
        "h-full w-full touch-none select-none bg-background",
        className,
      )}
      role="img"
      aria-label="World map"
    >
      <g transform={transform.toString()}>
        <g aria-hidden="true">
          {COUNTRY_PATHS.map(({ id, d }) => (
            <path
              key={id}
              d={d}
              className="fill-bg-elevated stroke-white/10"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {children}
      </g>
    </svg>
  );
}

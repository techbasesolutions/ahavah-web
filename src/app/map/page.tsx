"use client";

/**
 * /map — Discover Map screen (sub-plan 14 / Task 5 — fix-up pass).
 *
 * Bumpy reference (screenshot shared by user 2026-05-12) shows:
 *   - The map is FULL-BLEED (no card wrapper, no inset).
 *   - The top bar is a thin BrandMark + filter-sliders icon row — NO
 *     "Map" page title.
 *   - The continent picker lives INSIDE a filter Sheet opened from the
 *     top-right filter icon — NOT inline above the map.
 *
 * Implementation:
 *   - PageShell uses bottomPad="none" + relative positioning. The
 *     WorldMap absolutely fills the shell from top to bottom. The thin
 *     top bar and BottomNav float over it.
 *   - The top bar is `absolute inset-x-0 top-0` with a translucent
 *     backdrop blur, so the map shows through.
 *   - BottomNav is `fixed` (its own primitive), so it sits over the map
 *     at the bottom regardless of shell padding.
 *   - The filter sheet uses the kit's <Sheet> primitive bottom-side;
 *     opening it reveals <ContinentPicker>. Picking a continent both
 *     pans/zooms the map AND closes the sheet so the result is
 *     immediately visible.
 *
 * The MapAvatar ring is bumped to lime brand accent so markers pop
 * against the dark country fill (Bumpy uses a green ring; lime is
 * Ahavah's analog).
 *
 * MAP RENDERER NOTE: this is still d3-geo SVG. Bumpy uses Google Maps
 * raster tiles. Swapping to Mapbox / Google Maps requires an API key +
 * billing, which is Tier-4 backend-blocked per docs/BUILD-PLAN.md.
 * A future sub-plan handles the swap.
 *
 * Soft-completeness gate mirrors /discover: incomplete profiles are
 * redirected to the first missing onboarding step. Pre-redirect the
 * page renders a minimal scaffold to avoid map flash for incomplete
 * profiles.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { ContinentPicker } from "@/components/app/continent-picker";
import { MapAvatar } from "@/components/app/map-avatar";
import { PageShell } from "@/components/app/page-shell";
import { WorldMap, type Viewport } from "@/components/app/world-map";
import { BrandMark } from "@/components/brand/sparkle-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { BBox, Continent } from "@/lib/continent-bbox";
import {
  firstMissingStepFor,
  isDiscoverEligible,
} from "@/lib/profile-completeness";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import { useProfile } from "@/lib/use-profile";

/**
 * Heuristic: convert a continent bbox to a (center, zoom) Viewport for
 * <WorldMap>. The map's d3-zoom scaleExtent runs 1..10 (1 = whole world).
 *
 * We use the longitudinal span as the primary signal — at NaturalEarth1
 * the horizontal extent dominates the visible area. A 360° span maps to
 * zoom 1; a 30°-or-narrower bbox saturates to zoom 8 (which is plenty
 * tight without overshooting the projection's edge cases).
 *
 * Lower-bounded at 30° (so we always show some surrounding context, not
 * a coffee-cup-sized continent shoved against the edges) and
 * upper-bounded at 8 (so a single small continent doesn't snap to the
 * maximum zoom).
 */
function viewportFromBbox(bbox: BBox): Viewport {
  const centerLng = (bbox.east + bbox.west) / 2;
  const centerLat = (bbox.north + bbox.south) / 2;
  const lngSpan = Math.abs(bbox.east - bbox.west);
  const zoom = Math.max(
    1,
    Math.min(8, Math.round(360 / Math.max(lngSpan, 30))),
  );
  return { center: [centerLng, centerLat], zoom };
}

export default function MapPage() {
  const router = useRouter();
  const { profile: viewer, loaded } = useProfile();

  // Discarded: visibleBounds, the bbox returned by <WorldMap onBoundsChange>.
  // T6 needs this to resolve "Like everyone visible" → set of candidates;
  // for T5 we just keep the prop wired so the debounce + computation path
  // exercises in the smoke walk.
  const [, setVisibleBounds] = useState<BBox | null>(null);
  const [viewport, setViewport] = useState<Viewport | undefined>(undefined);
  const [activeContinent, setActiveContinent] = useState<
    Continent | undefined
  >(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Soft-completeness gate — match /discover's pattern exactly.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(viewer)) {
      const missingStep = firstMissingStepFor(viewer);
      if (missingStep) {
        router.replace(missingStep);
      }
    }
  }, [loaded, viewer, router]);

  const handlePickContinent = (id: Continent, bbox: BBox) => {
    setActiveContinent(id);
    setViewport(viewportFromBbox(bbox));
    // Auto-close on pick — Bumpy does this implicitly, so the user sees
    // the map pan/zoom immediately instead of having to dismiss the
    // sheet first.
    setFiltersOpen(false);
  };

  // Until T7 adds `showOnMap`, every sample renders. After T7:
  //   const visibleSamples = SAMPLE_PROFILES.filter((p) => p.showOnMap !== false);
  const visibleSamples = SAMPLE_PROFILES;

  // Pre-hydration or in-flight redirect — render minimal scaffold to keep
  // the map from flashing for an ineligible viewer.
  if (!loaded || (loaded && !isDiscoverEligible(viewer))) {
    return (
      <PageShell bottomPad="nav">
        <div
          className="flex flex-1 items-center justify-center px-5"
          aria-live="polite"
        >
          <p className="text-body text-text-secondary">
            Redirecting to complete your profile…
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="none" className="relative overflow-hidden">
      {/* Full-bleed map — absolute-fills the shell. The country paths +
          markers will project into the SVG's 800×450 viewBox and scale
          to whatever pixel size the parent gives them
          (preserveAspectRatio="xMidYMid meet"). */}
      <div className="absolute inset-0">
        <WorldMap
          viewport={viewport}
          onBoundsChange={setVisibleBounds}
          className="size-full"
        >
          {visibleSamples.map((p) => (
            <MapAvatar key={p.firstName} candidate={p} />
          ))}
        </WorldMap>
      </div>

      {/* Thin top bar overlay — BrandMark left, filter icon right. The
          translucent backdrop + blur lets the map texture show through
          while keeping the brand mark legible. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-bg-canvas/80 px-4 py-3 supports-backdrop-filter:bg-bg-canvas/60 supports-backdrop-filter:backdrop-blur-md">
        <BrandMark size="sm" />
        <Button
          size="circle"
          tone="elevated"
          aria-label="Filter map"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="text-white" />
        </Button>
      </div>

      {/* Filter sheet — opens from the filter icon. Hosts the
          ContinentPicker. Auto-closes on pick (handlePickContinent). */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="bottom"
          className="flex flex-col gap-0 rounded-t-3xl border-white/10 bg-bg-indigo p-0"
        >
          <SheetHeader className="items-start px-5 pt-6 pb-3">
            <SheetTitle className="text-h2 text-white">Filter map</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-6">
            <ContinentPicker
              active={activeContinent}
              onPick={handlePickContinent}
            />
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </PageShell>
  );
}

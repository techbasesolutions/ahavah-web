"use client";

/**
 * /map — Discover Map screen (sub-plan 14 / Task 5).
 *
 * Renderer swap (2026-05-12): swapped from d3-geo SVG to react-leaflet
 * + OSM raster tiles. Layout (full-bleed map, thin top bar, filter
 * sheet, BottomNav) is unchanged from commit 6834b16. Only the
 * WorldMap renderer + the bbox plumbing changed.
 *
 * Layout (Bumpy reference):
 *   - PageShell uses bottomPad="none" + relative positioning. The
 *     WorldMap absolutely fills the shell from top to bottom. The thin
 *     top bar and BottomNav float over it.
 *   - Top bar is `absolute inset-x-0 top-0 z-20` with a translucent
 *     backdrop blur, so the map shows through.
 *   - BottomNav is `fixed` (its own primitive), so it sits over the
 *     map at the bottom regardless of shell padding.
 *   - The filter sheet uses the kit's <Sheet> primitive bottom-side;
 *     opening it reveals <ContinentPicker>. Picking a continent both
 *     pans/zooms the map AND closes the sheet so the result is
 *     immediately visible.
 *
 * Dynamic import: Leaflet touches `window` at module load — bare
 * imports would break the Next.js SSR build with
 * "ReferenceError: window is not defined". We wrap WorldMap +
 * MapAvatar in `next/dynamic({ ssr: false })`.
 *
 * Continent → bbox: the picker emits a `BBox` directly, and we pass
 * it straight to WorldMap's `bbox` prop. Leaflet's `fitBounds` does
 * the rest — no center/zoom arithmetic here.
 *
 * Soft-completeness gate mirrors /discover: incomplete profiles are
 * redirected to the first missing onboarding step. Pre-redirect the
 * page renders a minimal scaffold to avoid map flash for incomplete
 * profiles.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { ContinentPicker } from "@/components/app/continent-picker";
import { PageShell } from "@/components/app/page-shell";
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

// Leaflet uses `window` at module scope (it shims SVG/canvas APIs at
// import time). Next.js SSR breaks if we don't dynamic-import with
// `ssr: false` — the build fails with "ReferenceError: window is not
// defined". This is intentional and documented in the WorldMap header.
const WorldMap = dynamic(
  () => import("@/components/app/world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-bg-elevated">
        <span className="text-text-secondary">Loading map…</span>
      </div>
    ),
  },
);

const MapAvatar = dynamic(
  () => import("@/components/app/map-avatar").then((m) => m.MapAvatar),
  { ssr: false },
);

export default function MapPage() {
  const router = useRouter();
  const { profile: viewer, loaded } = useProfile();

  // Discarded for now: visibleBounds, the bbox returned by
  // <WorldMap onBoundsChange>. T6 needs it to resolve "Like everyone
  // visible" → set of candidates; for T5 we keep the prop wired so the
  // bounds path exercises in the smoke walk.
  const [, setVisibleBounds] = useState<BBox | null>(null);
  const [bbox, setBbox] = useState<BBox | undefined>(undefined);
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

  const handlePickContinent = (id: Continent, b: BBox) => {
    setActiveContinent(id);
    setBbox(b);
    // Auto-close on pick — Bumpy does this implicitly, so the user sees
    // the map pan/zoom immediately instead of having to dismiss the
    // sheet first.
    setFiltersOpen(false);
  };

  // Until T7 adds `showOnMap`, every sample renders. After T7:
  //   const visibleSamples = SAMPLE_PROFILES.filter((p) => p.showOnMap !== false);
  const visibleSamples = SAMPLE_PROFILES;

  // Pre-hydration or in-flight redirect — render minimal scaffold to
  // keep the map from flashing for an ineligible viewer.
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
      {/* Full-bleed map — absolute-fills the shell. */}
      <div className="absolute inset-0">
        <WorldMap
          bbox={bbox}
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

"use client";

/**
 * /map — Discover Map screen (sub-plan 14 / Task 5, fix-up 2026-05-12).
 *
 * Renderer swap (2026-05-12): swapped from d3-geo SVG to react-leaflet
 * + OSM raster tiles. Layout (full-bleed map, thin top bar, filter
 * sheet, BottomNav) is unchanged from commit 6834b16. Only the
 * WorldMap renderer + the bbox plumbing changed.
 *
 * Filter unification (2026-05-12 fix-up): the bespoke ContinentPicker +
 * verified-only sheet was REPLACED with the shared FiltersSheet from
 * /discover. Both surfaces now read + write a single localStorage-
 * backed store via useFilters(); selecting Country:BB on /discover
 * propagates to /map markers live (and vice versa). User feedback:
 * "map filters should be the same filters on the discover page".
 *
 * Icon change (2026-05-12 fix-up): the filter-open button switched
 * from Globe → SlidersHorizontal across both /discover and /map for
 * consistency. The Globe icon was misleading ("looks like a map / world
 * view button"). The actual world-view CTA still lives on the Map tab
 * in BottomNav.
 *
 * Show-on-Map CTA removed (2026-05-12 fix-up): the wide "Show me on
 * Map" CTA on /map was dropped. Opt-in/out still lives on /settings/
 * privacy via useShowOnMap; we keep the showOnMap !== false filter on
 * candidate markers so Caleb (sample) stays hidden, but viewers control
 * their own visibility only from settings.
 *
 * Layout (Bumpy reference):
 *   - PageShell uses bottomPad="none" + relative positioning. The
 *     WorldMap absolutely fills the shell from top to bottom. The thin
 *     top bar and BottomNav float over it.
 *   - Top bar is `absolute inset-x-0 top-0 z-20` with a translucent
 *     backdrop blur, so the map shows through.
 *   - BottomNav is `fixed` (its own primitive), so it sits over the
 *     map at the bottom regardless of shell padding.
 *
 * Dynamic import: Leaflet touches `window` at module load — bare
 * imports would break the Next.js SSR build with
 * "ReferenceError: window is not defined". We wrap WorldMap +
 * MapAvatar in `next/dynamic({ ssr: false })`.
 *
 * Soft-completeness gate mirrors /discover: incomplete profiles are
 * redirected to the first missing onboarding step. Pre-redirect the
 * page renders a minimal scaffold to avoid map flash for incomplete
 * profiles.
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageShell } from "@/components/app/page-shell";
import { BrandMark } from "@/components/brand/sparkle-mark";
import { Button } from "@/components/ui/button";

import { simulateLikesBack } from "@/lib/decision-engine";
import { applyHardFilters, type DiscoverCandidate } from "@/lib/discover-engine";
import { ACTIVE_CHAT_IDS } from "@/lib/inbox-seed";
import { resolveMarkerState } from "@/lib/map-avatar-state";
import {
  firstMissingStepFor,
  isDiscoverEligible,
} from "@/lib/profile-completeness";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import { useDecisions } from "@/lib/use-decisions";
import { useFilters } from "@/lib/use-filters";
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
  const { decisions } = useDecisions();
  const { filters, setFilters } = useFilters();
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

  // Marker pool — start from SAMPLE_PROFILES, drop candidate-side
  // opt-outs (`showOnMap === false`, e.g. Caleb), then run the SAME
  // applyHardFilters() the /discover deck uses so the two surfaces
  // share filter semantics. Synthetic `id` (lowercased firstName) for
  // DiscoverCandidate satisfaction.
  const visibleSamples = useMemo<readonly DiscoverCandidate[]>(() => {
    const baseEligible: DiscoverCandidate[] = SAMPLE_PROFILES.filter(
      (p) => p.showOnMap !== false,
    ).map((p, i) => ({
      ...p,
      id: p.firstName?.toLowerCase() ?? `s${i}`,
    }));
    if (!viewer) return baseEligible;
    return applyHardFilters(viewer, baseEligible, filters);
  }, [filters, viewer]);

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
      {/* Full-bleed map — absolute-fills the shell. ContinentPicker was
          removed in the 2026-05-12 fix-up; users pan + zoom directly,
          and country/region filtering happens through FiltersSheet's
          Country pill grid (shared with /discover). */}
      <div className="absolute inset-0">
        <WorldMap className="size-full">
          {visibleSamples.map((p) => {
            // SP16 T5: resolve per-candidate marker state.
            //   - `id` is the lowercased firstName slug used everywhere
            //     in the app (chat seed, decisions store, profile route).
            //   - `matched` is pre-computed here so the resolver stays
            //     free of decision-engine internals (cleaner unit tests).
            //   - `viewer` may be undefined during hydration; `matched`
            //     defaults to false in that window so a liked candidate
            //     renders as "liked"/"active-chat" rather than a false
            //     "match". Resolver re-runs once useProfile() loads.
            const id = p.id;
            const matched = !!viewer && simulateLikesBack(viewer, p);
            const state = resolveMarkerState({
              candidate: { id },
              decisions,
              matched,
              activeChatIds: ACTIVE_CHAT_IDS,
            });
            return <MapAvatar key={id} candidate={p} state={state} />;
          })}
        </WorldMap>
      </div>

      {/* Thin top bar overlay — BrandMark left, filter icon right. The
          translucent backdrop + blur lets the map texture show through
          while keeping the brand mark legible. Icon matches /discover
          (SlidersHorizontal) so the user reads "open filters" not
          "switch to map view". */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-bg-canvas/80 px-4 py-3 supports-backdrop-filter:bg-bg-canvas/60 supports-backdrop-filter:backdrop-blur-md">
        <BrandMark size="sm" />
        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          initialFilters={filters}
          trigger={
            <Button size="circle" tone="elevated" aria-label="Filter map">
              <SlidersHorizontal className="text-white" />
            </Button>
          }
          onApply={(f) => setFilters(f)}
        />
      </div>

      <BottomNav />
    </PageShell>
  );
}

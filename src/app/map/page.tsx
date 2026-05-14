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
 *
 * Home-default on session start (SP17.5, 2026-05-12): on the first
 * /map mount per PWA session, the viewport flies to a ±15° bbox
 * around the user's home-country centroid. A one-shot sessionStorage
 * flag suppresses re-fly on subsequent /map mounts within the same
 * session (preserves user's pan position when bouncing through
 * BottomNav). App close → sessionStorage clears → next launch
 * defaults to home again. See the useEffect for full reasoning.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import type { BBox } from "@/lib/continent-bbox";

import { BottomNav } from "@/components/app/bottom-nav";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageShell } from "@/components/app/page-shell";
import { BrandMark } from "@/components/brand/sparkle-mark";
import { Button } from "@/components/ui/button";

import { centroidOf, countriesInBounds } from "@/lib/country-centroids";
import { simulateLikesBack } from "@/lib/decision-engine";
import type { DiscoverCandidate } from "@/lib/discover-engine";
import { ACTIVE_CHAT_IDS } from "@/lib/inbox-seed";
import { resolveMarkerState } from "@/lib/map-avatar-state";
import {
  firstMissingStepFor,
  isDiscoverEligible,
} from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
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

// SP17.5: session-scoped flag keyed in sessionStorage. The flag is a
// boolean marker, not the filter itself — useFilters() keeps its own
// localStorage store for everything else (age, intent, etc.). Only this
// one-shot "have we auto-flown yet this session?" bit lives in
// sessionStorage so it clears on PWA close → next launch defaults to
// home country again.
const SESSION_FLAG = "ahavah.map.session_initialized";
const INITIAL_PADDING_DEG = 15;

export default function MapPage() {
  const router = useRouter();
  const { profile: viewer, loaded } = useProfile();
  const { decisions } = useDecisions();
  const { filters, setFilters } = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [initialBbox, setInitialBbox] = useState<BBox | undefined>(undefined);

  // Soft-completeness gate — match /discover's pattern exactly.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(viewer)) {
      const missingStep = firstMissingStepFor(viewer);
      if (missingStep) {
        router.replace(missingStep);
      }
    }
  }, [loaded, viewer, router]);

  /**
   * SP17.5: default the map viewport to the user's home country on the
   * FIRST /map mount per PWA session. The signal is sessionStorage
   * (clears on app/tab close, persists across backgrounding) plus a
   * one-shot flag so subsequent /map mounts within the same session
   * preserve whatever pan position is already there — switching tabs
   * via BottomNav and coming back shouldn't yank the user's view.
   *
   * Why sessionStorage: PWAs close → sessionStorage clears → next cold
   * launch is a fresh session, and the user lands back on their home
   * region. Backgrounding the app (iOS Home button, Android task
   * switcher) does NOT clear sessionStorage, so a quick return won't
   * trigger an unwanted re-fly.
   *
   * Why a one-shot flag: subsequent /map mounts within the same session
   * shouldn't auto-fly. If the user pans to Africa, navigates to
   * /discover, then comes back to /map, they expect Africa — not a
   * snap back to home.
   *
   * Why 15° padding: rough continent-scale view. Wide enough to show
   * neighboring countries (so the user sees nearby candidates without
   * having to zoom out first), narrow enough to keep their home region
   * the obvious focus. Clamped to [-85, 85] / [-180, 180] so polar /
   * antimeridian edges don't break fitBounds.
   *
   * Bbox flow: setInitialBbox(...) → passed as WorldMap.bbox →
   * fitBounds → moveend → existing handleBoundsChange writes
   * filter.country naturally. No bespoke filter write here.
   */
  useEffect(() => {
    if (!loaded || !viewer?.country) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    const centroid = centroidOf(viewer.country);
    if (!centroid) return;
    // Bridging external state (sessionStorage flag + profile-load
    // timing) into React state on first qualifying render. Canonical
    // pattern in this codebase — see use-profile.ts mount-hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialBbox({
      north: Math.min(85, centroid.lat + INITIAL_PADDING_DEG),
      south: Math.max(-85, centroid.lat - INITIAL_PADDING_DEG),
      east: Math.min(180, centroid.lng + INITIAL_PADDING_DEG),
      west: Math.max(-180, centroid.lng - INITIAL_PADDING_DEG),
    });
    sessionStorage.setItem(SESSION_FLAG, "1");
  }, [loaded, viewer]);

  // SP17 T2: map-driven country filter. Every Leaflet pan/zoom-settle
  // fires moveend → onBoundsChange(bbox); we convert the visible bbox
  // into the ISO list of countries whose centroid sits inside the view
  // and write it to the shared filters store. /discover deck mirrors
  // this immediately via useFilters() in-tab broadcast.
  //
  // Functional setState avoids closing over `filters` so the callback
  // identity stays stable; useCallback's empty deps + the stable
  // `setFilters` reference together mean the WorldMap useEffect that
  // binds the moveend listener never re-runs. No re-render loop risk.
  //
  // `undefined` (not `[]`) when zero centroids fit — the discover
  // engine treats `undefined` as "no filter," whereas `[]` is ambiguous
  // (could read as "zero countries match"). Use undefined for the
  // unambiguous "no filter" signal.
  const handleBoundsChange = useCallback(
    (bbox: { north: number; south: number; east: number; west: number }) => {
      const countriesVisible = countriesInBounds(bbox);
      setFilters((prev) => ({
        ...prev,
        country: countriesVisible.length > 0 ? countriesVisible : undefined,
      }));
    },
    [setFilters],
  );

  // Marker pool — real candidates from GET /search via useDiscoverDeck.
  // Same filter shape /discover uses (age + countries + languages), so
  // the two surfaces share filter semantics.
  const httpFilters = useMemo(
    () => ({
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      countries: filters.country,
      languages: filters.languages,
    }),
    [filters.ageMin, filters.ageMax, filters.country, filters.languages],
  );
  const { items: realCandidates } = useDiscoverDeck(httpFilters);
  // Drop candidates without a country ISO — the map can't position them.
  const visibleCandidates = useMemo<readonly DiscoverCandidate[]>(
    () => realCandidates.filter((c) => Boolean(c.country)),
    [realCandidates],
  );

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
        <WorldMap
          className="size-full"
          onBoundsChange={handleBoundsChange}
          bbox={initialBbox}
        >
          {visibleCandidates.map((p) => {
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

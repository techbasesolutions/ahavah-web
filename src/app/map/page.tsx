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
import Link from "next/link";
import { MapPin, MessageCircle, SlidersHorizontal } from "lucide-react";

import type { BBox } from "@/lib/continent-bbox";

import { BottomNav } from "@/components/app/bottom-nav";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageShell } from "@/components/app/page-shell";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";


import { apiClient } from "@/lib/api-client";
import { centroidOf, countriesInBounds } from "@/lib/country-centroids";
import type { DiscoverCandidate } from "@/lib/discover-engine";
import { resolveMarkerState } from "@/lib/map-avatar-state";
import {
  firstMissingStepFor,
  isDiscoverEligible,
} from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
import { useFilters } from "@/lib/use-filters";
import { useProfile } from "@/lib/use-profile";
import { readOnboarded } from "@/lib/onboarded-storage";

// Leaflet uses `window` at module scope (it shims SVG/canvas APIs at
// import time). Next.js SSR breaks if we don't dynamic-import with
// `ssr: false` — the build fails with "ReferenceError: window is not
// defined". This is intentional and documented in the WorldMap header.
const WorldMap = dynamic(
  () => import("@/components/app/world-map").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-(--card)">
        <span className="text-(--ink-2)">Loading map…</span>
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

  // Soft-completeness gate — trust the backend onboarded flag so users
  // with a wiped localStorage cache aren't bounced back to the wizard
  // every time they open /map. Mirrors /discover.
  useEffect(() => {
    if (!loaded) return;
    if (readOnboarded()) return;
    if (!isDiscoverEligible(viewer)) {
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
      verifiedOnly: Boolean(
        filters.verifiedOnly || viewer?.requireVerifiedMatches,
      ),
      // Phase W cutover: pill-grid filters from FiltersSheet now reach
      // /search. /map inherits the same filter behavior as /discover.
      intents: filters.intents,
      maritalStatuses: filters.maritalStatuses,
      hasChildrenBuckets: filters.hasChildrenBuckets,
      assemblies: filters.assemblies,
      torahLevels: filters.torahLevels,
      polygynyStances: filters.polygynyStances,
      calendars: filters.calendars,
      educations: filters.educations,
      healthTags: filters.healthTags,
    }),
    [
      filters.ageMin,
      filters.ageMax,
      filters.country,
      filters.languages,
      filters.verifiedOnly,
      viewer?.requireVerifiedMatches,
      filters.intents,
      filters.maritalStatuses,
      filters.hasChildrenBuckets,
      filters.assemblies,
      filters.torahLevels,
      filters.polygynyStances,
      filters.calendars,
      filters.educations,
      filters.healthTags,
    ],
  );
  const { items: realCandidates } = useDiscoverDeck(httpFilters);

  // Phase W cutover (2026-05-15) — count active filters for the badge
  // on the top-bar filter button. Age range counts only when narrowed
  // from the full 18-80 default. country is excluded because it's
  // driven by the map viewport itself (panning sets it) — surfacing
  // a "country filter active" badge on the map is confusing since the
  // user IS the one moving the map.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if ((filters.ageMin ?? 18) > 18 || (filters.ageMax ?? 80) < 80) n += 1;
    if (filters.languages?.length) n += 1;
    if (filters.verifiedOnly) n += 1;
    if (filters.intents?.length) n += 1;
    if (filters.maritalStatuses?.length) n += 1;
    if (filters.hasChildrenBuckets?.length) n += 1;
    if (filters.assemblies?.length) n += 1;
    if (filters.torahLevels?.length) n += 1;
    if (filters.polygynyStances?.length) n += 1;
    if (filters.calendars?.length) n += 1;
    if (filters.educations?.length) n += 1;
    if (filters.healthTags?.length) n += 1;
    return n;
  }, [filters]);
  // Drop candidates without a country ISO — the map can't position them.
  // Also drop candidates who opted out via /settings/privacy → "Show me
  // on the map" → off (server ships `showOnMap = false` from
  // ahavah_extra; default TRUE means visible). /discover does NOT filter
  // on this so opted-out users still appear in the swipe deck — the
  // toggle is map-specific.
  const visibleCandidates = useMemo<readonly DiscoverCandidate[]>(
    () =>
      realCandidates.filter(
        (c) => Boolean(c.country) && c.showOnMap !== false,
      ),
    [realCandidates],
  );

  // Real matched-uuid set from GET /matches. Drives the 'match' marker
  // halo + (since every match IS a chat thread by design) the
  // 'active-chat' halo too. Earlier code used simulateLikesBack +
  // hardcoded ACTIVE_CHAT_IDS sample slugs — neither reflected real
  // backend state. Local `decisions` store still drives the 'liked'
  // halo for the just-swiped feedback.
  const [matchedUuids, setMatchedUuids] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  useEffect(() => {
    if (!loaded || !viewer) return;
    let cancelled = false;
    void apiClient
      .get<
        | {
            matches?: Array<{
              with_profile?: { id?: string };
              peer_uuid?: string;
            }>;
          }
        | Array<{
            with_profile?: { id?: string };
            peer_uuid?: string;
          }>
      >("/matches")
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res.matches ?? []);
        const uuids = new Set<string>();
        // Backend ships peers under `with_profile.id`. Keep peer_uuid
        // as a tolerated alias so older responses don't break the
        // marker highlight.
        for (const m of list) {
          const id = m?.with_profile?.id ?? m?.peer_uuid;
          if (typeof id === "string") uuids.add(id);
        }
        setMatchedUuids(uuids);
      })
      .catch(() => {
        // Quiet fail — markers stay neutral.
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, viewer]);

  // Pre-hydration or in-flight redirect — render minimal scaffold to
  // keep the map from flashing for an ineligible viewer.
  if (!loaded || (loaded && !readOnboarded() && !isDiscoverEligible(viewer))) {
    return (
      <PageShell desktopShell="sidebar" topBarTitle="Map" topBarBack={false} bottomPad="nav">
        <div
          className="flex flex-1 items-center justify-center px-5"
          aria-live="polite"
        >
          <p className="text-body text-(--ink-2)">
            Redirecting to complete your profile…
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  // Shared marker renderer — used by both mobile and desktop map columns.
  const mapMarkers = visibleCandidates.map((p) => {
    const id = p.id;
    const matched = matchedUuids.has(id);
    const state = resolveMarkerState({
      candidate: { id },
      decisions,
      matched,
      activeChatIds: matchedUuids,
    });
    return <MapAvatar key={id} candidate={p} state={state} />;
  });

  // Shared filter button used in both mobile top bar and desktop top bar actions.
  const filterButton = (
    <FiltersSheet
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      initialFilters={filters}
      trigger={
        <Button
          size="circle-lg"
          tone="elevated"
          aria-label={
            activeFilterCount > 0
              ? `Filter map (${activeFilterCount} active)`
              : "Filter map"
          }
          className="relative"
        >
          <SlidersHorizontal className="text-(--ink)" />
          {activeFilterCount > 0 ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-caption font-bold tabular-nums text-black ring-2 ring-bg-canvas"
            >
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      }
      onApply={(f) => setFilters(f)}
    />
  );

  return (
    <PageShell
      desktopShell="sidebar"
      topBarTitle="Map"
      topBarBack={false}
      topBarActions={filterButton}
      bottomPad="none"
      className="relative overflow-hidden"
    >
      {/* ── Mobile layout (hidden at md+) ──────────────────────────────── */}
      <div className="md:hidden absolute inset-0">
        <WorldMap
          className="size-full"
          onBoundsChange={handleBoundsChange}
          bbox={initialBbox}
        >
          {mapMarkers}
        </WorldMap>
      </div>

      {/* Mobile top-bar overlay */}
      <div className="md:hidden absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-(--canvas)/80 px-4 py-3 supports-backdrop-filter:bg-(--canvas)/60 supports-backdrop-filter:backdrop-blur-md">
        <Logo variant="horizontal" size="sm" />
        {filterButton}
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>

      {/* ── Desktop layout (hidden below md) ───────────────────────────── */}
      {/* DELIBERATE DIVERGENCE from canonical screens/07-map.md (2026-05-17):
          canonical specifies a FULL-BLEED map with overlay top bar + a
          340px selected-pin info card floating bottom-left. This impl
          retains a 360px candidate-list RAIL on the right instead — the
          rail surfaces who's currently in view and is scrollable, which
          is functionally valuable (panning the map updates the list).
          Tearing it out for canonical full-bleed loses that affordance.
          Visual treatment + theme-aware tokens applied throughout.
          h-[calc(100dvh-3.5rem)] subtracts the DesktopTopBar height. */}
      <div className="hidden md:grid md:grid-cols-[1fr_360px] md:gap-6 md:h-[calc(100dvh-3.5rem)] md:-m-8 md:p-8">
        {/* Left — Leaflet map, full height, rounded frame with hairline */}
        <div className="relative overflow-hidden rounded-2xl border border-(--hairline) min-h-0">
          <WorldMap
            className="size-full"
            onBoundsChange={handleBoundsChange}
            bbox={initialBbox}
          >
            {mapMarkers}
          </WorldMap>
        </div>

        {/* Right — candidate rail */}
        <div className="flex flex-col min-h-0 gap-4">
          {/* Visible-count row. Filter access lives in the desktop topbar
              (PageShell topBarActions) — duplicating it here was redundant
              (two filter icons on the same surface). */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-caption font-semibold text-(--ink-2)">
              {visibleCandidates.length} visible
            </span>
          </div>

          {/* Scrollable candidate list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-3 pr-2">
              {visibleCandidates.length === 0 ? (
                <p className="text-center text-meta py-8 text-(--ink-3)">
                  No candidates in view. Pan the map to explore.
                </p>
              ) : (
                visibleCandidates.map((p) => {
                  const nameInitial = (p.firstName ?? "?")[0].toUpperCase();
                  const location =
                    p.city && p.country
                      ? `${p.city}, ${p.country}`
                      : (p.country ?? "");
                  return (
                    <Card
                      key={p.id}
                      tone="flat"
                      size="sm"
                      className="flex flex-row items-center gap-3 p-3 rounded-2xl bg-(--card) border border-(--hairline)"
                    >
                      {/* Kit Avatar — size="tap" (44px) with brand fallback
                          (indigo tile + lime initial, per §Avatar variants).
                          Uses size prop not className override so typography
                          scales via group-data selectors in avatarVariants. */}
                      <Avatar size="tap">
                        <AvatarFallback variant="brand">
                          {nameInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-meta font-semibold truncate text-(--ink)">
                          {p.firstName ?? "Match"}
                          {p.age ? `, ${p.age}` : ""}
                        </p>
                        {location ? (
                          <p className="flex items-center gap-1 text-caption truncate text-(--ink-2)">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            {location}
                          </p>
                        ) : null}
                      </div>
                      {/* Kit Button + render={<Link/>} pattern (replaces
                          previous buttonVariants() classname application
                          which bypassed the primitive's slot semantics). */}
                      <Button
                        size="circle-lg"
                        tone="cta"
                        render={
                          <Link
                            href={`/chat/${p.id}`}
                            prefetch={false}
                          />
                        }
                        aria-label={`Message ${p.firstName ?? "Match"}`}
                      >
                        <MessageCircle className="size-4" aria-hidden />
                      </Button>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </PageShell>
  );
}

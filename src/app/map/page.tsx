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
 * Initial viewport (2026-06-14): the map restores the user's last
 * position (center + zoom) from localStorage, persisted on every
 * pan/zoom settle. The first ever visit (no saved position) opens
 * zoomed all the way out on the whole world. The render is gated on the
 * resolved viewport so the map mounts directly there — no flash + fly.
 * See the mount useEffect + persistView for the full reasoning.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MapPin, MessageCircle, SlidersHorizontal } from "lucide-react";

import type { MapView } from "@/components/app/world-map";

import { BottomNav } from "@/components/app/bottom-nav";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageShell } from "@/components/app/page-shell";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";


import { apiClient } from "@/lib/api-client";
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

// 2026-06-14: persist the user's last map position (center + zoom) to
// localStorage so re-opening /map restores where they left off — and on
// the first ever visit, open zoomed all the way out on the whole world.
// Replaces the old SP17.5 sessionStorage "fly to home country" behavior.
const VIEWPORT_KEY = "ahavah.map.viewport";
// First-ever visit: whole world, most-zoomed-out (minZoom is 1).
const WORLD_VIEW: MapView = { lat: 20, lng: 0, zoom: 1 };

export default function MapPage() {
  const router = useRouter();
  const { profile: viewer, loaded } = useProfile();
  const { decisions } = useDecisions();
  const { filters, setFilters } = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // null until the mount effect resolves it from localStorage. The map is
  // gated on this so it mounts directly at the remembered position (no
  // flash of the world view then fly-in).
  const [initialView, setInitialView] = useState<MapView | null>(null);

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
   * Resolve the initial viewport once, on mount: the user's last saved
   * position from localStorage, or a whole-world view on the first ever
   * visit. The map render is gated on this (see below) so it mounts
   * STARTING at the remembered position rather than flashing the world
   * view and flying in. localStorage (not sessionStorage) so the position
   * survives a PWA close — "remember where I left off" across launches.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let saved: MapView | null = null;
    try {
      const raw = window.localStorage.getItem(VIEWPORT_KEY);
      if (raw) {
        const v = JSON.parse(raw) as Partial<MapView>;
        if (
          typeof v?.lat === "number" &&
          typeof v?.lng === "number" &&
          typeof v?.zoom === "number"
        ) {
          saved = { lat: v.lat, lng: v.lng, zoom: v.zoom };
        }
      }
    } catch {
      saved = null;
    }
    // Bridging external state (localStorage) into React state on mount —
    // canonical pattern in this codebase (see use-profile.ts hydration).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialView(saved ?? WORLD_VIEW);
  }, []);

  // Persist the map position after every pan/zoom settle so the next
  // visit restores it. Cheap (fires only on moveend, already debounced by
  // Leaflet) and resilient to storage being full/disabled.
  const persistView = useCallback((v: MapView) => {
    try {
      window.localStorage.setItem(VIEWPORT_KEY, JSON.stringify(v));
    } catch {
      /* storage unavailable — non-fatal, position just won't persist */
    }
  }, []);

  // SP17 T2: map-driven country filter. Every Leaflet pan/zoom-settle
  // fires moveend → onBoundsChange(bbox); we convert the visible bbox
  // into the ISO list of countries whose centroid sits inside the view
  // and write it to the shared filters store. /discover deck mirrors
  // this immediately via useFilters() in-tab broadcast.
  //
  // Functional setState avoids closing over `filters` so the callback
  // identity stays stable; useCallback's empty deps + the stable
  // 2026-06-09 — map no longer writes to filters.country from pan
  // events. Previously every pan computed countriesInBounds(bbox)
  // and updated the shared filter store, which triggered a fresh
  // /search per pan-and-stop. /search takes 400-900ms; chained
  // pans felt like "loads on scroll, chunk by chunk."
  //
  // New model: one /search on mount with whatever filters are set,
  // markers are positioned by their stored lat/lng, panning just
  // translates the viewport. The filter sheet can still set country
  // explicitly (the value still flows into httpFilters below) — only
  // the bbox-driven write is gone.
  //
  // Breaks when total active users exceed /search's 1000-row cap;
  // until then this is the right shape. Layer a per-country client-
  // side cache on top if/when that becomes a real problem.

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
  // from the full 18-80 default. As of 2026-06-09, country is now a
  // manually-set filter (no longer auto-written by map pans), so it
  // counts toward the badge like any other.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if ((filters.ageMin ?? 18) > 18 || (filters.ageMax ?? 80) < 80) n += 1;
    if (filters.country?.length) n += 1;
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
    const compatScore = viewer ? computeCompatibility(viewer, p).score : undefined;
    return (
      <MapAvatar key={id} candidate={p} state={state} compatScore={compatScore} />
    );
  });

  // Shared filter button used in both mobile top bar and desktop top bar actions.
  const filterButton = (
    <FiltersSheet
      open={filtersOpen}
      onOpenChange={setFiltersOpen}
      initialFilters={filters}
      viewerSex={viewer.sex}
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
        {initialView ? (
          <WorldMap
            className="size-full"
            initialCenter={[initialView.lat, initialView.lng]}
            initialZoom={initialView.zoom}
            onViewChange={persistView}
          >
            {mapMarkers}
          </WorldMap>
        ) : null}
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
          {initialView ? (
            <WorldMap
              className="size-full"
              initialCenter={[initialView.lat, initialView.lng]}
              initialZoom={initialView.zoom}
              onViewChange={persistView}
            >
              {mapMarkers}
            </WorldMap>
          ) : null}
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
                  const src = photoOrGradient(p, 0);
                  const matched = matchedUuids.has(p.id);
                  const name = p.firstName ?? "Match";
                  return (
                    <Card
                      key={p.id}
                      tone="flat"
                      size="sm"
                      className="flex flex-row items-center gap-3 p-3 rounded-2xl bg-(--card) border border-(--hairline)"
                    >
                      {/* Prospect photo (first slot); gradient/brand initial
                          as fallback. Mirrors the discover desktop rail. */}
                      <Avatar size="tap">
                        {src.kind === "photo" ? (
                          <AvatarImage src={src.src} alt="" />
                        ) : null}
                        <AvatarFallback
                          variant="brand"
                          style={
                            src.kind === "gradient"
                              ? ({ background: src.css } as React.CSSProperties)
                              : undefined
                          }
                        >
                          {nameInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-meta font-semibold truncate text-(--ink)">
                          {name}
                          {p.age ? `, ${p.age}` : ""}
                        </p>
                        {location ? (
                          <p className="flex items-center gap-1 text-caption truncate text-(--ink-2)">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            {location}
                          </p>
                        ) : null}
                      </div>
                      {/* You can only message a confirmed match. For everyone
                          else the action is "view profile" (the marker click
                          does the same) — messaging an unmatched prospect
                          isn't allowed, so we don't offer a chat affordance. */}
                      {matched ? (
                        <Button
                          size="circle-lg"
                          tone="cta"
                          render={<Link href={`/chat/${p.id}`} prefetch={false} />}
                          aria-label={`Message ${name}`}
                        >
                          <MessageCircle className="size-4" aria-hidden />
                        </Button>
                      ) : (
                        <Button
                          size="circle-lg"
                          tone="elevated"
                          render={
                            <Link href={`/profile/${p.id}?from=map`} prefetch={false} />
                          }
                          aria-label={`View ${name}'s profile`}
                        >
                          <ChevronRight className="size-4" aria-hidden />
                        </Button>
                      )}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MapPin, SlidersHorizontal, X } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { BottomNav } from "@/components/app/bottom-nav";
import { DiscoverCardFace } from "@/components/app/discover-card-face";
import { EmptyState } from "@/components/app/empty-state";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { SwipeDeck, type DeckItem } from "@/components/app/swipe-deck";
import { useProfile } from "@/lib/use-profile";
import { firstMissingStepFor, isDiscoverEligible } from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck, type DiscoverFilters as HttpFilters } from "@/lib/use-discover-deck";
import { useFilters } from "@/lib/use-filters";

/**
 * /discover — the dating app's central swipe surface.
 *
 * Phase W rewire (this file):
 *   - Deck is fetched from `GET /search` via `useDiscoverDeck`. Filter
 *     changes reset the deck and refetch from the head. SwipeDeck's
 *     `onNeedMore` triggers prefetch when only ~3 cards remain.
 *   - Each swipe POSTs to `/decisions` via `useDecisions().decide`.
 *   - Mutual matches navigate to `/match?matchId=<id>` (handled by the
 *     /match page).
 *
 * Local-decision tracking (the legacy `recordLike`/`hasDecided` flow) is
 * deliberately removed here — the backend owns swipe state post-Phase W,
 * and the local `useDecisions` legacy surface is only kept for /map and
 * /profile/[uuid] cosmetic affordances.
 */
export default function DiscoverPage() {
  const router = useRouter();
  const { profile: userProfile, loaded } = useProfile();
  const { decide, pendingIds } = useDecisions();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Local filter state powers the FiltersSheet; we adapt its shape to the
  // useDiscoverDeck HTTP filter shape just below.
  const { filters, setFilters } = useFilters();

  // Soft-completeness gate — redirect incomplete profiles to first missing
  // step. If the missing field has no wizard step (config drift), fall
  // through to /profile/edit instead of stranding the user on this page.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(userProfile)) {
      const missingStep = firstMissingStepFor(userProfile);
      router.replace(missingStep ?? "/profile/edit");
    }
  }, [loaded, userProfile, router]);

  // Map FiltersSheet's local filter shape onto the HTTP filter shape that
  // useDiscoverDeck expects. The local filters object carries far more
  // facets than the backend exposes today (assemblies, intents, etc.);
  // those are silently dropped here — they will return as discovery-prefs
  // wiring lands in a future phase. age + countries + languages cover the
  // current backend `/search` query-string shape.
  const httpFilters: HttpFilters = useMemo(
    () => ({
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      countries: filters.country,
      languages: filters.languages,
    }),
    [filters.ageMin, filters.ageMax, filters.country, filters.languages],
  );

  const { items, loadMore, hasMore } = useDiscoverDeck(httpFilters);

  // Filter out candidates currently mid-decision so the deck doesn't double-
  // count a card the user just swiped while the server response is in flight.
  // The hook still tracks them in pendingIds; we just hide them visually.
  const visibleItems = useMemo(
    () => items.filter((c) => !pendingIds.has(c.id)),
    [items, pendingIds],
  );

  // Map candidates to DeckItem shape consumed by SwipeDeck. render() is
  // a thunk so SwipeDeck can call it once per visible slot without us
  // re-binding callbacks each parent render.
  const deckItems: DeckItem[] = useMemo(
    () =>
      visibleItems.map((candidate) => ({
        id: candidate.id,
        render: () => <DiscoverCardFace candidate={candidate} />,
      })),
    [visibleItems],
  );

  const handleDecide = async (
    item: DeckItem,
    decision: "like" | "nope",
  ) => {
    try {
      const result = await decide(item.id, decision);
      if (decision === "like" && result.matchId) {
        router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
      }
    } catch {
      // Errors are surfaced through useDecisions().error; the deck
      // returns to its prior visible state automatically because the
      // failed id is removed from pendingIds in the hook's finally.
      // Future: toast via global notification rail when the
      // notifications primitive lands.
    }
  };

  const handleNeedMore = () => {
    if (hasMore) {
      void loadMore();
    }
  };

  // During hydration or completeness redirect, render minimal scaffolding.
  if (!loaded || (loaded && !isDiscoverEligible(userProfile))) {
    return (
      <PageShell bottomPad="nav">
        <h1 className="sr-only">Discover</h1>
        <PageHeader pad="default" className="flex items-center justify-between">
          <BrandMark size="sm" />
          <div className="flex items-center gap-3">
            <Button
              size="circle"
              tone="elevated"
              aria-label="Discovery filters"
              disabled
            >
              <SlidersHorizontal className="text-lavender" />
            </Button>
            <Button
              size="circle"
              variant="ghost"
              aria-label="My profile"
              className="p-0"
              disabled
            >
              <Avatar size="tap-lg">
                <AvatarFallback variant="brand">E</AvatarFallback>
                <AvatarBadge className="top-0 right-0 bottom-auto bg-lime ring-bg-indigo" />
              </Avatar>
            </Button>
          </div>
        </PageHeader>
        <div
          className="relative mt-3 flex flex-1 flex-col items-center justify-center px-5"
          aria-live="polite"
        >
          <div className="text-center">
            <p className="text-body text-text-secondary">
              {!loaded
                ? "Loading…"
                : "Taking you to finish your profile…"}
            </p>
          </div>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="nav">
      {/* Visually-hidden page heading for screen readers. */}
      <h1 className="sr-only">Discover</h1>

      <PageHeader pad="default" className="flex items-center justify-between">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3">
          <FiltersSheet
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            initialFilters={filters}
            trigger={
              <Button
                size="circle"
                tone="elevated"
                aria-label="Discovery filters"
              >
                <SlidersHorizontal className="text-lavender" />
              </Button>
            }
            onApply={(f) => setFilters(f)}
          />
          <Button
            nativeButton={false}
            size="circle"
            variant="ghost"
            aria-label="My profile"
            className="p-0"
            render={<Link href="/profile" prefetch={false} />}
          >
            <Avatar size="tap-lg">
              <AvatarFallback variant="brand">E</AvatarFallback>
              <AvatarBadge className="top-0 right-0 bottom-auto bg-lime ring-bg-indigo" />
            </Avatar>
          </Button>
        </div>
      </PageHeader>

      {/* "Filtered by map view" pill — same UX as the pre-Phase-W version.
          /map writes filters.country when the user pans to a narrow region;
          this row gives a single-tap escape. */}
      {filters.country && filters.country.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex justify-center px-3 pt-1"
        >
          <button
            type="button"
            onClick={() => setFilters({ ...filters, country: undefined })}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-bg-elevated/80 px-3 py-1.5 text-caption text-white backdrop-blur-sm transition-colors hover:bg-bg-elevated"
            aria-label={`Filtered by map view, ${filters.country.length} ${filters.country.length === 1 ? "region" : "regions"}. Tap to clear.`}
          >
            <MapPin className="size-3" aria-hidden />
            <span>
              Filtered by map view · {filters.country.length}{" "}
              {filters.country.length === 1 ? "region" : "regions"}
            </span>
            <X className="size-3" aria-hidden />
          </button>
        </motion.div>
      )}

      <div className="relative mt-3 flex flex-1 flex-col px-5 pb-2">
        <SwipeDeck
          items={deckItems}
          onDecide={handleDecide}
          onNeedMore={handleNeedMore}
          pageThreshold={3}
          emptyState={
            <EmptyState
              variant="no-matches"
              title="You're all caught up."
              description="Try widening your filters or check back later."
              action={{
                label: "Adjust filters",
                onClick: () => setFiltersOpen(true),
              }}
              className="mx-0 mt-0 rounded-2xl border border-white/10 bg-bg-elevated"
            />
          }
        />
      </div>

      <BottomNav />
    </PageShell>
  );
}

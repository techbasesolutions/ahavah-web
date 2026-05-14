"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Heart, MapPin, Pause, X } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState } from "@/components/app/empty-state";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { PhotoCaption } from "@/components/app/photo-caption";
import { useProfile } from "@/lib/use-profile";
import { firstMissingStepFor, isDiscoverEligible } from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
import { useFilters } from "@/lib/use-filters";
import { photoOrGradient } from "@/lib/photo-or-gradient";

/**
 * /discover — central candidate-browsing surface.
 *
 * UX (restored from the original prototype, NOT the Tinder-style swipe-deck
 * the Phase W draft introduced):
 *   - One candidate card at a time, full-bleed photo or gradient.
 *   - Tap zones: left third = previous, right two-thirds = next.
 *   - Action row inside the card: Skip / Pause / Like (Pause is the
 *     auto-advance toggle — currently a no-op since we do not auto-advance).
 *   - Progress bar at top tracks position in the visible deck.
 *
 * Backend wiring (this is what Phase W kept):
 *   - Deck fetched from GET /search via useDiscoverDeck.
 *   - Skip / Like POSTs to /decisions via useDecisions().decide.
 *   - Mutual matches navigate to /match?matchId=<id>.
 */

export default function DiscoverPage() {
  const router = useRouter();
  const { profile: userProfile, loaded } = useProfile();
  const { decide, pendingIds } = useDecisions();
  const { filters, setFilters } = useFilters();
  const [exitDirection, setExitDirection] = useState<"left" | "right">("left");

  // Soft-completeness gate.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(userProfile)) {
      const missingStep = firstMissingStepFor(userProfile);
      router.replace(missingStep ?? "/profile/edit");
    }
  }, [loaded, userProfile, router]);

  // Map FiltersSheet shape onto the HTTP filter shape.
  const httpFilters = useMemo(
    () => ({
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      countries: filters.country,
      languages: filters.languages,
    }),
    [filters.ageMin, filters.ageMax, filters.country, filters.languages],
  );

  const { items, loadMore, hasMore } = useDiscoverDeck(httpFilters);

  // Hide candidates currently mid-decision so the visible card never goes
  // back to one we just acted on while the network call is in flight.
  const visibleItems = useMemo(
    () => items.filter((c) => !pendingIds.has(c.id)),
    [items, pendingIds],
  );

  const candidate = visibleItems[0];

  const advance = async (decision: "like" | "nope") => {
    if (!candidate) return;
    setExitDirection(decision === "like" ? "right" : "left");
    try {
      const result = await decide(candidate.id, decision);
      if (decision === "like" && result.matchId) {
        router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
        return;
      }
    } catch {
      // useDecisions surfaces error; visible state recovers via pendingIds.
    }
    // Prefetch when the deck is running low.
    if (hasMore && visibleItems.length <= 3) void loadMore();
  };

  // During hydration / redirect, render minimal scaffolding.
  if (!loaded || (loaded && !isDiscoverEligible(userProfile))) {
    return (
      <PageShell bottomPad="nav">
        <h1 className="sr-only">Discover</h1>
        <PageHeader pad="default" className="flex items-center justify-between">
          <BrandMark size="sm" />
          <div className="flex items-center gap-3">
            <Button size="circle" tone="elevated" aria-label="Discovery filters" disabled>
              <Globe className="text-lavender" />
            </Button>
            <Button
              size="circle"
              variant="ghost"
              aria-label="My profile"
              className="p-0"
              disabled
            >
              <Avatar size="tap-lg">
                <AvatarFallback variant="brand">
                  {userProfile.firstName?.[0] ?? "•"}
                </AvatarFallback>
                <AvatarBadge className="top-0 right-0 bottom-auto bg-lime ring-bg-indigo" />
              </Avatar>
            </Button>
          </div>
        </PageHeader>
        <div
          className="relative mt-3 flex flex-1 flex-col items-center justify-center px-5"
          aria-live="polite"
        >
          <p className="text-body text-text-secondary">
            {!loaded ? "Loading…" : "Taking you to finish your profile…"}
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  const photoSource = candidate ? photoOrGradient(candidate, 0) : null;

  return (
    <PageShell bottomPad="nav">
      <h1 className="sr-only">Discover</h1>

      <PageHeader pad="default" className="flex items-center justify-between">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3">
          <FiltersSheet
            trigger={
              <Button size="circle" tone="elevated" aria-label="Discovery filters">
                <Globe className="text-lavender" />
              </Button>
            }
            onApply={(f) => setFilters(f)}
          />
          <Button
            size="circle"
            variant="ghost"
            aria-label="My profile"
            className="p-0"
            render={<Link href="/profile" prefetch={false} />}
          >
            <Avatar size="tap-lg">
              <AvatarFallback variant="brand">
                {userProfile.firstName?.[0] ?? "•"}
              </AvatarFallback>
              <AvatarBadge className="top-0 right-0 bottom-auto bg-lime ring-bg-indigo" />
            </Avatar>
          </Button>
        </div>
      </PageHeader>

      <div className="relative mt-3 flex flex-1 flex-col px-5">
        <AnimatePresence mode="wait" initial={false}>
          {candidate ? (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, x: exitDirection === "left" ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: exitDirection === "left" ? -60 : 60 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full flex-1 overflow-hidden rounded-2xl bg-cover bg-center shadow-2xl"
              style={
                photoSource?.kind === "gradient"
                  ? ({
                      backgroundImage: photoSource.css,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {photoSource?.kind === "photo" && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoSource.src}
                  alt={`${candidate.firstName ?? "Candidate"} photo`}
                  className="absolute inset-0 z-0 size-full object-cover"
                />
              )}

              {/* Progress bar — single-photo mode for now (one segment).
                  When multi-photo lands, this becomes one segment per photo
                  with the active one filled. */}
              <div
                aria-hidden
                className="absolute top-5 right-5 left-5 z-20 flex gap-1.5"
              >
                <Progress value={100} className="flex-1" />
              </div>

              {/* Symmetric tap zones — left 50% = previous, right 50% =
                  next. Plain transparent <button> elements (NOT the
                  Button kit) — the kit's `ghost` variant added
                  hover/active backgrounds that produced a visible
                  vertical seam down the card. These are pure tap
                  surfaces, visually invisible at every state except
                  focus-visible (subtle keyboard-only indicator).
                  Re-discovered: previously fixed in 6242b47 + 583690e;
                  do not regress. */}
              <button
                type="button"
                aria-label="Previous candidate"
                onClick={() => advance("nope")}
                className="absolute inset-y-0 left-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />
              <button
                type="button"
                aria-label="Next candidate"
                onClick={() => advance("nope")}
                className="absolute inset-y-0 right-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />

              <PhotoCaption className="px-6 pb-24">
                <h2 className="text-h2 leading-tight text-white">
                  {candidate.firstName ?? "Someone"}
                  {candidate.age ? `, ${candidate.age}` : ""}
                </h2>
                {candidate.city && candidate.country ? (
                  <p className="mt-1 flex items-center gap-1 text-caption text-white/85">
                    <MapPin className="size-3" /> {candidate.city}, {candidate.country}
                  </p>
                ) : candidate.country ? (
                  <p className="mt-1 flex items-center gap-1 text-caption text-white/85">
                    <MapPin className="size-3" /> {candidate.country}
                  </p>
                ) : null}
              </PhotoCaption>

              {/* Action row — Skip / Pause / Like, floating at the bottom
                  of the card. z-30 wins over the tap zones (z-10). */}
              <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-5">
                <Button
                  size="circle"
                  tone="brand"
                  lift="float"
                  aria-label="Skip"
                  onClick={() => advance("nope")}
                >
                  <X className="text-black" />
                </Button>
                <Button
                  size="circle-lg"
                  tone="cta"
                  lift="float"
                  aria-label="Pause"
                  // No-op for now. Reserved for the auto-advance toggle
                  // when slideshow mode lands.
                >
                  <Pause className="text-black" fill="currentColor" />
                </Button>
                <Button
                  size="circle"
                  tone="action"
                  lift="float"
                  aria-label="Like"
                  onClick={() => advance("like")}
                >
                  <Heart className="text-white" fill="currentColor" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState
                variant="filter-too-narrow"
                title="You're all caught up"
                description="No more matches nearby — try widening your filters or check back later."
                action={{
                  label: "Adjust filters",
                  onClick: () => setFilters({}),
                }}
                className="mx-0 mt-0 rounded-2xl border border-white/10 bg-bg-elevated"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </PageShell>
  );
}

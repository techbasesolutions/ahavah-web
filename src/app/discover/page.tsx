"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronRight, Heart, MapPin, Pause, Play, SlidersHorizontal, X } from "lucide-react";

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
import { readOnboarded } from "@/lib/onboarded-storage";
import { firstMissingStepFor, isDiscoverEligible } from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
import { useFilters } from "@/lib/use-filters";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { formatLastSeen, isOnline } from "@/lib/last-seen";

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
  // Track whether at least one swipe has happened. The very first card
  // a user sees should land in its final position without sliding in;
  // subsequent cards (after Skip/Like) keep the lateral slide to give
  // visual feedback for the decision. Without this, the initial card
  // entered from x=±60 and the user reported the card position was
  // inconsistent across page loads.
  const [hasSwiped, setHasSwiped] = useState(false);
  // Photo carousel state — index into the current candidate's `photos`
  // array. Reset to 0 whenever the candidate changes (effect below).
  // `cyclePhotos` toggles the auto-advance through the candidate's photos
  // (NOT candidates) — Pause button in the action row controls this.
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cyclePhotos, setCyclePhotos] = useState(false);
  const [resettingDecisions, setResettingDecisions] = useState(false);
  // FiltersSheet is hoisted to /discover so the empty-state CTA can open
  // it. The header trigger uses the same sheet via a render prop.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const resetDecisions = async () => {
    if (resettingDecisions) return;
    setResettingDecisions(true);
    try {
      await apiClient.post("/decisions/reset", {});
      // Clear the local decided set too — without this, candidates the
      // user swiped on stay hidden client-side even though the backend
      // now has them back in the deck.
      setDecidedIds(new Set());
      // Bounce filters to trigger useDiscoverDeck's effect: setFilters
      // with the same shape re-fetches /search since the backend now
      // has an empty search_cache for us. A no-op spread is enough
      // because filtersKey (JSON.stringify) sees a fresh reference.
      setFilters({ ...filters });
    } catch {
      // Quiet fail — testing affordance only.
    } finally {
      setResettingDecisions(false);
    }
  };

  // Soft-completeness gate. Trust the backend onboarded flag: once a
  // user has graduated via /finish-onboarding (readOnboarded() === true)
  // they have a person row + session and the backend will serve their
  // /discover deck. Sending them back to the wizard because some
  // Torah-observant frontend-only fields (intent/assembly/relocation)
  // never round-trip from Duolicious's schema would lock them out
  // every time localStorage is cleared. Profile-detail fields they
  // can still fill later via /profile/edit.
  useEffect(() => {
    if (!loaded) return;
    if (readOnboarded()) return;
    if (!isDiscoverEligible(userProfile)) {
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

  // Locally-decided ids. The backend records the decision in `liked` /
  // `skipped` / `swipe` and Q_UNCACHED_SEARCH_2 excludes them on the
  // NEXT /search call — but the items list is paginated and not
  // refetched per swipe, so without a local filter the just-swiped
  // candidate stays in the deck and the Like / Skip buttons appear to
  // do nothing.
  const [decidedIds, setDecidedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Hide candidates currently mid-decision OR already decided in this
  // session so the visible card never repeats one we just acted on.
  const visibleItems = useMemo(
    () => items.filter((c) => !pendingIds.has(c.id) && !decidedIds.has(c.id)),
    [items, pendingIds, decidedIds],
  );

  const candidate = visibleItems[0];
  // Cached photo count so the carousel never out-runs the array. Empty
  // (no photos uploaded) → 1 (so ProgressDots renders one segment and
  // the gradient fallback gets a faux "single photo" slot).
  const photoCount = Math.max(1, candidate?.photos?.length ?? 0);

  // Reset photo index whenever the candidate changes. The dependency on
  // candidate?.id is what triggers the reset; the candidate object itself
  // can re-render while the same person is on screen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhotoIndex(0);
  }, [candidate?.id]);

  const advance = useCallback(
    async (decision: "like" | "nope") => {
      if (!candidate) return;
      const candidateId = candidate.id;
      setExitDirection(decision === "like" ? "right" : "left");
      setHasSwiped(true);
      // Optimistically remove this candidate from the visible deck so the
      // card animates out + the next one comes in even if the backend is
      // slow. If the decide() POST throws, undo below.
      setDecidedIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });
      try {
        const result = await decide(candidateId, decision);
        if (decision === "like" && result.matchId) {
          router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
          return;
        }
      } catch {
        // POST failed — un-hide the candidate so the user can try again.
        setDecidedIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
      // Prefetch when the deck is running low.
      if (hasMore && visibleItems.length <= 3) void loadMore();
    },
    [candidate, decide, hasMore, visibleItems.length, loadMore, router],
  );

  // Tap-zone handlers — left zone goes back one photo (no-op at first
  // photo), right zone goes forward one photo (advances to next
  // candidate when at the last photo). This matches the standard
  // Bumpy / Tinder / Hinge gesture for the photo timeline.
  const prevPhoto = useCallback(() => {
    setPhotoIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);
  const nextPhoto = useCallback(() => {
    setPhotoIndex((i) => {
      if (i + 1 < photoCount) return i + 1;
      // At the last photo and user tapped right → advance to next
      // candidate (recording a 'nope'). We don't await here because the
      // setState path must run before this microtask resolves; the
      // pending decision is non-blocking.
      void advance("nope");
      return 0;
    });
  }, [photoCount, advance]);

  // Photo auto-cycle timer. When `cyclePhotos` is true, advance through
  // the candidate's photo carousel every PHOTO_CYCLE_MS. When the loop
  // reaches the last photo, it WRAPS back to 0 rather than skipping to
  // the next candidate — auto-skip-by-time was the original misbuild
  // the user explicitly rejected. The Pause button toggles cyclePhotos.
  const PHOTO_CYCLE_MS = 3_500;
  // Stable ref to photoCount so the interval callback reads the latest
  // value without restarting the timer on every photo-index change.
  // Updated in an effect (refs cannot be assigned during render).
  const photoCountRef = useRef(photoCount);
  useEffect(() => {
    photoCountRef.current = photoCount;
  }, [photoCount]);
  useEffect(() => {
    if (!cyclePhotos) return;
    if (!candidate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCyclePhotos(false);
      return;
    }
    const id = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % photoCountRef.current);
    }, PHOTO_CYCLE_MS);
    return () => clearInterval(id);
  }, [cyclePhotos, candidate]);

  // During hydration / redirect, render minimal scaffolding. Same
  // backend-onboarded short-circuit as the gate above: if the user is
  // server-side-onboarded, don't show the "Redirecting…" placeholder.
  if (!loaded || (loaded && !readOnboarded() && !isDiscoverEligible(userProfile))) {
    return (
      <PageShell bottomPad="nav-fixed">
        <h1 className="sr-only">Discover</h1>
        <PageHeader pad="default" className="flex items-center justify-between">
          <BrandMark size="sm" />
          <div className="flex items-center gap-3">
            <Button size="circle" tone="elevated" aria-label="Discovery filters" disabled>
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
                <AvatarFallback variant="brand">
                  {userProfile.firstName?.[0] ?? "•"}
                </AvatarFallback>
                <AvatarBadge className="top-0 right-0 bottom-auto bg-lime ring-bg-indigo" />
              </Avatar>
            </Button>
          </div>
        </PageHeader>
        {/* Same outer container as the loaded state — flex-col, top-
            aligned, px-5 — so the card slot occupies the exact same
            screen rectangle in both states. Without this, "Loading…"
            sat vertically centered then the card jumped to the top
            when ready, making the layout feel unstable on every load. */}
        <div
          className="relative mt-3 flex flex-1 flex-col px-5"
          aria-live="polite"
        >
          <p className="mt-auto mb-auto text-center text-body text-text-secondary">
            {!loaded ? "Loading…" : "Taking you to finish your profile…"}
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  const photoSource = candidate ? photoOrGradient(candidate, photoIndex) : null;

  return (
    // /discover is a single-card surface — no scrolling, no overflow.
    // Hard-clamp the shell to the dynamic viewport (h-dvh, NOT min-h)
    // and overflow-hidden so any tiny child overshoot can't push the
    // card past the visible area. The min-h-dvh on PageShell only set
    // a floor; without an upper bound the layout could still grow
    // (e.g. iOS PWA standalone mode adds the home-indicator safe area
    // to the document, pushing flex-1 children below visible viewport
    // and clipping the action row behind the BottomNav). pb-safe adds
    // env(safe-area-inset-bottom) on top of pb-20 so the action row
    // clears the home indicator on devices that have one.
    <PageShell bottomPad="nav-fixed">
      <h1 className="sr-only">Discover</h1>

      <PageHeader pad="default" className="flex items-center justify-between">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3">
          <FiltersSheet
            trigger={
              <Button size="circle" tone="elevated" aria-label="Discovery filters">
                <SlidersHorizontal className="text-lavender" />
              </Button>
            }
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
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

      {/* Card slot + action row in the same flex container.
          - min-h-0 + flex-1 on the card lets it shrink to whatever
            vertical space remains AFTER the action row claims its
            56px. Without min-h-0, flex-1 children refuse to shrink
            below their content height and the action row gets pushed
            below the visible viewport (the bug that kept reappearing).
          - shrink-0 on the action row guarantees its height is never
            squeezed away. */}
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col gap-4 px-5 pb-3">
        <AnimatePresence mode="wait" initial={false}>
          {candidate ? (
            <motion.div
              key={candidate.id}
              // First card the user sees just fades in — no horizontal
              // slide — so the page layout stops jumping. Cards entering
              // after a Skip / Like keep the lateral slide as feedback
              // for the decision the user just made.
              initial={
                hasSwiped
                  ? { opacity: 0, x: exitDirection === "left" ? 60 : -60 }
                  : { opacity: 0 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: exitDirection === "left" ? -60 : 60 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              // Swipe-up detection without visual motion. dragElastic=0 +
              // both constraints at 0 lock the card to its origin; the
              // pointer gesture is still tracked and onDragEnd fires
              // with the full offset/velocity. Threshold: 60px upward OR
              // velocity < -400 navigates. The card never visibly moves.
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={(_e, info: PanInfo) => {
                if (info.offset.y < -60 || info.velocity.y < -400) {
                  router.push(
                    `/profile/${encodeURIComponent(candidate.id)}?from=discover`,
                  );
                }
              }}
              className="relative w-full min-h-0 flex-1 overflow-hidden rounded-2xl bg-cover bg-center shadow-2xl"
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

              {/* Photo timeline — one segment per uploaded photo, the
                  active one filled. Gradient-only candidates (no photos)
                  still get a single segment so the layout doesn't shift
                  between candidates. */}
              <div
                aria-hidden
                className="absolute top-5 right-5 left-5 z-20 flex gap-1.5"
              >
                {Array.from({ length: photoCount }).map((_, i) => (
                  <Progress
                    key={i}
                    value={i <= photoIndex ? 100 : 0}
                    className="flex-1"
                  />
                ))}
              </div>

              {/* Symmetric tap zones — left 50% = previous photo
                  (no-op at index 0), right 50% = next photo (advances
                  candidate when at last photo). Plain transparent
                  <button> elements (NOT the Button kit) — the kit's
                  `ghost` variant added hover/active backgrounds that
                  produced a visible vertical seam down the card.
                  Pre-fix: 6242b47 + 583690e; do not regress. */}
              <button
                type="button"
                aria-label="Previous photo"
                onClick={prevPhoto}
                className="absolute inset-y-0 left-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />
              <button
                type="button"
                aria-label="Next photo"
                onClick={nextPhoto}
                className="absolute inset-y-0 right-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />

              <PhotoCaption className="px-6 pb-6">
                {/* Tapping name + age opens the full profile. z-20 puts
                    the Link above the photo tap zones (z-10) so the
                    click lands here instead of advancing a photo. The
                    trailing chevron on the name signals the row is a
                    nav target rather than decorative text. */}
                <Link
                  href={`/profile/${encodeURIComponent(candidate.id)}?from=discover`}
                  prefetch={false}
                  aria-label={`View ${candidate.firstName ?? "profile"}'s full profile`}
                  className="relative z-20 -mx-2 -my-1 inline-block rounded-xl px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
                >
                  <h2 className="flex items-center gap-1 text-h2 leading-tight text-white">
                    <span className="underline decoration-white/30 decoration-1 underline-offset-4">
                      {candidate.firstName ?? "Someone"}
                      {candidate.age ? `, ${candidate.age}` : ""}
                    </span>
                    <ChevronRight className="size-5 text-white/70" />
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
                  {/* Online dot OR last-seen text. Tiny lime dot when
                      active in last 5 min; otherwise grey "Last seen
                      Xm ago" so the user can decide whether to send a
                      message expecting a quick reply. */}
                  <p className="mt-1 flex items-center gap-1.5 text-caption text-white/75">
                    {isOnline(candidate.seconds_since_last_online) ? (
                      <>
                        <span
                          aria-hidden
                          className="inline-block size-2 rounded-full bg-lime"
                        />
                        Online now
                      </>
                    ) : (
                      formatLastSeen(candidate.seconds_since_last_online)
                    )}
                  </p>
                </Link>
              </PhotoCaption>

            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3"
            >
              <EmptyState
                variant="filter-too-narrow"
                title="You're all caught up"
                description="No more matches nearby — try widening your filters or reset to re-see everyone."
                action={{
                  label: "Adjust filters",
                  // Open the FiltersSheet so the user can actually edit
                  // filters. Earlier this called setFilters({}) which
                  // was a no-op when filters were already empty.
                  onClick: () => setFiltersOpen(true),
                }}
                className="mx-0 mt-0 rounded-2xl border border-white/10 bg-bg-elevated"
              />
              {/* Reset decisions — wipes the user's swipe history on the
                  backend (skipped + liked tables) AND the search_cache.
                  Useful for testing the full /discover loop without
                  manual DB intervention. After reset, useDiscoverDeck's
                  filter-change effect re-fetches from /search. */}
              <Button
                variant="link"
                size="tap"
                className="self-center text-text-muted underline"
                onClick={() => void resetDecisions()}
                disabled={resettingDecisions}
              >
                {resettingDecisions ? "Resetting…" : "Reset my swipes (testing)"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action row — Skip / Pause / Like — sits as a flex sibling
            BELOW the card in the same parent flex container. shrink-0
            guarantees these 56px never get squeezed away regardless
            of viewport quirks. Was previously absolute-positioned
            inside the card with bottom-4, which let the buttons get
            clipped behind the BottomNav whenever the card overflowed
            its slot (the bug the user reported "still loads cut off").
            Hidden when there's no candidate so the empty-state CTA
            owns the slot. */}
        {candidate ? (
          <div className="flex shrink-0 items-center justify-center gap-5">
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
              aria-label={
                cyclePhotos ? "Pause photo slideshow" : "Play photo slideshow"
              }
              aria-pressed={cyclePhotos}
              onClick={() => setCyclePhotos((on) => !on)}
            >
              {cyclePhotos ? (
                <Pause className="text-black" fill="currentColor" />
              ) : (
                <Play className="text-black" fill="currentColor" />
              )}
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
        ) : null}
      </div>

      <BottomNav />
    </PageShell>
  );
}

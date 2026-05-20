"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronRight, MapPin, Pause, Play, SlidersHorizontal, X } from "lucide-react";

import { TokenActionIcon } from "@/lib/icon-map";

// Canonical action icons (icon-map.ts): Like = Heart, SuperLike = Star.
const LikeIcon = TokenActionIcon.Like;
const SuperLikeIcon = TokenActionIcon.SuperLike;
import { toast } from "sonner";

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useIncomingLikes } from "@/lib/use-incoming-likes";

import { BlurredAvatar } from "@/components/app/blurred-avatar";
import { Logo } from "@/components/brand/logo";
import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState } from "@/components/app/empty-state";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { PhotoCaption } from "@/components/app/photo-caption";
import { QuotaExceededCard } from "@/components/app/quota-exceeded-card";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";
import { useTokenBalance } from "@/lib/use-token-balance";
import { ApiError } from "@/lib/api-client";
import { useProfile } from "@/lib/use-profile";
import { readOnboarded } from "@/lib/onboarded-storage";
import { firstMissingStepFor, isDiscoverEligible } from "@/lib/profile-completeness";
import { useDecisions } from "@/lib/use-decisions";
import { useDiscoverDeck } from "@/lib/use-discover-deck";
import { useFilters } from "@/lib/use-filters";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { formatLastSeen, isOnline } from "@/lib/last-seen";

/**
 * /discover -- central candidate-browsing surface.
 *
 * Desktop (>=md): 3-column grid (260px filters | 1fr card | 320px rails).
 * Mobile (<md): unchanged single-card surface with swipe gestures.
 *
 * IMPORTANT: ALL hooks fire once at the top of the component.
 * Both the mobile and desktop render branches read from the same state
 * variables -- no duplicate hooks, no double renders.
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
  // visual feedback for the decision the user just made.
  const [hasSwiped, setHasSwiped] = useState(false);
  // Photo carousel state -- index into the current candidate's `photos`
  // array. Reset to 0 whenever the candidate changes (effect below).
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
      setDecidedIds(new Set());
      setFilters({ ...filters });
    } catch {
      // Quiet fail -- testing affordance only.
    } finally {
      setResettingDecisions(false);
    }
  };

  // Soft-completeness gate.
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
      verifiedOnly: Boolean(
        filters.verifiedOnly || userProfile?.requireVerifiedMatches,
      ),
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
      userProfile?.requireVerifiedMatches,
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

  const { items, loadMore, hasMore } = useDiscoverDeck(httpFilters);

  // Count active filters for the badge on the top-bar filter button.
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

  // Locally-decided ids to prevent swiped cards reappearing.
  const [decidedIds, setDecidedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Phase 5 (monetization-tokens): quota state.
  const [quotaState, setQuotaState] = useState<
    { resetsAt: string | null } | null
  >(null);

  // Incoming likes count for the desktop "New likes" gradient card.
  // Only the count is needed here — the card is a paywall teaser, not a grid.
  const { count: incomingLikesCount } = useIncomingLikes();

  // Phase 6: super-like state.
  const [superSheetOpen, setSuperSheetOpen] = useState(false);
  const [superBusy, setSuperBusy] = useState(false);
  const {
    state: tokenBalanceState,
    balance: tokenBalance,
    refresh: refreshTokens,
  } = useTokenBalance();
  const tokenBalanceForSheet =
    tokenBalanceState === "happy" ? tokenBalance : null;

  // Filter out candidates mid-decision or already decided.
  const visibleItems = useMemo(
    () => items.filter((c) => !pendingIds.has(c.id) && !decidedIds.has(c.id)),
    [items, pendingIds, decidedIds],
  );

  const candidate = visibleItems[0];
  const photoCount = Math.max(1, candidate?.photos?.length ?? 0);

  // Reset photo index whenever the candidate changes.
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
      setDecidedIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });
      try {
        const result = await decide(candidateId, decision);
        if (result.kind === "quota_exceeded") {
          setDecidedIds((prev) => {
            const next = new Set(prev);
            next.delete(candidateId);
            return next;
          });
          setQuotaState({ resetsAt: result.resetsAt });
          return;
        }
        if (decision === "like" && result.matchId) {
          router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
          return;
        }
      } catch {
        setDecidedIds((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
      if (hasMore && visibleItems.length <= 3) void loadMore();
    },
    [candidate, decide, hasMore, visibleItems.length, loadMore, router],
  );

  // Phase 6: super-like spend path.
  const handleSuperLike = useCallback(async () => {
    if (!candidate) return;
    const candidateId = candidate.id;
    setSuperBusy(true);
    try {
      const res = await apiClient.post<{
        super_liked: boolean;
        match_id: string | null;
      }>("/tokens/super-like", { person_id: candidateId });
      await refreshTokens();
      setSuperSheetOpen(false);
      setHasSwiped(true);
      setExitDirection("right");
      setDecidedIds((prev) => {
        const next = new Set(prev);
        next.add(candidateId);
        return next;
      });
      if (res.match_id) {
        router.push(`/match?matchId=${encodeURIComponent(res.match_id)}`);
        return;
      }
      if (hasMore && visibleItems.length <= 3) void loadMore();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        await refreshTokens();
        toast.error("Not enough tokens for Super Like.");
      } else {
        setSuperSheetOpen(false);
        const status = e instanceof ApiError ? e.status : null;
        const msg =
          status === 404
            ? "Super Like isn't available yet."
            : status === 401
              ? "Sign in to send a Super Like."
              : status === 503
                ? "Super Like is temporarily unavailable."
                : "Couldn't send Super Like. Try again.";
        toast.error(msg);
        console.error("super-like failed:", e);
      }
    } finally {
      setSuperBusy(false);
    }
  }, [candidate, hasMore, visibleItems.length, loadMore, refreshTokens, router]);

  // Tap-zone handlers.
  const prevPhoto = useCallback(() => {
    setPhotoIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);
  const nextPhoto = useCallback(() => {
    setPhotoIndex((i) => {
      if (i + 1 < photoCount) return i + 1;
      void advance("nope");
      return 0;
    });
  }, [photoCount, advance]);

  // Photo auto-cycle timer.
  const PHOTO_CYCLE_MS = 3_500;
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

  // Loading / redirect guard.
  if (!loaded || (loaded && !readOnboarded() && !isDiscoverEligible(userProfile))) {
    return (
      <PageShell bottomPad="nav-fixed" desktopShell="sidebar" topBarTitle="Discover" topBarBack={false}>
        <h1 className="sr-only">Discover</h1>
        <PageHeader pad="default" className="flex items-center justify-between">
          <Logo variant="horizontal" size="sm" priority />
          <div className="flex items-center gap-3">
            <Button size="circle-lg" tone="elevated" aria-label="Discovery filters" disabled>
              <SlidersHorizontal className="text-lavender" />
            </Button>
            <Button
              size="circle-lg"
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
          className="relative mt-3 flex flex-1 flex-col px-5"
          aria-live="polite"
        >
          <p className="mt-auto mb-auto text-center text-body text-(--ink-2)">
            {!loaded ? "Loading..." : "Taking you to finish your profile..."}
          </p>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  const photoSource = candidate ? photoOrGradient(candidate, photoIndex) : null;

  // Desktop "Recently seen" -- the next 3 candidates after the current one.
  const recentlySeen = visibleItems.slice(1, 4);

  // ── Shared JSX fragments (same state, used by both mobile + desktop) ──

  // The animated candidate card.
  const candidateCard = (
    <AnimatePresence mode="wait" initial={false}>
      {quotaState ? (
        <motion.div
          key="quota-exceeded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3"
        >
          <QuotaExceededCard
            resetsAt={quotaState.resetsAt}
            onDayPassActivated={() => setQuotaState(null)}
          />
        </motion.div>
      ) : candidate ? (
        <motion.div
          key={candidate.id}
          initial={
            hasSwiped
              ? { opacity: 0, x: exitDirection === "left" ? 60 : -60 }
              : { opacity: 0 }
          }
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: exitDirection === "left" ? -60 : 60 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
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
            <Link
              href={`/profile/${encodeURIComponent(candidate.id)}?from=discover`}
              prefetch={false}
              aria-label={`View ${candidate.firstName ?? "profile"}'s full profile`}
              className="relative z-20 -mx-2 -my-1 inline-block rounded-xl px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
            >
              {/* Caption text MUST be white — this sits over the photo
                  inside a PhotoCaption (black-gradient scrim). Using
                  --ink flips to indigo in light mode and disappears
                  against the photo. Same rule applies to every other
                  overlay-on-photo caption in the app. */}
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
            description="No more matches nearby -- try widening your filters or reset to re-see everyone."
            action={{
              label: "Adjust filters",
              onClick: () => setFiltersOpen(true),
            }}
            className="mx-0 mt-0 rounded-2xl border border-border bg-(--card)"
          />
          <Button
            variant="link"
            size="tap"
            className="self-center text-(--ink-3) underline"
            onClick={() => void resetDecisions()}
            disabled={resettingDecisions}
          >
            {resettingDecisions ? "Resetting..." : "Reset my swipes (testing)"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Action rows ──────────────────────────────────────────────────────────
  // Mobile: current behavior preserved verbatim (stacked "Super" label
  // keeps the existing feel on small screens).
  // Desktop: 4 equal circles in a single items-center flex row — no stacked
  // labels. The Super button uses `tone="brand"` (lavender + black
  // sparkle) so all four circles are visually distinct. Like icon is
  // `text-black` (not text-(--ink)) per §1.3 contrast audit (pink + black = 6.6:1 ✓).
  // Mobile action row — Task 13 Step 6 (2026-05-17): aligned with desktop
  // canonical 4-button row per user direction. Order: Skip / Play / Like /
  // Super, all at circle-2xl (64px). Stacked "Super" label removed (was a
  // mobile-only divergence the user called out as bad placement). Super
  // uses tone="brand" (lavender) — distinct from Play's cta-lime and
  // Like's action-pink — matching desktop. Like icon switched from
  // text-(--ink) to text-black to match canonical contrast rule §1.3
  // (pink + black = 6.6:1 ✓; pink + white = 3.66:1 ✗).
  const actionRowMobile = candidate && !quotaState ? (
    <div className="flex shrink-0 items-center justify-center gap-5">
      <Button
        size="circle-2xl"
        tone="brand"
        lift="float"
        aria-label="Skip"
        onClick={() => advance("nope")}
      >
        <X className="size-7 text-black" strokeWidth={2.4} />
      </Button>
      <Button
        size="circle-2xl"
        tone="cta"
        lift="float"
        aria-label={cyclePhotos ? "Pause photo slideshow" : "Play photo slideshow"}
        aria-pressed={cyclePhotos}
        onClick={() => setCyclePhotos((on) => !on)}
      >
        {cyclePhotos ? (
          <Pause className="size-8 text-black" fill="currentColor" />
        ) : (
          <Play className="size-8 text-black" fill="currentColor" />
        )}
      </Button>
      <Button
        size="circle-2xl"
        tone="action"
        lift="float"
        aria-label="Like"
        onClick={() => advance("like")}
      >
        <LikeIcon className="size-7 text-black" fill="currentColor" />
      </Button>
      <Button
        size="circle-2xl"
        tone="brand"
        lift="float"
        aria-label="Super like, costs 2 tokens"
        onClick={() => setSuperSheetOpen(true)}
      >
        <SuperLikeIcon className="size-7 text-black" fill="currentColor" />
      </Button>
    </div>
  ) : null;

  // (Task 13 Step 2): the canonical desktop action row is inlined inside
  // the desktop block below. The previous `actionRowDesktop` const
  // (4 buttons including the post-canonical Super-like) was removed —
  // Step 6 of Task 13 will re-introduce the Super-like button at the
  // user-approved placement within the canonical action row.

  return (
    <PageShell
      bottomPad="nav-fixed"
      desktopShell="sidebar"
      topBarTitle="Discover"
      topBarBack={false}
      topBarActions={
        // Same filter trigger as /map desktop topbar — Button size="circle-lg"
        // tone="elevated" with SlidersHorizontal + a lime count badge when
        // filters are active. Keeps /discover and /map visually consistent
        // (both surfaces share the same FiltersSheet + useFilters store).
        <Button
          size="circle-lg"
          tone="elevated"
          aria-label={
            activeFilterCount > 0
              ? `Discovery filters (${activeFilterCount} active)`
              : "Discovery filters"
          }
          className="relative"
          onClick={() => setFiltersOpen(true)}
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
    >
      <h1 className="sr-only">Discover</h1>

      {/* ── Mobile layout (<md): existing behavior unchanged ─────────── */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <PageHeader pad="default" className="flex items-center justify-between">
          <Logo variant="horizontal" size="sm" priority />
          <div className="flex items-center gap-3">
            <FiltersSheet
              trigger={
                <Button
                  size="circle-lg"
                  tone="elevated"
                  aria-label={
                    activeFilterCount > 0
                      ? `Discovery filters (${activeFilterCount} active)`
                      : "Discovery filters"
                  }
                  className="relative"
                >
                  <SlidersHorizontal className="text-lavender" />
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
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              onApply={(f) => setFilters(f)}
            />
            <Button
              size="circle-lg"
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

        {/* Card slot + action row */}
        <div className="relative mt-3 flex min-h-0 flex-1 flex-col gap-4 px-5 pb-3">
          {candidateCard}
          {actionRowMobile}
        </div>
      </div>

      {/* ── Desktop layout (>=md): canonical port per DiscoverDesktop ── */}
      {/*
        Ported from docs/handoff-desktop/desktop.jsx:L434-L586 (DiscoverDesktop).
        3-col grid: 260px filters / 1fr center (460x640 photo card + action row)
        / 320px right rail (New likes gradient card + Recently seen row cards).
        Outer padding 24 per canonical. Gap 24.
        Reuses the shared `candidateCard` for the center photo (which carries
        the QuotaExceededCard conditional + the empty state — both pre-canonical
        and shared with mobile via the same candidate state).
        Action row: 3 buttons (Skip 64 brand / Play 64 cta / Like 64 action).
        Canonical specifies Play at 80px; kit's max circle size is 64
        (circle-2xl). Flagged as a kit-gap pending user decision in Step 6.
        Super-like button is intentionally absent from this canonical port —
        it is a post-canonical monetization surface added in Step 6 of Task 13
        after user-approved placement.
      */}
      <div className="hidden md:grid grid-cols-[260px_1fr_320px] gap-6 p-6">

        {/* LEFT — filter rail (canonical: 5 chip cards + Reset filters button) */}
        <aside className="flex flex-col gap-3.5">
          <p className="text-overline text-(--ink-2)">Filters</p>

          {/* 5 filter chip cards. Canonical (desktop.jsx:L451-L466):
              padding 14px 16px, radius 14, bg --card, border --hairline.
              Tappable — opens FiltersSheet per screens/04-discover.md L78. */}
          {(
            [
              {
                label: "Age range",
                value: `${filters.ageMin ?? 18}–${filters.ageMax ?? 80}`,
              },
              {
                label: "Country",
                value: filters.country?.length ? filters.country.join(", ") : "Any",
              },
              {
                label: "Languages",
                value: filters.languages?.length ? filters.languages.join(", ") : "Any",
              },
              {
                label: "Marital status",
                value: filters.maritalStatuses?.length
                  ? filters.maritalStatuses.join(", ")
                  : "Any",
              },
              {
                label: "Verified only",
                value: filters.verifiedOnly ? "Yes" : "Any",
              },
            ] as const
          ).map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="text-left rounded-[14px] border border-(--hairline) bg-(--card) px-4 py-3.5 min-h-11 transition-colors hover:bg-(--app) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lavender)"
            >
              <p className="text-caption text-(--ink-3)">{chip.label}</p>
              <p className="text-meta text-(--ink) mt-0.5 font-semibold truncate">
                {chip.value}
              </p>
            </button>
          ))}

          {/* Reset filters button (canonical desktop.jsx:L468-L473):
              marginTop 8 (mt-2), h 44, radius 12, border --hairline, --ink,
              centered, fontSize 14 fontWeight 600. */}
          <Button
            variant="ghost"
            size="tap"
            className="mt-2 h-11 rounded-xl border border-(--hairline) justify-center font-semibold text-meta text-(--ink) hover:bg-(--app)"
            onClick={() => setFilters({ ageMin: 18, ageMax: 80 })}
          >
            Reset filters
          </Button>

          {/* FiltersSheet trigger stays as a hidden control so the chip-card
              onClicks can open it via setFiltersOpen. Sheet UI is unchanged. */}
          <FiltersSheet
            trigger={<span className="hidden" aria-hidden />}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            onApply={(f) => setFilters(f)}
          />
        </aside>

        {/* CENTER — 460×640 photo card + canonical 3-button action row.
            Reuses the shared {candidateCard} which already carries the
            QuotaExceededCard conditional + empty state (pre-canonical;
            shared with mobile via the same candidate state). */}
        <div className="flex flex-col items-center justify-center gap-7">
          {/* candidateCard's candidate-branch motion.div uses `flex-1` to
              fill its parent's height — the wrapper MUST be flex flex-col
              for that to size correctly. The empty + quota branches use
              `flex flex-col gap-3` themselves which renders correctly
              inside this flex parent too. Width fixed at 460, height
              fixed at 640 per canonical (desktop.jsx:L478). */}
          <div className="relative flex flex-col w-115 h-160">
            {candidateCard}
          </div>

          {/* Action row — canonical desktop.jsx:L506-L510:
              Skip 64 brand (X icon 26 strokeWidth 2.4 black) /
              Play 80 cta (Play icon 32 filled black) /
              Like 64 action (Heart icon 26 white filled).
              KIT-GAP: Button's max circle size is `circle-2xl` (64). The
              canonical 80px Play size is not in the kit. Using circle-2xl
              for all three. Surfaced for user decision before Step 6
              integration — options: add a `circle-3xl: 80` size to the
              Button cva, or accept the 64/64/64 uniform-size variation.
              Super-like button is INTENTIONALLY ABSENT from this canonical
              port — it is a post-canonical monetization surface introduced
              in Step 6 of Task 13 after user-approved placement. */}
          {candidate && !quotaState ? (
            // Action row — Task 13 Step 6: Super-like added at A1/B1/C1
            // per user-approved placement (2026-05-17). Order: Skip /
            // Play / Like / Super. All 4 at circle-2xl (64px) for
            // canonical row uniformity. Super uses tone="brand" (lavender,
            // distinct from Play's cta-lime and Like's action-pink) +
            // Sparkles size-7 black. Wired to existing setSuperSheetOpen
            // state — TokenSpendSheet at the file bottom handles confirm.
            <div className="flex items-center gap-7">
              <Button
                size="circle-2xl"
                tone="brand"
                lift="float"
                aria-label="Skip"
                onClick={() => advance("nope")}
              >
                <X className="size-7 text-black" strokeWidth={2.4} />
              </Button>
              <Button
                size="circle-2xl"
                tone="cta"
                lift="float"
                aria-label={cyclePhotos ? "Pause photo slideshow" : "Play photo slideshow"}
                aria-pressed={cyclePhotos}
                onClick={() => setCyclePhotos((on) => !on)}
              >
                {cyclePhotos ? (
                  <Pause className="size-8 text-black" fill="currentColor" />
                ) : (
                  <Play className="size-8 text-black" fill="currentColor" />
                )}
              </Button>
              <Button
                size="circle-2xl"
                tone="action"
                lift="float"
                aria-label="Like"
                onClick={() => advance("like")}
              >
                <LikeIcon className="size-7 text-(--ink)" fill="currentColor" />
              </Button>
              <Button
                size="circle-2xl"
                tone="brand"
                lift="float"
                aria-label="Super like, costs 2 tokens"
                onClick={() => setSuperSheetOpen(true)}
              >
                <SuperLikeIcon className="size-7 text-black" fill="currentColor" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* RIGHT — "New likes" gradient card + "Recently seen" row cards.
            Per screens/04-discover.md L81: "New likes only renders when user
            is non-premium." Premium gating wiring is pre-existing (or TBD);
            keeping the card always visible for now per current behaviour. */}
        <aside className="flex flex-col gap-3.5">
          <p className="text-overline text-(--ink-2)">New likes</p>

          {/* Gradient Card — canonical desktop.jsx:L515-L539:
              padding 18, radius 18, indigo→lavender gradient, white text. */}
          <Card tone="gradient" className="p-4.5 gap-3 rounded-[18px]">
            <CardHeader className="p-0 gap-1.5">
              <p className="text-overline opacity-85 text-(--ink)">
                {incomingLikesCount > 0 ? incomingLikesCount : 3}{" "}
                {incomingLikesCount === 1 ? "like" : "likes"} this week
              </p>
              <p className="text-h3 text-(--ink) mt-1.5">See who liked you</p>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-3">
              {/* 3 frosted silhouettes (canonical L525-L533). aria-hidden —
                  the heading "See who liked you" carries the meaning. */}
              <AvatarGroup
                aria-hidden
                className="-space-x-3 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-white"
              >
                {[0, 1, 2].map((i) => (
                  <BlurredAvatar key={i} size="md" aria-hidden />
                ))}
              </AvatarGroup>
              <Button
                size="tap"
                tone="cta"
                className="w-full h-9 rounded-[10px] font-bold text-meta"
              >
                Unlock with Premium
              </Button>
            </CardContent>
          </Card>

          {/* "Recently seen" — canonical desktop.jsx:L541-L572:
              overline label + row cards (44px brand-fallback avatar with
              optional online dot + name/age + location + chevron). */}
          {recentlySeen.length > 0 && (
            <>
              <p className="text-overline text-(--ink-2) mt-2.5">
                Recently seen
              </p>
              {recentlySeen.map((c) => {
                const src = photoOrGradient(c, 0);
                return (
                  <Link
                    key={c.id}
                    href={`/profile/${encodeURIComponent(c.id)}?from=discover`}
                    prefetch={false}
                    className="flex items-center gap-3 rounded-[14px] border border-(--hairline) bg-(--card) px-3 py-2.5 min-h-11 transition-colors hover:bg-(--app)"
                  >
                    <div className="relative shrink-0">
                      <Avatar size="tap">
                        {src.kind === "photo" ? (
                          <AvatarImage
                            src={src.src}
                            alt={`${c.firstName ?? "Profile"}'s photo`}
                          />
                        ) : null}
                        <AvatarFallback
                          variant="brand-fallback"
                          style={
                            src.kind === "gradient"
                              ? ({ background: src.css } as React.CSSProperties)
                              : undefined
                          }
                        >
                          {c.firstName?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online dot — canonical L562-L566: top-right corner
                          of the avatar, 10px circle, lime, 2px --card ring. */}
                      {isOnline(c.seconds_since_last_online) ? (
                        <span
                          aria-label="Online now"
                          className="absolute top-0 right-0 size-2.5 rounded-full bg-lime ring-2 ring-(--card)"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-meta font-semibold text-(--ink) truncate">
                        {c.firstName ?? "Someone"}
                        {c.age ? `, ${c.age}` : ""}
                      </p>
                      {(c.city ?? c.country) ? (
                        <p className="text-caption text-(--ink-3) truncate">
                          {c.city && c.country
                            ? `${c.city}, ${c.country}`
                            : c.country ?? c.city}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="size-3.5 text-(--ink-3) shrink-0" />
                  </Link>
                );
              })}
            </>
          )}
        </aside>
      </div>

      {/* Phase 6: super-like confirmation sheet */}
      <TokenSpendSheet
        open={superSheetOpen}
        onOpenChange={setSuperSheetOpen}
        title={`Super-like ${candidate?.firstName ?? "this person"}?`}
        description="They'll see your like at the top of their deck with a lime ring."
        cost={2}
        currentBalance={tokenBalanceForSheet}
        onConfirm={handleSuperLike}
        busy={superBusy}
      />

      <BottomNav />
    </PageShell>
  );
}

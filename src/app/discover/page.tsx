"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Heart, MapPin, Pause, X } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState } from "@/components/app/empty-state";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { PhotoCaption } from "@/components/app/photo-caption";
import { ProgressDots } from "@/components/app/progress-dots";
import { CompatPill } from "@/components/app/compat-pill";
import { useProfile } from "@/lib/use-profile";
import { firstMissingStepFor, isDiscoverEligible } from "@/lib/profile-completeness";
import { buildDiscoverDeck, type DiscoverFilters, type DiscoverCandidate } from "@/lib/discover-engine";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import { useDecisions } from "@/lib/use-decisions";
import { simulateLikesBack } from "@/lib/decision-engine";

// Gradient palette for candidate photos (stable per firstName).
// Until profile.photos[] ships, we use a 3-gradient sequence per candidate
// so the timeline (multi-photo carousel) has something to walk through.
const PHOTO_GRADIENTS = [
  "linear-gradient(160deg,#FFB088 0%,#FF7A53 60%,#3D1A45 100%)",
  "linear-gradient(160deg,#9F76EA 0%,#5524F5 60%,#1A1340 100%)",
  "linear-gradient(160deg,#F9D976 0%,#A87E1E 60%,#3D2410 100%)",
  "linear-gradient(160deg,#6CB7FF 0%,#1A1340 60%,#000 100%)",
];

const PHOTOS_PER_CANDIDATE = 3;

/**
 * Stable 3-photo gradient sequence per candidate. Indexed off firstName's
 * char code so the same candidate always shows the same sequence across
 * remounts (no flicker on swipe + re-enter).
 */
function photosFor(firstName: string | undefined): string[] {
  const seed = firstName ? firstName.charCodeAt(0) : 0;
  return Array.from(
    { length: PHOTOS_PER_CANDIDATE },
    (_, i) => PHOTO_GRADIENTS[(seed + i) % PHOTO_GRADIENTS.length],
  );
}

/**
 * Convert SAMPLE_PROFILES to DiscoverCandidates with gradients.
 */
const SAMPLE_AS_CANDIDATES: DiscoverCandidate[] = SAMPLE_PROFILES.map((profile) => ({
  ...profile,
  id: profile.firstName?.toLowerCase() ?? "unknown",
}));

export default function DiscoverPage() {
  const router = useRouter();
  const { profile: userProfile, loaded } = useProfile();
  const { recordPass, recordLike, hasDecided } = useDecisions();
  const [userIndex, setUserIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [filters, setFilters] = useState<DiscoverFilters>({});
  // Track last action so AnimatePresence can pick a direction (skip → left,
  // like → right). Reset on user advance.
  const [exitDirection, setExitDirection] = useState<"left" | "right">("left");

  // Soft-completeness gate: redirect incomplete profiles to first missing step.
  // Check only after profile is loaded from localStorage.
  useEffect(() => {
    if (loaded && !isDiscoverEligible(userProfile)) {
      const missingStep = firstMissingStepFor(userProfile);
      if (missingStep) {
        router.replace(missingStep);
      }
    }
  }, [loaded, userProfile, router]);

  // Build the discover deck based on filters
  const deck = useMemo(() => {
    if (!userProfile) return [];
    return buildDiscoverDeck(userProfile, SAMPLE_AS_CANDIDATES, filters);
  }, [userProfile, filters]);

  // Exclude viewer themselves from the deck
  const filteredDeck = useMemo(() => {
    if (!userProfile?.firstName) return deck;
    const viewerFirstName = userProfile.firstName.toLowerCase();
    return deck.filter(
      (candidate) =>
        candidate.id !== viewerFirstName && !hasDecided(candidate.id),
    );
  }, [deck, userProfile, hasDecided]);

  const profile = filteredDeck[userIndex];

  /**
   * 3-photo gradient sequence for the current candidate. Stable per
   * firstName so the same candidate always shows the same photos.
   */
  const candidatePhotos = useMemo(
    () => photosFor(profile?.firstName),
    [profile?.firstName],
  );

  const currentPhoto = candidatePhotos[photoIndex] ?? candidatePhotos[0];

  const advanceUser = (action: "skip" | "like") => {
    if (!profile) return;
    // Stub: real impl POSTs to swipe service.
    setExitDirection(action === "like" ? "right" : "left");
    setUserIndex((i) => i + 1);
    setPhotoIndex(0);
  };

  /**
   * Walk the candidate's photo carousel. At the boundaries, advance / fall
   * back to the previous candidate so the gesture always does something.
   */
  const advancePhoto = (direction: "prev" | "next") => {
    if (!profile) return;
    if (direction === "next") {
      if (photoIndex < candidatePhotos.length - 1) {
        setPhotoIndex((i) => i + 1);
      } else {
        advanceUser("skip");
      }
    } else {
      if (photoIndex > 0) {
        setPhotoIndex((i) => i - 1);
      } else if (userIndex > 0) {
        setExitDirection("right");
        setUserIndex((i) => i - 1);
        setPhotoIndex(0);
      }
    }
  };


  // During hydration or redirect, render minimal state to avoid swipe deck flash.
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
              Redirecting to complete your profile…
            </p>
          </div>
        </div>
        <BottomNav />
      </PageShell>
    );
  }

  return (
    <PageShell bottomPad="nav">
      {/* Visually-hidden page heading for screen readers — the visible
          per-card h2 is the profile name, not a page-level heading.
          Without this, SR users land on a page with no h1. */}
      <h1 className="sr-only">Discover</h1>

      {/* Top chrome — BrandMark + filter/location button + own-avatar.
          Uses PageHeader chrome (px-5 pt-6) with a flex layout in className
          for the BrandMark-left, action-cluster-right pattern. */}
      <PageHeader pad="default" className="flex items-center justify-between">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3">
          <FiltersSheet
            trigger={
              <Button
                size="circle"
                tone="elevated"
                aria-label="Discovery filters"
              >
                <Globe className="text-lavender" />
              </Button>
            }
            onApply={(f) => {
              setFilters(f);
              setUserIndex(0);
            }}
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

      {/* Profile card — Stories model with slide transition on user-swap.
          AnimatePresence + keyed motion.div: card slides out in the
          chosen exit direction (skip → left, like → right) and the new
          card slides in from the opposite side. Reduce-motion via
          globals.css. */}
      <div className="relative mt-3 flex flex-1 flex-col px-5">
        {/* AnimatePresence custom prop: passes the current exitDirection
            to BOTH the exiting and entering card as a function arg for
            initial/exit variants. Without this, the exiting card's exit
            prop is captured from the previous render — so a reject right
            after a like would play the like exit animation (slide right)
            because exitDirection was still 'right' when the doomed card
            last rendered. */}
        <AnimatePresence mode="wait" initial={false} custom={exitDirection}>
          {profile ? (
            <motion.div
              key={profile.id}
              custom={exitDirection}
              variants={{
                initial: (dir: "left" | "right") => ({
                  opacity: 0,
                  x: dir === "left" ? 60 : -60,
                }),
                animate: { opacity: 1, x: 0 },
                exit: (dir: "left" | "right") => ({
                  opacity: 0,
                  x: dir === "left" ? -60 : 60,
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full flex-1 overflow-hidden rounded-2xl bg-cover bg-center shadow-2xl"
              style={
                {
                  "--photo-bg": currentPhoto,
                  backgroundImage: "var(--photo-bg)",
                } as React.CSSProperties
              }
            >
              {/* Timeline — one segment per photo, stories-style. Bar mode
                  fills reached segments and dims upcoming ones. */}
              <div className="absolute top-5 right-5 left-5 z-20">
                <ProgressDots
                  mode="bar"
                  tone="white"
                  count={candidatePhotos.length}
                  active={photoIndex}
                />
              </div>

              {/* Symmetric tap zones — left half = previous photo (or
                  previous candidate at photo 0), right half = next photo
                  (or next candidate at last photo). Plain transparent
                  <button> elements with no variant — the Button kit's
                  ghost variant added hover/active backgrounds that
                  produced a visible vertical seam down the card. These
                  are pure tap surfaces, visually invisible at every
                  state. Action row below sits on z-30. */}
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => advancePhoto("prev")}
                className="absolute inset-y-0 left-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => advancePhoto("next")}
                className="absolute inset-y-0 right-0 z-10 h-full w-1/2 cursor-pointer bg-transparent outline-none focus-visible:bg-white/5"
              />

              <PhotoCaption className="px-6 pb-20">
                {/* Name + location form a tap zone to the full profile.
                    Sits z-20 above the prev/next photo tap zones (z-10)
                    so the link wins the hit-test. Compat pill stays
                    outside the Link because it owns its own Sheet trigger. */}
                <Link
                  href={`/profile/${profile.id}`}
                  prefetch={false}
                  aria-label={`View ${profile.firstName}'s profile`}
                  className="relative z-20 -mx-1 -my-1 inline-block rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
                >
                  <h2 className="text-h2 leading-tight text-white">
                    {profile.firstName}, {profile.age}
                  </h2>
                  {profile.city && profile.country ? (
                    <p className="mt-1 flex items-center gap-1 text-caption text-white/85">
                      <MapPin className="size-3" /> {profile.city}, {profile.country}
                    </p>
                  ) : profile.country ? (
                    <p className="mt-1 flex items-center gap-1 text-caption text-white/85">
                      <MapPin className="size-3" /> {profile.country}
                    </p>
                  ) : null}
                </Link>
                <div className="relative z-20 mt-3">
                  <CompatPill score={profile.compatScore} size="sm" />
                </div>
              </PhotoCaption>

              {/* Action row — skip/pause/like for the profile */}
              <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-5">
                <Button
                  size="circle"
                  tone="brand"
                  lift="float"
                  aria-label="Skip user"
                  onClick={() => {
                    recordPass(profile.id);
                    advanceUser("skip");
                  }}
                >
                  <X className="text-black" />
                </Button>
                <Button
                  size="circle-lg"
                  tone="cta"
                  lift="float"
                  aria-label="Pause auto-advance"
                >
                  <Pause className="text-black" fill="currentColor" />
                </Button>
                <Button
                  size="circle"
                  tone="action"
                  lift="float"
                  aria-label="Like user"
                  onClick={() => {
                    recordLike(profile.id);
                    if (userProfile && simulateLikesBack(userProfile, profile)) {
                      router.push(`/match?id=${profile.id}`);
                    } else {
                      advanceUser("like");
                    }
                  }}
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

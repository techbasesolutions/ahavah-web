"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { CompatPill } from "@/components/app/compat-pill";
import { useProfile } from "@/lib/use-profile";
import { isDiscoverEligible } from "@/lib/profile-completeness";
import { firstMissingStepFor } from "@/lib/profile-completeness";
import { buildDiscoverDeck, type DiscoverFilters, type DiscoverCandidate } from "@/lib/discover-engine";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";

// Gradient palette for candidate photos (stable per firstName)
const PHOTO_GRADIENTS = [
  "linear-gradient(160deg,#FFB088 0%,#FF7A53 60%,#3D1A45 100%)",
  "linear-gradient(160deg,#9F76EA 0%,#5524F5 60%,#1A1340 100%)",
  "linear-gradient(160deg,#F9D976 0%,#A87E1E 60%,#3D2410 100%)",
  "linear-gradient(160deg,#6CB7FF 0%,#1A1340 60%,#000 100%)",
];

/**
 * Get a stable gradient for a candidate based on their firstName.
 */
function gradientFor(firstName: string | undefined): string {
  if (!firstName) return PHOTO_GRADIENTS[0];
  const index = firstName.charCodeAt(0) % PHOTO_GRADIENTS.length;
  return PHOTO_GRADIENTS[index];
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
  const [userIndex, setUserIndex] = useState(0);
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
    return deck.filter((candidate) => candidate.id !== viewerFirstName);
  }, [deck, userProfile]);

  const profile = filteredDeck[userIndex];

  /**
   * Get a single gradient photo for this candidate (since SAMPLE_PROFILES
   * don't have photo arrays in the schema).
   */
  const candidateGradient = useMemo(() => {
    return profile ? gradientFor(profile.firstName) : "";
  }, [profile]);

  const advanceUser = (action: "skip" | "like") => {
    if (!profile) return;
    // Stub: real impl POSTs to swipe service.
    setExitDirection(action === "like" ? "right" : "left");
    setUserIndex((i) => i + 1);
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
        <AnimatePresence mode="wait" initial={false}>
          {profile ? (
            <motion.div
              key={profile.id}
              initial={{
                opacity: 0,
                x: exitDirection === "left" ? 60 : -60,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: exitDirection === "left" ? -60 : 60,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full flex-1 overflow-hidden rounded-2xl bg-cover bg-center shadow-2xl"
              style={
                {
                  "--photo-bg": candidateGradient,
                  backgroundImage: "var(--photo-bg)",
                } as React.CSSProperties
              }
            >
              {/* Progress bar (single since we're using one gradient per candidate) */}
              <div
                aria-hidden
                className="absolute top-5 right-5 left-5 z-20 flex gap-1.5"
              >
                <Progress
                  value={100}
                  className="flex-1"
                />
              </div>

              {/* Photo-nav tap zones removed: SAMPLE_PROFILES have one
                  gradient placeholder each (no photo carousel), so the
                  asymmetric 1/3 + 2/3 invisible buttons just split the
                  card into uneven hover halves without actually navigating
                  anything. The Skip / Like buttons at the bottom of the
                  card are the real swipe affordance. When photo carousels
                  land (future sub-plan), restore symmetric 50/50 tap zones
                  that walk profile.photos[]. */}

              <PhotoCaption className="px-6 pb-20">
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
                <div className="mt-3">
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
                  onClick={() => advanceUser("skip")}
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
                  onClick={() => advanceUser("like")}
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

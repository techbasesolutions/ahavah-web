"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, Heart, MapPin, MessageCircle, Pause, X } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pill } from "@/components/kibo-ui/pill";

import { BrandMark } from "@/components/brand/sparkle-mark";
import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState } from "@/components/app/empty-state";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { PhotoCaption } from "@/components/app/photo-caption";
import { useProfile } from "@/lib/use-profile";
import { isDiscoverEligible } from "@/lib/profile-completeness";
import { firstMissingStepFor } from "@/lib/profile-completeness";

// Stories-style discover: each user has multiple photos; user navigates
// through them via left/right tap zones on the card (same idiom as
// Instagram/Snapchat stories). Action buttons switch USERS, not photos.
// Pause is reserved for auto-advance (not yet implemented; UI in place).
const PROFILES = [
  {
    id: "jessica",
    name: "Jessica Maple",
    age: 25,
    distance: "3 km away",
    compat: 94,
    photos: [
      "linear-gradient(160deg,#FFB088 0%,#FF7A53 60%,#3D1A45 100%)",
      "linear-gradient(160deg,#FF8A65 0%,#A04020 60%,#1A1340 100%)",
      "linear-gradient(160deg,#FFD976 0%,#A87E1E 60%,#3D2410 100%)",
    ],
  },
  {
    id: "theresa",
    name: "Theresa Webb",
    age: 20,
    distance: "2 km away",
    compat: 92,
    photos: [
      "linear-gradient(160deg,#9F76EA 0%,#5524F5 60%,#1A1340 100%)",
      "linear-gradient(160deg,#BC96FF 0%,#7551E0 60%,#1A1340 100%)",
      "linear-gradient(160deg,#5524F5 0%,#2A0F7A 60%,#000 100%)",
      "linear-gradient(160deg,#9F76EA 0%,#3D1A45 60%,#000 100%)",
    ],
  },
  {
    id: "kristin",
    name: "Kristin Watson",
    age: 24,
    distance: "1.5 km away",
    compat: 97,
    photos: [
      "linear-gradient(160deg,#F9D976 0%,#A87E1E 60%,#3D2410 100%)",
      "linear-gradient(160deg,#FFCC66 0%,#7A4F1E 60%,#1A1340 100%)",
    ],
  },
  {
    id: "eleanor",
    name: "Eleanor Pena",
    age: 27,
    distance: "3 km away",
    compat: 90,
    photos: [
      "linear-gradient(160deg,#6CB7FF 0%,#1A1340 60%,#000 100%)",
      "linear-gradient(160deg,#86C5FF 0%,#2A4F7A 60%,#000 100%)",
      "linear-gradient(160deg,#4A8AD9 0%,#1A1340 60%,#000 100%)",
      "linear-gradient(160deg,#6CB7FF 0%,#3D6499 60%,#000 100%)",
      "linear-gradient(160deg,#1A1340 0%,#5524F5 60%,#9F76EA 100%)",
    ],
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const { profile: userProfile, loaded } = useProfile();
  const [userIndex, setUserIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
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

  const profile = PROFILES[userIndex];

  const advanceUser = (action: "skip" | "like") => {
    if (!profile) return;
    // Stub: real impl POSTs to swipe service.
    setExitDirection(action === "like" ? "right" : "left");
    setUserIndex((i) => i + 1);
    setPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (!profile) return;
    if (photoIndex < profile.photos.length - 1) {
      setPhotoIndex((i) => i + 1);
    } else {
      // End of photos for this profile — auto-advance to next user (skip)
      advanceUser("skip");
    }
  };

  const prevPhoto = () => {
    if (photoIndex > 0) setPhotoIndex((i) => i - 1);
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
            onApply={() => {
              // Stub: real impl POSTs filters to discovery service.
            }}
          />
          <Button
            size="circle"
            variant="ghost"
            aria-label="My profile"
            className="p-0"
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
                  "--photo-bg": profile.photos[photoIndex],
                  backgroundImage: "var(--photo-bg)",
                } as React.CSSProperties
              }
            >
              {/* Photo-position progress bars at top of card */}
              <div
                aria-hidden
                className="absolute top-5 right-5 left-5 z-20 flex gap-1.5"
              >
                {profile.photos.map((_, i) => (
                  <Progress
                    key={i}
                    value={i <= photoIndex ? 100 : 0}
                    className="flex-1"
                  />
                ))}
              </div>

              <Pill
                variant="lime"
                className="absolute top-10 right-5 z-20 font-bold tabular-nums"
              >
                <MessageCircle className="size-3" />
                {profile.compat}%
              </Pill>

              {/* Tap zones for photo nav — Button primitives with
                  variant="ghost" so they don't paint a fill, sized via
                  className to span the card halves. Standard Stories
                  interaction (Instagram / Snapchat). */}
              <Button
                variant="ghost"
                size="block"
                aria-label="Previous photo"
                onClick={prevPhoto}
                className="absolute inset-y-0 left-0 z-10 h-full w-1/3 rounded-none p-0 hover:bg-transparent"
              />
              <Button
                variant="ghost"
                size="block"
                aria-label="Next photo"
                onClick={nextPhoto}
                className="absolute inset-y-0 right-0 z-10 h-full w-2/3 rounded-none p-0 hover:bg-transparent"
              />

              <PhotoCaption className="px-6 pb-20">
                <h2 className="text-h2 leading-tight text-white">
                  {profile.name}, {profile.age}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-caption text-white/85">
                  <MapPin className="size-3" /> {profile.distance}
                </p>
              </PhotoCaption>

              {/* Action row — skip/pause/like for the WHOLE profile (not the
                  photo). Sits at bottom of card, above PhotoCaption's
                  pb-20 reserved space. */}
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
                action={{ label: "Adjust filters" }}
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

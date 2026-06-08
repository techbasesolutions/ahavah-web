// Inline width on the progress-fill child is required: animating
// width via @keyframes + dynamic paused-state width are both
// inherently dynamic per-render values that can't be expressed as a
// design-token Tailwind class. Same exception pattern as
// auth-illustration.tsx (per-card layout values).
/* eslint-disable no-restricted-syntax */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Pause, Play } from "lucide-react";

import { PhotoCaption } from "@/components/app/photo-caption";
import { CompatPill } from "@/components/app/compat-pill";
import type { DiscoverCandidate } from "@/lib/api-types";
import { photoOrGradient } from "@/lib/photo-or-gradient";

const PHOTO_CYCLE_MS = 3_500;

/**
 * DiscoverCardFace — the visual contents of a single SwipeCard in the
 * /discover deck.
 *
 * Renders against the orchestrator's `DiscoverCandidate` (api-types.ts) —
 * a `Profile & { id: string }`. The candidate carries first name, age,
 * city, country, and (post-Phase-W-Agent-3) real photo URLs.
 *
 * Layout:
 *   - Full-bleed photo OR gradient fallback fills the card.
 *   - Bottom caption stack: name + age (h2 link), location (MapPin row),
 *     compatibility pill.
 *   - Name + location form a single tappable Link to the full profile.
 *
 * Photos: each candidate's first photo (index 0) is the deck face. The
 * 3-photo carousel from the static /discover page is intentionally absent
 * — the SwipeCard's drag gesture owns the entire surface, and per-photo
 * tap zones would conflict with horizontal pan. The full carousel lives
 * on `/profile/[id]`.
 */

export type DiscoverCardFaceProps = {
  candidate: DiscoverCandidate;
  /** Optional compat score precomputed by the caller; undefined hides the pill. */
  compatScore?: number;
};

export function DiscoverCardFace({
  candidate,
  compatScore,
}: DiscoverCardFaceProps) {
  const photoCount = candidate.photos?.length ?? 0;
  const hasMultiplePhotos = photoCount > 1;
  const [photoIndex, setPhotoIndex] = useState(0);
  // Slideshow autoplay default — Instagram-style: the card starts
  // playing the moment it mounts so the user sees the active progress
  // bar fill from 0% on photo 0 without having to tap play first.
  const [cyclePhotos, setCyclePhotos] = useState(true);
  // 0-100 progress driving the inline width of the active dot's fill.
  // Updated each animation frame by the rAF loop below. NOT a CSS
  // animation: the previous @keyframes implementation suffered from
  // first-paint timing edge cases where the element painted at
  // computed-auto width (= 100%) before the keyframes engine took
  // over, so the user saw the bar as already-full on photo 0.
  // Direct React-state-driven width is bulletproof: width=0 on mount,
  // climbs every frame, advances photoIndex at 100.
  const [progress, setProgress] = useState(0);

  // Reset state on candidate change (deck advance) so a fresh card
  // always starts on photo 0, autoplay, 0% progress.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhotoIndex(0);
    setCyclePhotos(true);
    setProgress(0);
  }, [candidate.id]);

  // Single effect drives BOTH the active dot's progress and the photo
  // advance. requestAnimationFrame ticks every ~16ms; once elapsed
  // crosses PHOTO_CYCLE_MS the photoIndex advances (effect re-runs with
  // a fresh startedAt and the next photo's dot starts filling).
  // When paused (cyclePhotos=false), the effect is a no-op — progress
  // freezes at whatever value it last had, so the user sees the bar
  // visibly stopped where the slideshow was at the moment they tapped
  // pause (matches Instagram behaviour).
  useEffect(() => {
    if (!cyclePhotos || !hasMultiplePhotos) return;
    let raf = 0;
    let startedAt = 0;
    const tick = (now: DOMHighResTimeStamp) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt;
      if (elapsed >= PHOTO_CYCLE_MS) {
        // Advance — effect re-runs with the new photoIndex and a
        // fresh startedAt; don't loop further here.
        setProgress(0);
        setPhotoIndex((i) => (i + 1) % photoCount);
        return;
      }
      setProgress((elapsed / PHOTO_CYCLE_MS) * 100);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [photoIndex, cyclePhotos, hasMultiplePhotos, photoCount]);

  const photoSource = photoOrGradient(candidate, photoIndex);

  return (
    <div
      className="relative size-full overflow-hidden rounded-3xl"
      style={
        photoSource?.kind === "gradient"
          ? ({
              backgroundImage: photoSource.css,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } as React.CSSProperties)
          : undefined
      }
    >
      {photoSource?.kind === "photo" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSource.src}
          alt={`${candidate.firstName ?? "Profile"} photo`}
          className="absolute inset-0 z-0 size-full object-cover"
        />
      )}

      {hasMultiplePhotos ? (
        <>
          {/* Photo position dots — Instagram-style: thin track per
              photo; past=full, current=growing fill, future=empty.
              Width is driven by React state (progress), not CSS
              animation, so the first paint is guaranteed to start at
              0% and grow visibly. */}
          <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex gap-1">
            {Array.from({ length: photoCount }).map((_, i) => (
              <span
                key={i}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/35"
              >
                {i < photoIndex ? (
                  <span className="block h-full w-full bg-white" />
                ) : i === photoIndex ? (
                  <span
                    className="block h-full bg-white"
                    style={{ width: `${progress}%` }}
                  />
                ) : null}
              </span>
            ))}
          </div>
          {/* Subtle play/pause toggle for the slideshow — bottom-right
              corner, glass overlay so it doesn't compete with the name
              caption or fight the swipe-pan gesture. Stops pointer-events
              propagation so a tap on the button doesn't get interpreted
              by the SwipeCard as the start of a horizontal drag. */}
          <button
            type="button"
            aria-label={cyclePhotos ? "Pause photo slideshow" : "Play photo slideshow"}
            aria-pressed={cyclePhotos}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setCyclePhotos((on) => !on);
            }}
            className="absolute right-3 bottom-24 z-20 inline-flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-white"
          >
            {cyclePhotos ? (
              <Pause className="size-4" fill="currentColor" />
            ) : (
              <Play className="size-4" fill="currentColor" />
            )}
          </button>
        </>
      ) : null}

      <PhotoCaption className="px-6 pb-6">
        {/* Name + location wrap into a single Link so the entire caption
            is one tappable target for "view full profile". Drag still
            wins at the SwipeCard layer; only a tap (no horizontal travel)
            triggers navigation. */}
        <Link
          href={`/profile/${candidate.id}`}
          prefetch={false}
          aria-label={`View ${candidate.firstName ?? "profile"}'s details`}
          className="relative z-20 -mx-1 -my-1 inline-block rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <h2 className="text-h2 leading-tight text-white">
            {candidate.firstName}
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
        </Link>
        {compatScore !== undefined ? (
          <div className="relative z-20 mt-3">
            <CompatPill score={compatScore} size="sm" />
          </div>
        ) : null}
      </PhotoCaption>
    </div>
  );
}

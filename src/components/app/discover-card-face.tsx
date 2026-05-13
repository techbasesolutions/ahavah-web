"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { PhotoCaption } from "@/components/app/photo-caption";
import { CompatPill } from "@/components/app/compat-pill";
import type { DiscoverCandidate } from "@/lib/api-types";
import { photoOrGradient } from "@/lib/photo-or-gradient";

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
  const photoSource = photoOrGradient(candidate, 0);

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

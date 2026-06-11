"use client";

/**
 * MapProfilePopup — the card shown when hovering a map marker on desktop.
 *
 * Photo-first redesign (2026-06-11): the photo is the hero (4:5 portrait,
 * ~80% of the card) with identity overlaid on a bottom scrim — the dating-
 * card convention — instead of the old 96px letterbox strip that cropped
 * portraits to a band. Kit-only: Card surface + CompatPill (real
 * compatibility score, overlaid top-right) + Button. The CTA is "View
 * profile" (NOT message) — you can only message a confirmed match, and map
 * markers are unmatched prospects. Rendered inside a react-leaflet <Popup>
 * by MapAvatar; the Leaflet popup chrome is neutralised via the
 * `.ahavah-map-popup` overrides in globals.css.
 */

import Link from "next/link";
import { MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompatPill } from "@/components/app/compat-pill";

export interface MapProfilePopupProps {
  name: string;
  age?: number;
  location?: string;
  /** CDN url when the prospect has a photo; gradientCss is the fallback. */
  photoSrc?: string;
  gradientCss?: string;
  /** 0..100 compatibility vs. the viewer; omitted when unknown. */
  compatScore?: number;
  /** /profile/[uuid]?from=map */
  href: string;
}

export function MapProfilePopup({
  name,
  age,
  location,
  photoSrc,
  gradientCss,
  compatScore,
  href,
}: MapProfilePopupProps) {
  return (
    <Card
      tone="elevated"
      className="w-60 gap-0 overflow-hidden rounded-3xl border border-(--hairline) p-0 shadow-xl"
    >
      {/* Hero photo — portrait 4:5 so faces frame properly (was a 96px
          letterbox strip). Gradient fallback paints the same block. */}
      <div
        className="relative aspect-[4/5] w-full"
        style={photoSrc ? undefined : { background: gradientCss }}
      >
        {photoSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        {/* Legibility scrim for the overlaid identity. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Compatibility accent — overlaid top-right, dating-card style. */}
        {compatScore !== undefined ? (
          <div className="absolute right-2.5 top-2.5">
            <CompatPill score={compatScore} size="sm" />
          </div>
        ) : null}

        {/* Identity overlaid on the scrim. White is theme-independent here
            (always sits on the dark scrim, both light + dark mode). */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
          <p className="truncate text-meta font-bold text-white drop-shadow-sm">
            {name}
            {age ? `, ${age}` : ""}
          </p>
          {location ? (
            <p className="flex items-center gap-1 truncate text-caption text-white/85 drop-shadow-sm">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {location}
            </p>
          ) : null}
        </div>
      </div>

      {/* Action bar on the Card surface (adapts light/dark via tokens). */}
      <div className="p-2.5">
        <Button
          size="tap"
          tone="cta"
          className="w-full justify-center"
          render={<Link href={href} prefetch={false} />}
        >
          View profile
        </Button>
      </div>
    </Card>
  );
}

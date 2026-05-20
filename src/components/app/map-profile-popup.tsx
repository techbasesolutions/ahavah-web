"use client";

/**
 * MapProfilePopup — the card shown when hovering a map marker on desktop.
 *
 * Kit-derived: Card surface + CompatPill (real compatibility score) +
 * Button. The CTA is "View profile" (NOT message) — you can only message a
 * confirmed match, and map markers are unmatched prospects. Rendered inside
 * a react-leaflet <Popup> by MapAvatar; the Leaflet popup chrome is
 * neutralised via the `.ahavah-map-popup` overrides in globals.css.
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
      className="w-56 gap-0 overflow-hidden rounded-2xl border border-(--hairline) p-0 shadow-xl"
    >
      <div
        className="relative h-24 w-full"
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
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-meta font-semibold text-(--ink)">
            {name}
            {age ? `, ${age}` : ""}
          </p>
          {compatScore !== undefined ? (
            <CompatPill score={compatScore} size="sm" />
          ) : null}
        </div>
        {location ? (
          <p className="flex items-center gap-1 truncate text-caption text-(--ink-2)">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {location}
          </p>
        ) : null}
        <Button
          size="tap"
          tone="cta"
          className="mt-1 w-full justify-center"
          render={<Link href={href} prefetch={false} />}
        >
          View profile
        </Button>
      </div>
    </Card>
  );
}

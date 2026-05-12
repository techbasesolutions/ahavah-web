"use client";

/**
 * <MapAvatar> — tappable gradient stamp at a candidate's country centroid.
 *
 * Sits inside the <WorldMap>'s zoomable <g>, so it rides the same pan/zoom
 * transform as the country paths. Looks up `candidate.country` (2-letter ISO)
 * via {@link centroidOf}, projects the result through {@link WORLD_MAP_PROJECTION}
 * (the same `geoNaturalEarth1` fitted to 800×450 that draws the country paths
 * in T2), and renders a 44×44 circular gradient stamp at that SVG point.
 *
 * Implementation notes:
 *   - SVG <foreignObject> hosts an HTML <div> so the CSS `linear-gradient(...)`
 *     string from {@link gradientsFor} can be used directly. Recreating those
 *     gradients as SVG <linearGradient> defs would mean parsing the CSS string
 *     for the MVP — not worth it.
 *   - `pointer-events-none` on the <foreignObject> so the parent <g> receives
 *     the click event. Without this, the inner <div> would intercept it and
 *     the <g>'s onClick would never fire.
 *   - role="link" + tabIndex={0} + onClick + onKeyDown(Enter/Space) is the
 *     accessible pattern for a clickable SVG group. We can't wrap in a real
 *     <a> here because the marker sits inside an <svg>, and Next.js's <Link>
 *     also doesn't fit inside an SVG element tree.
 *   - Returns `null` for candidates with missing or unknown `country` — no
 *     crash on bad ISO data.
 *   - The 44×44 marker IS the tap target (matches Phase D's 44px floor and
 *     R-Phase-D minimum-tap-area rule). At zoom=1 it's ~5.5% of viewport
 *     width; at zoom=10 it's ~55%. That's intentional — when zoomed in, the
 *     marker grows with the map so it stays easy to hit; when zoomed out,
 *     dense regions may crowd. MVP accepts the crowding.
 */

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { WORLD_MAP_PROJECTION } from "@/components/app/world-map";
import { ALL_COUNTRIES } from "@/lib/countries";
import { centroidOf } from "@/lib/country-centroids";
import { gradientsFor } from "@/lib/profile-gradients";
import type { Profile } from "@/lib/profile-schema";

export interface MapAvatarProps {
  candidate: Profile & { id?: string };
}

/** Inline lookup — `labelForCountry` does not exist in @/lib/countries. */
function labelForCountry(iso: string): string | undefined {
  return ALL_COUNTRIES.find((c) => c.cc === iso)?.name;
}

export function MapAvatar({ candidate }: MapAvatarProps) {
  const router = useRouter();

  const iso = candidate.country;
  if (!iso) return null;

  const centroid = centroidOf(iso);
  if (!centroid) return null;

  const projected = WORLD_MAP_PROJECTION([centroid.lng, centroid.lat]);
  if (!projected) return null;
  const [x, y] = projected;

  const name = candidate.firstName ?? "Profile";
  const slug = name.toLowerCase();
  const href = `/profile/${slug}`;

  const countryLabel = labelForCountry(iso) ?? iso;
  // "Adina, 24, in Israel" — if age is missing we drop the empty segment so
  // SR users don't hear a stray comma.
  const ariaLabel =
    candidate.age != null
      ? `${name}, ${candidate.age}, in ${countryLabel}`
      : `${name}, in ${countryLabel}`;

  // Seed gradient pool by id when present (matches /profile/[uuid] which seeds
  // by uuid), otherwise by lowercased first name so the same person stays
  // visually stable across renders.
  const seed = candidate.id ?? slug;
  const primaryGradient = gradientsFor(seed)[0];

  const activate = () => {
    router.push(href);
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={activate}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none focus-visible:[&>foreignObject>div]:ring-lavender focus-visible:[&>foreignObject>div]:ring-2 hover:[&>foreignObject>div]:ring-lavender/70"
    >
      <foreignObject
        x={-22}
        y={-22}
        width={44}
        height={44}
        className="pointer-events-none overflow-visible"
      >
        <div
          className="size-full rounded-full ring-2 ring-white/20 shadow-lg transition-[box-shadow,--tw-ring-color] duration-150"
          style={{ background: primaryGradient }}
        />
      </foreignObject>
    </g>
  );
}

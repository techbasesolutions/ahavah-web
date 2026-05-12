"use client";

/**
 * <MapAvatar> — Leaflet marker rendered as a gradient stamp at a
 * candidate's country centroid.
 *
 * Renderer swap (2026-05-12): the previous SVG <foreignObject> stamp
 * was tied to d3-geo's projection inside <WorldMap>'s zoomable <g>.
 * Now <WorldMap> is react-leaflet, so markers are real Leaflet
 * <Marker>s carrying a <L.divIcon> whose HTML is the gradient stamp.
 *
 * Implementation notes:
 *   - The gradient comes from {@link gradientsFor} as a CSS
 *     `linear-gradient(...)` string; we inline it on the divIcon's
 *     root <div> via `style="background: ..."`.
 *   - The lime ring is rendered via `box-shadow` (Leaflet's divIcon
 *     uses an absolutely-positioned wrapper so a Tailwind `ring-*`
 *     class wouldn't paint reliably). `var(--color-lime, #c8ff88)`
 *     resolves the Tailwind v4 token; the hex fallback covers jsdom
 *     contexts where CSS variables aren't applied.
 *   - HTML attribute injection: aria-label / title carry the
 *     candidate's name + age + country. All user-controlled strings
 *     are escaped via {@link escapeAttr} before splicing into the
 *     divIcon's HTML string.
 *   - Click handler uses Leaflet's `eventHandlers.click` to navigate
 *     via Next.js's `useRouter`. Mouse, touch, and keyboard-Enter all
 *     fire the Leaflet `click` event through Leaflet's internal
 *     accessibility shim — sufficient for MVP. Tab-focused keyboard
 *     navigation across markers would require walking the rendered
 *     DOM after mount to patch tabIndex on each marker icon; out of
 *     scope here, will revisit if a11y review flags it.
 *   - Returns `null` for candidates with missing or unknown
 *     `country` — no crash on bad ISO data.
 */

import { useRouter } from "next/navigation";
import { Marker } from "react-leaflet";
import L from "leaflet";

import { ALL_COUNTRIES, flagFromCC } from "@/lib/countries";
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

/** Escape user-controlled strings before splicing into a divIcon HTML string. */
function escapeAttr(s: string): string {
  return s.replace(
    /[<>"'&]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "&": "&amp;",
      })[c]!,
  );
}

export function MapAvatar({ candidate }: MapAvatarProps) {
  const router = useRouter();

  const iso = candidate.country;
  if (!iso) return null;

  const centroid = centroidOf(iso);
  if (!centroid) return null;

  const name = candidate.firstName ?? "Profile";
  const slug = name.toLowerCase();
  const href = `/profile/${slug}`;

  const countryLabel = labelForCountry(iso) ?? iso;
  // "Adina, 24, in Israel" — drop the empty segment when age is missing
  // so SR users don't hear a stray comma.
  const ariaLabel =
    candidate.age != null
      ? `${name}, ${candidate.age}, in ${countryLabel}`
      : `${name}, in ${countryLabel}`;

  // Seed gradient pool by id when present (matches /profile/[uuid] which
  // seeds by uuid), otherwise by lowercased first name so the same
  // person stays visually stable across renders.
  const seed = candidate.id ?? slug;
  const primaryGradient = gradientsFor(seed)[0];

  // Build the divIcon. The wrapping container is `position: relative`
  // so the flag bubble can be absolutely anchored to the gradient
  // circle's bottom-right corner. The gradient circle itself remains
  // 44×44 — the canonical tap-target — and the 18×18 flag bubble is a
  // decorative overlay (does not steal pointer events from the circle).
  //
  //   - 44×44 gradient circle (Phase D tap-target floor + visual)
  //   - lime outer ring + soft drop shadow via box-shadow
  //   - aria-label + role="img" so screen readers announce the marker
  //   - flag emoji bubble in the bottom-right, ISO-derived via
  //     flagFromCC(); same emoji glyphs are already in use across the
  //     onboarding language list, so font availability is proven.
  const safeAria = escapeAttr(ariaLabel);
  const safeGradient = escapeAttr(primaryGradient);
  const flag = flagFromCC(iso);
  const safeFlag = escapeAttr(flag);
  const icon = L.divIcon({
    className: "ahavah-map-avatar", // disable Leaflet's default leaflet-div-icon border/bg
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html:
      `<div role="img" aria-label="${safeAria}" style="position:relative;width:44px;height:44px;cursor:pointer;">` +
      `<div style="` +
      `width:44px;height:44px;border-radius:9999px;` +
      `background:${safeGradient};` +
      `box-shadow:0 0 0 3px var(--color-lime, #c8ff88),0 2px 8px rgba(0,0,0,0.35);` +
      `"></div>` +
      `<div aria-hidden="true" style="` +
      `position:absolute;bottom:-2px;right:-2px;` +
      `width:18px;height:18px;border-radius:9999px;background:#fff;` +
      `display:flex;align-items:center;justify-content:center;` +
      `font-size:12px;line-height:1;` +
      `box-shadow:0 1px 3px rgba(0,0,0,0.4);` +
      `pointer-events:none;` +
      `">${safeFlag}</div>` +
      `</div>`,
  });

  return (
    <Marker
      position={[centroid.lat, centroid.lng]}
      icon={icon}
      eventHandlers={{
        click: () => router.push(href),
        keypress: (e) => {
          const event = e.originalEvent as KeyboardEvent;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            router.push(href);
          }
        },
      }}
      title={ariaLabel}
      alt={ariaLabel}
    />
  );
}

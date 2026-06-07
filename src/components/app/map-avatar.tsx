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

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

import { ALL_COUNTRIES, flagFromCC } from "@/lib/countries";
import { centroidOf } from "@/lib/country-centroids";
import { flagSvg } from "@/lib/flag-svg";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { MapProfilePopup } from "@/components/app/map-profile-popup";
import type { MarkerState } from "@/lib/map-avatar-state";
import type { Profile } from "@/lib/profile-schema";

export interface MapAvatarProps {
  candidate: Profile & { id?: string };
  /**
   * Optional marker state from `resolveMarkerState`. Drives an 18×18 top-
   * right badge (match / active-chat / liked) and/or a grayscale+opacity
   * wrapper (passed). Defaults to `"none"` — no badge, normal marker.
   */
  state?: MarkerState;
  /** 0..100 compatibility vs. the viewer, shown in the hover popup. */
  compatScore?: number;
}

// Lucide SVG paths inlined for Leaflet divIcon (can't use React inside).
// 10×10 rendered at viewBox=24 to fit the 18×18 badge bubble with the
// 2px white border + ~2px breathing room.
const SVG_SPARKLES = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`;
const SVG_MESSAGE_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>`;
const SVG_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

/**
 * Build the 18×18 top-right badge HTML for a given marker state.
 *
 * Returns "" for `"none"` and `"passed"` (passed is handled separately
 * via a grayscale filter on the wrapper, not a badge). `match` uses
 * the `.ahavah-marker-badge--match` class to trigger a one-time
 * mount-pulse animation (defined in `src/app/globals.css`).
 *
 * `pointer-events: none` keeps the badge from intercepting taps — the
 * marker's 44×44 click target is preserved.
 */
function badgeHtml(state: MarkerState): string {
  const base =
    `position:absolute;top:-2px;right:-2px;width:18px;height:18px;` +
    `border-radius:50%;border:2px solid white;display:flex;` +
    `align-items:center;justify-content:center;color:#000;` +
    `box-shadow:0 1px 3px rgba(0,0,0,0.4);pointer-events:none;`;
  if (state === "match") {
    return `<div class="ahavah-marker-badge--match" aria-hidden="true" style="${base}background:var(--color-lime,#c8ff88);">${SVG_SPARKLES}</div>`;
  }
  if (state === "active-chat") {
    return `<div aria-hidden="true" style="${base}background:var(--color-lavender,#9f76ea);">${SVG_MESSAGE_CIRCLE}</div>`;
  }
  if (state === "liked") {
    return `<div aria-hidden="true" style="${base}background:var(--color-pink,#ffc0cb);">${SVG_HEART}</div>`;
  }
  return "";
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

export function MapAvatar({
  candidate,
  state = "none",
  compatScore,
}: MapAvatarProps) {
  const router = useRouter();

  // Hover popup is desktop-only: gate on a hover-capable, fine pointer so
  // touch devices keep the tap → profile behaviour (no popup). All hooks
  // run before the early returns below to satisfy rules-of-hooks.
  const markerRef = useRef<L.Marker | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanHover(
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false,
    );
  }, []);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  const openPopup = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    markerRef.current?.openPopup();
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // Delay so the cursor can travel from the marker onto the card without
    // it closing out from under them.
    closeTimer.current = setTimeout(() => markerRef.current?.closePopup(), 250);
  };

  // Early-return checks deferred to AFTER the useMemo below so we don't
  // call hooks conditionally (rules-of-hooks).
  const iso = candidate.country ?? null;
  const centroid = iso ? centroidOf(iso) : null;

  const name = candidate.firstName ?? "Profile";
  // ?from=map → /profile/[uuid] reads this and points its back button
  // back at /map instead of the /discover default. Required because
  // map markers are the second entry path into a profile, and Bumpy's
  // UX expects returning to the surface the user came from.
  //
  // BUG FIX 2026-05-14: the URL used to be `${name.toLowerCase()}` —
  // a slug that only matched legacy sample profiles. Real candidates
  // have UUIDs; tapping their marker 404'd. Use candidate.id which is
  // the real prospect UUID from the /search response.
  const href = `/profile/${candidate.id}?from=map`;

  const countryLabel = iso ? (labelForCountry(iso) ?? iso) : "";
  // SR users hear marker state context first ("Matched. Adina, 24, in
  // Israel") so blind/low-vision users can triage matches/chats without
  // visiting each marker. Empty for "none" — no extra noise on neutral
  // markers.
  const stateLabel =
    state === "match"
      ? "Matched. "
      : state === "active-chat"
        ? "Active chat. "
        : state === "liked"
          ? "Liked. "
          : state === "passed"
            ? "Passed. "
            : "";
  // "Adina, 24, in Israel" — drop the empty segment when age is missing
  // so SR users don't hear a stray comma.
  const ariaLabel =
    candidate.age != null
      ? `${stateLabel}${name}, ${candidate.age}, in ${countryLabel}`
      : `${stateLabel}${name}, in ${countryLabel}`;

  // SP21 T8: photoOrGradient seeded by lowercased firstName so the gradient
  // stamp is stable across renders. When a candidate has `photos[0]`, an
  // <img> renders in the 44px circle; otherwise the gradient fallback paints
  // the disc directly.
  const photoSource = photoOrGradient(
    {
      firstName: candidate.firstName ?? candidate.id ?? "x",
      photos: candidate.photos,
    },
    0,
  );

  // Build the divIcon. The wrapping container is `position: relative`
  // so the flag bubble can be absolutely anchored to the gradient
  // circle's bottom-right corner. The gradient circle itself remains
  // 44×44 — the canonical tap-target — and the 18×18 flag bubble is a
  // decorative overlay (does not steal pointer events from the circle).
  //
  //   - 44×44 gradient circle (Phase D tap-target floor + visual)
  //   - lime outer ring + soft drop shadow via box-shadow
  //   - aria-label + role="img" so screen readers announce the marker
  //   - SVG flag bubble in the bottom-right, ISO-derived via flagSvg() —
  //     emoji-fallback path documented in fix/map-avatar-svg-flags.
  //     Why SVG: Windows Chrome has no flag-emoji font, so the previous
  //     Unicode-emoji approach rendered "BB"/"JM" letters at 12px inside
  //     an 18px bubble. SVG renders identically across all OSes. If
  //     flagSvg() returns null (unrecognised cc), we fall back to the
  //     emoji glyph via flagFromCC() so the bubble still paints something
  //     — better than a bare white circle that suggests a render bug.
  const safeAria = escapeAttr(ariaLabel);
  // SP21 T8: render <img> when a real photo exists, gradient <div> otherwise.
  // The lime ring + drop shadow apply to BOTH branches so the marker chrome
  // stays identical across the photo/gradient swap.
  const discInnerHtml =
    photoSource.kind === "photo"
      ? `<img src="${escapeAttr(photoSource.src)}" alt="" style="` +
        `width:44px;height:44px;border-radius:9999px;` +
        `object-fit:cover;display:block;` +
        `box-shadow:0 0 0 3px var(--color-lime, #c8ff88),0 2px 8px rgba(0,0,0,0.35);` +
        `" />`
      : `<div style="` +
        `width:44px;height:44px;border-radius:9999px;` +
        `background:${escapeAttr(photoSource.css)};` +
        `box-shadow:0 0 0 3px var(--color-lime, #c8ff88),0 2px 8px rgba(0,0,0,0.35);` +
        `"></div>`;
  // SVG path is the primary renderer (works everywhere, including Windows).
  // Emoji fallback covers ISO codes country-flag-icons doesn't ship (e.g.
  // sub-region codes like ES-CT that ALL_COUNTRIES doesn't expose anyway —
  // belt-and-braces for future schema drift). escapeAttr wraps the emoji
  // glyph since it's still spliced into the HTML string.
  // flagSvg() defaults to 18px (the bubble dimension) and uses object-fit:cover
  // so the flag fills edge-to-edge inside the bubble's circular crop — no
  // white margin. Emoji fallback covers ISO codes country-flag-icons doesn't
  // ship; escapeAttr wraps the glyph since it's spliced into an HTML string.
  const flagMarkup = iso
    ? (flagSvg(iso) ??
       `<span style="font-size:12px;line-height:1;">${escapeAttr(flagFromCC(iso))}</span>`)
    : "";
  // state === "passed" → entire marker (photo/gradient circle + flag bubble +
  // any future overlays) recedes via grayscale + half-opacity. Applied
  // to the same relative wrapper so it cascades to all children.
  const passedFilter =
    state === "passed" ? "filter:grayscale(100%);opacity:0.5;" : "";
  const badge = badgeHtml(state);
  // Memoize the L.divIcon so async props like `compatScore` (which only
  // affect the hover popup body) don't rebuild the icon. Without this,
  // every re-render handed react-leaflet a fresh icon object, which
  // forced the Marker to swap its icon and CLOSED any open Popup --
  // perceived as the hover-card "freaking out" on desktop.
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "ahavah-map-avatar",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html:
          `<div role="img" aria-label="${safeAria}" style="position:relative;width:44px;height:44px;cursor:pointer;${passedFilter}">` +
          discInnerHtml +
          `<div aria-hidden="true" style="` +
          `position:absolute;bottom:-2px;right:-2px;` +
          `width:18px;height:18px;border-radius:9999px;background:#fff;` +
          `display:flex;align-items:center;justify-content:center;` +
          `overflow:hidden;` +
          `box-shadow:0 1px 3px rgba(0,0,0,0.4);` +
          `pointer-events:none;` +
          `">${flagMarkup}</div>` +
          badge +
          `</div>`,
      }),
    [safeAria, passedFilter, discInnerHtml, flagMarkup, badge],
  );

  // Deferred early returns (moved from the top so the useMemo above isn't
  // skipped on null-iso renders, which would violate rules-of-hooks).
  if (!iso || !centroid) return null;

  const popupLocation =
    candidate.city && countryLabel
      ? `${candidate.city}, ${countryLabel}`
      : countryLabel;

  return (
    <Marker
      ref={markerRef}
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
        ...(canHover ? { mouseover: openPopup, mouseout: scheduleClose } : {}),
      }}
      title={ariaLabel}
      alt={ariaLabel}
    >
      {canHover ? (
        <Popup
          className="ahavah-map-popup"
          closeButton={false}
          autoClose={false}
          closeOnClick={false}
          minWidth={0}
          maxWidth={260}
          offset={[0, -18]}
        >
          {/* Keep the popup open while the cursor is over the card so the
              "View profile" CTA is reachable (the marker's mouseout would
              otherwise close it mid-travel). */}
          <div onMouseEnter={openPopup} onMouseLeave={scheduleClose}>
            <MapProfilePopup
              name={name}
              age={candidate.age ?? undefined}
              location={popupLocation}
              photoSrc={
                photoSource.kind === "photo" ? photoSource.src : undefined
              }
              gradientCss={
                photoSource.kind === "gradient" ? photoSource.css : undefined
              }
              compatScore={compatScore}
              href={href}
            />
          </div>
        </Popup>
      ) : null}
    </Marker>
  );
}

import { hasFlag } from "country-flag-icons";

/**
 * Returns HTML markup for an inline SVG flag image for the given ISO-3166-1
 * alpha-2 country code, suitable for splicing into an HTML string (Leaflet
 * divIcon, innerHTML, etc.). Returns `null` when the code is unknown.
 *
 * Implementation: at build time, `scripts/copy-flags` (one-shot, already run)
 * copied `country-flag-icons`' 3x2 SVGs into `public/flags/<cc>.svg`. We
 * resolve the URL synchronously and return an `<img>` tag rather than
 * inlining the SVG source — that keeps the JS bundle for the /map route
 * flat (~0 KB delta) and offloads the flag bytes to lazy, cacheable static
 * assets. The trade-off is one HTTP request per unique country in view,
 * which is negligible: each SVG is ~500 B and the typical map shows
 * ~10 unique countries.
 *
 * Synchronous by design: MapAvatar builds its `L.divIcon` HTML string
 * synchronously inside the component body, so the helper cannot fetch or
 * dynamic-import.
 *
 * @param cc ISO-3166-1 alpha-2 country code (case-insensitive)
 * @param size Square dimension in pixels rendered inside the host bubble.
 *             The 3x2 source SVG is letterboxed inside the square by the
 *             browser's default aspect-ratio handling — callers wanting a
 *             circular crop should wrap the returned markup in a div with
 *             `border-radius: 9999px; overflow: hidden;`.
 * @returns `<img>` tag string, or `null` when `cc` is not a recognised code.
 */
export function flagSvg(cc: string, size = 14): string | null {
  if (!cc) return null;
  const upper = cc.toUpperCase();
  if (!hasFlag(upper)) return null;
  const lower = upper.toLowerCase();
  // `display:block; margin:auto` centers the flag inside its parent bubble
  // (MapAvatar's 18×18 white disc). The 3x2 aspect ratio means a 14px-wide
  // flag is ~9.3px tall, leaving a thin white margin around the flag —
  // intentional, more legible at 18px than an edge-to-edge fill.
  return (
    `<img src="/flags/${lower}.svg" alt="" width="${size}" height="${size}" ` +
    `style="display:block;margin:auto;width:${size}px;height:auto;` +
    `pointer-events:none;" />`
  );
}

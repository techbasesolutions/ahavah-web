import { hasFlag } from "country-flag-icons";

/**
 * Returns HTML markup for an inline SVG flag image for the given ISO-3166-1
 * alpha-2 country code, suitable for splicing into an HTML string (Leaflet
 * divIcon, innerHTML, etc.). Returns `null` when the code is unknown.
 *
 * Implementation: at build time, `scripts/copy-flags` (one-shot, already run)
 * copied `country-flag-icons`' 3x2 SVGs into `public/flags/<cc>.svg`. We
 * resolve the URL synchronously and return an `<img>` tag rather than
 * inlining the SVG source — keeps the JS bundle for /map flat (~0 KB delta)
 * and offloads the flag bytes to lazy, cacheable static assets.
 *
 * Synchronous by design: MapAvatar builds its `L.divIcon` HTML string
 * synchronously inside the component body, so the helper cannot fetch or
 * dynamic-import.
 *
 * Sizing: the returned <img> fills its `size` × `size` square via
 * `object-fit: cover`, so the 3x2 source SVG is scaled up + center-cropped
 * to fill the host bubble edge-to-edge with no white margin. Callers
 * supply a circular wrapper with `border-radius: 9999px; overflow: hidden;`
 * to clip the rectangular flag to a circle. Cover-crop trims roughly the
 * outer 25% of the top/bottom of the flag — fine for tri-color and
 * banded designs; flags with crown/seal motifs at the very edge lose
 * those edge details (acceptable trade-off at 18px).
 *
 * @param cc ISO-3166-1 alpha-2 country code (case-insensitive)
 * @param size Square dimension in pixels matching the host bubble.
 * @returns `<img>` tag string, or `null` when `cc` is not a recognised code.
 */
export function flagSvg(cc: string, size = 18): string | null {
  if (!cc) return null;
  const upper = cc.toUpperCase();
  if (!hasFlag(upper)) return null;
  const lower = upper.toLowerCase();
  return (
    `<img src="/flags/${lower}.svg" alt="" width="${size}" height="${size}" ` +
    `style="display:block;width:${size}px;height:${size}px;` +
    `object-fit:cover;pointer-events:none;" />`
  );
}

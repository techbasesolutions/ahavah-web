"use client";

/**
 * <ContinentPicker> — horizontal pill row of the 6 inhabited continents.
 *
 * Sub-plan 14 / Task 4. Presentational only — owns no state; selection lives
 * in the parent (/map page mounts this above the WorldMap and reacts to onPick
 * by updating the map viewport).
 *
 * Visual treatment uses the kit's existing `lime`/`lavender` Pill variants:
 *   - lavender = unselected (the kit's "ambient" pill colour, matching the
 *     filter pills on /discover and /profile fact rows).
 *   - lime     = selected (the kit's "active / brand-emphasis" pill colour,
 *     matching the lime CTA + high-compat pill in CompatPill).
 *
 * Tap target: each Pill is wrapped in a transparent `<button>` whose hit area
 * is forced to `min-h-tap min-w-tap` (44px floor; same pattern as
 * compat-pill.tsx, see comment there). The visible chip stays at Pill
 * `size="default"` (~24px tall) so the row remains visually dense; the wrapper
 * just extends the touch surface beyond the chip bounds.
 *
 * Accessibility: implemented as the WAI-ARIA toggle-button group pattern —
 * `role="group"` on the container with an `aria-label`, and `aria-pressed`
 * on each button so screen readers announce "Africa, pressed" when active.
 * Keyboard focus is visible via `focus-visible:ring-2 ring-ring`.
 *
 * Layout: `flex flex-wrap gap-2`. At a 414px viewport (iPhone Plus / Pro Max
 * width) the 6 default labels — including "North America" / "South America" —
 * wrap onto 2 rows naturally with `gap-2` and the kit's default Pill padding.
 * No label abbreviation is applied here; if a smoke walk later shows ugly
 * wrapping the labels live in CONTINENTS (continent-bbox.ts), not here.
 *
 * Kit-only: this component adds zero new visual styling beyond the wrapper
 * button's hit-area + focus ring. No new tokens, no new motion. All colour
 * + radius + padding comes from <Pill> / <Badge> cva.
 */

import { Pill } from "@/components/kibo-ui/pill";
import { CONTINENTS, type BBox, type Continent } from "@/lib/continent-bbox";
import { cn } from "@/lib/utils";

export interface ContinentPickerProps {
  /**
   * Currently-selected continent. Omit (or pass `undefined`) for the "no
   * continent selected" state — every pill renders as `lavender`.
   */
  active?: Continent;
  /**
   * Fires when a continent pill is tapped. Receives the continent id and
   * its bbox so the consumer (/map page T5) can hand the bbox straight to
   * WorldMap's viewport computation without re-deriving from CONTINENTS.
   */
  onPick: (continent: Continent, bbox: BBox) => void;
  className?: string;
}

export function ContinentPicker({
  active,
  onPick,
  className,
}: ContinentPickerProps) {
  return (
    <div
      role="group"
      aria-label="Filter by continent"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {CONTINENTS.map((c) => {
        const isActive = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id, c.bbox)}
            aria-pressed={isActive}
            className="inline-flex min-h-tap min-w-tap cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pill variant={isActive ? "lime" : "lavender"} size="default">
              {c.label}
            </Pill>
          </button>
        );
      })}
    </div>
  );
}

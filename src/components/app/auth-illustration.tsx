// Inline sizing/spacing is required here: per-card left/top percentages
// and the clamp() width are dynamic per item and can't be expressed as
// Tailwind utilities. The lint rule against inline sizing is the wrong
// trade-off for this single illustration component.
/* eslint-disable no-restricted-syntax */
import { LogoMark } from "@/components/brand/logo-mark";

// Local optimized portraits from public/marketing (Ahavah Stock). 6 cards
// scattered for an organic "snapshots tossed on a wall" composition.
// Adina removed per feedback (previous 3-3-1 grid layout felt too
// regimented); remaining 6 now sit on staggered diagonals instead of
// clean rows. Names are Hebrew/biblical to match the brand's target
// cohort; ethnicities/presentations deliberately varied.

/**
 * Scattered profile cards. Positions chosen so every pair satisfies
 *   (|ΔL| × panel_width ≥ card_width) OR
 *   (|ΔT| × panel_height ≥ card_height)
 * at the tightest worst-case viewport (2xl: 933×900 panel, 130×156
 * card = 14% wide, 17.3% tall). All 15 pairs checked to have either
 * ≥14% horizontal separation or ≥18% vertical separation -- no
 * overlap at any viewport from md (450px) through 2xl (933px).
 *
 * Visual intent (frontend-design notes):
 *  - Break the perceived grid: positions deliberately NOT on 5%/37%/
 *    69% horizontals or 4%/32%/56% verticals.
 *  - Two cards in the top stripe (Yael, Daniel), one card straddling
 *    rows 1-2 (Tamar), two in the mid stripe (Eitan low-left, Esther
 *    high-right), and one anchor (Sarah) low-center.
 *  - Rotations expanded from ±6° to ±11° for a more "tossed on a
 *    wall" feel without sacrificing label readability.
 *  - Sign of rotation alternates around the composition's diagonals
 *    so adjacent cards lean toward each other rather than parallel
 *    (parallel rotations read as a grid).
 *
 * Sarah's bottom edge lands ~68-71% panel height; brand block starts
 * ~76% via flex justify-end + p-10/lg:p-16 padding. ≥5% breathing
 * room above the heading at every breakpoint.
 */
const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  left: string;
  top: string;
  rot: number;
}> = [
  { name: "Yael",   src: "/marketing/woman-1.webp",  left: "3%",  top: "4%",  rot: -10 },
  { name: "Daniel", src: "/marketing/avatar-2.webp", left: "70%", top: "2%",  rot: 9 },
  { name: "Tamar",  src: "/marketing/avatar-5.webp", left: "34%", top: "18%", rot: -7 },
  { name: "Eitan",  src: "/marketing/avatar-4.webp", left: "8%",  top: "33%", rot: 11 },
  { name: "Esther", src: "/marketing/avatar-3.webp", left: "58%", top: "38%", rot: -8 },
  { name: "Sarah",  src: "/marketing/avatar-6.webp", left: "30%", top: "50%", rot: 6 },
];

/**
 * Right-column illustration for auth surfaces (sign-up, sign-in).
 * Indigo gradient + 5 floating profile cards in the upper half +
 * Ahavah brand mark and tagline anchored bottom-left.
 */
export function AuthIllustration() {
  return (
    <div
      className="relative overflow-hidden p-10 lg:p-16 flex flex-col justify-end min-h-dvh"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-indigo) 0%, var(--bg-elevated) 100%)",
      }}
    >
      {/* Photo cards — sit in the upper half of the panel via top: <50% */}
      <div className="pointer-events-none absolute inset-0">
        {CARDS.map((c) => (
          <div
            key={c.name}
            aria-hidden
            className="absolute rounded-2xl overflow-hidden border-[3px] border-white"
            style={{
              left: c.left,
              top: c.top,
              // Tightened twice: original 16vw → 14vw (v1) → 11vw (v2,
              // after v1 overlap report). At 11vw the card height as
              // % of panel height is small enough that the 28% vertical
              // gap between bands 1+2 and the 24% gap between bands 2+3
              // are always larger than the card height, regardless of
              // viewport aspect ratio. Verified by checking the
              // worst-case combo (1280×800 → tallest cards relative to
              // panel) which still leaves a ~6% gap between adjacent
              // band cards.
              width: "clamp(85px, 11vw, 130px)",
              aspectRatio: "5 / 6",
              backgroundImage: `url(${c.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: `rotate(${c.rot}deg)`,
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%)",
              }}
            />
            <div
              className="absolute left-3 right-3 bottom-3 text-white text-sm font-bold"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
            >
              {c.name}
            </div>
          </div>
        ))}
      </div>

      {/* Brand + tagline — anchored bottom-left, above the cards via
          relative positioning + z-index. */}
      <div className="relative z-10 max-w-105 text-white">
        <LogoMark size={48} decorative />
        <div className="mt-4.5 text-3xl font-extrabold leading-tight tracking-tight">
          Real people.<br />Verified profiles.
        </div>
        <p className="mt-3 text-base text-white/70">
          Every member completes selfie verification before they can match.
        </p>
      </div>
    </div>
  );
}

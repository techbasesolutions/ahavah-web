// Inline sizing/spacing is required here: per-card left/top percentages
// and the clamp() width are dynamic per item and can't be expressed as
// Tailwind utilities. The lint rule against inline sizing is the wrong
// trade-off for this single illustration component.
/* eslint-disable no-restricted-syntax */
import { LogoMark } from "@/components/brand/logo-mark";

// Local optimized portraits from public/marketing (Ahavah Stock). 7 cards
// spread across a 3-3-1 row layout in the upper ~75% of the right panel.
// Names are Hebrew/biblical to match the brand's target cohort, ethnicities
// + presentations deliberately varied for representation.

/**
 * Floating profile cards — positions are container-relative (percent)
 * so they scale with the right-panel viewport. Two clean rows of 3 plus
 * one anchor card in row 3, all sitting above the bottom-anchored
 * brand+tagline.
 *
 * Layout constraints validated for breakpoints md (panel ~450px wide)
 * through 2xl (panel ~900px). Cards use clamp(110px, 14vw, 170px) so
 * they shrink at tablet widths instead of overlapping. Horizontal
 * positions chosen so 3 cards per row fit with breathing room at the
 * tightest panel width:
 *   3 cards × ~30% width = 90% + 10% across 4 gaps = ~2.5% each.
 *
 * Vertical bands:
 *   Row 1: top 4-12%  → ends at ~30%
 *   Row 2: top 30-36% → ends at ~55%
 *   Row 3: top 53%    → ends at ~75% (brand starts at ~76%)
 *
 * Rotations stay in -7°..+6° so labels remain readable and silhouettes
 * don't bleed into the heading.
 */
const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  left: string;
  top: string;
  rot: number;
}> = [
  // Row 1 — top band
  { name: "Yael",   src: "/marketing/woman-1.webp",  left: "4%",  top: "5%",  rot: -6 },
  { name: "Adina",  src: "/marketing/avatar-1.webp", left: "36%", top: "12%", rot: 4 },
  { name: "Daniel", src: "/marketing/avatar-2.webp", left: "68%", top: "4%",  rot: -3 },
  // Row 2 — middle band
  { name: "Tamar",  src: "/marketing/avatar-5.webp", left: "4%",  top: "33%", rot: 5 },
  { name: "Eitan",  src: "/marketing/avatar-4.webp", left: "36%", top: "30%", rot: -4 },
  { name: "Esther", src: "/marketing/avatar-3.webp", left: "68%", top: "34%", rot: 6 },
  // Row 3 — anchor card, centered, sits just above the brand block
  { name: "Sarah",  src: "/marketing/avatar-6.webp", left: "36%", top: "53%", rot: 2 },
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
              // Tightened from 16vw → 14vw (and 120-180 → 110-170) so
              // 3 cards per row fit at md (~450px panel) without
              // touching. The total horizontal real estate consumed by
              // a 3-card row is ~93% at panel width, leaving 7% across
              // the 4 gaps.
              width: "clamp(110px, 14vw, 170px)",
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

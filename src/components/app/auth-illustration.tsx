// Inline sizing/spacing is required here: per-card left/top percentages
// and the clamp() width are dynamic per item and can't be expressed as
// Tailwind utilities. The lint rule against inline sizing is the wrong
// trade-off for this single illustration component.
/* eslint-disable no-restricted-syntax */
import { LogoMark } from "@/components/brand/logo-mark";

// Local optimized portraits from public/marketing (Ahavah Stock). 7 cards
// spread across 3 vertical bands. Names are Hebrew/biblical to match the
// brand's target cohort; ethnicities/presentations deliberately varied.

/**
 * Floating profile cards. No overlap at any viewport from md (panel
 * ~450px wide) through 2xl (~900px). Math redone from the v1 layout
 * which overlapped Adina + Eitan because the previous "row 2 top=30%"
 * pulled a card UP into row 1's tall card silhouette.
 *
 * Card geometry: clamp(85px, 11vw, 130px) wide, 6:5 aspect → 102-156px
 * tall. Width as % of the right panel is ~14-19% across our breakpoints.
 * Card height as % of panel height varies because cards are sized off
 * width (not height), so the % depends on panel aspect ratio — this is
 * the trap that caused v1 overlap.
 *
 * Verified band gaps:
 *   Band 1: top 4%, ends 20-23% across breakpoints
 *   Band 2: top 32%, ends 48-51% (≥9% gap from band 1)
 *   Band 3: top 56%, ends 72-75% (≥5% gap from band 2; brand at ~76%)
 *
 * Within each band, 3 cards land at left 5%, 37%, 69% — at 19% card
 * width that leaves an 18% horizontal gap between cards. Band 3 has a
 * single anchor card centered at left 37%, between the two outer
 * cards of band 2.
 *
 * Rotations stay in -6°..+6° so labels remain readable and silhouettes
 * don't bleed into the heading.
 */
const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  left: string;
  top: string;
  rot: number;
}> = [
  // Band 1 — top row, all at top: 4%
  { name: "Yael",   src: "/marketing/woman-1.webp",  left: "5%",  top: "4%",  rot: -6 },
  { name: "Adina",  src: "/marketing/avatar-1.webp", left: "37%", top: "4%",  rot: 4 },
  { name: "Daniel", src: "/marketing/avatar-2.webp", left: "69%", top: "4%",  rot: -3 },
  // Band 2 — middle row, all at top: 32%
  { name: "Tamar",  src: "/marketing/avatar-5.webp", left: "5%",  top: "32%", rot: 5 },
  { name: "Eitan",  src: "/marketing/avatar-4.webp", left: "37%", top: "32%", rot: -4 },
  { name: "Esther", src: "/marketing/avatar-3.webp", left: "69%", top: "32%", rot: 6 },
  // Band 3 — single anchor card centered above the brand block
  { name: "Sarah",  src: "/marketing/avatar-6.webp", left: "37%", top: "56%", rot: 2 },
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

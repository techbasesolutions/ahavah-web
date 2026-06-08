// Inline sizing/spacing is required here: per-card left/top percentages
// and the clamp() width are dynamic per item and can't be expressed as
// Tailwind utilities. The lint rule against inline sizing is the wrong
// trade-off for this single illustration component.
/* eslint-disable no-restricted-syntax */
import { LogoMark } from "@/components/brand/logo-mark";

// Local optimized portraits from public/marketing (Ahavah Stock). 6 cards
// scattered for an organic "snapshots tossed on a wall" composition.
// Adina removed in v3; v4 addresses feedback that (a) Yael+Daniel were
// too close to the edges, (b) the lower-right next to the brand text
// was blank, (c) cards didn't grow on 27" screens.

/**
 * Scattered profile cards, v4.
 *
 * Layout intent (frontend-design notes):
 *  - Cards pulled inward from edges: Yael L=3%→10%, Daniel L=70%→64%.
 *    Rotation extends the bounding box ~3% per side at ±9°, so 10%
 *    interior margin leaves ~6% visual clearance.
 *  - Sarah moved to the lower-right (L=70%, T=70%) so she sits BESIDE
 *    the "Real people. Verified profiles." brand block (which lives
 *    in the lower-left via max-w-105 + justify-end) rather than above
 *    it. The previous v3 left the entire lower-right quadrant blank
 *    next to the heading.
 *  - Rotations stay in ±10° range, sign alternating around the
 *    composition diagonal so adjacent cards lean toward each other
 *    rather than parallel.
 *
 * Card sizing: clamp(95px, 13vw, 240px) — max-cap raised from 130px so
 * cards actually grow on big screens (24" 1920 → 195px; 27" 2560 →
 * 240px cap). Aspect 5:6 → 114-288px tall.
 *
 * Pairwise no-overlap math verified at the worst-case viewport
 * (1440 wide × 800 tall → panel 840×800, card 187×224 = 22.3% wide,
 * 28% tall; needs ΔL ≥23% OR ΔT ≥28% between every pair). All 15
 * pairs satisfy at least one bound; the tightest is Esther↔Sarah
 * (ΔL=8%, ΔT=32%) which clears vertically by 4%.
 */
const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  left: string;
  top: string;
  rot: number;
}> = [
  { name: "Yael",   src: "/marketing/woman-1.webp",  left: "10%", top: "8%",  rot: -9 },
  { name: "Daniel", src: "/marketing/avatar-2.webp", left: "64%", top: "5%",  rot: 8 },
  { name: "Tamar",  src: "/marketing/avatar-5.webp", left: "38%", top: "24%", rot: -6 },
  { name: "Eitan",  src: "/marketing/avatar-4.webp", left: "8%",  top: "46%", rot: 10 },
  { name: "Esther", src: "/marketing/avatar-3.webp", left: "64%", top: "38%", rot: -7 },
  { name: "Sarah",  src: "/marketing/avatar-6.webp", left: "70%", top: "70%", rot: 6 },
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
              // v4.1 sizing: 12vw slope (was 13vw — a deployed-render
              // verification showed Tamar↔Esther bounding-box overlap
              // by 9px at desktop because 13vw made the rotated AABBs
              // 25.5% wide vs 24% horizontal gap between them).
              //   md  (768px):  ~92px → clamped to 95min
              //   xl (1440px):  173px
              //   2xl(1920px):  230px
              //   27"(2560px):  240px (cap, only ~10px smaller than
              //                       the v4 13vw cap)
              // Aspect 5:6 gives card heights 114-288px. Worst-case
              // AABB % at desktop is 24% wide × 30% tall, all pairs
              // now clear with margin (see CARDS comment).
              width: "clamp(95px, 12vw, 240px)",
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

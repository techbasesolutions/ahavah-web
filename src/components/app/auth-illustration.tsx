// Inline sizing/spacing is required here: per-card left/top percentages
// and the clamp() width are dynamic per item and can't be expressed as
// Tailwind utilities. The lint rule against inline sizing is the wrong
// trade-off for this single illustration component.
/* eslint-disable no-restricted-syntax */
import { LogoMark } from "@/components/brand/logo-mark";

// Stable Unsplash portrait IDs. ?w=400&h=480 keeps payload small for the
// 160×200 card slots. crop=faces centers on the subject.
const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&h=480&fit=crop&crop=faces&auto=format&q=70`;

/**
 * Floating profile cards — positions are container-relative (percent)
 * so they scale with the right-panel viewport and never collide with
 * the bottom-anchored heading. The cards live entirely in the upper
 * ~55% of the panel; the lower 45% is reserved for brand + tagline.
 *
 * Rotations stay small (-8°..+6°) so labels remain readable and the
 * card silhouettes don't bleed into the heading text on narrower
 * desktop widths. Sizes use clamp() so cards shrink on smaller right
 * panels instead of crowding each other.
 */
const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  left: string;
  top: string;
  rot: number;
}> = [
  { name: "Yael",   src: IMG("photo-1494790108377-be9c29b29330"), left: "8%",  top: "8%",  rot: -6 },
  { name: "Adina",  src: IMG("photo-1438761681033-6461ffad8d80"), left: "44%", top: "18%", rot: 4 },
  { name: "Daniel", src: IMG("photo-1500648767791-00dcc994a43e"), left: "70%", top: "5%",  rot: -3 },
  { name: "Esther", src: IMG("photo-1544005313-94ddf0286df2"),    left: "18%", top: "36%", rot: 5 },
  { name: "Rivka",  src: IMG("photo-1502823403499-6ccfcf4fb453"), left: "58%", top: "42%", rot: -8 },
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
              width: "clamp(120px, 16vw, 180px)",
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

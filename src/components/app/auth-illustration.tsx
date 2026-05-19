import { LogoMark } from "@/components/brand/logo-mark";

// Stable Unsplash portrait IDs. ?w=400&h=480 keeps payload small for the
// 180×220 card slots. crop=faces centers on the subject.
const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&h=480&fit=crop&crop=faces&auto=format&q=70`;

const CARDS: ReadonlyArray<{
  name: string;
  src: string;
  x: number;
  y: number;
  rot: number;
  scale: number;
}> = [
  { name: "Yael",   src: IMG("photo-1494790108377-be9c29b29330"), x: 60,  y: 80,  rot: -6, scale: 1.0  },
  { name: "Adina",  src: IMG("photo-1438761681033-6461ffad8d80"), x: 300, y: 200, rot: 4,  scale: 1.1  },
  { name: "Daniel", src: IMG("photo-1500648767791-00dcc994a43e"), x: 540, y: 120, rot: -3, scale: 0.95 },
  { name: "Esther", src: IMG("photo-1544005313-94ddf0286df2"),    x: 140, y: 380, rot: 5,  scale: 1.05 },
  { name: "Rivka",  src: IMG("photo-1502823403499-6ccfcf4fb453"), x: 430, y: 430, rot: -4, scale: 1.0  },
];

/**
 * Right-column illustration for auth surfaces (sign-up, sign-in).
 * Canonical per handoff/screens/02-sign-up.md — indigo→elevated gradient,
 * 5 floating profile cards (180×220, 3px white border, varied rotations),
 * and the Ahavah brand mark + tagline anchored bottom-left.
 */
export function AuthIllustration() {
  return (
    <div
      className="relative overflow-hidden p-16 flex flex-col justify-end"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-indigo) 0%, var(--bg-elevated) 100%)",
      }}
    >
      {CARDS.map((c) => (
        <div
          key={c.name}
          aria-hidden
          className="absolute w-45 h-55 rounded-2xl overflow-hidden border-[3px] border-white"
          style={{
            left: c.x,
            top: c.y,
            backgroundImage: `url(${c.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `rotate(${c.rot}deg) scale(${c.scale})`,
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
            className="absolute left-3.5 right-3.5 bottom-3.5 text-white text-base font-bold"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
          >
            {c.name}
          </div>
        </div>
      ))}
      <div className="relative max-w-105 text-white">
        <LogoMark size={36} decorative />
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

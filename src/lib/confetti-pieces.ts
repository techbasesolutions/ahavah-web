export type ConfettiPiece = {
  color: "lime" | "lavender" | "pink" | "peach";
  shape: "rect" | "circle";
  /** Angle in radians, 0 = right, π/2 = down. */
  angle: number;
  /** Distance from origin in px after animation completes. */
  distance: number;
  /** Initial rotation in degrees. */
  rotation: number;
  /** Final rotation in degrees. */
  finalRotation: number;
  /** Animation delay relative to mount in seconds. */
  delay: number;
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE: ConfettiPiece["color"][] = [
  "lime",
  "lime",
  "lime",
  "lime",
  "lavender",
  "lavender",
  "lavender",
  "lavender",
  "pink",
  "pink",
  "pink",
  "pink",
  "peach",
  "peach",
];

/**
 * Deterministic confetti piece generator. Same seed → same output.
 * Default count=14 matches PALETTE length; passing different counts
 * cycles or truncates the palette via i % PALETTE.length.
 *
 * Used by `<Confetti>` (SP19 T2) for the /match celebration burst.
 * Determinism matters: SSR + hydration must produce the same positions
 * or React will warn about hydration mismatch on the absolutely-
 * positioned SVG children.
 */
export function generatePieces(count = 14, seed = 1): ConfettiPiece[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = rng() * Math.PI * 2; // 0..2π
    const distance = 80 + rng() * 80; // 80..160 px
    const rotation = (rng() - 0.5) * 60; // -30..30 deg
    const finalRotation = rotation + (rng() - 0.5) * 360; // tumble
    const delay = rng() * 0.15; // 0..0.15s — small stagger
    return {
      color: PALETTE[i % PALETTE.length],
      shape: i % 3 === 0 ? "circle" : "rect", // 1/3 circles, 2/3 rects
      angle,
      distance,
      rotation,
      finalRotation,
      delay,
    };
  });
}

"use client";

import { motion, useReducedMotion } from "motion/react";

import { generatePieces, type ConfettiPiece } from "@/lib/confetti-pieces";

const COLOR_TO_CSS: Record<ConfettiPiece["color"], string> = {
  lime:     "var(--color-lime, #c8ff88)",
  lavender: "var(--color-lavender, #9f76ea)",
  pink:     "var(--color-pink, #ffc0cb)",
  peach:    "var(--color-peach, #ffb088)",
};

export interface ConfettiProps {
  /** Number of pieces. Default 14. */
  pieces?: number;
  /** Seed for deterministic position output. Default 1. */
  seed?: number;
  /** Animation duration in seconds per piece. Default 1.4. */
  duration?: number;
  /** Tailwind classes for absolute-positioning the burst origin. */
  className?: string;
}

/**
 * Paper-shape confetti burst. Fires once on mount, radiates 14 brand-
 * colored pieces from the burst origin, then idles at opacity 0
 * (pointer-events: none). Reduced-motion: pieces never appear.
 * Decorative; aria-hidden.
 *
 * Used by /match (SP19 T4) at the badge climax. Future surfaces (e.g.
 * premium unlock, first-message-sent) can reuse the same primitive.
 */
export function Confetti({
  pieces = 14,
  seed = 1,
  duration = 1.4,
  className,
}: ConfettiProps) {
  const reduceMotion = useReducedMotion();
  const items = generatePieces(pieces, seed);

  if (reduceMotion) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 ${className ?? ""}`}
    >
      {items.map((p, i) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;
        const size = p.shape === "circle" ? 8 : 12;
        return (
          <motion.svg
            key={i}
            initial={{ x: 0, y: 0, rotate: p.rotation, opacity: 0, scale: 0.5 }}
            animate={{
              x: dx,
              y: dy,
              rotate: p.finalRotation,
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 1, 0.8],
            }}
            transition={{
              duration,
              delay: p.delay,
              ease: "easeOut",
              times: [0, 0.15, 0.7, 1],
            }}
            width={size}
            height={size}
            style={{ position: "absolute", color: COLOR_TO_CSS[p.color] }}
            viewBox="0 0 24 24"
          >
            {p.shape === "circle" ? (
              <circle cx="12" cy="12" r="10" fill="currentColor" />
            ) : (
              <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" />
            )}
          </motion.svg>
        );
      })}
    </div>
  );
}

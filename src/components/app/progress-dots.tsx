import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * ProgressDots — horizontal row of step indicators.
 *
 * Two modes:
 *  - `mode="dot"` (default): one elongated "active" dot, others are tiny
 *    circles. Used in /onboarding intro carousel + /profile/[uuid] photo
 *    paginator.
 *  - `mode="bar"`: every step is a flex-1 segment; reached segments are
 *    fully filled, upcoming are dim. Cumulative-fill pattern. Used in the
 *    /onboarding wizard chrome's step header (replaces the N-Progress map).
 *
 * `tone` controls the active/inactive colour pair; `size` controls the
 * dot height + active-dot length. `count` is the number of dots, `active`
 * is the zero-based index of the current step.
 */
const progressDotsVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "gap-1",
      md: "gap-1.5",
    },
  },
  defaultVariants: { size: "md" },
});

const dotVariants = cva("rounded-full transition-all duration-200", {
  variants: {
    size: {
      sm: "h-1 data-[state=active]:w-6 data-[state=inactive]:w-1.5",
      md: "h-1.5 data-[state=active]:w-7 data-[state=inactive]:w-1.5",
    },
    tone: {
      // Lime = brand-primary (onboarding intro carousel).
      lime:  "data-[state=active]:bg-lime data-[state=inactive]:bg-foreground/15",
      // White = on-photo paginator (profile/[uuid]).
      white: "data-[state=active]:bg-white data-[state=inactive]:bg-white/40",
    },
  },
  defaultVariants: { size: "md", tone: "lime" },
});

const barVariants = cva(
  "h-1 flex-1 rounded-full transition-all duration-200",
  {
    variants: {
      tone: {
        lime:  "data-[state=reached]:bg-lime data-[state=upcoming]:bg-foreground/15",
        white: "data-[state=reached]:bg-white data-[state=upcoming]:bg-white/40",
      },
    },
    defaultVariants: { tone: "lime" },
  },
);

type ProgressDotsProps = VariantProps<typeof progressDotsVariants> &
  VariantProps<typeof dotVariants> & {
    count: number;
    active: number;
    /** "dot" = single elongated active dot; "bar" = cumulative-fill bars. */
    mode?: "dot" | "bar";
    className?: string;
  };

export function ProgressDots({
  count,
  active,
  size,
  tone,
  mode = "dot",
  className,
}: ProgressDotsProps) {
  return (
    <div
      data-slot="progress-dots"
      role="tablist"
      aria-label={`Step ${active + 1} of ${count}`}
      className={cn(progressDotsVariants({ size }), className)}
    >
      {Array.from({ length: count }).map((_, i) => {
        if (mode === "bar") {
          return (
            <span
              key={i}
              data-state={i <= active ? "reached" : "upcoming"}
              className={barVariants({ tone })}
            />
          );
        }
        return (
          <span
            key={i}
            data-state={i === active ? "active" : "inactive"}
            className={dotVariants({ size, tone })}
          />
        );
      })}
    </div>
  );
}

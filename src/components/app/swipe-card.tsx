"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { Heart, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  COMMIT_OFFSET_PX,
  decideFromPan,
  type SwipeDecision,
} from "@/lib/swipe-decision";

/**
 * SwipeCard — single, drag-aware dating-app card.
 *
 * Behaviour:
 *  - Horizontal pan (drag="x") with `dragConstraints` clamped to {0,0,0,0}
 *    and `dragElastic={0.5}` so the card springs back to center on release.
 *  - `useMotionValue(0)` for x; `useTransform(x, [-200, 0, 200], [-15, 0, 15])`
 *    drives rotation in degrees. All visual feedback (rotate, LIKE/NOPE
 *    overlays) is GPU-accelerated via `style` — zero React re-renders during
 *    drag. This keeps a phone at 60fps even with a 3-card stack behind.
 *  - LIKE overlay (top-right, lime + Heart icon) ramps from opacity 0 at
 *    +40 px to opacity 1 at +140 px (the commit threshold). NOPE overlay is
 *    symmetric on the negative axis.
 *  - On dragEnd, we call `decideFromPan` with the motion-supplied
 *    `info.offset.x` + `info.velocity.x`. If the decision is "like" or
 *    "nope", we call `onCommit(decision)`. "stay" => card springs back
 *    naturally; no callback.
 *  - `prefers-reduced-motion` collapses the card to a non-interactive div
 *    (the parent SwipeDeck will surface tap-buttons in that mode). Same
 *    fallback when `interactive={false}` so behind-the-stack cards don't
 *    try to drag.
 *
 * cva variants control the surface tone (`elevated` for the visible top
 * card, `flat` for the dim cards beneath). Both inherit the 3xl radius +
 * floating shadow used across the app's card surfaces.
 */
export const swipeCardVariants = cva(
  // Base: absolute fill so SwipeDeck can stack cards inside a positioned
  // wrapper. Touch-action: none lets motion's pan hijack the gesture from
  // the browser's default scroll handling. Drag the card sideways; the
  // page doesn't move.
  "absolute inset-0 select-none overflow-hidden rounded-3xl shadow-card-floating",
  {
    variants: {
      surface: {
        elevated: "bg-bg-elevated",
        flat: "bg-bg-canvas",
      },
    },
    defaultVariants: { surface: "elevated" },
  },
);

export type SwipeCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof swipeCardVariants> & {
    /**
     * Fires when a drag commits a decision. Not called when the gesture
     * springs back ("stay") or when the card is non-interactive.
     */
    onCommit?: (decision: Exclude<SwipeDecision, "stay">) => void;
    /**
     * False disables drag / overlays / rotation. Used by behind-the-stack
     * cards in SwipeDeck and by the reduce-motion / tap-button fallback.
     */
    interactive?: boolean;
  };

export function SwipeCard({
  surface,
  className,
  children,
  onCommit,
  interactive = true,
  ...rest
}: SwipeCardProps) {
  const reduceMotion = useReducedMotion();
  // Both reduce-motion AND explicit interactive=false collapse to the
  // non-draggable variant. Motion hooks still run (so the component shape
  // stays stable across re-renders) but the values are never read.
  const dragDisabled = !interactive || reduceMotion;

  const x = useMotionValue(0);
  // -200 / 200 px input range matches the card's natural drag travel before
  // it gets gated by the commit-threshold; reading rotation off the same x
  // keeps the rotation and overlays perfectly in lock-step with the drag.
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  // Overlay opacity ramps from 0 at ±40 to 1 at ±COMMIT_OFFSET_PX so the
  // user feels the commit point coming. Hard 0/1 clamping handled by motion
  // outside the input range.
  const likeOpacity = useTransform(x, [40, COMMIT_OFFSET_PX], [0, 1]);
  const nopeOpacity = useTransform(x, [-COMMIT_OFFSET_PX, -40], [1, 0]);

  const handleDragEnd = React.useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      const decision = decideFromPan({
        offsetX: info.offset.x,
        velocityX: info.velocity.x,
      });
      if (decision !== "stay" && onCommit) {
        onCommit(decision);
      }
    },
    [onCommit],
  );

  if (dragDisabled) {
    // Plain div surface — no drag, no rotation, no overlays. The deck's
    // tap-button fallback (NOPE / LIKE) drives commits in this mode.
    return (
      <div
        className={cn(swipeCardVariants({ surface }), className)}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      // Drag config: x-only, snap-back constraints, elastic rebound, and a
      // subtle tap-down scale for tactile feel. `touchAction: none` is set
      // via the style prop so the browser doesn't fight motion for the
      // gesture (Safari iOS in particular).
      drag="x"
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.5}
      whileTap={{ scale: 0.98 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, touchAction: "none" }}
      className={cn(swipeCardVariants({ surface }), className)}
      {...(rest as Omit<typeof rest, keyof React.ComponentProps<"div">>)}
    >
      {children}

      {/* LIKE overlay — top-right lime burst with Heart icon. aria-hidden
          because the commit itself is announced separately by the deck's
          live region; this is decorative ramp-up feedback. */}
      <motion.div
        aria-hidden
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute top-6 right-6 z-30 flex items-center gap-2 rounded-2xl border-[3px] border-lime bg-lime/15 px-4 py-2 backdrop-blur-sm"
      >
        <Heart className="size-5 text-lime" fill="currentColor" />
        <span className="text-meta font-semibold tracking-wider text-lime uppercase">
          Like
        </span>
      </motion.div>

      {/* NOPE overlay — top-left symmetric. Pink + X icon. */}
      <motion.div
        aria-hidden
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute top-6 left-6 z-30 flex items-center gap-2 rounded-2xl border-[3px] border-pink bg-pink/15 px-4 py-2 backdrop-blur-sm"
      >
        <X className="size-5 text-pink" />
        <span className="text-meta font-semibold tracking-wider text-pink uppercase">
          Nope
        </span>
      </motion.div>
    </motion.div>
  );
}

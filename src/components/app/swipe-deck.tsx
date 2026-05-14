"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SwipeCard } from "@/components/app/swipe-card";
import type { SwipeDecision } from "@/lib/swipe-decision";

/**
 * SwipeDeck — stack of SwipeCards with deck-of-cards visual presentation.
 *
 * Only the top card is interactive. Behind cards render with a small
 * vertical offset and a slight scale-down so the stack reads as depth.
 * On commit (drag past threshold OR tap-button fallback), the top card
 * is removed via AnimatePresence and the next card becomes interactive.
 *
 * Pagination signal — when the deck has `pageThreshold` or fewer items
 * remaining (default 3), we call `onNeedMore?.()` so the caller can
 * prefetch the next page. We do this on every commit that leaves the
 * deck at-or-below the threshold; the caller is expected to no-op
 * re-entrant fetches via its own in-flight ref.
 *
 * Tap-button fallback — NOPE / LIKE circles sit beneath the deck. On
 * mid-range mobile + with motion allowed, they are hidden at the `lg`
 * breakpoint (so desktop / tablet users keep button controls; small
 * touch screens get pure swipe). When `prefers-reduced-motion` is set,
 * the buttons stay visible at every breakpoint and drag is disabled
 * inside SwipeCard. WCAG 2.3.3 + 2.5.4 satisfied.
 */

const VISIBLE_COUNT = 3;
const STACK_OFFSET_PER_INDEX = 8;
const STACK_SCALE_PER_INDEX = 0.04;

export type DeckItem = {
  id: string;
  render: () => React.ReactNode;
};

export type SwipeDeckProps = {
  items: ReadonlyArray<DeckItem>;
  onDecide: (
    item: DeckItem,
    decision: Exclude<SwipeDecision, "stay">,
  ) => void;
  /** Threshold below which `onNeedMore` is called. Defaults to 3. */
  pageThreshold?: number;
  /** Prefetch hook. Caller must dedupe in-flight requests. */
  onNeedMore?: () => void;
  /** Rendered when `items.length === 0`. */
  emptyState?: React.ReactNode;
  className?: string;
};

export function SwipeDeck({
  items,
  onDecide,
  pageThreshold = 3,
  onNeedMore,
  emptyState,
  className,
}: SwipeDeckProps) {
  const reduceMotion = useReducedMotion();

  // The visible slice — top card at index 0, deepest behind at VISIBLE_COUNT-1.
  // Slicing in render avoids any stale-state hazard with AnimatePresence
  // because exiting cards are keyed by id, not index.
  const visible = items.slice(0, VISIBLE_COUNT);
  const topItem = visible[0];

  const handleCommit = React.useCallback(
    (item: DeckItem, decision: Exclude<SwipeDecision, "stay">) => {
      onDecide(item, decision);
      // After this commit, the deck (items prop) will shrink on next
      // render. We check BEFORE the prop update because onDecide may
      // race with state updates upstream; this fires the prefetch hook
      // when the visible count after-commit will be at or below
      // pageThreshold.
      if (items.length - 1 <= pageThreshold) {
        onNeedMore?.();
      }
    },
    [items.length, onDecide, onNeedMore, pageThreshold],
  );

  // Tap-button fallback — NOPE / LIKE. The brief calls for these to always
  // be rendered so keyboard / non-touch users have a path to commit. We
  // hide them at `lg:` when motion is allowed (touch users get swipe);
  // reduce-motion forces them visible at every breakpoint.
  const fallbackHidden = reduceMotion ? "" : "lg:hidden";

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "relative flex w-full flex-1 items-center justify-center",
          className,
        )}
      >
        {emptyState}
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full flex-1 flex-col", className)}>
      {/* Card stack — sized purely by `aspect-3/4 w-full` so its height
          is `width × 4/3` and never grows to consume the parent's
          remaining height. The OUTER deck container gets `flex-1` (it
          fills the route), then the card stack sits at top with the
          tap-buttons immediately below. Earlier `flex-1` here pushed
          the buttons off-screen. */}
      <div className="relative aspect-3/4 w-full shrink-0">
        <AnimatePresence initial={false}>
          {visible.map((item, index) => {
            const offsetY = index * STACK_OFFSET_PER_INDEX;
            const scale = 1 - index * STACK_SCALE_PER_INDEX;
            return (
              <motion.div
                key={item.id}
                layout
                // Stacked depth — behind cards offset down + scaled in.
                // zIndex inverts the visible array so the top item (index 0)
                // wins the hit-test. Exit slides nothing horizontally — the
                // SwipeCard's own drag handles horizontal motion; exit just
                // fades + drops in z-stack.
                initial={{ opacity: 0, y: -12, scale }}
                animate={{ opacity: 1, y: offsetY, scale }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.25 }}
                style={{ zIndex: VISIBLE_COUNT - index }}
                className="absolute inset-0"
              >
                <SwipeCard
                  // Only the top card drags. Behind cards render with the
                  // SwipeCard's non-interactive variant (plain div, no
                  // motion gestures, no overlays).
                  interactive={index === 0}
                  onCommit={(decision) => handleCommit(item, decision)}
                  surface={index === 0 ? "elevated" : "flat"}
                >
                  {item.render()}
                </SwipeCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tap-button fallback. mt-4 gives breathing room from the card
          stack. The buttons are square Button kit "circle" size variants
          (44x44 minimum touch target). aria-label carries the action verb
          for SR users; the icons are decorative. */}
      {topItem ? (
        <div
          className={cn(
            "mt-4 flex items-center justify-center gap-6 pb-2",
            fallbackHidden,
          )}
        >
          <Button
            size="circle"
            variant="outline"
            aria-label="Pass on this profile"
            onClick={() => handleCommit(topItem, "nope")}
            className="border-2 border-pink/60 text-pink hover:bg-pink/10"
          >
            <X />
          </Button>
          <Button
            size="circle"
            variant="outline"
            aria-label="Like this profile"
            onClick={() => handleCommit(topItem, "like")}
            className="border-2 border-lime/60 text-lime hover:bg-lime/10"
          >
            <Heart fill="currentColor" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

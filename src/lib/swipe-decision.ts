/**
 * Pure swipe-decision logic.
 *
 * Given the pan state at drag-end (horizontal offset + horizontal velocity),
 * returns whether to commit a like, commit a nope, or spring the card back.
 *
 * Two independent commit paths:
 *
 *   - **Offset threshold** — drag past ±COMMIT_OFFSET_PX. Slow, deliberate
 *     swipes commit by distance regardless of how slowly you arrived.
 *   - **Velocity threshold** — fling faster than ±COMMIT_VELOCITY_PX_S
 *     (in px/s). Tinder-style flicks commit even if the finger lifts close
 *     to where it landed.
 *
 * Defaults are tuned for mobile dating UX:
 *   - 140 px offset is roughly 35% of a 390px-wide iPhone screen — visible
 *     commit intent, not an accidental nudge.
 *   - 1200 px/s velocity is the canonical "flick" threshold widely used in
 *     swipe-card libraries; below it the gesture reads as "trying to peek,"
 *     above it as "definitely committed."
 *
 * This module has NO React imports, NO DOM access, and NO side effects so it
 * can be unit-tested without jsdom. The DOM-rendered SwipeCard primitive
 * imports `decideFromPan` and the threshold constants from here.
 */

export const COMMIT_OFFSET_PX = 140;
export const COMMIT_VELOCITY_PX_S = 1200;

export type SwipeDecision = "like" | "nope" | "stay";

export type PanState = {
  /** Horizontal drag offset at drag-end, in CSS pixels. Positive = rightward. */
  offsetX: number;
  /** Horizontal pointer velocity at drag-end, in CSS px / second. */
  velocityX: number;
};

/**
 * Decide whether a drag-end pan state commits a like, a nope, or springs back.
 *
 * Order of evaluation: like first, nope second, stay otherwise. The two
 * directional branches are independent — a fast right fling with negative
 * offset (rare but possible mid-deceleration) commits a like because the
 * velocity already points right.
 */
export function decideFromPan({ offsetX, velocityX }: PanState): SwipeDecision {
  if (offsetX > COMMIT_OFFSET_PX || velocityX > COMMIT_VELOCITY_PX_S) {
    return "like";
  }
  if (offsetX < -COMMIT_OFFSET_PX || velocityX < -COMMIT_VELOCITY_PX_S) {
    return "nope";
  }
  return "stay";
}

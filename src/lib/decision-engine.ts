import type { Profile } from "@/lib/profile-schema";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";

export type DecisionAction = "pass" | "like";

export type Decision = {
  /** uuid from SAMPLE_PROFILES (e.g. "esther"). */
  subjectId: string;
  action: DecisionAction;
  /** Epoch ms — used for ordering when surfaced in a "recent activity" view. */
  timestamp: number;
};

/**
 * Compat threshold for the mutual-like simulation. A sample profile
 * "likes back" the viewer iff `computeCompatibility(viewer, sample).score
 * >= LIKE_THRESHOLD`. 50 is permissive enough that most viewers get 1-3
 * mutuals across the 8 seed profiles; tune up to make matches scarcer.
 */
export const LIKE_THRESHOLD = 50;

/**
 * Append-or-replace: if a decision already exists for the subject, REPLACE
 * it (most-recent wins). Returns a new array — pure function, never
 * mutates input. Auto-stamps `timestamp` to `Date.now()` if absent.
 */
export function recordDecision(
  current: ReadonlyArray<Decision>,
  next: { subjectId: string; action: DecisionAction; timestamp?: number },
): Decision[] {
  const stamped: Decision = {
    subjectId: next.subjectId,
    action: next.action,
    timestamp: next.timestamp ?? Date.now(),
  };
  const withoutExisting = current.filter((d) => d.subjectId !== next.subjectId);
  return [...withoutExisting, stamped];
}

/**
 * Returns the recorded decision for the given subject, or null if none.
 * `null` (not undefined) matches the codebase convention from
 * `wizard-flow.ts#routeForField` for "absent record" lookups.
 */
export function getDecision(
  decisions: ReadonlyArray<Decision>,
  subjectId: string,
): Decision | null {
  return decisions.find((d) => d.subjectId === subjectId) ?? null;
}

export function hasDecided(
  decisions: ReadonlyArray<Decision>,
  subjectId: string,
): boolean {
  return decisions.some((d) => d.subjectId === subjectId);
}

/**
 * Deterministic mutual-like simulation. Returns true iff the sample
 * profile would "like back" the viewer per the compat threshold. Pure —
 * no randomness, no I/O. Identical inputs always yield identical output.
 */
export function simulateLikesBack(viewer: Profile, sample: Profile): boolean {
  const { score } = computeCompatibility(viewer, sample);
  return score >= LIKE_THRESHOLD;
}

/**
 * Removes the most-recently-recorded decision from the array and returns
 * the popped entry plus the remaining list. Pure — input is not mutated.
 * Returns `popped: null` when input is empty.
 *
 * Used by the /discover left-edge "undo last decision" gesture. After
 * pop, hasDecided(popped.subjectId) flips false and the candidate
 * re-appears at the head of filteredDeck under the head-only deck model.
 */
export function popLastDecision(
  decisions: ReadonlyArray<Decision>,
): { popped: Decision | null; rest: Decision[] } {
  if (decisions.length === 0) return { popped: null, rest: [] };
  const popped = decisions[decisions.length - 1];
  const rest = decisions.slice(0, -1);
  return { popped, rest };
}

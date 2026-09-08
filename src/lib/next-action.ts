/**
 * Next-action priority engine — pure, framework-free logic for the
 * signed-in home "next action" card.
 *
 * SOT: "Claude Design/Ahavah Landing First Viewport.html", frames
 * "Signed-in home ..." (6 of them) + the "NEXT-ACTION PRIORITY ORDER"
 * spec card. That board states the rule this module implements:
 *
 *   "The highest-ranked live condition becomes the one card. Everything
 *    else below it collapses into the 'and N more' list, in the same
 *    order. Premium never outranks a real event, and the fallback only
 *    appears when ranks 1 to 7 are all clear."
 *
 * Kept separate from use-next-action.ts (the data-fetching hook) so the
 * ranking algorithm — the part with real "which one wins" logic — can be
 * unit-tested without React, network mocks, or IndexedDB.
 */

export type NextActionKind =
  | "message-failed"
  | "new-match"
  | "profile-incomplete"
  | "verification-pending"
  | "add-city"
  | "profile-nudge"
  | "premium-upsell"
  | "steady-deck";

/**
 * Rank order per the SOT's "Next-action priority order" board — 1 is
 * highest priority (becomes the one primary card). Every other LIVE
 * condition collapses into "And N more", ordered by this same rank.
 */
export const NEXT_ACTION_RANK: Readonly<Record<NextActionKind, number>> = {
  "message-failed": 1,
  "new-match": 2,
  "profile-incomplete": 3,
  "verification-pending": 4,
  "add-city": 5,
  "profile-nudge": 6,
  "premium-upsell": 7,
  "steady-deck": 8,
};

export type RankedItem = { kind: NextActionKind };

/**
 * Pure selection: given the set of CURRENTLY LIVE conditions (any order,
 * any subset, duplicates of the same kind not expected but tolerated),
 * returns the single highest-ranked one as `primary` and every other
 * live condition — in rank order — as `more`.
 *
 * Callers decide what counts as "live" (e.g. steady-deck, the rank-8
 * fallback, should only be included when ranks 1-7 are already known to
 * be clear) — this function itself has no special-casing, it just sorts
 * and splits, which is what keeps it trivially testable.
 */
export function selectNextAction<T extends RankedItem>(
  live: ReadonlyArray<T>,
): { primary: T | null; more: T[] } {
  const sorted = [...live].sort(
    (a, b) => NEXT_ACTION_RANK[a.kind] - NEXT_ACTION_RANK[b.kind],
  );
  const primary = sorted[0] ?? null;
  const more = sorted.slice(1);
  return { primary, more };
}

/**
 * "Written {time}" style label for the message-failed card, per the SOT
 * copy "Written 9:12 this morning." — clock time + day-part qualifier
 * for same-day, a short relative form otherwise. `now` is injectable for
 * deterministic tests; defaults to the real clock.
 */
export function writtenAtLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const h = d.getHours();
    const qualifier =
      h < 5 ? "tonight" : h < 12 ? "this morning" : h < 17 ? "this afternoon" : h < 21 ? "this evening" : "tonight";
    return `${time} ${qualifier}`;
  }
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 1) return `yesterday at ${time}`;
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return `on ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

/**
 * "N steps left" + progress meta for the profile-incomplete card.
 *
 * `requiredTotal` / `missingRequiredCount` come from
 * `computeCompleteness()` (the same MINIMUM_COMPLETE_FIELDS gate
 * /discover itself uses elsewhere) — photo + about are added on top
 * because they are NOT in MINIMUM_COMPLETE_FIELDS (the discover-eligibility
 * gate doesn't require them) but the SOT copy is specifically about them
 * ("Members only see profiles with a photo and an about section"). The
 * "About N minutes" estimate is a UX heuristic (2 min/step), not a real
 * signal — documented as such at the call site.
 */
export function computeVisibilitySteps(input: {
  hasPhoto: boolean;
  hasBio: boolean;
  missingRequiredCount: number;
  requiredTotal: number;
}): { stepsLeft: number; stepsTotal: number; doneCount: number; estimatedMinutes: number } {
  const stepsTotal = input.requiredTotal + 2; // + photo + about
  const stepsLeft =
    input.missingRequiredCount + (input.hasPhoto ? 0 : 1) + (input.hasBio ? 0 : 1);
  const doneCount = Math.max(0, stepsTotal - stepsLeft);
  const estimatedMinutes = Math.max(1, stepsLeft * 2);
  return { stepsLeft, stepsTotal, doneCount, estimatedMinutes };
}

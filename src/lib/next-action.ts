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
  | "profile-finish"
  | "add-city"
  | "profile-nudge"
  | "premium-upsell"
  | "steady-deck";

/**
 * Rank order per the SOT's "Next-action priority order" board — 1 is
 * highest priority (becomes the one primary card). Every other LIVE
 * condition collapses into "And N more", ordered by this same rank.
 *
 * "profile-finish" is NOT one of the SOT's original 8 ranks — it was
 * added after a prod bug report (2026-09-08): "profile-incomplete" (rank
 * 3, the BLOCKING "you are hidden" card) must only ever fire for a member
 * who is genuinely not `isDiscoverEligible()`. On /discover, that's rare
 * — the page's own soft-completeness gate already redirects ineligible,
 * not-yet-onboarded members away. The common case is an ELIGIBLE member
 * who is simply not 100% complete (e.g. 10/11 fields) — they already
 * appear in the deck, so telling them they're "hidden" is false. That
 * case gets "profile-finish": a soft, evergreen nudge slotted right
 * after verification-pending, honest that the profile already shows.
 */
export const NEXT_ACTION_RANK: Readonly<Record<NextActionKind, number>> = {
  "message-failed": 1,
  "new-match": 2,
  "profile-incomplete": 3,
  "verification-pending": 4,
  "profile-finish": 5,
  "add-city": 6,
  "profile-nudge": 7,
  "premium-upsell": 8,
  "steady-deck": 9,
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

/**
 * The finish-profile / profile-incomplete card's primary CTA must name a
 * REAL missing item — a prod bug (2026-09-08) hardcoded "Add a photo"
 * even when the member already had one. Photo and about are checked
 * first because they're the two things called out by name in the SOT
 * copy; any other missing required field falls back to a generic label
 * rather than guessing which one to name.
 */
export function finishProfilePrimaryLabel(input: { hasPhoto: boolean; hasBio: boolean }): string {
  if (!input.hasPhoto) return "Add a photo";
  if (!input.hasBio) return "Add your about";
  return "Finish profile";
}

/**
 * Primary CTA href for the BLOCKING profile-incomplete card. Photo/about
 * aren't part of MINIMUM_COMPLETE_FIELDS, so there's no dedicated
 * onboarding step for them — those cases fall back to `/profile/edit`
 * same as before. Once photo AND about both exist, the ONLY reason left
 * to be non-eligible is a missing MINIMUM_COMPLETE_FIELDS entry, so the
 * CTA should route to that field's real onboarding step
 * (`firstMissingStepFor(profile)`, resolved by the caller — this file
 * stays free of a profile-completeness import) rather than a generic
 * edit page that may not even surface that field.
 */
export function blockingProfilePrimaryHref(input: {
  hasPhoto: boolean;
  hasBio: boolean;
  firstMissingStepHref: string | null;
}): string {
  if (!input.hasPhoto || !input.hasBio) return "/profile/edit";
  return input.firstMissingStepHref ?? "/profile/edit";
}

/**
 * Short, human labels for MINIMUM_COMPLETE_FIELDS — used ONLY to name a
 * genuinely-missing required field in the BLOCKING profile-incomplete
 * card's body copy. Never used to invent a per-field primary CTA label
 * (a prod audit, 2026-09-08, found 7 members non-eligible ONLY because
 * `wantsChildren` was unanswered — they already had a photo and about,
 * so the old hardcoded "Add a photo" + photo/about body was flat wrong
 * for them). Keyed loosely by string (not `keyof Profile`) so this file
 * stays free of a profile-schema import — callers pass whatever key
 * `missingRequiredFields()` returned.
 */
export const REQUIRED_FIELD_LABEL: Readonly<Record<string, string>> = {
  firstName: "your name",
  age: "your age",
  sex: "your sex",
  maritalStatus: "your marital status",
  wantsChildren: "whether you want children",
  country: "your country",
  intent: "what you are looking for",
  assembly: "your assembly",
  relocation: "your relocation preference",
};

/**
 * Title + body for the BLOCKING profile-incomplete card. Only claims the
 * photo/about specifics when one of them is ACTUALLY missing; otherwise
 * a generic, always-true sentence — naming the single missing field when
 * there's exactly one, per REQUIRED_FIELD_LABEL, without ever fabricating
 * a reason that doesn't apply to this member.
 */
export function blockingProfileCopy(input: {
  hasPhoto: boolean;
  hasBio: boolean;
  missingRequiredKeys: ReadonlyArray<string>;
}): { title: string; body: string } {
  const title = "Finish your profile to appear in the deck";
  if (!input.hasPhoto || !input.hasBio) {
    return {
      title,
      body: "Members only see profiles with a photo and an about section. Yours is hidden until then.",
    };
  }
  if (input.missingRequiredKeys.length === 1) {
    const label = REQUIRED_FIELD_LABEL[input.missingRequiredKeys[0]] ?? "one required detail";
    return {
      title,
      body: `One required detail is missing (${label}), so your profile is not shown in the deck yet.`,
    };
  }
  return {
    title,
    body: "A few required details are missing, so your profile is not shown in the deck yet.",
  };
}

/**
 * Which profile-completion card (if any) should be live, given whether
 * the member is genuinely `isDiscoverEligible()` and how many steps are
 * left. This is the single decision point the 2026-09-08 prod bug fix
 * hinges on — keeping it here (pure, no React/profile-schema import)
 * means "eligible member never sees the blocking card" is locked by a
 * unit test rather than only provable by reading use-next-action.ts.
 *
 *   stepsLeft <= 0            -> null (nothing to show; fully done)
 *   stepsLeft > 0, eligible   -> "profile-finish" (soft, honest, evergreen)
 *   stepsLeft > 0, NOT eligible -> "profile-incomplete" (blocking, "hidden")
 */
export function pickProfileCompletionCard(input: {
  eligible: boolean;
  stepsLeft: number;
}): Extract<NextActionKind, "profile-incomplete" | "profile-finish"> | null {
  if (input.stepsLeft <= 0) return null;
  return input.eligible ? "profile-finish" : "profile-incomplete";
}

/**
 * Greeting copy for the signed-in home surface. "Welcome" is reserved
 * for the genuinely-hidden state (`profile-incomplete`) — every other
 * primary card, including the soft `profile-finish` nudge, greets a
 * member who has already met the app before with "Shalom". Fixed
 * 2026-09-08 alongside the profile-completion bug: this used to key off
 * `stepsLeft > 0` (via the old single "profile-incomplete" kind), which
 * flipped an eligible-but-incomplete member's greeting to "Welcome" too.
 */
export function greetingFor(primaryKind: NextActionKind | null): "Shalom" | "Welcome" {
  return primaryKind === "profile-incomplete" ? "Welcome" : "Shalom";
}

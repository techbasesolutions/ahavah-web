import type { Decision } from "@/lib/decision-engine";

/**
 * Marker state used by `/map` to drive avatar badge + ring styling.
 *
 * Priority (highest → lowest): `match` > `active-chat` > `liked` > `passed` > `none`.
 */
export type MarkerState = "match" | "active-chat" | "liked" | "passed" | "none";

export interface ResolveMarkerStateInput {
  candidate: { id: string };
  decisions: ReadonlyArray<Decision>;
  /**
   * Caller pre-computes via `simulateLikesBack(viewer, candidate)`. This
   * keeps the resolver free of decision-engine internals and trivially
   * unit-testable.
   *
   * Only meaningful when the viewer has recorded a `like` decision —
   * a match cannot exist without a viewer-side like AND mutual interest.
   */
  matched: boolean;
  /** Subject IDs the viewer has an active chat thread with. */
  activeChatIds: ReadonlySet<string>;
}

/**
 * Resolve the marker state for a single candidate on `/map`.
 *
 * Priority (per sub-plan 16 spec): `match` > `active-chat` > `liked` >
 * `passed` > `none`. Notably, `active-chat` beats both `liked` and
 * `passed` — a seeded chat thread surfaces in the UI even if the viewer
 * has previously passed on the subject (rare but possible in mock data).
 */
export function resolveMarkerState({
  candidate,
  decisions,
  matched,
  activeChatIds,
}: ResolveMarkerStateInput): MarkerState {
  const decision = decisions.find((d) => d.subjectId === candidate.id);
  const inChat = activeChatIds.has(candidate.id);
  const liked = decision?.action === "like";

  if (liked && matched) return "match";
  if (inChat) return "active-chat";
  if (liked) return "liked";
  if (decision?.action === "pass") return "passed";
  return "none";
}

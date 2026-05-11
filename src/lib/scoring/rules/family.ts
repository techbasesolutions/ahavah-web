import type { Profile } from "@/lib/profile-schema";

/**
 * Family-views compatibility score. This axis captures procreation intent,
 * which is foundational to long-term partnership viability in this audience.
 *
 * Set-overlap (Jaccard similarity) with a hard deal-breaker rule:
 * - If both sides undefined → 0.5 (neutral, unknown)
 * - If one side undefined → 0.4 (mild penalty for asymmetric information)
 * - Deal-breaker: one side has "does-not-want" AND the other has any of
 *   ["wants-children", "has-children", "open-to-more", "interested-large-family"] → 0.0
 * - Otherwise: Jaccard similarity on the overlap. If there's at least one shared
 *   view, add +0.1 bonus (capped at 1.0) to reward any common ground.
 */
export function scoreFamily(a: Profile, b: Profile): number {
  const aViews = a.familyViews ?? [];
  const bViews = b.familyViews ?? [];

  // Both undefined → neutral
  if (aViews.length === 0 && bViews.length === 0) {
    return 0.5;
  }

  // One undefined → mild penalty
  if (aViews.length === 0 || bViews.length === 0) {
    return 0.4;
  }

  // Deal-breaker: "does-not-want" vs. "wants/has/open-to/interested" conflict
  const aHasDoesNotWant = aViews.includes("does-not-want");
  const bHasDoesNotWant = bViews.includes("does-not-want");

  const aHasProCreationIntent = aViews.some((v) =>
    ["wants-children", "has-children", "open-to-more", "interested-large-family"].includes(v),
  );
  const bHasProCreationIntent = bViews.some((v) =>
    ["wants-children", "has-children", "open-to-more", "interested-large-family"].includes(v),
  );

  if ((aHasDoesNotWant && bHasProCreationIntent) || (bHasDoesNotWant && aHasProCreationIntent)) {
    return 0.0;
  }

  // Jaccard similarity
  const aSet = new Set(aViews);
  const bSet = new Set(bViews);
  const intersection = [...aSet].filter((x) => bSet.has(x));
  const unionSize = new Set([...aSet, ...bSet]).size;

  const base = unionSize === 0 ? 0 : intersection.length / unionSize;

  // Bonus for any overlap
  const bonus = intersection.length > 0 ? 0.1 : 0;
  return Math.min(base + bonus, 1.0);
}

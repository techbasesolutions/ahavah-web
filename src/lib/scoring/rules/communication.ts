import type { Profile } from "@/lib/profile-schema";

/**
 * Communication-preferences compatibility score. This axis captures rhythm
 * and medium preference, which shapes how couples navigate courtship and
 * relationship development.
 *
 * Set-overlap (Jaccard similarity) with a special rhythm-conflict case:
 * - If both sides undefined/empty → 0.5 (neutral, unknown)
 * - If one side undefined/empty → 0.4 (mild penalty for asymmetric information)
 * - Rhythm conflict: one has "frequent" and the other has "slow-paced-courtship"
 *   with NO other overlap → 0.2 (incompatible rhythms, hard to bridge)
 * - Otherwise: Jaccard similarity on the overlap. If there's at least one shared
 *   preference, add +0.1 bonus (capped at 1.0) to reward any common ground.
 */
export function scoreCommunication(a: Profile, b: Profile): number {
  const aPrefs = a.communicationPrefs ?? [];
  const bPrefs = b.communicationPrefs ?? [];

  // Both undefined/empty → neutral
  if (aPrefs.length === 0 && bPrefs.length === 0) {
    return 0.5;
  }

  // One undefined/empty → mild penalty
  if (aPrefs.length === 0 || bPrefs.length === 0) {
    return 0.4;
  }

  // Jaccard similarity
  const aSet = new Set(aPrefs);
  const bSet = new Set(bPrefs);
  const intersection = [...aSet].filter((x) => bSet.has(x));
  const unionSize = new Set([...aSet, ...bSet]).size;

  const base = unionSize === 0 ? 0 : intersection.length / unionSize;

  // Special case: rhythm conflict (frequent vs slow-paced-courtship)
  // Only applies if there's NO other overlap
  const aHasFrequent = aSet.has("frequent");
  const aHasSlow = aSet.has("slow-paced-courtship");
  const bHasFrequent = bSet.has("frequent");
  const bHasSlow = bSet.has("slow-paced-courtship");

  const rhythmConflict =
    (aHasFrequent && bHasSlow) || (aHasSlow && bHasFrequent);

  if (rhythmConflict && intersection.length === 0) {
    return 0.2;
  }

  // Bonus for any overlap
  const bonus = intersection.length > 0 ? 0.1 : 0;
  return Math.min(base + bonus, 1.0);
}

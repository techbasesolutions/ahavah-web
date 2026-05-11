import type { Profile } from "@/lib/profile-schema";

/**
 * Living preferences compatibility score. Lifestyle choices (urban, rural,
 * homestead, off-grid, community-living) signal compatibility in day-to-day
 * environment and values alignment.
 *
 * Rubric (Jaccard + bonus):
 *  - Both undefined/empty → 0.5 (neutral)
 *  - One undefined/empty → 0.4 (incomplete signal)
 *  - Otherwise: Jaccard |A ∩ B| / |A ∪ B| + 0.1 if intersection non-empty, capped at 1.0
 */
export function scoreLifestyle(a: Profile, b: Profile): number {
  const prefsA = a.livingPreferences ?? [];
  const prefsB = b.livingPreferences ?? [];

  // Both undefined or empty
  if (prefsA.length === 0 && prefsB.length === 0) {
    return 0.5;
  }

  // One undefined or empty
  if (prefsA.length === 0 || prefsB.length === 0) {
    return 0.4;
  }

  // Jaccard overlap + 0.1 bonus for any intersection
  const setA = new Set(prefsA);
  const setB = new Set(prefsB);

  const intersection = [...setA].filter((pref) => setB.has(pref)).length;
  const union = new Set([...setA, ...setB]).size;

  const base = union === 0 ? 0 : intersection / union;
  return Math.min(1.0, base + (intersection > 0 ? 0.1 : 0));
}

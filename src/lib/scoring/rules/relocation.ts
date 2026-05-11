import type { Profile } from "@/lib/profile-schema";

/**
 * Relocation compatibility score.
 *
 * A 4×4 semantic pairing of relocation stances:
 *  - will-relocate × will-relocate → 1.0
 *  - will-relocate × wants-partner-willing → 1.0 (perfect complement)
 *  - will-relocate × local-only → 0.8 (viewer is willing; candidate wants local)
 *  - will-relocate × international-open → 0.9
 *  - wants-partner-willing × wants-partner-willing → 0.5 (stalemate)
 *  - wants-partner-willing × local-only → 0.2 (both want to stay; conflict)
 *  - wants-partner-willing × international-open → 0.7
 *  - local-only × local-only → 1.0 IF same country, 0.0 IF different
 *  - local-only × international-open → 0.5
 *  - international-open × international-open → 1.0
 *  - Either side undefined → 0.5
 *
 * Symmetric: scoreRelocation(a, b) === scoreRelocation(b, a).
 */
export function scoreRelocation(a: Profile, b: Profile): number {
  const ra = a.relocation;
  const rb = b.relocation;

  if (!ra || !rb) return 0.5;

  // Special case: local-only × local-only depends on country match
  if (ra === "local-only" && rb === "local-only") {
    const ca = a.country;
    const cb = b.country;
    if (!ca || !cb) return 0.5; // Missing country → 0.5
    return ca === cb ? 1.0 : 0.0;
  }

  // Canonical pair key (sorted alphabetically for symmetry)
  const key = [ra, rb].sort().join("|");

  return PAIR_SCORES[key] ?? 0.5; // Default to 0.5 if not found
}

/**
 * Symmetric pairing scores for all non-identical relocation combos.
 * Keys are "stance1|stance2" sorted alphabetically.
 */
const PAIR_SCORES: Record<string, number> = {
  // will-relocate × will-relocate → 1.0
  "will-relocate|will-relocate": 1.0,

  // will-relocate × wants-partner-willing → 1.0 (perfect complement)
  "wants-partner-willing|will-relocate": 1.0,

  // will-relocate × local-only → 0.8 (viewer willing, candidate wants local)
  "local-only|will-relocate": 0.8,

  // will-relocate × international-open → 0.9
  "international-open|will-relocate": 0.9,

  // wants-partner-willing × wants-partner-willing → 0.5 (stalemate)
  "wants-partner-willing|wants-partner-willing": 0.5,

  // wants-partner-willing × local-only → 0.2 (both want to stay; conflict)
  "local-only|wants-partner-willing": 0.2,

  // wants-partner-willing × international-open → 0.7
  "international-open|wants-partner-willing": 0.7,

  // international-open × international-open → 1.0
  "international-open|international-open": 1.0,

  // local-only × international-open → 0.5
  "international-open|local-only": 0.5,
};

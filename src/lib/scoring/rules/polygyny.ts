import type { Profile, Polygyny } from "@/lib/profile-schema";

/**
 * Polygyny-alignment score. Polygyny is a theological stance that divides
 * the Torah-observant community. Compatibility requires alignment on whether
 * the relationship structure is compatible with biblical polygyny.
 *
 * Scoring table (4×4, indexed by both stances):
 *  - identical stance → 1.0 (both support same model)
 *  - supports × open → 0.8 (one wants, one's open to it)
 *  - supports × monogamy-only → 0.0 (irreconcilable)
 *  - supports × undecided → 0.5
 *  - open × open → 0.9 (both flexible)
 *  - open × monogamy-only → 0.4 (open could go monogamous)
 *  - open × undecided → 0.6
 *  - monogamy-only × monogamy-only → 1.0 (both want monogamy)
 *  - monogamy-only × undecided → 0.5
 *  - undecided × undecided → 0.7 (both open to conversation)
 *  - Either side undefined → 0.5 (unknown — neutral)
 *
 * Symmetric: scorePolygyny(a, b) === scorePolygyny(b, a)
 */
export function scorePolygyny(a: Profile, b: Profile): number {
  const pa = a.polygyny;
  const pb = b.polygyny;

  if (!pa || !pb) return 0.5;

  const key = keyOf(pa, pb);
  return PAIR_SCORES[key];
}

/**
 * Canonical key for the score table. Alphabetically sorts the two values
 * and joins with "|" for symmetric lookup.
 */
function keyOf(x: Polygyny, y: Polygyny): string {
  const pair = [x, y].sort();
  return `${pair[0]}|${pair[1]}`;
}

/**
 * Symmetric lookup table for all 4×4 stance pairs.
 * Keys are canonical order (alphabetically sorted, joined with "|").
 */
const PAIR_SCORES: Record<string, number> = {
  // identical stances
  "monogamy-only|monogamy-only": 1.0,
  "open|open": 0.9,
  "supports|supports": 1.0,
  "undecided|undecided": 0.7,

  // supports pairs
  "open|supports": 0.8,
  "monogamy-only|supports": 0.0,
  "supports|undecided": 0.5,

  // open pairs (excluding supports, which is above)
  "monogamy-only|open": 0.4,
  "open|undecided": 0.6,

  // monogamy-only pairs (excluding open and supports, which are above)
  "monogamy-only|undecided": 0.5,
};

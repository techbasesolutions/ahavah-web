import type { Profile, TorahLevel } from "@/lib/profile-schema";

/**
 * Torah-observance-level compatibility score. Matches profiles on their
 * commitment level along the Torah-observance ladder: learning, beginner,
 * intermediate, experienced. Proximity to the same rung correlates with
 * shared discipline, lifestyle alignment, and community fit.
 *
 *  - identical level → 1.0
 *  - adjacent rungs (e.g. learning↔beginner) → 0.8
 *  - two rungs apart (e.g. learning↔intermediate) → 0.5
 *  - extremes (learning↔experienced) → 0.2
 *  - either side undefined → 0.5 (unknown but not exclusionary)
 *
 * Symmetric by construction: |index(a) - index(b)| = |index(b) - index(a)|.
 */
export function scoreObservance(a: Profile, b: Profile): number {
  const levelA = a.torahLevel;
  const levelB = b.torahLevel;

  if (!levelA || !levelB) return 0.5;

  const rankA = RANK[levelA];
  const rankB = RANK[levelB];
  const distance = Math.abs(rankA - rankB);

  return PROXIMITY[distance];
}

const RANK: Record<TorahLevel, number> = {
  learning: 0,
  beginner: 1,
  intermediate: 2,
  experienced: 3,
};

const PROXIMITY: Record<number, number> = {
  0: 1.0, // same level
  1: 0.8, // adjacent
  2: 0.5, // two apart
  3: 0.2, // extremes
};

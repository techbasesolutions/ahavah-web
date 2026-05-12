import type { Profile } from "@/lib/profile-schema";
import { type Weights, BALANCED } from "@/lib/scoring/weights";

import { scoreCalendar } from "@/lib/scoring/rules/calendar";
import { scorePolygyny } from "@/lib/scoring/rules/polygyny";
import { scoreFamily } from "@/lib/scoring/rules/family";
import { scoreRelocation } from "@/lib/scoring/rules/relocation";
import { scoreLifestyle } from "@/lib/scoring/rules/lifestyle";
import { scoreCommunication } from "@/lib/scoring/rules/communication";
import { scoreObservance } from "@/lib/scoring/rules/observance";
import { scoreFeast } from "@/lib/scoring/rules/feast";
import { scoreLanguage } from "@/lib/scoring/rules/language";

/**
 * Per-axis breakdown of a compatibility computation. Each value is in
 * [0, 1] — its rule's raw score. The composite `score` is a weight-
 * normalized 0..100 integer for UI display.
 */
export type CompatibilityBreakdown = {
  calendar: number;
  polygyny: number;
  family: number;
  relocation: number;
  lifestyle: number;
  communication: number;
  observance: number;
  feast: number;
  language: number;
};

export type CompatibilityResult = {
  /** 0..100 integer for UI display. */
  score: number;
  /** Per-axis raw scores in [0, 1]. */
  breakdown: CompatibilityBreakdown;
};

/**
 * Composite compatibility score between two profiles. Pure function —
 * deterministic given inputs, no side effects. Weights default to
 * BALANCED; pass STRICT_DOCTRINAL or OPEN (or a custom Weights object)
 * to tune.
 *
 * Scoring contract:
 *   - Each rule returns [0, 1].
 *   - Composite = (Σ weight_i × score_i) / (Σ weight_i), then ×100 rounded.
 *   - Zero-weight axes are excluded from both the numerator and
 *     denominator (so users who don't care about an axis don't have
 *     its noise polluting the score).
 */
export function computeCompatibility(
  a: Profile,
  b: Profile,
  weights: Weights = BALANCED,
): CompatibilityResult {
  const breakdown: CompatibilityBreakdown = {
    calendar: scoreCalendar(a, b),
    polygyny: scorePolygyny(a, b),
    family: scoreFamily(a, b),
    relocation: scoreRelocation(a, b),
    lifestyle: scoreLifestyle(a, b),
    communication: scoreCommunication(a, b),
    observance: scoreObservance(a, b),
    feast: scoreFeast(a, b),
    language: scoreLanguage(a, b),
  };

  let weightedSum = 0;
  let weightTotal = 0;
  for (const axis of AXES) {
    const w = weights[axis];
    if (w <= 0) continue;
    const axisScore = breakdown[axis];
    // Defensive: any axis returning NaN (e.g. a rule with an edge case
    // that escapes its early-return guards) would poison the composite.
    // Skip non-finite axes so the score remains a finite percentage —
    // the user sees a real number, not "NaN%". Surfaced in SP21 T8
    // matches grid smoke walk with a minimal-data viewer.
    if (!Number.isFinite(axisScore)) continue;
    weightedSum += w * axisScore;
    weightTotal += w;
  }

  const normalized = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const score = Math.round(normalized * 100);
  return {
    score: Number.isFinite(score) ? score : 0,
    breakdown,
  };
}

const AXES: ReadonlyArray<keyof Weights> = [
  "calendar",
  "polygyny",
  "family",
  "relocation",
  "lifestyle",
  "communication",
  "observance",
  "feast",
  "language",
];

/**
 * Compatibility weights. Each axis contributes a 0..1 score from its
 * rule function; the weight controls how much that axis matters in the
 * final composite. Weights are normalized at compute time so the
 * final score is always in [0, 1] regardless of weight magnitudes.
 *
 * 9 axes per the 2026-05-11 product spec ("Advanced Compatibility
 * Scoring") + sub-plan 13 worldwide-search language axis:
 *   - calendar      — same/compatible calendar system
 *   - polygyny      — viewer + candidate polygyny stances align
 *   - family        — familyViews overlap (Jaccard-like)
 *   - relocation    — relocation openness pair compatibility
 *   - lifestyle     — livingPreferences overlap
 *   - communication — communicationPrefs overlap
 *   - observance    — torahLevel proximity
 *   - feast         — feastDays overlap (Jaccard-like)
 *   - language      — shared spoken languages (intersection / viewer size)
 */
export type Weights = {
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

/**
 * Balanced preset — every axis equally weighted. Good default for users
 * who haven't tuned their preferences.
 */
export const BALANCED: Weights = {
  calendar: 1,
  polygyny: 1,
  family: 1,
  relocation: 1,
  lifestyle: 1,
  communication: 1,
  observance: 1,
  feast: 1,
  language: 1,
};

/**
 * Strict-doctrinal preset — doctrine axes (calendar / polygyny /
 * observance / feast) weighted heavier than lifestyle / communication.
 * Use when faith alignment is the priority.
 */
export const STRICT_DOCTRINAL: Weights = {
  calendar: 3,
  polygyny: 3,
  family: 2,
  relocation: 1,
  lifestyle: 1,
  communication: 1,
  observance: 3,
  feast: 3,
  language: 1,
};

/**
 * Open preset — practical axes (relocation / lifestyle / communication /
 * family) weighted heavier than doctrine. Use when a wider faith net
 * is acceptable.
 */
// OPEN weights practical axes (lifestyle, communication, language) at 2x
// doctrine; the commit msg's 'equal weight' (45c69d9) refers to BALANCED
// and STRICT_DOCTRINAL across all 9 axes, not OPEN's intentional skew.
export const OPEN: Weights = {
  calendar: 1,
  polygyny: 1,
  family: 2,
  relocation: 2,
  lifestyle: 2,
  communication: 2,
  observance: 1,
  feast: 1,
  language: 2,
};

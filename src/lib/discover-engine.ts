import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  Calendar,
  Intent,
  HealthTag,
  EducationLevel,
} from "@/lib/profile-schema";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import type { Weights } from "@/lib/scoring/weights";

/**
 * A candidate is a Profile with an id field.
 */
export interface DiscoverCandidate extends Profile {
  id: string;
}

/**
 * Discover filters. Session-scoped — all selection is positive
 * ("show me candidates who match these"), no separate persistent
 * boundary-tag concept.
 *
 * Country filtering removed: the product spec is map-zoom-driven
 * (Bumpy-style) and needs profile.lat/lng + a map view that don't
 * exist yet. A fixed POPULAR_COUNTRIES pill list mismatches that
 * design; reintroducing location filtering belongs to the future
 * map-view feature.
 *
 * Feast-day filtering removed per the 2026-05-11 product call —
 * day-by-day overlap is too granular at the filter layer and
 * already feeds into compatibility scoring.
 */
export interface DiscoverFilters {
  ageMin?: number;
  ageMax?: number;
  assemblies?: readonly Assembly[];
  torahLevels?: readonly TorahLevel[];
  polygynyStances?: readonly Polygyny[];
  intents?: readonly Intent[];
  calendars?: readonly Calendar[];
  healthTags?: readonly HealthTag[];
  educations?: readonly EducationLevel[];
  verifiedOnly?: boolean;
}

/**
 * Apply discover filters to a candidate list. All filters are positive
 * gates with AND semantics — candidate must match every filter that is
 * set. Empty / undefined filters are ignored.
 *
 * Filter rules:
 * - ageMin/ageMax: candidate.age must be defined and within the range
 * - countries / assemblies / torahLevels / polygynyStances / intents /
 *   calendars: candidate field must be in the selected set
 * - feastDays: at least ONE overlap between filter and candidate's
 *   feastDays (multi-select overlap, not subset)
 * - healthTags: candidate.healthTags must include EVERY selected tag
 *   (AND semantics — picking "non-smoker" + "fitness" requires both)
 * - verifiedOnly: candidate must have at least one verificationTag
 */
export function applyHardFilters(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  filters?: DiscoverFilters,
): readonly DiscoverCandidate[] {
  if (!filters) return candidates;
  return candidates.filter((candidate) => passesAllFilters(candidate, filters));
}

function passesAllFilters(candidate: DiscoverCandidate, filters: DiscoverFilters): boolean {
  // Age range
  if (filters.ageMin !== undefined) {
    if (!candidate.age || candidate.age < filters.ageMin) return false;
  }
  if (filters.ageMax !== undefined) {
    if (!candidate.age || candidate.age > filters.ageMax) return false;
  }

  // Assemblies
  if (filters.assemblies && filters.assemblies.length > 0) {
    if (!candidate.assembly || !filters.assemblies.includes(candidate.assembly)) {
      return false;
    }
  }

  // Torah levels
  if (filters.torahLevels && filters.torahLevels.length > 0) {
    if (!candidate.torahLevel || !filters.torahLevels.includes(candidate.torahLevel)) {
      return false;
    }
  }

  // Polygyny stances
  if (filters.polygynyStances && filters.polygynyStances.length > 0) {
    if (!candidate.polygyny || !filters.polygynyStances.includes(candidate.polygyny)) {
      return false;
    }
  }

  // Intents
  if (filters.intents && filters.intents.length > 0) {
    if (!candidate.intent || !filters.intents.includes(candidate.intent)) {
      return false;
    }
  }

  // Calendars
  if (filters.calendars && filters.calendars.length > 0) {
    if (!candidate.calendar || !filters.calendars.includes(candidate.calendar)) {
      return false;
    }
  }

  // Health tags (candidate must have EVERY selected tag — AND semantics).
  // Empty selection means "no health filter applied".
  if (filters.healthTags && filters.healthTags.length > 0) {
    if (!candidate.healthTags || candidate.healthTags.length === 0) return false;
    const candidateTags = candidate.healthTags;
    const allPresent = filters.healthTags.every((tag) => candidateTags.includes(tag));
    if (!allPresent) return false;
  }

  // Educations
  if (filters.educations && filters.educations.length > 0) {
    if (!candidate.education || !filters.educations.includes(candidate.education)) {
      return false;
    }
  }

  // Verified only
  if (filters.verifiedOnly) {
    if (!candidate.verificationTags || candidate.verificationTags.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * A candidate plus its computed compatibility score against the viewer.
 * `score` is 0..100; `breakdown` is exposed for UI tooltips / pills.
 */
export type RankedCandidate = DiscoverCandidate & {
  compatScore: number;
};

/**
 * Rank candidates by compatibility (descending). Each candidate gets a
 * computeCompatibility() score against the viewer; ties preserve input
 * order via stable sort.
 */
export function rankCandidates(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  weights?: Weights,
): readonly RankedCandidate[] {
  const scored = candidates.map((c) => ({
    ...c,
    compatScore: computeCompatibility(viewer, c, weights).score,
  }));
  return scored.sort((a, b) => b.compatScore - a.compatScore);
}

/**
 * Build a discover deck: filter, then rank. Each item carries its
 * compatibility score for downstream UI.
 */
export function buildDiscoverDeck(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  filters?: DiscoverFilters,
  weights?: Weights,
): readonly RankedCandidate[] {
  const filtered = applyHardFilters(viewer, candidates, filters);
  return rankCandidates(viewer, filtered, weights);
}

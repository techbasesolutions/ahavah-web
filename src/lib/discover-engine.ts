import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  FeastDay,
  Calendar,
  Intent,
  HealthTag,
} from "@/lib/profile-schema";

/**
 * A candidate is a Profile with an id field.
 */
export interface DiscoverCandidate extends Profile {
  id: string;
}

/**
 * Discover filters. Session-scoped — all selection is positive
 * ("show me candidates who match these"), no separate persistent
 * boundary-tag concept. Per the 2026-05-11 consolidation: the 5 old
 * boundary tags collapse into filter rows here (monogamy-only →
 * polygynyStances, no-additional-spouses / serious-courtship-only →
 * intents, no-smokers → healthTags, no-long-distance → countries).
 */
export interface DiscoverFilters {
  ageMin?: number;
  ageMax?: number;
  countries?: readonly string[];
  assemblies?: readonly Assembly[];
  torahLevels?: readonly TorahLevel[];
  polygynyStances?: readonly Polygyny[];
  intents?: readonly Intent[];
  feastDays?: readonly FeastDay[];
  calendars?: readonly Calendar[];
  healthTags?: readonly HealthTag[];
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

  // Countries
  if (filters.countries && filters.countries.length > 0) {
    if (!candidate.country || !filters.countries.includes(candidate.country)) {
      return false;
    }
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

  // Feast days (at least ONE overlap required)
  if (filters.feastDays && filters.feastDays.length > 0) {
    if (!candidate.feastDays || candidate.feastDays.length === 0) return false;
    const hasOverlap = candidate.feastDays.some((day) =>
      filters.feastDays!.includes(day),
    );
    if (!hasOverlap) return false;
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

  // Verified only
  if (filters.verifiedOnly) {
    if (!candidate.verificationTags || candidate.verificationTags.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Rank candidates (identity stub for Sub-plan 4).
 * Sub-plan 5 will plug compute-compatibility here.
 */
export function rankCandidates(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
): readonly DiscoverCandidate[] {
  return candidates;
}

/**
 * Build a discover deck: filter, then rank.
 */
export function buildDiscoverDeck(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  filters?: DiscoverFilters,
): readonly DiscoverCandidate[] {
  const filtered = applyHardFilters(viewer, candidates, filters);
  return rankCandidates(viewer, filtered);
}

import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  FeastDay,
  Calendar,
  BoundaryTag,
} from "@/lib/profile-schema";

/**
 * A candidate is a Profile with an id field.
 */
export interface DiscoverCandidate extends Profile {
  id: string;
}

/**
 * Optional filters applied after boundary tag evaluation.
 */
export interface DiscoverFilters {
  ageMin?: number;
  ageMax?: number;
  countries?: readonly string[];
  assemblies?: readonly Assembly[];
  torahLevels?: readonly TorahLevel[];
  polygynyStances?: readonly Polygyny[];
  feastDays?: readonly FeastDay[];
  calendars?: readonly Calendar[];
  verifiedOnly?: boolean;
}

/**
 * Apply hard boundary tags, then optional discover filters.
 *
 * Boundary tags are evaluated in strict AND semantics:
 * - monogamy-only: excludes polygyny: "supports" and intent: "additional-wife"
 * - no-long-distance: excludes candidates not in viewer's country
 * - no-additional-spouses: excludes intent: "additional-wife"
 * - no-smokers: requires "non-smoker" in healthTags
 * - serious-courtship-only: requires intent: "courtship" or "marriage-only"
 *
 * Filters are applied after boundaries pass:
 * - ageMin/ageMax: both must be defined on candidate
 * - countries: candidate country must be in list
 * - assemblies/torahLevels/polygynyStances: candidate field in list
 * - feastDays: at least ONE overlap with candidate's feastDays
 * - calendars: candidate calendar in list
 * - verifiedOnly: requires non-empty verificationTags if true
 */
export function applyHardFilters(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  filters?: DiscoverFilters,
): readonly DiscoverCandidate[] {
  // Apply boundary tags
  const boundaryTags = viewer.boundaryTags ?? [];
  let filtered = candidates.filter((candidate) =>
    passesAllBoundaries(viewer, candidate, boundaryTags),
  );

  // Apply discover filters
  if (filters) {
    filtered = filtered.filter((candidate) => passesAllFilters(candidate, filters));
  }

  return filtered;
}

/**
 * Check if candidate passes all boundary tags (AND semantics).
 */
function passesAllBoundaries(
  viewer: Profile,
  candidate: DiscoverCandidate,
  boundaryTags: readonly BoundaryTag[],
): boolean {
  for (const tag of boundaryTags) {
    if (!passesBoundary(viewer, candidate, tag)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if candidate passes a single boundary tag.
 */
function passesBoundary(viewer: Profile, candidate: DiscoverCandidate, tag: BoundaryTag): boolean {
  switch (tag) {
    case "monogamy-only":
      // Exclude polygyny: "supports" and intent: "additional-wife"
      if (candidate.polygyny === "supports") return false;
      if (candidate.intent === "additional-wife") return false;
      return true;

    case "no-long-distance":
      // Exclude candidates not in viewer's country (strict: must have country)
      if (!viewer.country || !candidate.country) {
        return false;
      }
      return viewer.country === candidate.country;

    case "no-additional-spouses":
      // Exclude intent: "additional-wife"
      if (candidate.intent === "additional-wife") return false;
      return true;

    case "no-smokers":
      // Require "non-smoker" in healthTags (strict: must have healthTags)
      if (!candidate.healthTags || candidate.healthTags.length === 0) {
        return false;
      }
      return candidate.healthTags.includes("non-smoker");

    case "serious-courtship-only":
      // Require intent: "courtship" or "marriage-only"
      return candidate.intent === "courtship" || candidate.intent === "marriage-only";

    default:
      return true;
  }
}

/**
 * Check if candidate passes all discover filters (AND semantics).
 */
function passesAllFilters(candidate: DiscoverCandidate, filters: DiscoverFilters): boolean {
  // Age range
  if (filters.ageMin !== undefined) {
    if (!candidate.age || candidate.age < filters.ageMin) {
      return false;
    }
  }
  if (filters.ageMax !== undefined) {
    if (!candidate.age || candidate.age > filters.ageMax) {
      return false;
    }
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

  // Feast days (at least ONE overlap required)
  if (filters.feastDays && filters.feastDays.length > 0) {
    if (!candidate.feastDays || candidate.feastDays.length === 0) {
      return false;
    }
    const hasOverlap = candidate.feastDays.some((day) =>
      filters.feastDays!.includes(day),
    );
    if (!hasOverlap) {
      return false;
    }
  }

  // Calendars
  if (filters.calendars && filters.calendars.length > 0) {
    if (!candidate.calendar || !filters.calendars.includes(candidate.calendar)) {
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
 * Rank candidates (identity stub for Sub-plan 4).
 * Returns candidates in unchanged order.
 */
export function rankCandidates(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
): readonly DiscoverCandidate[] {
  return candidates;
}

/**
 * Build a discover deck: filter, then rank.
 * Composition of applyHardFilters and rankCandidates.
 */
export function buildDiscoverDeck(
  viewer: Profile,
  candidates: readonly DiscoverCandidate[],
  filters?: DiscoverFilters,
): readonly DiscoverCandidate[] {
  const filtered = applyHardFilters(viewer, candidates, filters);
  return rankCandidates(viewer, filtered);
}

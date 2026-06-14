import {
  type Profile,
  MINIMUM_COMPLETE_FIELDS,
} from "@/lib/profile-schema";

// Re-exported from wizard-flow so /discover and any other gate consumer
// reads the SAME route map the onboarding chrome uses. Avoids the drift
// that caused the country / languages / Reset-all class of bugs.
export { firstMissingStepFor } from "@/lib/wizard-flow";

export type CompletenessResult = {
  /** 0-100 — fraction of ALL schema fields populated. */
  percent: number;
  /** How many of the 10 minimum-required fields are filled. */
  requiredFilled: number;
  /** Total minimum-required fields (10 after sub-plan 18). */
  requiredTotal: number;
  /** True iff every minimum-required field is filled. */
  discoverEligible: boolean;
};

/**
 * Fields where a numeric `0` is a VALID complete answer ("I have zero of X").
 * For these, completeness uses an answered-check (undefined/null/empty only),
 * not a truthy-check. `children: 0` means "I have zero children" — a valid
 * answer; treating it as not-filled would loop the user back to the question
 * forever.
 */
const ZERO_ALLOWED_FIELDS: ReadonlySet<keyof Profile> = new Set<keyof Profile>([
  // No fields currently need numeric-zero treatment. Children went
  // away as a count when /onboarding/children switched to a binary
  // wants/does-not-want question; the Profile.children field is kept
  // only for legacy round-trip and is not part of completeness.
]);

/**
 * Field-level "answered" check (allows numeric 0).
 *   - undefined / null → not answered
 *   - empty string     → not answered
 *   - empty array      → not answered
 *   - empty object     → not answered
 *   - everything else  → answered (including 0)
 */
function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Field-level "filled" check.
 *   - undefined / null → not filled
 *   - empty string     → not filled
 *   - 0                → not filled (age=0 is invalid)
 *   - empty array      → not filled
 *   - empty object     → not filled
 *   - everything else  → filled
 */
function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Per-field completeness predicate. Uses `isAnswered` (0-allowed) for fields
 * in ZERO_ALLOWED_FIELDS (e.g. `children`); `isFilled` otherwise.
 */
function fieldComplete(profile: Profile, key: keyof Profile): boolean {
  const value = profile[key];
  return ZERO_ALLOWED_FIELDS.has(key) ? isAnswered(value) : isFilled(value);
}

// All Profile keys, hard-coded for deterministic %-complete. If the schema
// adds a field, add it here. (Could be derived via `keyof Profile` but
// TypeScript can't iterate type keys at runtime.)
const ALL_FIELDS: ReadonlyArray<keyof Profile> = [
  "firstName", "displayName", "age", "sex",
  "maritalStatus", "wantsChildren",
  "country", "stateOrProvince", "city",
  "nationality", "ethnicities", "languages",
  "occupation", "education", "bio",
  "intent",
  "assembly", "torahLevel", "shabbat", "feastDays", "calendar",
  "polygyny", "headCovering", "tzitzit",
  "familyViews", "livingPreferences", "healthTags",
  "interests", "personalityTraits",
  "relocation", "communicationPrefs",
  "verificationTags", "boundaryTags",
  "voiceIntroUrl", "promptCards",
];

export function computeCompleteness(profile: Profile): CompletenessResult {
  const requiredFilled = MINIMUM_COMPLETE_FIELDS.filter((k) =>
    fieldComplete(profile, k),
  ).length;

  const allFilled = ALL_FIELDS.filter((k) => fieldComplete(profile, k)).length;
  const percent = Math.round((allFilled / ALL_FIELDS.length) * 100);

  return {
    percent,
    requiredFilled,
    requiredTotal: MINIMUM_COMPLETE_FIELDS.length,
    discoverEligible: requiredFilled === MINIMUM_COMPLETE_FIELDS.length,
  };
}

export function isDiscoverEligible(profile: Profile): boolean {
  return computeCompleteness(profile).discoverEligible;
}

/** The required fields (in order) that are still empty. Drives the
 *  /profile/edit suggestion that names + jumps to the missing field. */
export function missingRequiredFields(
  profile: Profile,
): ReadonlyArray<keyof Profile> {
  return MINIMUM_COMPLETE_FIELDS.filter((k) => !fieldComplete(profile, k));
}

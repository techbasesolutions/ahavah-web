import {
  type Profile,
  MINIMUM_COMPLETE_FIELDS,
} from "@/lib/profile-schema";

export type CompletenessResult = {
  /** 0-100 — fraction of ALL schema fields populated. */
  percent: number;
  /** How many of the 6 minimum-required fields are filled. */
  requiredFilled: number;
  /** Total minimum-required fields (always 6 in v1). */
  requiredTotal: number;
  /** True iff every minimum-required field is filled. */
  discoverEligible: boolean;
};

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

// All Profile keys, hard-coded for deterministic %-complete. If the schema
// adds a field, add it here. (Could be derived via `keyof Profile` but
// TypeScript can't iterate type keys at runtime.)
const ALL_FIELDS: ReadonlyArray<keyof Profile> = [
  "firstName", "displayName", "age", "sex",
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
    isFilled(profile[k]),
  ).length;

  const allFilled = ALL_FIELDS.filter((k) => isFilled(profile[k])).length;
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

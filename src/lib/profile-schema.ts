/**
 * Ahavah profile schema — Torah-observant / Hebrew Israelite matchmaker.
 *
 * Every field below is OPTIONAL on the Profile aggregate (soft-completeness
 * model per 2026-05-11 product decision). The minimum-complete set is
 * defined by `MINIMUM_COMPLETE_FIELDS` so users can finish minimal
 * onboarding and complete the rest in /profile/edit.
 */

// Basic Identity ------------------------------------------------------------

export type Sex = "male" | "female";

export function isSex(value: unknown): value is Sex {
  return value === "male" || value === "female";
}

// Relationship Intent ------------------------------------------------------
// Gender-conditional intent: men and women see different options. We store
// both unions in the same field `Profile.intent` as a discriminated whole;
// the UI uses `intentOptionsForSex(sex)` to render the correct picker.

export type MaleIntent =
  | "first-wife"
  | "additional-wife"
  | "courtship"
  | "marriage-only"
  | "long-distance-courtship"
  | "local-only";

export type FemaleIntent =
  | "unmarried-man"
  | "married-man"
  | "courtship"
  | "marriage-only"
  | "open-to-relocation"
  | "local-only";

export type Intent = MaleIntent | FemaleIntent;

const MALE_INTENTS: ReadonlyArray<MaleIntent> = [
  "first-wife",
  "additional-wife",
  "courtship",
  "marriage-only",
  "long-distance-courtship",
  "local-only",
];

const FEMALE_INTENTS: ReadonlyArray<FemaleIntent> = [
  "unmarried-man",
  "married-man",
  "courtship",
  "marriage-only",
  "open-to-relocation",
  "local-only",
];

export function isMaleIntent(value: unknown): value is MaleIntent {
  return typeof value === "string" && (MALE_INTENTS as readonly string[]).includes(value);
}

export function isFemaleIntent(value: unknown): value is FemaleIntent {
  return typeof value === "string" && (FEMALE_INTENTS as readonly string[]).includes(value);
}

export type IntentOption = { value: Intent; label: string };

const MALE_INTENT_LABELS: ReadonlyArray<IntentOption> = [
  { value: "first-wife",              label: "First wife" },
  { value: "additional-wife",         label: "Additional wife" },
  { value: "courtship",               label: "Courtship" },
  { value: "marriage-only",           label: "Marriage only" },
  { value: "long-distance-courtship", label: "Long-distance courtship" },
  { value: "local-only",              label: "Local only" },
];

const FEMALE_INTENT_LABELS: ReadonlyArray<IntentOption> = [
  { value: "unmarried-man",      label: "Unmarried man" },
  { value: "married-man",        label: "Married man" },
  { value: "courtship",          label: "Courtship" },
  { value: "marriage-only",      label: "Marriage only" },
  { value: "open-to-relocation", label: "Open to relocation" },
  { value: "local-only",         label: "Local only" },
];

export function intentOptionsForSex(sex: Sex): ReadonlyArray<IntentOption> {
  return sex === "male" ? MALE_INTENT_LABELS : FEMALE_INTENT_LABELS;
}

// Faith cluster -----------------------------------------------------------

export type Assembly =
  | "messianic"
  | "torah-observant"
  | "hebrew-israelite"
  | "independent"
  | "christian-transitioning"
  | "non-denom-torah";

export type AssemblyOption = { value: Assembly; label: string };

export const ASSEMBLIES: ReadonlyArray<AssemblyOption> = [
  { value: "messianic",               label: "Messianic" },
  { value: "torah-observant",         label: "Torah observant" },
  { value: "hebrew-israelite",        label: "Hebrew Israelite" },
  { value: "independent",             label: "Independent fellowship" },
  { value: "christian-transitioning", label: "Christian transitioning into Torah observance" },
  { value: "non-denom-torah",         label: "Non-denominational Torah believer" },
];

export function isAssembly(value: unknown): value is Assembly {
  return typeof value === "string" && ASSEMBLIES.some((opt) => opt.value === value);
}

export type TorahLevel = "learning" | "beginner" | "intermediate" | "experienced";

export const TORAH_LEVELS: ReadonlyArray<{ value: TorahLevel; label: string }> = [
  { value: "learning",     label: "Learning" },
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced",  label: "Experienced" },
];

export function isTorahLevel(value: unknown): value is TorahLevel {
  return typeof value === "string" && TORAH_LEVELS.some((opt) => opt.value === value);
}

export type Shabbat =
  | "friday-sunset-saturday-sunset"
  | "luni-solar"
  | "saturday-only"
  | "other";

export const SHABBATS: ReadonlyArray<{ value: Shabbat; label: string }> = [
  { value: "friday-sunset-saturday-sunset", label: "Friday sunset to Saturday sunset" },
  { value: "luni-solar",                    label: "Luni-solar calendar" },
  { value: "saturday-only",                 label: "Saturday only" },
  { value: "other",                         label: "Other" },
];

export function isShabbat(value: unknown): value is Shabbat {
  return typeof value === "string" && SHABBATS.some((opt) => opt.value === value);
}

export type FeastDay =
  | "passover"
  | "unleavened-bread"
  | "first-fruits"
  | "shavuot"
  | "trumpets"
  | "yom-kippur"
  | "sukkot"
  | "hanukkah"
  | "purim";

export const FEAST_DAYS: ReadonlyArray<{ value: FeastDay; label: string }> = [
  { value: "passover",         label: "Passover" },
  { value: "unleavened-bread", label: "Unleavened Bread" },
  { value: "first-fruits",     label: "First Fruits" },
  { value: "shavuot",          label: "Shavuot" },
  { value: "trumpets",         label: "Trumpets" },
  { value: "yom-kippur",       label: "Yom Kippur" },
  { value: "sukkot",           label: "Sukkot" },
  { value: "hanukkah",         label: "Hanukkah" },
  { value: "purim",            label: "Purim" },
];

export function isFeastDay(value: unknown): value is FeastDay {
  return typeof value === "string" && FEAST_DAYS.some((opt) => opt.value === value);
}

export type Calendar =
  | "rabbinic"
  | "aviv-barley"
  | "enoch"
  | "luni-solar"
  | "observational-new-moon"
  | "other";

export const CALENDARS: ReadonlyArray<{ value: Calendar; label: string }> = [
  { value: "rabbinic",               label: "Rabbinic" },
  { value: "aviv-barley",            label: "Aviv barley" },
  { value: "enoch",                  label: "Enoch" },
  { value: "luni-solar",             label: "Luni-solar" },
  { value: "observational-new-moon", label: "Observational new moon" },
  { value: "other",                  label: "Other" },
];

export function isCalendar(value: unknown): value is Calendar {
  return typeof value === "string" && CALENDARS.some((opt) => opt.value === value);
}

// Doctrine cluster --------------------------------------------------------

export type Polygyny = "supports" | "open" | "monogamy-only" | "undecided";

export const POLYGYNY_VIEWS: ReadonlyArray<{ value: Polygyny; label: string }> = [
  { value: "supports",       label: "Supports biblical polygyny" },
  { value: "open",           label: "Open to it" },
  { value: "monogamy-only",  label: "Monogamy only" },
  { value: "undecided",      label: "Undecided" },
];

export function isPolygyny(value: unknown): value is Polygyny {
  return typeof value === "string" && POLYGYNY_VIEWS.some((opt) => opt.value === value);
}

export type HeadCovering = "required" | "encouraged" | "optional" | "not-practiced";

export const HEAD_COVERINGS: ReadonlyArray<{ value: HeadCovering; label: string }> = [
  { value: "required",      label: "Required" },
  { value: "encouraged",    label: "Encouraged" },
  { value: "optional",      label: "Optional" },
  { value: "not-practiced", label: "Not practiced" },
];

export function isHeadCovering(value: unknown): value is HeadCovering {
  return typeof value === "string" && HEAD_COVERINGS.some((opt) => opt.value === value);
}

export type Tzitzit = "regularly" | "occasionally" | "not-currently";

export const TZITZIT_OPTIONS: ReadonlyArray<{ value: Tzitzit; label: string }> = [
  { value: "regularly",     label: "Wears tzitzit regularly" },
  { value: "occasionally",  label: "Occasionally" },
  { value: "not-currently", label: "Not currently" },
];

export function isTzitzit(value: unknown): value is Tzitzit {
  return typeof value === "string" && TZITZIT_OPTIONS.some((opt) => opt.value === value);
}

// Lifestyle cluster (multi-select) ----------------------------------------

export type FamilyView =
  | "wants-children"
  | "has-children"
  | "open-to-more"
  | "does-not-want"
  | "open-blended"
  | "interested-large-family";

export const FAMILY_VIEWS: ReadonlyArray<{ value: FamilyView; label: string }> = [
  { value: "wants-children",          label: "Wants children" },
  { value: "has-children",            label: "Has children" },
  { value: "open-to-more",            label: "Open to more children" },
  { value: "does-not-want",           label: "Does not want children" },
  { value: "open-blended",            label: "Open to blended family" },
  { value: "interested-large-family", label: "Interested in large family" },
];

export function isFamilyView(value: unknown): value is FamilyView {
  return typeof value === "string" && FAMILY_VIEWS.some((opt) => opt.value === value);
}

export type LivingPreference =
  | "urban"
  | "rural"
  | "homestead"
  | "off-grid"
  | "community-living"
  | "open-to-relocation";

export const LIVING_PREFERENCES: ReadonlyArray<{ value: LivingPreference; label: string }> = [
  { value: "urban",              label: "Urban" },
  { value: "rural",              label: "Rural" },
  { value: "homestead",          label: "Homestead lifestyle" },
  { value: "off-grid",           label: "Off-grid interest" },
  { value: "community-living",   label: "Community living" },
  { value: "open-to-relocation", label: "Open to relocation" },
];

export function isLivingPreference(value: unknown): value is LivingPreference {
  return typeof value === "string" && LIVING_PREFERENCES.some((opt) => opt.value === value);
}

export type HealthTag =
  | "non-smoker"
  | "no-alcohol"
  | "moderate-alcohol"
  | "fitness"
  | "natural-health"
  | "herbalist"
  | "prepper";

export const HEALTH_TAGS: ReadonlyArray<{ value: HealthTag; label: string }> = [
  { value: "non-smoker",       label: "Non-smoker" },
  { value: "no-alcohol",       label: "No alcohol" },
  { value: "moderate-alcohol", label: "Moderate alcohol" },
  { value: "fitness",          label: "Fitness focused" },
  { value: "natural-health",   label: "Natural health focused" },
  { value: "herbalist",        label: "Herbalist interest" },
  { value: "prepper",          label: "Prepper / survival minded" },
];

export function isHealthTag(value: unknown): value is HealthTag {
  return typeof value === "string" && HEALTH_TAGS.some((opt) => opt.value === value);
}

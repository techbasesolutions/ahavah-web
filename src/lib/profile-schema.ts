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

export type TorahLevel = "learning" | "beginner" | "intermediate" | "experienced";

export const TORAH_LEVELS: ReadonlyArray<{ value: TorahLevel; label: string }> = [
  { value: "learning",     label: "Learning" },
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced",  label: "Experienced" },
];

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

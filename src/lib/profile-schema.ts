/**
 * Ahavah profile schema — Torah-observant / Hebrew Israelite matchmaker.
 *
 * Every field below is OPTIONAL on the Profile aggregate (soft-completeness
 * model per 2026-05-11 product decision). The minimum-complete set is
 * defined by `MINIMUM_COMPLETE_FIELDS` so users can finish minimal
 * onboarding and complete the rest in /profile/edit.
 */

import type { PhotoRecord } from "@/lib/photo-types";

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

// 2026-05-19: expanded from 6 -> 12 terms (PDF "self-identify as several
// things") and converted to MULTI-SELECT. The canonical list now lives in
// lib/identification.ts (IDENTIFICATION_TERMS); ASSEMBLIES re-exports it
// so existing consumers keep working. `assembly` is now an ARRAY on the
// profile. Pre-existing single-string values are normalised to a
// one-element array on read in use-profile.ts.
export type Assembly =
  | "messianic"
  | "torah-observant"
  | "hebrew-israelite"
  | "israelite"
  | "hebrew-roots"
  | "pronomian"
  | "natsarim"
  | "follower-of-the-way"
  | "jew"
  | "non-denom-torah"
  | "independent"
  | "christian-transitioning";

export type AssemblyOption = { value: Assembly; label: string };

export const ASSEMBLIES: ReadonlyArray<AssemblyOption> = [
  { value: "messianic",               label: "Messianic" },
  { value: "torah-observant",         label: "Torah observant" },
  { value: "hebrew-israelite",        label: "Hebrew Israelite" },
  { value: "israelite",               label: "Israelite" },
  { value: "hebrew-roots",            label: "Hebrew Roots" },
  { value: "pronomian",               label: "Pronomian" },
  { value: "natsarim",                label: "Natsarim" },
  { value: "follower-of-the-way",     label: "Follower of The Way" },
  { value: "jew",                     label: "Jew" },
  { value: "non-denom-torah",         label: "Non-denominational Torah believer" },
  { value: "independent",             label: "Independent fellowship" },
  { value: "christian-transitioning", label: "Christian transitioning into Torah observance" },
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

// Marital status (mandatory onboarding) ------------------------------------
// Single-select. Picker order leads with "Never Married" (largest cohort
// for a dating app — matches Bumpy convention).

export type MaritalStatus =
  | "never-married"
  | "married"
  | "re-married"
  | "divorced"
  | "widowed";

export const MARITAL_STATUSES: ReadonlyArray<{ value: MaritalStatus; label: string }> = [
  { value: "never-married", label: "Never Married" },
  { value: "married",       label: "Married" },
  { value: "re-married",    label: "Re-married" },
  { value: "divorced",      label: "Divorced" },
  { value: "widowed",       label: "Widowed" },
];

export function isMaritalStatus(value: unknown): value is MaritalStatus {
  return typeof value === "string" && MARITAL_STATUSES.some((opt) => opt.value === value);
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

// Ethnicity (multi-select) -----------------------------------------------

export type Ethnicity =
  | "afro-caribbean"
  | "afro-american"
  | "afro-latino"
  | "native-american"
  | "native-african"
  | "east-african"
  | "west-african"
  | "southern-african"
  | "european"
  | "mediterranean"
  | "eurasian"
  | "hispanic-latino"
  | "middle-eastern"
  | "south-asian"
  | "southeast-asian"
  | "mixed-heritage"
  | "other";

export const ETHNICITIES: ReadonlyArray<{ value: Ethnicity; label: string }> = [
  { value: "afro-caribbean",   label: "Afro-Caribbean" },
  { value: "afro-american",    label: "Afro-American" },
  { value: "afro-latino",      label: "Afro-Latino" },
  { value: "native-american",  label: "Native American" },
  { value: "native-african",   label: "Native African" },
  { value: "east-african",     label: "East African" },
  { value: "west-african",     label: "West African" },
  { value: "southern-african", label: "Southern African" },
  { value: "european",         label: "European" },
  { value: "mediterranean",    label: "Mediterranean" },
  { value: "eurasian",         label: "Eurasian" },
  { value: "hispanic-latino",  label: "Hispanic / Latino" },
  { value: "middle-eastern",   label: "Middle Eastern" },
  { value: "south-asian",      label: "South Asian" },
  { value: "southeast-asian",  label: "Southeast Asian" },
  { value: "mixed-heritage",   label: "Mixed Heritage" },
  { value: "other",            label: "Other" },
];

export function isEthnicity(value: unknown): value is Ethnicity {
  return typeof value === "string" && ETHNICITIES.some((opt) => opt.value === value);
}

// Nationality — comprehensive global list (~195 demonyms) -----------------
//
// Originally a hand-curated 20-entry Caribbean-biased union, which was
// too narrow for a global Torah-observant audience. Expanded 2026-05-15
// to the full set sourced from ISO 3166-1 with the standard demonym
// (people-from-country) form. The TypeScript type is now `string` since
// a 195-element string union has no real benefit over runtime
// validation via `isNationality()`.
//
// Stored on Profile.nationality as the kebab-case `value` (e.g.
// "south-african"); the renderer looks up the human label via
// `labelOf(value, NATIONALITIES)`.

export type Nationality = string;

export const NATIONALITIES: ReadonlyArray<{ value: Nationality; label: string }> = [
  { value: "afghan",                        label: "Afghan" },
  { value: "albanian",                      label: "Albanian" },
  { value: "algerian",                      label: "Algerian" },
  { value: "andorran",                      label: "Andorran" },
  { value: "angolan",                       label: "Angolan" },
  { value: "antiguan",                      label: "Antiguan" },
  { value: "argentine",                     label: "Argentine" },
  { value: "armenian",                      label: "Armenian" },
  { value: "australian",                    label: "Australian" },
  { value: "austrian",                      label: "Austrian" },
  { value: "azerbaijani",                   label: "Azerbaijani" },
  { value: "bahamian",                      label: "Bahamian" },
  { value: "bahraini",                      label: "Bahraini" },
  { value: "bangladeshi",                   label: "Bangladeshi" },
  { value: "barbadian",                     label: "Barbadian" },
  { value: "belarusian",                    label: "Belarusian" },
  { value: "belgian",                       label: "Belgian" },
  { value: "belizean",                      label: "Belizean" },
  { value: "beninese",                      label: "Beninese" },
  { value: "bhutanese",                     label: "Bhutanese" },
  { value: "bolivian",                      label: "Bolivian" },
  { value: "bosnian",                       label: "Bosnian" },
  { value: "botswanan",                     label: "Botswanan" },
  { value: "brazilian",                     label: "Brazilian" },
  { value: "british",                       label: "British" },
  { value: "bruneian",                      label: "Bruneian" },
  { value: "bulgarian",                     label: "Bulgarian" },
  { value: "burkinabe",                     label: "Burkinabé" },
  { value: "burmese",                       label: "Burmese" },
  { value: "burundian",                     label: "Burundian" },
  { value: "cambodian",                     label: "Cambodian" },
  { value: "cameroonian",                   label: "Cameroonian" },
  { value: "canadian",                      label: "Canadian" },
  { value: "cape-verdean",                  label: "Cape Verdean" },
  { value: "central-african",               label: "Central African" },
  { value: "chadian",                       label: "Chadian" },
  { value: "chilean",                       label: "Chilean" },
  { value: "chinese",                       label: "Chinese" },
  { value: "colombian",                     label: "Colombian" },
  { value: "comoran",                       label: "Comoran" },
  { value: "congolese",                     label: "Congolese" },
  { value: "costa-rican",                   label: "Costa Rican" },
  { value: "croatian",                      label: "Croatian" },
  { value: "cuban",                         label: "Cuban" },
  { value: "cypriot",                       label: "Cypriot" },
  { value: "czech",                         label: "Czech" },
  { value: "danish",                        label: "Danish" },
  { value: "djiboutian",                    label: "Djiboutian" },
  { value: "dominican",                     label: "Dominican" },
  { value: "dutch",                         label: "Dutch" },
  { value: "ecuadorian",                    label: "Ecuadorian" },
  { value: "egyptian",                      label: "Egyptian" },
  { value: "emirati",                       label: "Emirati" },
  { value: "english",                       label: "English" },
  { value: "equatoguinean",                 label: "Equatoguinean" },
  { value: "eritrean",                      label: "Eritrean" },
  { value: "estonian",                      label: "Estonian" },
  { value: "swazi",                         label: "Swazi" },
  { value: "ethiopian",                     label: "Ethiopian" },
  { value: "fijian",                        label: "Fijian" },
  { value: "filipino",                      label: "Filipino" },
  { value: "finnish",                       label: "Finnish" },
  { value: "french",                        label: "French" },
  { value: "gabonese",                      label: "Gabonese" },
  { value: "gambian",                       label: "Gambian" },
  { value: "georgian",                      label: "Georgian" },
  { value: "german",                        label: "German" },
  { value: "ghanaian",                      label: "Ghanaian" },
  { value: "greek",                         label: "Greek" },
  { value: "grenadian",                     label: "Grenadian" },
  { value: "guatemalan",                    label: "Guatemalan" },
  { value: "guinean",                       label: "Guinean" },
  { value: "guinea-bissauan",               label: "Guinea-Bissauan" },
  { value: "guyanese",                      label: "Guyanese" },
  { value: "haitian",                       label: "Haitian" },
  { value: "honduran",                      label: "Honduran" },
  { value: "hungarian",                     label: "Hungarian" },
  { value: "icelandic",                     label: "Icelandic" },
  { value: "indian",                        label: "Indian" },
  { value: "indonesian",                    label: "Indonesian" },
  { value: "iranian",                       label: "Iranian" },
  { value: "iraqi",                         label: "Iraqi" },
  { value: "irish",                         label: "Irish" },
  { value: "israeli",                       label: "Israeli" },
  { value: "italian",                       label: "Italian" },
  { value: "ivorian",                       label: "Ivorian" },
  { value: "jamaican",                      label: "Jamaican" },
  { value: "japanese",                      label: "Japanese" },
  { value: "jordanian",                     label: "Jordanian" },
  { value: "kazakhstani",                   label: "Kazakhstani" },
  { value: "kenyan",                        label: "Kenyan" },
  { value: "kiribati",                      label: "I-Kiribati" },
  { value: "north-korean",                  label: "North Korean" },
  { value: "south-korean",                  label: "South Korean" },
  { value: "kosovar",                       label: "Kosovar" },
  { value: "kuwaiti",                       label: "Kuwaiti" },
  { value: "kyrgyz",                        label: "Kyrgyz" },
  { value: "laotian",                       label: "Laotian" },
  { value: "latvian",                       label: "Latvian" },
  { value: "lebanese",                      label: "Lebanese" },
  { value: "basotho",                       label: "Basotho" },
  { value: "liberian",                      label: "Liberian" },
  { value: "libyan",                        label: "Libyan" },
  { value: "liechtensteiner",               label: "Liechtensteiner" },
  { value: "lithuanian",                    label: "Lithuanian" },
  { value: "luxembourgish",                 label: "Luxembourgish" },
  { value: "malagasy",                      label: "Malagasy" },
  { value: "malawian",                      label: "Malawian" },
  { value: "malaysian",                     label: "Malaysian" },
  { value: "maldivian",                     label: "Maldivian" },
  { value: "malian",                        label: "Malian" },
  { value: "maltese",                       label: "Maltese" },
  { value: "marshallese",                   label: "Marshallese" },
  { value: "mauritanian",                   label: "Mauritanian" },
  { value: "mauritian",                     label: "Mauritian" },
  { value: "mexican",                       label: "Mexican" },
  { value: "micronesian",                   label: "Micronesian" },
  { value: "moldovan",                      label: "Moldovan" },
  { value: "monacan",                       label: "Monégasque" },
  { value: "mongolian",                     label: "Mongolian" },
  { value: "montenegrin",                   label: "Montenegrin" },
  { value: "moroccan",                      label: "Moroccan" },
  { value: "mozambican",                    label: "Mozambican" },
  { value: "namibian",                      label: "Namibian" },
  { value: "nauruan",                       label: "Nauruan" },
  { value: "nepali",                        label: "Nepali" },
  { value: "new-zealander",                 label: "New Zealander" },
  { value: "nicaraguan",                    label: "Nicaraguan" },
  { value: "nigerien",                      label: "Nigerien" },
  { value: "nigerian",                      label: "Nigerian" },
  { value: "macedonian",                    label: "Macedonian" },
  { value: "northern-irish",                label: "Northern Irish" },
  { value: "norwegian",                     label: "Norwegian" },
  { value: "omani",                         label: "Omani" },
  { value: "pakistani",                     label: "Pakistani" },
  { value: "palauan",                       label: "Palauan" },
  { value: "palestinian",                   label: "Palestinian" },
  { value: "panamanian",                    label: "Panamanian" },
  { value: "papua-new-guinean",             label: "Papua New Guinean" },
  { value: "paraguayan",                    label: "Paraguayan" },
  { value: "peruvian",                      label: "Peruvian" },
  { value: "polish",                        label: "Polish" },
  { value: "portuguese",                    label: "Portuguese" },
  { value: "puerto-rican",                  label: "Puerto Rican" },
  { value: "qatari",                        label: "Qatari" },
  { value: "romanian",                      label: "Romanian" },
  { value: "russian",                       label: "Russian" },
  { value: "rwandan",                       label: "Rwandan" },
  { value: "kittitian-or-nevisian",         label: "Kittitian or Nevisian" },
  { value: "saint-lucian",                  label: "Saint Lucian" },
  { value: "vincentian",                    label: "Vincentian" },
  { value: "samoan",                        label: "Samoan" },
  { value: "sammarinese",                   label: "Sammarinese" },
  { value: "sao-tomean",                    label: "São Toméan" },
  { value: "saudi",                         label: "Saudi" },
  { value: "scottish",                      label: "Scottish" },
  { value: "senegalese",                    label: "Senegalese" },
  { value: "serbian",                       label: "Serbian" },
  { value: "seychellois",                   label: "Seychellois" },
  { value: "sierra-leonean",                label: "Sierra Leonean" },
  { value: "singaporean",                   label: "Singaporean" },
  { value: "slovak",                        label: "Slovak" },
  { value: "slovenian",                     label: "Slovenian" },
  { value: "solomon-islander",              label: "Solomon Islander" },
  { value: "somali",                        label: "Somali" },
  { value: "south-african",                 label: "South African" },
  { value: "south-sudanese",                label: "South Sudanese" },
  { value: "spanish",                       label: "Spanish" },
  { value: "sri-lankan",                    label: "Sri Lankan" },
  { value: "sudanese",                      label: "Sudanese" },
  { value: "surinamese",                    label: "Surinamese" },
  { value: "swedish",                       label: "Swedish" },
  { value: "swiss",                         label: "Swiss" },
  { value: "syrian",                        label: "Syrian" },
  { value: "taiwanese",                     label: "Taiwanese" },
  { value: "tajik",                         label: "Tajik" },
  { value: "tanzanian",                     label: "Tanzanian" },
  { value: "thai",                          label: "Thai" },
  { value: "timorese",                      label: "Timorese" },
  { value: "togolese",                      label: "Togolese" },
  { value: "tongan",                        label: "Tongan" },
  { value: "trinidadian",                   label: "Trinidadian" },
  { value: "tunisian",                      label: "Tunisian" },
  { value: "turkish",                       label: "Turkish" },
  { value: "turkmen",                       label: "Turkmen" },
  { value: "tuvaluan",                      label: "Tuvaluan" },
  { value: "ugandan",                       label: "Ugandan" },
  { value: "ukrainian",                     label: "Ukrainian" },
  { value: "uruguayan",                     label: "Uruguayan" },
  { value: "american",                      label: "American" },
  { value: "uzbek",                         label: "Uzbek" },
  { value: "ni-vanuatu",                    label: "Ni-Vanuatu" },
  { value: "vatican",                       label: "Vatican" },
  { value: "venezuelan",                    label: "Venezuelan" },
  { value: "vietnamese",                    label: "Vietnamese" },
  { value: "welsh",                         label: "Welsh" },
  { value: "yemeni",                        label: "Yemeni" },
  { value: "zambian",                       label: "Zambian" },
  { value: "zimbabwean",                    label: "Zimbabwean" },
  { value: "other",                         label: "Other" },
];

export function isNationality(value: unknown): value is Nationality {
  return typeof value === "string" && NATIONALITIES.some((opt) => opt.value === value);
}

// Interests (multi-select) ------------------------------------------------

export type Interest =
  | "scripture-study"
  | "hebrew-language"
  | "paleo-hebrew"
  | "homesteading"
  | "farming"
  | "gardening"
  | "health-wellness"
  | "fitness"
  | "business-entrepreneurship"
  | "modest-fashion"
  | "natural-hair"
  | "music-ministry"
  | "feast-gatherings"
  | "camping"
  | "hiking"
  | "travel"
  | "cooking"
  | "family-life"
  | "community-building"
  | "youth-mentorship"
  | "street-teaching"
  | "content-creation"
  | "apologetics"
  | "debate"
  | "history-research"
  | "ancient-cultures"
  | "prophecy-studies"
  | "survival-skills";

export const INTERESTS: ReadonlyArray<{ value: Interest; label: string }> = [
  { value: "scripture-study",          label: "Scripture Study" },
  { value: "hebrew-language",          label: "Hebrew Language" },
  { value: "paleo-hebrew",             label: "Paleo Hebrew" },
  { value: "homesteading",             label: "Homesteading" },
  { value: "farming",                  label: "Farming" },
  { value: "gardening",                label: "Gardening" },
  { value: "health-wellness",          label: "Health & Wellness" },
  { value: "fitness",                  label: "Fitness" },
  { value: "business-entrepreneurship", label: "Business / Entrepreneurship" },
  { value: "modest-fashion",           label: "Modest Fashion" },
  { value: "natural-hair",             label: "Natural Hair" },
  { value: "music-ministry",           label: "Music Ministry" },
  { value: "feast-gatherings",         label: "Feast Gatherings" },
  { value: "camping",                  label: "Camping" },
  { value: "hiking",                   label: "Hiking" },
  { value: "travel",                   label: "Travel" },
  { value: "cooking",                  label: "Cooking" },
  { value: "family-life",              label: "Family Life" },
  { value: "community-building",       label: "Community Building" },
  { value: "youth-mentorship",         label: "Youth Mentorship" },
  { value: "street-teaching",          label: "Street Teaching" },
  { value: "content-creation",         label: "Content Creation" },
  { value: "apologetics",              label: "Apologetics" },
  { value: "debate",                   label: "Debate" },
  { value: "history-research",         label: "History Research" },
  { value: "ancient-cultures",         label: "Ancient Cultures" },
  { value: "prophecy-studies",         label: "Prophecy Studies" },
  { value: "survival-skills",          label: "Survival Skills" },
];

export function isInterest(value: unknown): value is Interest {
  return typeof value === "string" && INTERESTS.some((opt) => opt.value === value);
}

// Personality traits (multi-select) ---------------------------------------

export type PersonalityTrait =
  | "introverted"
  | "extroverted"
  | "reserved"
  | "intellectual"
  | "traditional"
  | "humorous"
  | "adventurous"
  | "calm"
  | "assertive"
  | "leadership-oriented"
  | "nurturing"
  | "disciplined";

export const PERSONALITY_TRAITS: ReadonlyArray<{ value: PersonalityTrait; label: string }> = [
  { value: "introverted",          label: "Introverted" },
  { value: "extroverted",          label: "Extroverted" },
  { value: "reserved",             label: "Reserved" },
  { value: "intellectual",         label: "Intellectual" },
  { value: "traditional",          label: "Traditional" },
  { value: "humorous",             label: "Humorous" },
  { value: "adventurous",          label: "Adventurous" },
  { value: "calm",                 label: "Calm" },
  { value: "assertive",            label: "Assertive" },
  { value: "leadership-oriented",  label: "Leadership oriented" },
  { value: "nurturing",            label: "Nurturing" },
  { value: "disciplined",          label: "Disciplined" },
];

export function isPersonalityTrait(value: unknown): value is PersonalityTrait {
  return typeof value === "string" && PERSONALITY_TRAITS.some((opt) => opt.value === value);
}

// Relocation + Communication ----------------------------------------------

export type Relocation =
  | "will-relocate"
  | "wants-partner-willing"
  | "local-only"
  | "international-open";

export const RELOCATIONS: ReadonlyArray<{ value: Relocation; label: string }> = [
  { value: "will-relocate",         label: "Will relocate" },
  { value: "wants-partner-willing", label: "Wants partner willing to relocate" },
  { value: "local-only",            label: "Local only" },
  { value: "international-open",    label: "International open" },
];

export function isRelocation(value: unknown): value is Relocation {
  return typeof value === "string" && RELOCATIONS.some((opt) => opt.value === value);
}

export type CommunicationPref =
  | "frequent"
  | "slow-paced-courtship"
  | "video-calls"
  | "texting"
  | "in-person";

export const COMMUNICATION_PREFS: ReadonlyArray<{ value: CommunicationPref; label: string }> = [
  { value: "frequent",             label: "Frequent communication" },
  { value: "slow-paced-courtship", label: "Slow paced courtship" },
  { value: "video-calls",          label: "Video calls preferred" },
  { value: "texting",              label: "Texting preferred" },
  { value: "in-person",            label: "In-person preferred" },
];

export function isCommunicationPref(value: unknown): value is CommunicationPref {
  return typeof value === "string" && COMMUNICATION_PREFS.some((opt) => opt.value === value);
}

// Verification tags (set, not tier — combinable) ---------------------------

export type VerificationTag =
  | "government-id"
  | "assembly"
  | "community-references"
  | "video-selfie";

export const VERIFICATION_TAGS: ReadonlyArray<{ value: VerificationTag; label: string }> = [
  { value: "government-id",        label: "Government ID verified" },
  { value: "assembly",             label: "Assembly verified" },
  { value: "community-references", label: "Community references" },
  { value: "video-selfie",         label: "Video selfie verified" },
];

export function isVerificationTag(value: unknown): value is VerificationTag {
  return typeof value === "string" && VERIFICATION_TAGS.some((opt) => opt.value === value);
}

// Boundary tags (auto-apply hard filters in discovery) ----------------------
// Note: "monogamy-only" also appears in `Polygyny`. Intentional reuse — the
// Polygyny value is a doctrine stance; the BoundaryTag is a discovery filter
// the user opts into. They share a string but live in different fields.

export type BoundaryTag =
  | "monogamy-only"
  | "no-long-distance"
  | "no-additional-spouses"
  | "no-smokers"
  | "serious-courtship-only";

export const BOUNDARY_TAGS: ReadonlyArray<{ value: BoundaryTag; label: string }> = [
  { value: "monogamy-only",          label: "Monogamy only" },
  { value: "no-long-distance",       label: "No long distance" },
  { value: "no-additional-spouses",  label: "No additional spouses" },
  { value: "no-smokers",             label: "No smokers" },
  { value: "serious-courtship-only", label: "Serious courtship only" },
];

export function isBoundaryTag(value: unknown): value is BoundaryTag {
  return typeof value === "string" && BOUNDARY_TAGS.some((opt) => opt.value === value);
}

// Education level ---------------------------------------------------------

export type EducationLevel =
  | "primary"
  | "secondary"
  | "vocational"
  | "associates"
  | "bachelors"
  | "masters"
  | "doctorate"
  | "other";

export const EDUCATIONS: ReadonlyArray<{ value: EducationLevel; label: string }> = [
  { value: "primary",     label: "Primary School" },
  { value: "secondary",   label: "Secondary / High School" },
  { value: "vocational",  label: "Vocational / Trade" },
  { value: "associates",  label: "Associate's Degree" },
  { value: "bachelors",   label: "Bachelor's Degree" },
  { value: "masters",     label: "Master's Degree" },
  { value: "doctorate",   label: "Doctorate" },
  { value: "other",       label: "Other" },
];

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === "string" && EDUCATIONS.some((opt) => opt.value === value);
}

// Profile aggregate -------------------------------------------------------
// Every field optional per 2026-05-11 soft-completeness model.
// `MINIMUM_COMPLETE_FIELDS` is the soft-required set users must fill before
// /discover access (enforced by `computeCompleteness`).

export type Profile = {
  // Basic identity
  firstName?: string;
  displayName?: string;
  age?: number;
  /**
   * ISO date string (YYYY-MM-DD). Persisted alongside `age` so the
   * /onboardee-info translation layer can send the original date to
   * the backend's `date_of_birth` field — age alone loses too much
   * information to round-trip.
   */
  dob?: string;
  sex?: Sex;
  // Mandatory onboarding (sub-plan 18). `children` is an integer 0..20;
  // `children: 0` is a VALID complete answer — completeness uses an
  // undefined/null check, not a truthy check.
  maritalStatus?: MaritalStatus;
  children?: number;
  country?: string;        // 2-letter ISO from src/lib/countries.ts
  /**
   * Resolved "City, State, Country" string from /search-locations. The
   * backend's onboardee.coordinates lookup requires an exact match
   * against the location.long_friendly column, so we resolve and persist
   * the canonical string here when the user picks a country.
   */
  location?: string;
  stateOrProvince?: string;
  city?: string;
  nationality?: Nationality;
  ethnicities?: Ethnicity[];
  languages?: string[];    // language codes from /onboarding/languages
  // The user's primary spoken language (one of `languages`). Drives
  // the ★ prefix on the primary-language pill on /profile/[uuid] so
  // peers see which language the user prefers to be approached in.
  primaryLanguage?: string;
  occupation?: string;
  education?: EducationLevel;
  bio?: string;            // also called "Testimony" in copy for this audience
  // Up to 7 PhotoRecord entries (backend MAX_PHOTO_POSITION = 7). Each
  // record carries a CDN URL (450px variant), position, moderation state,
  // and the raw nsfw_score where available. Consumer surfaces (map-avatar,
  // discover, profile-detail) render record.cdn_url directly; the photo
  // pipeline lives in `photo-storage.ts`.
  photos?: PhotoRecord[];
  // Relationship intent (gender-conditional)
  intent?: Intent;
  // Faith cluster. assembly is MULTI-SELECT as of 2026-05-19 (a believer
  // self-identifies as several terms). Stored inside the ahavah_extra
  // JSONB blob; pre-existing single-string values are normalised to a
  // one-element array on read (see use-profile.ts normalizeProfile).
  assembly?: Assembly[];
  torahLevel?: TorahLevel;
  shabbat?: Shabbat;
  feastDays?: FeastDay[];
  calendar?: Calendar;
  // Doctrine cluster
  polygyny?: Polygyny;
  headCovering?: HeadCovering;
  tzitzit?: Tzitzit;
  // Lifestyle cluster
  familyViews?: FamilyView[];
  livingPreferences?: LivingPreference[];
  healthTags?: HealthTag[];
  // Interests + personality
  interests?: Interest[];
  personalityTraits?: PersonalityTrait[];
  // Practical compatibility
  relocation?: Relocation;
  communicationPrefs?: CommunicationPref[];
  // Verification + boundaries
  verificationTags?: VerificationTag[];
  boundaryTags?: BoundaryTag[];
  // Voice intro + prompt cards (placeholders — sub-plans 3 + 6)
  voiceIntroUrl?: string;
  promptCards?: Array<{ promptId: string; answer: string }>;
  // Map visibility (sub-plan 14 / T7) — soft default `true` at consumer
  // level. When false, the profile is filtered out of the /map view.
  showOnMap?: boolean;
  // Phase W cutover (2026-05-15) — "Require my matches to be verified".
  // Drives the /search verified_only filter as a sticky setting (lives
  // on /settings/privacy, persists per-account). Free for any user.
  requireVerifiedMatches?: boolean;
  // Phase W premium (Stripe Checkout, 2026-05-15). `entitlements` is the
  // canonical source of truth for paywall gates — `'premium'` ∈ array
  // grants access to /matches "Liked you" content + advanced filters.
  // `subscriptionExpiresAt` is the auto-revoke timestamp (ISO 8601 UTC).
  // `stripeCustomerId` (presence-only) gates visibility of the
  // "Manage subscription" CTA — only users who've ever subscribed
  // have one, and /billing-portal 400s without it.
  entitlements?: ReadonlyArray<string>;
  subscriptionExpiresAt?: string;
  stripeCustomerId?: string;
  // Phase W cutover soft-delete grace (2026-05-15). When set, the
  // user is mid-7-day grace window — UI surfaces a banner + Cancel
  // button that calls /account/cancel-deletion. NULL/undefined for
  // active accounts.
  deletionRequestedAt?: string;
  // Operator roles (TEXT[] on backend person.roles). Read-only on the
  // client — gates visibility of /admin/* surfaces. Empty array for
  // ordinary users; ['admin'] or ['mod'] (or both) for operators.
  roles?: ReadonlyArray<string>;
};

/** Pure admin/mod gate. Reads only from `roles` (the backend's
 *  person.roles TEXT[]). Returns false for null/undefined inputs so
 *  the caller can liberally pass `Profile | undefined`. */
export function isAdminOrMod(profile: Pick<Profile, "roles"> | null | undefined): boolean {
  if (!profile?.roles) return false;
  return profile.roles.includes("admin") || profile.roles.includes("mod");
}

/** Pure paywall-gate predicate. Reads only from the entitlements array
 *  (not the upstream `has_gold` boolean — that's a separate Duolicious
 *  concept tied to the verification ladder, not the Stripe paywall).
 *  Returns false for null / undefined / missing-key inputs so caller
 *  can be liberal with the `Profile | undefined | null` it passes. */
export function isPremium(profile: Pick<Profile, "entitlements"> | null | undefined): boolean {
  if (!profile?.entitlements) return false;
  return profile.entitlements.includes("premium");
}

/**
 * Soft-required field names. Users can finish minimal onboarding by filling
 * these, then complete the rest in /profile/edit. `computeCompleteness`
 * checks profile completion against this list for the "discover-eligible"
 * gate; the full ~30-field completion drives the visual "X% complete" badge.
 *
 * Sourced from the 2026-05-11 product spec — asterisked fields in the
 * Torah-observant matchmaker profile structure. `verificationTags` being
 * present in this list means at least ONE verification tag must be set
 * (isFilled treats empty arrays as not-filled).
 */
export const MINIMUM_COMPLETE_FIELDS: ReadonlyArray<keyof Profile> = [
  "firstName",
  "age",
  "sex",
  "maritalStatus",
  "children",
  "country",
  "intent",
  "assembly",
  "relocation",
  // verificationTags intentionally excluded — /onboarding/verification is
  // a "Skip for now" step (CTA defaults to skip; the page never forces a
  // tier choice). Listing it as required while no wizard step writes it
  // strands users on /discover with a permanent "Redirecting…" message
  // because firstMissingStepFor returns null. Verification status is a
  // post-onboarding nudge, not a discover prerequisite.
];

export function emptyProfile(): Profile {
  return {};
}

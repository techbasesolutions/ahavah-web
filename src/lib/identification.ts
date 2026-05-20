/**
 * Self-identification terms for Messianic Torah-observant believers.
 * Per user direction 2026-05-19 (Changes PDF), these are the labels users
 * self-identify with. Multi-select on the profile (a user can be both
 * "Messianic" and "Pronomian", for example). NOT mutually exclusive.
 *
 * The list is the canonical source; do not duplicate inline at consumer
 * sites. Filters / profile display / onboarding all read from here.
 */

export const IDENTIFICATION_TERMS = [
  { value: "israelite",            label: "Israelite" },
  { value: "hebrew-israelite",     label: "Hebrew Israelite" },
  { value: "messianic",            label: "Messianic" },
  { value: "pronomian",            label: "Pronomian" },
  { value: "hebrew-roots",         label: "Hebrew Roots" },
  { value: "follower-of-the-way",  label: "Follower of The Way" },
  { value: "natsarim",             label: "Natsarim" },
  { value: "jew",                  label: "Jew" },
] as const;

export type IdentificationValue =
  (typeof IDENTIFICATION_TERMS)[number]["value"];

/** Lookup helper for rendering labels from stored values. */
export function identificationLabel(value: IdentificationValue): string {
  const found = IDENTIFICATION_TERMS.find((t) => t.value === value);
  return found?.label ?? value;
}

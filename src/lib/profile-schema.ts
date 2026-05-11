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

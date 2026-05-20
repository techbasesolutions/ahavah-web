/**
 * Self-identification terms for Messianic Torah-observant believers.
 * Per user direction 2026-05-19 (Changes PDF), believers self-identify
 * with several of these labels — the profile field is MULTI-SELECT.
 *
 * The canonical list + type live in `profile-schema.ts` (ASSEMBLIES /
 * Assembly) because that file owns the whole profile schema. This module
 * re-exports them under friendlier names so call sites can read
 * `IDENTIFICATION_TERMS` / `IdentificationValue` without coupling to the
 * legacy "assembly" naming.
 */

import { ASSEMBLIES, type Assembly, type AssemblyOption } from "./profile-schema";

export const IDENTIFICATION_TERMS = ASSEMBLIES;
export type IdentificationValue = Assembly;
export type IdentificationOption = AssemblyOption;

/** Lookup helper for rendering a label from a stored value. */
export function identificationLabel(value: IdentificationValue): string {
  const found = IDENTIFICATION_TERMS.find((t) => t.value === value);
  return found?.label ?? value;
}

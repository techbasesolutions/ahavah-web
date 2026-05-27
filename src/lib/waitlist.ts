/**
 * Waitlist capture — answers model + option re-exports + POST client.
 *
 * The answers shape mirrors the onboarding profile fields so a magic-link
 * launch flow can prefill onboarding from a waitlist row. Option lists are
 * re-exported from the canonical schema modules (never hardcoded here).
 */

import { apiClient } from "@/lib/api-client";
import {
  ASSEMBLIES,
  intentOptionsForSex,
  FAMILY_VIEWS,
  ETHNICITIES,
  NATIONALITIES,
  type Sex,
  type Assembly,
  type Intent,
  type FamilyView,
  type Ethnicity,
  type Nationality,
} from "@/lib/profile-schema";
import { ALL_COUNTRIES } from "@/lib/countries";

export const REFERRAL_SOURCES = [
  { value: "friend-family", label: "Friend or family" },
  { value: "social", label: "Social media" },
  { value: "search", label: "Search" },
  { value: "assembly", label: "Assembly or congregation" },
  { value: "other", label: "Other" },
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["value"];

export type WaitlistAnswers = {
  sex?: Sex;
  country?: string; // ISO cc
  region?: string; // state / province free text
  assembly?: Assembly[]; // self-identification (multi)
  intent?: Intent[]; // looking for (multi, gender-conditional)
  relocate_willing?: boolean;
  family?: FamilyView; // children
  ethnicity?: Ethnicity;
  nationality?: Nationality;
  referral_source?: ReferralSource;
  referral_other?: string;
};

export {
  ASSEMBLIES,
  intentOptionsForSex,
  FAMILY_VIEWS,
  ETHNICITIES,
  NATIONALITIES,
  ALL_COUNTRIES,
};

export async function postWaitlist(email: string, answers: WaitlistAnswers = {}) {
  // isNew=false → this email was already on the waitlist (returning registrant).
  return apiClient.post<{ ok: boolean; isNew?: boolean }>("/waitlist", { email, answers });
}

export async function getWaitlistCount(): Promise<{ count: number }> {
  return apiClient.get<{ count: number }>("/waitlist/count");
}

/** Read-only check: is this email already on the waitlist? Used to short-circuit
 *  a returning registrant at the onboarding email step (no write). */
export async function checkWaitlist(email: string) {
  return apiClient.post<{ exists: boolean }>("/waitlist/check", { email });
}

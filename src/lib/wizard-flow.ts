import type { Profile } from "@/lib/profile-schema";

/**
 * Canonical wizard step order. Adding/removing a step here cascades to
 * every consumer:
 *   - OnboardingShell reads positionOf(currentHref).{step, totalSteps,
 *     back, next} for its chrome
 *   - /discover gate calls firstMissingStepFor(profile) for redirects
 *   - /profile/edit field components can look up the wizard step
 *     associated with a field via routeForField
 *
 * `requiredField` (when set) is the Profile key whose absence routes the
 * /discover gate here. Steps without a requiredField are wizard-only.
 */
export type WizardStep = {
  href: string;
  label: string;
  requiredField?: keyof Profile;
};

export const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  { href: "/onboarding/verify-email",   label: "Verify email" },
  { href: "/onboarding/verify-phone",   label: "Verify phone" },
  { href: "/onboarding/name",           label: "Name",           requiredField: "firstName" },
  { href: "/onboarding/dob",            label: "Date of birth",  requiredField: "age" },
  { href: "/onboarding/gender",         label: "Gender",         requiredField: "sex" },
  { href: "/onboarding/looking-for",    label: "Looking for",    requiredField: "intent" },
  { href: "/onboarding/photos",         label: "Photos" },
  { href: "/onboarding/country",        label: "Country",        requiredField: "country" },
  { href: "/onboarding/languages",      label: "Languages" },
  { href: "/onboarding/bio",            label: "Bio" },
  { href: "/onboarding/polygyny",       label: "Polygyny" },
  { href: "/onboarding/assembly",       label: "Assembly",       requiredField: "assembly" },
  { href: "/onboarding/relocation",     label: "Relocation",     requiredField: "relocation" },
  { href: "/onboarding/verification",   label: "Verification",   requiredField: "verificationTags" },
];

const TOTAL = WIZARD_STEPS.length;

const indexOf = (href: string): number =>
  WIZARD_STEPS.findIndex((s) => s.href === href);

export type WizardPosition = {
  /** 1-indexed step number (1..totalSteps), or 0 if href is not in the wizard. */
  step: number;
  totalSteps: number;
  back: string | null;
  next: string | null;
};

export function positionOf(href: string): WizardPosition {
  const i = indexOf(href);
  if (i < 0) {
    return { step: 0, totalSteps: TOTAL, back: null, next: null };
  }
  return {
    step: i + 1,
    totalSteps: TOTAL,
    back: i > 0 ? WIZARD_STEPS[i - 1].href : null,
    next: i < TOTAL - 1 ? WIZARD_STEPS[i + 1].href : null,
  };
}

export function nextOf(href: string): string | null {
  return positionOf(href).next;
}

export function backOf(href: string): string | null {
  return positionOf(href).back;
}

/**
 * Field → wizard route lookup. Derived from the requiredField annotations
 * on WIZARD_STEPS so adding a new required field to the wizard
 * automatically wires up the gate redirect.
 */
const FIELD_TO_HREF: ReadonlyMap<keyof Profile, string> = new Map(
  WIZARD_STEPS.flatMap((s) =>
    s.requiredField ? [[s.requiredField, s.href] as const] : [],
  ),
);

/** Public field → route lookup (returns null for fields without a wizard step). */
export function routeForField(field: keyof Profile): string | null {
  return FIELD_TO_HREF.get(field) ?? null;
}

const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

/**
 * Walks WIZARD_STEPS in canonical order and returns the href of the
 * first step whose requiredField is empty on the profile. Returns null
 * when every required field is filled.
 */
export function firstMissingStepFor(profile: Profile): string | null {
  for (const step of WIZARD_STEPS) {
    if (!step.requiredField) continue;
    if (!isFilled(profile[step.requiredField])) {
      return step.href;
    }
  }
  return null;
}

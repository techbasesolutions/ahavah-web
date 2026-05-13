/**
 * Onboarded-flag helpers extracted from use-profile so non-hook modules
 * (photo-storage, future REST callers) can route to /onboardee-info vs
 * /profile-info without importing React.
 *
 * Backend enforces this distinction via `expected_onboarding_status`
 * decorator (service/api/decorators.py:223-292). Calling the wrong
 * endpoint returns 400/401.
 */

import { ONBOARDED_KEY } from "@/lib/storage-keys";

export function readOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOnboarded(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function clearOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns the right endpoint path for profile mutations during the
 * current session — /onboardee-info while onboarding, /profile-info
 * after /finish-onboarding.
 */
export function profileEndpoint(): "/onboardee-info" | "/profile-info" {
  return readOnboarded() ? "/profile-info" : "/onboardee-info";
}

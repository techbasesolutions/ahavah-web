/**
 * Referral-code client helpers.
 *
 * The code arrives via /i/[code] which sets a 90-day `ahavah.ref` cookie
 * AND mirrors it to localStorage on mount (cookie for SSR / first-render
 * routing, localStorage for the long-lived stash that survives tab close).
 *
 * Read paths: postWaitlist / registerBetaTester / requestEmailOtp.
 * Clear paths: after a successful attribute() — the backend's INSERT-
 * ON-CONFLICT-DO-NOTHING semantics make re-attribution a no-op, but
 * clearing avoids the FE re-sending a code that's already been used.
 */
import { REFERRAL_CODE_KEY } from "@/lib/storage-keys";

const CROCKFORD_BASE32 = /^[0-9A-HJ-NP-TV-Z]{7}$/;

function isWellFormed(code: string | null | undefined): code is string {
  return !!code && CROCKFORD_BASE32.test(code);
}

export function readReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(REFERRAL_CODE_KEY);
    return isWellFormed(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  if (!isWellFormed(code)) return;
  try {
    window.localStorage.setItem(REFERRAL_CODE_KEY, code);
  } catch {
    // private mode / quota / disabled storage — silently skip
  }
}

export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REFERRAL_CODE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Canonical localStorage / sessionStorage key constants.
 *
 * Post-Phase W, localStorage is a CACHE only; the backend is the source of
 * truth for profile, decisions, etc. These keys exist so the UI can paint
 * synchronously on first load before the server fetch resolves, and so the
 * three magic-string keys that used to be scattered across the codebase
 * have one home.
 *
 * Convention: `ahavah.<noun>.v<version>` for persistent caches; bare slug
 * for short-lived session data.
 */

/** Cached current-user profile (server is source of truth). */
export const PROFILE_CACHE_KEY = "ahavah.profile.v1";

/** Cached swipe decisions (server is source of truth post-Phase W). */
export const DECISIONS_CACHE_KEY = "ahavah.decisions.v1";

/** Persisted FiltersSheet state. */
export const FILTERS_CACHE_KEY = "ahavah.filters.v1";

/** Bridges /auth/sign-{up,in} -> /onboarding/verify-email. sessionStorage. */
export const PENDING_EMAIL_KEY = "ahavah.pending-email";

/**
 * Stashes the `?next=` URL captured at /auth/sign-in mount so that the
 * eventual post-OTP redirect (in /onboarding/verify-email) can land the
 * user back at the route they were trying to reach (e.g. /help, /legal/*).
 * sessionStorage.
 */
export const AUTH_NEXT_URL_KEY = "ahavah.auth.next";

/**
 * Tracks whether the current authenticated user has completed onboarding.
 * Written from /check-otp's response. Used by useProfile to route PATCHes
 * to /onboardee-info (not yet onboarded) vs /profile-info (onboarded).
 * "1" = onboarded, "0" or missing = onboardee.
 */
export const ONBOARDED_KEY = "ahavah.onboarded";

/** /map first-mount flag (SP17 sessionStorage gate). */
export const MAP_FIRST_MOUNT_KEY = "ahavah.map-first-mount";

/**
 * Referral code captured by /i/[code]. Persisted in localStorage so it
 * survives the multi-step landing → /waitlist → /beta-tester flow, and
 * survives tab close (people often click links and come back later).
 * 90-day TTL enforced by the cookie set on the same route — localStorage
 * itself has no TTL, but the cookie's expiry implicitly invalidates.
 */
export const REFERRAL_CODE_KEY = "ahavah.ref";

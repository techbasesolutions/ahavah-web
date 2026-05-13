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

/** /map first-mount flag (SP17 sessionStorage gate). */
export const MAP_FIRST_MOUNT_KEY = "ahavah.map-first-mount";

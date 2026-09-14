/**
 * Spotlight-ref cookie helpers.
 *
 * `/s/[key]` sets a 7-day `ahavah.spotlight_ref` cookie on the click-
 * through redirect (see src/app/s/[key]/route.ts). finishOnboarding
 * (use-profile.ts) reads it straight off document.cookie — no
 * localStorage mirror needed, since onboarding always continues on the
 * same site the cookie was set on — and sends it as spotlight_ref on the
 * finish-onboarding POST, then clears it once that POST succeeds so a
 * later graduation never re-sends a stale ref.
 */

export const SPOTLIGHT_REF_COOKIE = "ahavah.spotlight_ref";

// Matches the API's campaign_link.key charset (secrets.token_urlsafe)
// and the finish-onboarding request model's max_length=32.
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function readSpotlightRef(): string | null {
  if (typeof document === "undefined") return null;
  try {
    for (const pair of document.cookie.split(";")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      if (name !== SPOTLIGHT_REF_COOKIE) continue;
      const value = decodeURIComponent(pair.slice(eq + 1).trim());
      return KEY_PATTERN.test(value) ? value : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSpotlightRef(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${SPOTLIGHT_REF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

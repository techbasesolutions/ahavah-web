/**
 * Meta Pixel helpers. The base snippet in app/layout.tsx loads fbevents.js
 * and auto-fires PageView; this module is the typed surface for standard
 * events fired from client components.
 *
 * Every helper must no-op (never throw) when NEXT_PUBLIC_META_PIXEL_ID is
 * unset (local dev / preview builds) or when fbevents.js didn't load --
 * ad blockers strip it for a meaningful share of users.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/**
 * CompleteRegistration -- fired once per user, on fresh onboarding
 * graduation (onboarding/complete). The eventID parameter dedupes this
 * browser event against the Conversions API copy the backend will send
 * for the same registration (phase 2 of docs/meta-pixel-plan.md).
 */
export function pixelCompleteRegistration(eventId: string): void {
  if (!META_PIXEL_ID) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
}

/**
 * /i/[code] — referral-link landing.
 *
 * Validates the Crockford-base32 7-char code, sets a 90-day `ahavah.ref`
 * cookie (so SSR sees it on the destination route), and redirects to:
 *   - /waitlist   when NEXT_PUBLIC_PRELAUNCH != "false" (current pre-launch posture)
 *   - /auth/sign-up otherwise
 *
 * The same cookie value is mirrored to localStorage by a tiny mount-time
 * effect on /waitlist and /auth/sign-up, so subsequent reads everywhere
 * else in the FE go through `readReferralCode()` synchronously.
 *
 * Note: this is a SERVER component. `cookies()` from `next/headers`
 * works only here, not on the client.
 *
 * See docs/superpowers/specs/2026-06-05-beta-referrals-design.md.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { REFERRAL_CODE_KEY } from "@/lib/storage-keys";

const CROCKFORD_BASE32 = /^[0-9A-HJ-NP-TV-Z]{7}$/;
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90 days

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export default async function ReferralLanding({ params }: { params: Params }) {
  const { code } = await params;

  // Always-canonical-uppercase normalization; backend regex is upper-only.
  const normalized = (code || "").toUpperCase();

  if (CROCKFORD_BASE32.test(normalized)) {
    const jar = await cookies();
    jar.set(REFERRAL_CODE_KEY, normalized, {
      maxAge: COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      path: "/",
      httpOnly: false, // read by client mirror effect
    });
  }
  // Bad codes fall through silently — landing still redirects so the
  // user isn't shown an error page.

  const prelaunch = process.env.NEXT_PUBLIC_PRELAUNCH !== "false";
  redirect(prelaunch ? "/waitlist" : "/auth/sign-up");
}

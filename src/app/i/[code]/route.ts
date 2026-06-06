/**
 * /i/[code] — referral-link landing.
 *
 * Route Handler (not Server Component): Next 16 disallows
 * `cookies().set()` inside a Server Component render path, so we set
 * the cookie on the NextResponse here instead. Validates the
 * Crockford-base32 7-char code, sets a 90-day `ahavah.ref` cookie,
 * and 307-redirects to:
 *   - /waitlist     when NEXT_PUBLIC_PRELAUNCH != "false" (pre-launch)
 *   - /auth/sign-up otherwise
 *
 * The cookie is mirrored into localStorage by a mount-time effect on
 * the destination route (/waitlist and /auth/sign-up), so the rest of
 * the FE reads via readReferralCode() synchronously.
 *
 * Bad codes still redirect — the user lands cleanly, just without the
 * attribution cookie.
 *
 * See docs/superpowers/specs/2026-06-05-beta-referrals-design.md.
 */

import { NextResponse, after } from "next/server";

import { REFERRAL_CODE_KEY } from "@/lib/storage-keys";

const CROCKFORD_BASE32 = /^[0-9A-HJKM-NP-TV-Z]{7}$/;
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90 days

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { code } = await params;
  const normalized = (code || "").toUpperCase();

  const prelaunch = process.env.NEXT_PUBLIC_PRELAUNCH !== "false";
  const target = new URL(prelaunch ? "/waitlist" : "/auth/sign-up", req.url);
  const res = NextResponse.redirect(target, 307);

  if (CROCKFORD_BASE32.test(normalized)) {
    res.cookies.set(REFERRAL_CODE_KEY, normalized, {
      maxAge: COOKIE_MAX_AGE_SEC,
      sameSite: "lax",
      path: "/",
      httpOnly: false,
    });
  }

  // Click log to the backend. Uses Next 16's after() so the redirect
  // response goes out IMMEDIATELY; the log fires in the background.
  // History note: an earlier attempt used `void fetch + keepalive`
  // (silently dropped 100% of requests on Vercel Node runtime), then
  // `await fetch` with 800ms timeout (worked but added 400-800ms to
  // every redirect). after() is the documented canonical pattern.
  const ua = req.headers.get("user-agent") || "";
  const wellFormed = CROCKFORD_BASE32.test(normalized);
  after(async () => {
    try {
      await fetch("https://api.ahavah.app/referral-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          well_formed: wellFormed,
          user_agent: ua.slice(0, 512),
        }),
      });
    } catch {
      // Swallow — best-effort analytics.
    }
  });

  return res;
}

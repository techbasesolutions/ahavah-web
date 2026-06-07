import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pre-launch gate. Until launch, the app/auth/onboarding surfaces are not open
// to the public — anyone who reaches them (direct URL, installed PWA, guessed
// link) is redirected into the waitlist. The marketing surfaces (/, /waitlist,
// /resources, /faq, legal) are NOT matched below, so they stay public.
//
// This is the obscurity/UX layer; the authoritative lock is the backend
// AHAVAH_SIGNUPS_OPEN flag on /request-otp. Flip both at launch:
//   - set NEXT_PUBLIC_PRELAUNCH=false in Vercel (disables this redirect)
//   - set AHAVAH_SIGNUPS_OPEN=true on the droplet
const PRELAUNCH = process.env.NEXT_PUBLIC_PRELAUNCH !== "false";

export function proxy(request: NextRequest) {
  if (!PRELAUNCH) return NextResponse.next();
  // Authed users (signed up via signup.ahavah.app or any other path) are
  // exempt from the obscurity redirect. The cookie is set by setSessionToken
  // alongside the localStorage bearer token; absence here means "not signed
  // in on this device", which is the case the gate exists to catch.
  if (request.cookies.get("ahavah.authed")?.value === "1") {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/waitlist", request.url));
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/onboarding/:path*",
    "/discover/:path*",
    "/matches/:path*",
    "/match/:path*",
    "/inbox/:path*",
    "/chat/:path*",
    "/map/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/verify/:path*",
    "/paywall/:path*",
    "/billing-portal/:path*",
    // Admin surface — moderator-only routes. Backend gates by role, but
    // the HTML shell + bundle path should not leak pre-launch either.
    "/admin/:path*",
  ],
};

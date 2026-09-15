// Campaign click links. The route calls the API itself (redirect: "manual")
// instead of bouncing the browser through the /api rewrite, so it can read
// the click's receipt off the raw response before anything is sent back to
// the visitor. It drops a spotlight_ref cookie carrying that receipt so a
// later sign-up can attribute back to this one click (finish-onboarding
// reads it via src/lib/spotlight-ref.ts). The cookie used to hold the
// shared campaign_link.key, which is printed in the caption every viewer
// sees and so can't prove a particular visitor clicked; the receipt is
// minted per click by the API and can.
//
// If the API call fails, times out, or never mints a receipt (a bot click
// mints none), the visitor still reaches their destination -- attribution
// failing must never leave anyone on an error page. Read
// node_modules/next/dist/docs for the Route Handler signature and the
// NextResponse cookies API before changing this.
//
// The API origin comes from src/lib/api-origin.ts, the one module
// next.config.ts's /api rewrite also imports. This file used to repeat that
// expression character for character while calling next.config the single
// source of truth, so the two could drift apart with no test and no error
// to show for it (see that module's own comment for the failure mode).
import { NextResponse } from "next/server";

import { apiOrigin } from "@/lib/api-origin";
import { SPOTLIGHT_REF_COOKIE } from "@/lib/spotlight-ref";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
const RECEIPT_HEADER = "x-spotlight-receipt";
const UPSTREAM_TIMEOUT_MS = 5000;
const ALLOWED_PLATFORMS = new Set(["facebook", "instagram"]);

// `?p=` names the platform a click came from. Only forward the two values
// the API records; anything else is noise (or worse) and is dropped here
// rather than trusted through.
function platformQuery(url: URL): string {
  const platform = url.searchParams.get("p");
  return platform && ALLOWED_PLATFORMS.has(platform) ? `?p=${encodeURIComponent(platform)}` : "";
}

// The upstream `Location` is untrusted input. Resolve it against the
// request origin and only accept it if it parses as a real URL, so a
// malformed or empty header can never reach NextResponse.redirect (which
// throws on an invalid URL) and 500 the visitor.
function resolveLocation(value: string, base: string): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const url = new URL(req.url);
  const encodedKey = encodeURIComponent(key);
  const query = platformQuery(url);

  // Today's behaviour: hop through the same-origin proxy with no cookie.
  // Used whenever the direct call below can't tell us where to send the
  // visitor, so a click never dead-ends on attribution failure.
  const fallbackLocation = `${url.origin}/api/s/${encodedKey}${query}`;

  let location = fallbackLocation;
  let receipt: string | null = null;

  try {
    const upstream = await fetch(`${apiOrigin()}/s/${encodedKey}${query}`, {
      redirect: "manual",
      // Stated, not inherited. Route handlers are uncached by default in
      // Next 16, but a cached 302 here would hand ONE receipt to many
      // visitors: every one of them would carry the same cookie value, the
      // first sign-up would consume that single-use receipt and the rest
      // would silently earn no credit. That property is load-bearing for
      // attribution, so it is pinned on the request rather than left to a
      // default a future version or a config option could change.
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // The API classifies bot vs. human off this header (_ua_class in
      // service/campaigns/__init__.py) to decide whether a click ever
      // earns a receipt. This route now makes the request on the
      // visitor's behalf, so without forwarding it explicitly Flask
      // would see Node's own default User-Agent instead of the
      // visitor's, and every click -- crawler included -- would read as
      // human. _ua_class reads no other header, so this is the only one
      // that needs to travel.
      headers: { "user-agent": req.headers.get("user-agent") ?? "" },
    });
    const upstreamLocation = upstream.headers.get("location");
    const resolved = upstreamLocation ? resolveLocation(upstreamLocation, url.origin) : null;
    if (resolved) {
      location = resolved;
      receipt = upstream.headers.get(RECEIPT_HEADER);
    }
  } catch {
    // Network error, timeout, or anything else fetch can throw: keep the
    // fallback above.
  }

  const res = NextResponse.redirect(location, 307);
  if (receipt) {
    res.cookies.set(SPOTLIGHT_REF_COOKIE, receipt, {
      maxAge: COOKIE_MAX_AGE_SEC,
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
    });
  }
  return res;
}

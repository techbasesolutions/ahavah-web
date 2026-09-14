// Campaign click links. The API counts the click and redirects; this
// route only hops to the same-origin proxy so the link works from any
// email client or social caption. It also drops a spotlight_ref cookie
// so a later sign-up can attribute back to this click (finish-onboarding
// reads it via src/lib/spotlight-ref.ts). Read node_modules/next/dist/docs
// for the Route Handler signature and the NextResponse cookies API before
// changing it.
import { NextResponse } from "next/server";

import { SPOTLIGHT_REF_COOKIE } from "@/lib/spotlight-ref";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const url = new URL(req.url);
  const res = NextResponse.redirect(`${url.origin}/api/s/${encodeURIComponent(key)}`, 307);
  res.cookies.set(SPOTLIGHT_REF_COOKIE, key, {
    maxAge: COOKIE_MAX_AGE_SEC,
    path: "/",
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
  return res;
}

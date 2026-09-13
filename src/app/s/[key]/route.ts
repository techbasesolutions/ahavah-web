// Campaign click links. The API counts the click and redirects; this
// route only hops to the same-origin proxy so the link works from any
// email client or social caption. Read node_modules/next/dist/docs for
// the Route Handler signature before changing it.
import { NextResponse } from "next/server";

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/api/s/${encodeURIComponent(key)}`, 307);
}

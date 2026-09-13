// Unsubscribe links. The API renders the confirmation page (GET) and stamps
// the unsubscribe (POST, including RFC 8058 one-click). This route only hops
// to the same-origin proxy so the emailed link works, and a 307 preserves
// the method/body so the confirmation form's POST survives the redirect.
// Read node_modules/next/dist/docs for the Route Handler signature before
// changing it.
import { NextResponse } from "next/server";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/api/u/${encodeURIComponent(token)}`, 307);
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = new URL(req.url);
  return NextResponse.redirect(`${url.origin}/api/u/${encodeURIComponent(token)}`, 307);
}

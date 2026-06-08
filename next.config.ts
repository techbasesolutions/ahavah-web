import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Let .md/.mdx files be processed by the MDX loader. App routes remain
  // .ts/.tsx; content MDX lives outside app/ so these add no extra routes.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Dev-mode equivalent of vercel.json's /api rewrite. With this, the
  // frontend can use `NEXT_PUBLIC_API_BASE_URL=/api` in dev too, and the
  // dev server proxies same-origin -> the droplet. Avoids the
  // `credentials: 'include'` + wildcard CORS incompatibility that
  // surfaces on any cross-origin browser fetch to the droplet.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.ahavah.app/:path*",
      },
    ];
  },

  // Force /sw.js to bypass Vercel's edge cache. Without this, the CDN
  // cached sw.js for ~3 minutes between deploys — returning users got
  // the stale sw.js, never noticed the new build's per-deploy CACHE
  // name, never triggered the activate-handler eviction, and kept
  // seeing UI from the previous deploy ("the cards still load like
  // this on refresh"). Surrogate-Control tells Vercel's CDN to skip
  // caching; Cache-Control tells the browser to always revalidate
  // against origin.
  async headers() {
    // Global security headers — applied to every response. CSP is intentionally
    // permissive on script-src ('unsafe-inline' for Next's inline bootstrap +
    // 'unsafe-eval' for Turbopack dev), but locks down frame-ancestors,
    // object-src, base-uri, and limits connect-src to the API + chat WS. Tune
    // when the bearer→cookie migration lands (DEFERRED).
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "geolocation=(self), camera=(self), microphone=(), payment=(self)",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // OpenStreetMap tile servers (a.tile., b.tile., c.tile.) feed the
        // /map page via react-leaflet's TileLayer; without explicit
        // whitelist the CSP blocks the tile images and the map renders
        // as a blank grey rectangle.
        "img-src 'self' data: blob: https://user-images.ahavah.app https://email-assets.ahavah.app https://*.digitaloceanspaces.com https://*.tile.openstreetmap.org",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https://api.ahavah.app wss://chat.ahavah.app wss://chat.ahavah.app:5443 wss://chat.ahavah.app:5442",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        // Apply to every other route. Order: more specific sw.js block above
        // wins for its source; this catch-all applies elsewhere.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withMDX = createMDX({
  // String form is required for Turbopack (JS functions can't cross into the
  // Rust loader). remark-frontmatter strips the YAML so it does not render.
  options: { remarkPlugins: [["remark-frontmatter", { type: "yaml", marker: "-" }]] },
});

export default withMDX(nextConfig);

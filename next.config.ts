import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-mode equivalent of vercel.json's /api rewrite. With this, the
  // frontend can use `NEXT_PUBLIC_API_BASE_URL=/api` in dev too, and the
  // dev server proxies same-origin -> the droplet. Avoids the
  // `credentials: 'include'` + wildcard CORS incompatibility that
  // surfaces on any cross-origin browser fetch to the droplet.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://167.71.93.27:5000/:path*",
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
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;

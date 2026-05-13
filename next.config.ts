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
};

export default nextConfig;

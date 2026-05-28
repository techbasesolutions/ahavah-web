import type { MetadataRoute } from "next";

// Public marketing pages are crawlable; the authed in-app routes are not useful
// SEO landing pages (and many require a session), so they're disallowed to focus
// crawl budget on indexable content. Points crawlers to the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth/",
        "/onboarding/",
        "/discover",
        "/matches",
        "/match",
        "/inbox",
        "/chat",
        "/map",
        "/settings/",
        "/profile",
        "/verify",
        "/paywall",
        "/admin",
      ],
    },
    sitemap: "https://ahavah.app/sitemap.xml",
    host: "https://ahavah.app",
  };
}

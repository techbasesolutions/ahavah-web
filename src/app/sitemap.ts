import type { MetadataRoute } from "next";

import { getGuides, getUpdates } from "@/lib/content";

const BASE = "https://ahavah.app";

// Public, indexable routes only (the in-app/auth routes are excluded — see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/community", priority: 0.6, changeFrequency: "monthly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    { path: "/legal/community-guidelines", priority: 0.5, changeFrequency: "monthly" },
    { path: "/feedback", priority: 0.4, changeFrequency: "monthly" },
    { path: "/messianic-matchmaking", priority: 0.7, changeFrequency: "monthly" },
    { path: "/biblical-polygyny", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faith-marriage-abroad", priority: 0.7, changeFrequency: "monthly" },
    { path: "/marriage-checklist", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];
  const staticEntries = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const hubEntries = [
    { url: `${BASE}/resources`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE}/resources/updates`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.4 },
  ];

  const guideEntries = getGuides().map((g) => ({
    url: `${BASE}/resources/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const updateEntries = getUpdates().map((u) => ({
    url: `${BASE}/resources/updates/${u.slug}`,
    lastModified: new Date(u.date),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...staticEntries, ...hubEntries, ...guideEntries, ...updateEntries];
}

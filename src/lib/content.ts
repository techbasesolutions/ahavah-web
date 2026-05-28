// Single source of truth for resources content. Reads MDX frontmatter at
// build time. THIS FILE is the CMS-swap seam: a future migration replaces
// only these functions, keeping the same return types.
import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";

export type Cluster = "messianic" | "polygyny" | "cross-border";

export type GuideMeta = {
  title: string;
  description: string;
  slug: string;
  cluster: Cluster;
  updated: string; // ISO date
  readingMinutes: number;
};

export type UpdateMeta = {
  title: string;
  description: string;
  slug: string;
  date: string; // ISO date
  author?: string;
  readingMinutes: number;
};

export const CLUSTER_META: Record<Cluster, { label: string; landing: string }> = {
  messianic: { label: "Messianic", landing: "/messianic-matchmaking" },
  polygyny: { label: "Biblical marriage", landing: "/biblical-polygyny" },
  "cross-border": { label: "Across borders", landing: "/faith-marriage-abroad" },
};

const GUIDES_DIR = path.join(process.cwd(), "src/content/guides");
const UPDATES_DIR = path.join(process.cwd(), "src/content/updates");

function listMdx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
}

export function getGuides(): GuideMeta[] {
  return listMdx(GUIDES_DIR)
    .map((file) => {
      const raw = fs.readFileSync(path.join(GUIDES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return {
        title: String(data.title),
        description: String(data.description),
        slug: String(data.slug),
        cluster: data.cluster as Cluster,
        updated: String(data.updated),
        readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
      } satisfies GuideMeta;
    })
    .sort((a, b) => a.cluster.localeCompare(b.cluster) || a.title.localeCompare(b.title));
}

export function getGuide(slug: string): GuideMeta | null {
  return getGuides().find((g) => g.slug === slug) ?? null;
}

export function getUpdates(): UpdateMeta[] {
  return listMdx(UPDATES_DIR)
    .map((file) => {
      const raw = fs.readFileSync(path.join(UPDATES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return {
        title: String(data.title),
        description: String(data.description),
        slug: String(data.slug),
        date: String(data.date),
        author: data.author ? String(data.author) : undefined,
        readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
      } satisfies UpdateMeta;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getUpdate(slug: string): UpdateMeta | null {
  return getUpdates().find((u) => u.slug === slug) ?? null;
}

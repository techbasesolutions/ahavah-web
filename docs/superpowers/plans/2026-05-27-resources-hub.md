# Resources Hub (Guides + Updates) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/resources` hub of evergreen MDX guides (plus a built-but-empty dated updates section) that deepens topical authority for the three keyword clusters and cross-links the Sub-project A landing pages.

**Architecture:** Next 16 native MDX (`@next/mdx`) with `remark-frontmatter`. Articles are `.mdx` files under `src/content/{guides,updates}/`. One typed loader (`src/lib/content.ts`) reads frontmatter via `gray-matter` and is the single CMS-swap seam. Server-component routes dynamic-import the MDX body and use `generateStaticParams` + `dynamicParams = false`. Reuses the marketing design system.

**Tech Stack:** Next 16.2.6 (App Router, Turbopack), React 19, Tailwind v4, `@next/mdx`, `gray-matter`, `reading-time`, pnpm.

---

## Conventions (read before starting)

- Per `AGENTS.md`: Next 16, not training-data Next. The MDX approach here is from `node_modules/next/dist/docs/01-app/02-guides/mdx.md`. Key facts already extracted:
  - Dynamic-import pattern: `const { default: Post } = await import("@/content/guides/" + slug + ".mdx")` inside an `async` server page; `params` is `Promise<{ slug: string }>` and must be `await`ed.
  - Use `generateStaticParams` + `export const dynamicParams = false` so unknown slugs 404.
  - **Turbopack:** remark plugins MUST be strings, not function imports (`remarkPlugins: ['remark-frontmatter']`). Functions cannot be passed to the Rust loader.
  - A root `src/mdx-components.tsx` is required by `@next/mdx`.
- **No em dashes** in any user-facing string (copy or MDX). Use periods/commas.
- Avoid the literal phrase "dating app". Use "matchmaking" / "find a spouse" / "courtship".
- New page/section TSX files using arbitrary Tailwind values need `/* eslint-disable no-restricted-syntax */` at the top (same as existing marketing pages).
- Typecheck: `pnpm exec tsc --noEmit`. Build: `pnpm build`. Lint: `pnpm lint`.
- `@/*` maps to `./src/*`. Content lives at `src/content/`.

## File Structure

- Modify `next.config.ts` — wrap with `withMDX`, add `pageExtensions`.
- Create `src/mdx-components.tsx` — required global MDX component map (on-brand styles).
- Create `src/lib/content.ts` — typed loader (`GuideMeta`, `UpdateMeta`, `getGuides`, `getGuide`, `getUpdates`, `getUpdate`, `CLUSTER_META`).
- Create `src/components/app/resources/resources-jsonld.ts` — `buildArticleGraph`, `buildCollectionGraph`.
- Create `src/components/app/resources/resource-sections.tsx` — `ResourceHero`, `ArticleCard`, `ArticleList`.
- Create `src/app/resources/page.tsx` — hub index.
- Create `src/app/resources/[slug]/page.tsx` — guide article.
- Create `src/app/resources/updates/page.tsx` — updates index (empty state).
- Create `src/app/resources/updates/[slug]/page.tsx` — update article.
- Create `src/app/resources/rss.xml/route.ts` — updates RSS feed.
- Create `src/content/guides/{3 files}.mdx` — seed guides.
- Modify `src/app/sitemap.ts` — append hub + dynamic article URLs.
- Modify `src/components/app/marketing-footer.tsx` — add "Resources" link.
- Modify the 3 Sub-project A landing pages + `landing-sections.tsx` — add a related-guide link.

---

### Task 1: Install deps + configure MDX

**Files:**
- Modify: `next.config.ts`
- Create: `src/mdx-components.tsx`

- [ ] **Step 1: Install dependencies**

Run: `pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx remark-frontmatter gray-matter reading-time`
Expected: installs without peer-dependency errors.

- [ ] **Step 2: Wrap `next.config.ts` with withMDX**

At the top of `next.config.ts`, after the existing import line `import type { NextConfig } from "next";`, add:

```ts
import createMDX from "@next/mdx";
```

Add `pageExtensions` to the `nextConfig` object (top of the object, before `rewrites`):

```ts
  pageExtensions: ["ts", "tsx", "md", "mdx"],
```

Replace the final `export default nextConfig;` line with:

```ts
const withMDX = createMDX({
  // String form is required for Turbopack (functions can't cross into the Rust loader).
  options: { remarkPlugins: [["remark-frontmatter", { type: "yaml", marker: "-" }]] },
});

export default withMDX(nextConfig);
```

- [ ] **Step 3: Create the required MDX components map**

```tsx
// src/mdx-components.tsx — required by @next/mdx. Styles compiled MDX with
// the marketing design tokens. Internal links use next/link.
/* eslint-disable no-restricted-syntax */
import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2 className="mt-10 mb-3 text-2xl lg:text-3xl font-bold tracking-tight text-(--ink)" {...props} />
    ),
    h3: (props) => (
      <h3 className="mt-8 mb-2 text-lg lg:text-xl font-bold tracking-tight text-(--ink)" {...props} />
    ),
    p: (props) => <p className="my-4 text-base leading-[1.7] text-(--ink-2)" {...props} />,
    ul: (props) => <ul className="my-4 flex flex-col gap-2 pl-5 list-disc text-(--ink-2)" {...props} />,
    ol: (props) => <ol className="my-4 flex flex-col gap-2 pl-5 list-decimal text-(--ink-2)" {...props} />,
    li: (props) => <li className="text-base leading-[1.6]" {...props} />,
    blockquote: (props) => (
      <blockquote className="my-6 rounded-2xl border border-(--hairline) bg-(--card) p-5 text-(--ink-2) italic" {...props} />
    ),
    strong: (props) => <strong className="font-bold text-(--ink)" {...props} />,
    a: ({ href = "", ...rest }) =>
      href.startsWith("/") ? (
        <Link href={href} className="font-semibold text-(--color-lavender) hover:underline" {...rest} />
      ) : (
        <a href={href} className="font-semibold text-(--color-lavender) hover:underline" {...rest} />
      ),
    ...components,
  };
}
```

- [ ] **Step 4: Verify config compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts src/mdx-components.tsx package.json pnpm-lock.yaml
git commit -m "feat(resources): configure @next/mdx pipeline + mdx-components"
```

---

### Task 2: Content loader

**Files:**
- Create: `src/lib/content.ts`

- [ ] **Step 1: Write the loader**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (note: `getGuides()` will return `[]` until Task 7 adds files; that is fine).

- [ ] **Step 3: Commit**

```bash
git add src/lib/content.ts
git commit -m "feat(resources): typed MDX content loader (CMS-swap seam)"
```

---

### Task 3: JSON-LD helpers + resource sections

**Files:**
- Create: `src/components/app/resources/resources-jsonld.ts`
- Create: `src/components/app/resources/resource-sections.tsx`

- [ ] **Step 1: Write the JSON-LD helpers**

```ts
// Structured data for the resources hub. Reuses the site Organization @id.
const BASE = "https://ahavah.app";

export function buildArticleGraph(opts: {
  url: string; // absolute
  title: string;
  description: string;
  datePublished: string;
  crumbName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${opts.url}#article`,
        headline: opts.title,
        description: opts.description,
        datePublished: opts.datePublished,
        dateModified: opts.datePublished,
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        mainEntityOfPage: opts.url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE}/resources` },
          { "@type": "ListItem", position: 3, name: opts.crumbName, item: opts.url },
        ],
      },
    ],
  };
}

export function buildCollectionGraph(opts: { url: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${opts.url}#collection`,
        url: opts.url,
        name: opts.name,
        description: opts.description,
        isPartOf: { "@id": `${BASE}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: opts.name, item: opts.url },
        ],
      },
    ],
  };
}
```

- [ ] **Step 2: Write the section components**

```tsx
// Resources hub UI sections. Server-compatible (no hooks). Reuses the
// marketing design tokens + clamp() rhythm.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

export function ResourceHero({
  eyebrow,
  title,
  subhead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subhead: string;
}) {
  return (
    <header className="flex flex-col gap-4 max-w-[760px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
        {eyebrow}
      </span>
      <h1
        className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
        style={{ fontFamily: "var(--font-display)", lineHeight: 0.94, letterSpacing: "-0.025em", fontWeight: 400 }}
      >
        {title}
      </h1>
      <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{subhead}</p>
    </header>
  );
}

export function ArticleCard({
  href,
  label,
  meta,
  title,
  description,
}: {
  href: string;
  label: string; // cluster label or date
  meta: string; // e.g. "4 min read"
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-(--hairline) bg-(--card) p-6 flex flex-col gap-3 transition-colors hover:border-(--color-lavender)"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
        <span>{label}</span>
        <span className="text-(--ink-2) font-medium normal-case tracking-normal">{meta}</span>
      </div>
      <h3 className="m-0 text-lg font-bold text-(--ink) tracking-tight group-hover:text-(--color-lavender) transition-colors">
        {title}
      </h3>
      <p className="m-0 text-sm leading-[1.6] text-(--ink-2)">{description}</p>
    </Link>
  );
}

export function ArticleList({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/resources/resources-jsonld.ts src/components/app/resources/resource-sections.tsx
git commit -m "feat(resources): JSON-LD helpers + hub UI sections"
```

---

### Task 4: `/resources` hub index

**Files:**
- Create: `src/app/resources/page.tsx`

- [ ] **Step 1: Write the index page**

```tsx
// /resources — hub index. Guides grouped by cluster + latest updates row.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { ResourceHero, ArticleCard, ArticleList } from "@/components/app/resources/resource-sections";
import { buildCollectionGraph } from "@/components/app/resources/resources-jsonld";
import { getGuides, getUpdates, CLUSTER_META, type Cluster } from "@/lib/content";

const TITLE = "Resources";
const DESCRIPTION =
  "Guides on finding a Torah-observant spouse, biblical marriage, verification, and meeting across borders. From the team behind Ahavah.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/resources" },
};

const CLUSTER_ORDER: Cluster[] = ["messianic", "polygyny", "cross-border"];

export default function ResourcesPage() {
  const guides = getGuides();
  const updates = getUpdates();
  const graph = buildCollectionGraph({ url: "https://ahavah.app/resources", name: TITLE, description: DESCRIPTION });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <ResourceHero
          eyebrow="Resources"
          title={<>Guides for the journey to marriage<span className="text-(--color-lime)">.</span></>}
          subhead="Practical, belief-aware guides on finding a spouse, verification and safety, and meeting someone across borders."
        />

        {CLUSTER_ORDER.map((cluster) => {
          const items = guides.filter((g) => g.cluster === cluster);
          if (items.length === 0) return null;
          return (
            <section key={cluster} className="flex flex-col gap-4">
              <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
                {CLUSTER_META[cluster].label}
              </h2>
              <ArticleList>
                {items.map((g) => (
                  <ArticleCard
                    key={g.slug}
                    href={`/resources/${g.slug}`}
                    label={CLUSTER_META[g.cluster].label}
                    meta={`${g.readingMinutes} min read`}
                    title={g.title}
                    description={g.description}
                  />
                ))}
              </ArticleList>
            </section>
          );
        })}

        {updates.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
              Latest updates
            </h2>
            <ArticleList>
              {updates.slice(0, 3).map((u) => (
                <ArticleCard
                  key={u.slug}
                  href={`/resources/updates/${u.slug}`}
                  label={new Date(u.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  meta={`${u.readingMinutes} min read`}
                  title={u.title}
                  description={u.description}
                />
              ))}
            </ArticleList>
          </section>
        ) : null}
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

```bash
git add src/app/resources/page.tsx
git commit -m "feat(resources): /resources hub index"
```

---

### Task 5: `/resources/[slug]` guide article

**Files:**
- Create: `src/app/resources/[slug]/page.tsx`

- [ ] **Step 1: Write the article page**

```tsx
// /resources/[slug] — a guide article. Server component: dynamic-imports
// the MDX body, reads metadata from the content loader.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { buildArticleGraph } from "@/components/app/resources/resources-jsonld";
import { getGuide, getGuides, CLUSTER_META } from "@/lib/content";

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/resources/${guide.slug}` },
    openGraph: { title: `${guide.title} · Ahavah`, description: guide.description, url: `https://ahavah.app/resources/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { default: Body } = await import(`@/content/guides/${slug}.mdx`);
  const url = `https://ahavah.app/resources/${guide.slug}`;
  const cluster = CLUSTER_META[guide.cluster];
  const graph = buildArticleGraph({
    url,
    title: guide.title,
    description: guide.description,
    datePublished: guide.updated,
    crumbName: guide.title,
  });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-6">
        <nav className="text-sm text-(--ink-2)">
          <Link href="/resources" className="hover:text-(--color-lavender)">Resources</Link>
          <span className="px-2">/</span>
          <span>{cluster.label}</span>
        </nav>
        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            {cluster.label} · {guide.readingMinutes} min read
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(30px,5.5vw,52px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.98, letterSpacing: "-0.02em", fontWeight: 400 }}
          >
            {guide.title}
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{guide.description}</p>
        </header>

        <article className="flex flex-col">
          <Body />
        </article>

        <aside className="mt-6 rounded-3xl border border-lavender/30 bg-lavender/10 p-6 flex flex-col gap-3 items-start">
          <p className="m-0 text-base font-bold text-(--ink)">Ready to start?</p>
          <p className="m-0 text-sm leading-[1.6] text-(--ink-2)">
            Read more about <Link href={cluster.landing} className="font-semibold text-(--color-lavender) hover:underline">{cluster.label.toLowerCase()}</Link>, or join the waitlist.
          </p>
          <Link
            href="/waitlist"
            className="rounded-xl bg-(--color-lime) px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity"
          >
            Join the waitlist
          </Link>
        </aside>
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (The dynamic `import` of `.mdx` resolves once Task 1's MDX loader is configured and Task 7 adds files; tsc accepts the template-literal import.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/resources/[slug]/page.tsx"
git commit -m "feat(resources): /resources/[slug] guide article page"
```

---

### Task 6: Updates index + update article

**Files:**
- Create: `src/app/resources/updates/page.tsx`
- Create: `src/app/resources/updates/[slug]/page.tsx`

- [ ] **Step 1: Write the updates index**

```tsx
// /resources/updates — dated announcements index. Empty state until posts exist.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { ResourceHero, ArticleCard, ArticleList } from "@/components/app/resources/resource-sections";
import { buildCollectionGraph } from "@/components/app/resources/resources-jsonld";
import { getUpdates } from "@/lib/content";

const TITLE = "Updates";
const DESCRIPTION = "Announcements and product updates from the Ahavah team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources/updates" },
};

export default function UpdatesPage() {
  const updates = getUpdates();
  const graph = buildCollectionGraph({ url: "https://ahavah.app/resources/updates", name: TITLE, description: DESCRIPTION });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-10">
        <ResourceHero
          eyebrow="Updates"
          title={<>Product updates<span className="text-(--color-lime)">.</span></>}
          subhead="Announcements and progress from the team building Ahavah."
        />
        {updates.length > 0 ? (
          <ArticleList>
            {updates.map((u) => (
              <ArticleCard
                key={u.slug}
                href={`/resources/updates/${u.slug}`}
                label={new Date(u.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                meta={`${u.readingMinutes} min read`}
                title={u.title}
                description={u.description}
              />
            ))}
          </ArticleList>
        ) : (
          <div className="rounded-2xl border border-(--hairline) bg-(--card) p-8 text-(--ink-2)">
            No updates yet. Check back soon, or <a href="/waitlist" className="font-semibold text-(--color-lavender) hover:underline">join the waitlist</a> for news.
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Write the update article page**

```tsx
// /resources/updates/[slug] — a dated update article.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { buildArticleGraph } from "@/components/app/resources/resources-jsonld";
import { getUpdate, getUpdates } from "@/lib/content";

export function generateStaticParams() {
  return getUpdates().map((u) => ({ slug: u.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) return {};
  return {
    title: update.title,
    description: update.description,
    alternates: { canonical: `/resources/updates/${update.slug}` },
  };
}

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) notFound();

  const { default: Body } = await import(`@/content/updates/${slug}.mdx`);
  const url = `https://ahavah.app/resources/updates/${update.slug}`;
  const graph = buildArticleGraph({
    url,
    title: update.title,
    description: update.description,
    datePublished: update.date,
    crumbName: update.title,
  });

  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-6">
        <nav className="text-sm text-(--ink-2)">
          <Link href="/resources/updates" className="hover:text-(--color-lavender)">Updates</Link>
        </nav>
        <header className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            {new Date(update.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(30px,5.5vw,52px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.98, letterSpacing: "-0.02em", fontWeight: 400 }}
          >
            {update.title}
          </h1>
        </header>
        <article className="flex flex-col">
          <Body />
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

```bash
git add src/app/resources/updates
git commit -m "feat(resources): updates index + update article page"
```

---

### Task 7: Seed the 3 guides

**Files:**
- Create: `src/content/guides/how-to-find-a-torah-observant-spouse.mdx`
- Create: `src/content/guides/biblical-plural-marriage-online.mdx`
- Create: `src/content/guides/marrying-across-borders-safely.mdx`

NOTE: guide 2 is doctrinally sensitive. Claims stay grounded in already-published positioning. No new scriptural assertions. Owner sign-off before deploy (Task 10).

- [ ] **Step 1: Guide 1 — niche identity**

````mdx
---
title: How to Find a Torah-Observant Spouse Online
description: A practical guide to meeting a Messianic, Hebrew Roots, or Torah-observant spouse online, from filtering on belief to verifying who is real.
slug: how-to-find-a-torah-observant-spouse
cluster: messianic
updated: 2026-05-28
---

Finding a spouse is hard. Finding one who shares your walk, keeps the same days, and reads the same Scriptures the same way is harder still. Mainstream apps were not built for this. They optimize for volume and swiping, not for the slow, deliberate work of building a marriage on shared conviction. Here is a practical way to approach the search.

## Start with belief, not chemistry

Chemistry is real, but it is not a foundation. Two people can feel a spark and still disagree on the things that will shape every Sabbath, every holy day, and every child raised in the home. Before anything else, get clear on what you actually believe and what you need a spouse to share. Observance level. View of the feasts. How you read Torah. These are not deal points to negotiate later. They are the ground you stand on.

A platform built for this lets you filter on those things from the start. On [Ahavah](/messianic-matchmaking), shared-belief filters come first, so you are not scrolling past people who could never share your table.

## Verify who is real

The oldest problem in online matchmaking is not rejection. It is deception. Photos that are not the person. Stories that do not hold up. Intentions that are hidden. The answer is verification.

Look for a platform that checks identity before matching begins, not as an afterthought. Tiered verification, where members can prove more about themselves over time, gives you a real signal about who you are talking to. It will not remove all risk, but it removes the easiest lies.

## Move toward courtship, not endless chatting

The goal is marriage, so the process should move toward it. Long stretches of low-stakes messaging tend to go nowhere. Once belief and basic trust are established, move toward real conversation with intent. Ask the questions that matter. Involve the people who know you. Treat the other person as a potential spouse, not a pen pal.

## What to look for in a platform

- Belief and observance filters that actually work
- Identity verification built in, not bolted on
- A culture that is courtship-minded rather than swipe-driven
- A community that shares your convictions, even across borders

## The short version

Know what you believe. Filter for it. Verify who is real. Move toward marriage with intent. If you want a community built around exactly this, [join the Ahavah waitlist](/waitlist).
````

Write the file exactly as above (without the surrounding code fence).

- [ ] **Step 2: Guide 2 — biblical plural marriage (doctrine minimal, owner-vetted)**

````mdx
---
title: "Biblical Plural Marriage Online: What a Platform Should Get Right"
description: Most platforms have no category for plural marriage. Here is what an online platform should get right for it, from openness to verification to safety.
slug: biblical-plural-marriage-online
cluster: polygyny
updated: 2026-05-28
---

For believers whose convictions include plural marriage, the online search is uniquely difficult. Most platforms have no category for it. The topic gets pushed off-app, into private messages and guarded hints, which serves no one well. A platform built with this in mind can do better. Here is what it should get right.

## Recognize it, do not hide it

The first thing a platform should do is have a place for it. On [Ahavah](/biblical-polygyny), polygyny is a recognised path, which means it is not for never-married singles only, and members can be open about what they are seeking. Openness is not just more honest. It is safer, because it lets the right conversations happen in the open instead of in the shadows.

## Treat verification as essential

When families are involved, trust matters even more. Identity verification should apply to everyone, with no exceptions and no quiet opt-outs. Members should be able to see how verified the person across the screen is before any serious conversation begins. This protects everyone, and it raises the standard of the whole community.

## Let belief do the filtering

Plural marriage sits inside a wider set of convictions about observance, family, and how a household is ordered. A good platform lets people match on those convictions, including views on marriage itself, so first conversations start from common ground rather than a difficult disclosure.

## Hold the same standards for everyone

Recognising a path is not the same as lowering the bar. The same community guidelines, the same reporting and blocking tools, and the same conduct expectations should apply to every member. A platform that recognises plural marriage and enforces clear standards is serving its community, not cutting corners for it.

## The short version

Recognise it openly. Verify everyone. Filter by conviction. Hold one standard for all. If that is the kind of community you are looking for, read more about [biblical marriage on Ahavah](/biblical-polygyny) or [join the waitlist](/waitlist).
````

Write the file exactly as above (without the surrounding code fence).

- [ ] **Step 3: Guide 3 — cross-border**

````mdx
---
title: "Marrying Across Borders: Verification and Safety for Diaspora Couples"
description: A guide to meeting and marrying a spouse who lives in another country, covering verification, language, and the safety steps that matter most.
slug: marrying-across-borders-safely
cluster: cross-border
updated: 2026-05-28
---

The right person does not always live in your city, or even your country. For believers spread across the diaspora, the search for a spouse is naturally international. That is a feature, not a problem, but it does raise the stakes on trust and safety. Here is how to approach it well.

## Distance is not the obstacle people think

A shared faith and a shared goal can bridge a great deal of distance. Many strong marriages began with two people in different countries who were aligned on what mattered. The question is not whether distance is hard. It is whether you have the tools to build trust across it. [Ahavah](/faith-marriage-abroad) is built for exactly this, with members across continents and over 100 languages.

## Verify before you invest

International introductions carry more risk, simply because it is harder to check someone out through your own network. That makes identity verification the single most important safeguard. Favor platforms that verify identity in tiers and show you that status before you engage. Do not skip it because someone seems sincere. Sincerity is easy to fake at a distance.

## Bridge the language gap early

Language should not stand between two believers, but it does need to be handled honestly. Be clear about the languages you each speak well. Use a platform designed to bridge more than 100 languages so that early conversations are real conversations, not guesswork.

## Practical safety steps

- Keep early contact on the platform, where verification and reporting tools exist
- Confirm identity through verification before sharing personal details
- Involve trusted people in your life as things get serious
- Take video calls before any travel, and never travel without telling someone you trust

## The short version

Do not let borders rule out the right person, but do not let distance lower your guard. Verify early, bridge language honestly, and keep trusted people involved. Read more about [meeting a spouse across borders](/faith-marriage-abroad), or [join the waitlist](/waitlist).
````

Write the file exactly as above (without the surrounding code fence).

- [ ] **Step 4: Build to verify MDX compiles + pages prerender**

Run: `pnpm build`
Expected: PASS. Build output lists `/resources`, `/resources/[slug]` (3 prerendered guide paths), `/resources/updates`.

- [ ] **Step 5: Commit**

```bash
git add src/content/guides
git commit -m "content(resources): seed 3 evergreen guides (one per cluster)"
```

---

### Task 8: Sitemap + nav/footer + landing cross-links

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/components/app/marketing-footer.tsx`
- Modify: `src/components/app/landing/landing-sections.tsx`
- Modify: the 3 landing pages (`messianic-matchmaking`, `biblical-polygyny`, `faith-marriage-abroad`)

- [ ] **Step 1: Dynamic sitemap entries**

In `src/app/sitemap.ts`, import the loader at the top:

```ts
import { getGuides, getUpdates } from "@/lib/content";
```

After the static `routes` array is mapped (i.e., compute the static list first), append article entries. Replace the final `return routes.map(...)` block with:

```ts
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
```

- [ ] **Step 2: Add "Resources" to the footer**

In `src/components/app/marketing-footer.tsx`, add a Resources entry to `COMPANY_LINKS` (after "Help & FAQ"):

```tsx
  { href: "/resources",             label: "Resources" },
```

- [ ] **Step 3: Add an optional related-guide link to `LandingCta`**

In `src/components/app/landing/landing-sections.tsx`, extend `LandingCta`. Replace its signature and add the secondary link. Change:

```tsx
export function LandingCta({ heading, body }: { heading: string; body: string }) {
```

to:

```tsx
export function LandingCta({
  heading,
  body,
  secondary,
}: {
  heading: string;
  body: string;
  secondary?: { href: string; label: string };
}) {
```

and immediately after the `<Button ...>Join the waitlist</Button>` inside `LandingCta`, add:

```tsx
      {secondary ? (
        <Link href={secondary.href} className="text-sm font-semibold text-(--color-lavender) hover:underline">
          {secondary.label}
        </Link>
      ) : null}
```

(`Link` is already imported in this file.)

- [ ] **Step 4: Pass the related guide on each landing page**

In each of the three landing pages, add the `secondary` prop to the `<LandingCta ... />`:

- `messianic-matchmaking/page.tsx`:
  ```tsx
          secondary={{ href: "/resources/how-to-find-a-torah-observant-spouse", label: "Read: How to find a Torah-observant spouse" }}
  ```
- `biblical-polygyny/page.tsx`:
  ```tsx
          secondary={{ href: "/resources/biblical-plural-marriage-online", label: "Read: What a platform should get right" }}
  ```
- `faith-marriage-abroad/page.tsx`:
  ```tsx
          secondary={{ href: "/resources/marrying-across-borders-safely", label: "Read: Marrying across borders safely" }}
  ```

- [ ] **Step 5: Typecheck + lint + commit**

Run: `pnpm exec tsc --noEmit` then `pnpm lint`
Expected: both PASS.

```bash
git add src/app/sitemap.ts src/components/app/marketing-footer.tsx src/components/app/landing/landing-sections.tsx src/app/messianic-matchmaking/page.tsx src/app/biblical-polygyny/page.tsx src/app/faith-marriage-abroad/page.tsx
git commit -m "feat(resources): sitemap entries, footer link, landing cross-links"
```

---

### Task 9: Updates RSS feed

**Files:**
- Create: `src/app/resources/rss.xml/route.ts`

- [ ] **Step 1: Write the route handler**

```ts
// /resources/rss.xml — updates feed. Hand-rolled XML (no extra dep).
import { getUpdates } from "@/lib/content";

const BASE = "https://ahavah.app";

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function GET() {
  const updates = getUpdates();
  const items = updates
    .map(
      (u) => `    <item>
      <title>${escape(u.title)}</title>
      <link>${BASE}/resources/updates/${u.slug}</link>
      <guid>${BASE}/resources/updates/${u.slug}</guid>
      <pubDate>${new Date(u.date).toUTCString()}</pubDate>
      <description>${escape(u.description)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ahavah Updates</title>
    <link>${BASE}/resources/updates</link>
    <description>Announcements and product updates from the Ahavah team.</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
```

- [ ] **Step 2: Build + commit**

Run: `pnpm build`
Expected: PASS. `/resources/rss.xml` appears as a route.

```bash
git add src/app/resources/rss.xml/route.ts
git commit -m "feat(resources): updates RSS feed"
```

---

### Task 10: Build, render verification, sign-off, deploy, live verification

**Files:** none.

- [ ] **Step 1: Full build + re-typecheck**

Run: `pnpm build` then `pnpm exec tsc --noEmit`
Expected: both PASS.

- [ ] **Step 2: Local render screenshots (verify-rendered-pixels)**

Start `pnpm start -p 3210`, wait for ready, capture and actually view (headless Chrome, `Start-Process -Wait`):
- `/resources`
- `/resources/how-to-find-a-torah-observant-spouse`
- `/resources/biblical-plural-marriage-online`
- `/resources/marrying-across-borders-safely`
- `/resources/updates` (empty state)
Confirm: hub groups guides by cluster, article typography (mdx-components) renders, footer shows "Resources", landing CTA shows the related-guide link. Stop the server.

- [ ] **Step 3: Owner doctrinal sign-off on guide 2**

Surface the rendered `/resources/biblical-plural-marriage-online` to the owner for sign-off before deploy.

- [ ] **Step 4: Deploy**

```bash
git push origin master
```

- [ ] **Step 5: Live verification (curl)**

For `/resources`, each guide, `/resources/updates`, and `/resources/rss.xml`, confirm via curl: 200; unique title + canonical; Article+BreadcrumbList JSON-LD on guides; CollectionPage on indexes; valid XML on the feed; and `sitemap.xml` lists the hub + 3 guides.

- [ ] **Step 6: Follow every internal link (renders-not-works)**

On the live site: footer "Resources", each landing-to-guide link, each guide-to-landing and guide-to-waitlist link, and breadcrumb links. Confirm no 404/soft-404 and content is real, not placeholder.

---

## Self-Review

**Spec coverage:**
- MDX pipeline (native @next/mdx, remark-frontmatter string form, mdx-components): Task 1. ✓
- Content loader as CMS-swap seam, typed: Task 2. ✓
- Article + Collection JSON-LD; hub UI sections: Task 3. ✓
- `/resources` hub grouped by cluster + conditional updates row: Task 4. ✓
- `/resources/[slug]` guide with generateStaticParams + dynamicParams=false + awaited Promise params: Task 5. ✓
- Updates index (empty state) + update article: Task 6. ✓
- 3 seed guides, em-dash-free, polygyny grounded + owner-vetted: Task 7 + Task 10 Step 3. ✓
- Dynamic sitemap, footer "Resources", bidirectional landing cross-links: Task 8. ✓
- RSS feed: Task 9. ✓
- Verification gate (tsc, build, screenshots, live curl, link-following): Task 10. ✓

**Placeholder scan:** None. All code and MDX content is complete inline.

**Type consistency:** `GuideMeta`/`UpdateMeta`/`Cluster`/`CLUSTER_META` defined in Task 2, used identically in Tasks 4-6, 8. `buildArticleGraph`/`buildCollectionGraph` signatures defined in Task 3 match calls in Tasks 4-6. `ArticleCard` props (`href,label,meta,title,description`) defined in Task 3 match usage in Tasks 4, 6. `LandingCta` `secondary` prop added in Task 8 Step 3 matches usage in Step 4.

**Turbopack note:** remark plugin passed as string tuple `["remark-frontmatter", {...}]` (serializable options), satisfying the Turbopack constraint from the Next docs.

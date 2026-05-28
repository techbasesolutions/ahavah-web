# Resources Hub (Guides + Updates) — Phase 2, Sub-project B

Date: 2026-05-27
Status: Approved (design)
Scope owner: ahavah-web
Builds on: Sub-project A (commit d5b032c) — the keyword landing pages this hub cross-links with.

## Context

Phase 2 Sub-project A shipped three keyword landing pages and an expanded FAQ. Sub-project B is the ongoing content-acquisition layer: a resources hub of evergreen guides (the backbone) plus a dated updates/announcements section (hybrid model). It deepens topical authority for the same three keyword clusters and feeds AI answer engines.

Decisions locked during brainstorming:
- Content source: MDX files in the repo now, with a clean loader seam so a CMS swap later is contained ("start MDX, migrate later").
- Shape: hybrid. Evergreen guides backbone + a dated updates section.
- Seed content: full hub infrastructure + 3 evergreen guides drafted in-house (one per cluster), em-dash-free, owner-approved. No updates seeded at launch.

## Goals

- A `/resources` hub with a guides index and article pages, plus a built-but-empty updates section that lights up when the first dated post lands.
- 3 evergreen guides at launch, one per keyword cluster, with Article + BreadcrumbList structured data.
- Dynamic sitemap coverage and bidirectional internal linking with the Sub-project A landing pages.
- A content loader that is the single seam to swap for a CMS later.

## Non-goals (YAGNI)

- Tags, full-text search, pagination, comments, algorithmic "related posts".
- A CMS. MDX only for now.
- New doctrinal or scriptural assertions. The polygyny guide stays grounded in already-published positioning, owner-vetted.

## Architecture

### Content directory

```
src/content/
  guides/        # evergreen, undated topical articles
    <slug>.mdx
  updates/       # dated announcements (empty at launch)
    <slug>.mdx
```

Each `.mdx` file carries YAML frontmatter and a Markdown/MDX body.

- Guide frontmatter: `title`, `description`, `slug`, `cluster` (`"messianic" | "polygyny" | "cross-border"`), `updated` (ISO date string).
- Update frontmatter: `title`, `description`, `slug`, `date` (ISO date string), `author` (optional).

### Content loader (`src/lib/content.ts`)

A single typed module that reads the content directories with `fs` at build time, parses frontmatter with `gray-matter`, computes reading time with `reading-time`, and exposes:

- `getGuides(): GuideMeta[]` (sorted by cluster then title)
- `getGuide(slug): { meta: GuideMeta; body: string } | null`
- `getUpdates(): UpdateMeta[]` (sorted newest first)
- `getUpdate(slug): { meta: UpdateMeta; body: string } | null`

This module is the CMS-swap seam: a future migration replaces only this file. Types `GuideMeta` and `UpdateMeta` are exported for consumers.

### MDX rendering

Uses the Next 16 native MDX pipeline (`@next/mdx`), per `node_modules/next/dist/docs/01-app/02-guides/mdx.md`. `next.config.ts` is wrapped with `withMDX`, configured with `remark-frontmatter` so YAML frontmatter is stripped from the rendered body (it does not leak as text). Article pages are server components that `await import("@/content/guides/<slug>.mdx")` for the body component and read metadata via the content loader. A required `src/mdx-components.tsx` maps headings, paragraphs, links (Next `<Link>` for internal), lists, and blockquotes to the existing marketing tokens. Routes use `generateStaticParams` + `export const dynamicParams = false` so unknown slugs 404. `params` is typed `Promise<{ slug: string }>` and awaited (Next 16).

Content lives under `src/content/` (matching the `@/*` -> `./src/*` alias) rather than a repo-root `content/`.

New dependencies: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`, `remark-frontmatter`, `gray-matter`, `reading-time`.

### Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/resources` | static | Hub index: guides grid grouped by cluster, plus a "Latest updates" row rendered only when `getUpdates()` is non-empty. |
| `/resources/[slug]` | SSG (`generateStaticParams` from `getGuides()`) | A guide article. |
| `/resources/updates` | static | Dated updates index (empty state when none). |
| `/resources/updates/[slug]` | SSG (`generateStaticParams` from `getUpdates()`) | A dated update. |

The static `/resources/updates` segment takes precedence over the dynamic `/resources/[slug]`, so there is no collision.

### Components (`src/components/app/resources/`)

- `ResourceHero` — index hero (eyebrow, display H1, subhead), reusing the landing hero rhythm.
- `ArticleCard` — title, description, cluster/date meta, reading time; links to the article.
- `ArticleList` — maps cards into the responsive grid.
- `mdx-components.tsx` — the element-to-style map for compiled MDX.

Article and index pages reuse `MarketingHeader` and `MarketingFooter`.

## Structured data

- Article pages: `Article` (headline, description, `datePublished`/`dateModified`, `author` + `publisher` = existing Organization `@id` at `https://ahavah.app/#organization`) + `BreadcrumbList`.
- Index pages (`/resources`, `/resources/updates`): `CollectionPage` + `BreadcrumbList`.

## Seed guides (drafted in-house, owner-approved, em-dash-free)

1. `how-to-find-a-torah-observant-spouse` (cluster: messianic) — finding a spouse who shares the walk; what to look for; how Ahavah's verification + belief filters help. Links to `/messianic-matchmaking` and `/waitlist`.
2. `biblical-plural-marriage-online` (cluster: polygyny) — what an online platform should get right for plural marriage; trust, openness, safety. Doctrine minimal, owner-vetted. Links to `/biblical-polygyny` and `/waitlist`.
3. `marrying-across-borders-safely` (cluster: cross-border) — verification and safety for diaspora couples; language; meeting across countries. Links to `/faith-marriage-abroad` and `/waitlist`.

Each guide is roughly 600 to 900 words.

## Plumbing and internal linking

- `src/app/sitemap.ts`: import the content loader and append `/resources`, `/resources/updates`, every guide URL, and every update URL dynamically.
- `MarketingHeader`/`MarketingFooter`: add a "Resources" link.
- Cross-linking: each Sub-project A landing page links to its matching guide; each guide links back to its landing page and to `/waitlist`.
- A lean `/resources/rss.xml` route emitting the updates feed (guides optional). Built with a hand-rolled `Response` (XML string) to avoid an extra dep.

## Error handling

Static content. `getGuide`/`getUpdate` returning `null` triggers `notFound()` (Next default 404). Bad article slugs 404 cleanly. No runtime data fetching.

## Testing and verification (gate before "done")

1. `pnpm exec tsc --noEmit` clean and `pnpm build` clean (rerun tsc after build).
2. Rendered screenshots (headless Chrome) of `/resources`, each of the 3 guide pages, and `/resources/updates` (empty state), actually viewed.
3. Owner doctrinal sign-off on the polygyny guide before deploy.
4. Post-deploy live `curl`: each article has a unique title, canonical, Article + BreadcrumbList JSON-LD; the hub lists the 3 guides; the dynamic `sitemap.xml` includes the hub + 3 guides; `/resources/rss.xml` is valid XML.
5. Follow every new internal link (nav/footer "Resources", landing-to-guide, guide-to-landing, guide-to-waitlist) on the live site: no 404/soft-404.

## Deploy

Push `master`; Vercel builds and deploys. Verify live per the gate.

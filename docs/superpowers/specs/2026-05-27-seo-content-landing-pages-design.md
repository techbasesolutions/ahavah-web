# SEO Content Layer — Keyword Landing Pages + Expanded FAQ (Phase 2, Sub-project A)

Date: 2026-05-27
Status: Approved (design)
Scope owner: ahavah-web
Supersedes: nothing. Builds on the SEO technical foundation shipped in commit 1900fa8 (robots, sitemap, canonicals, site + FAQ JSON-LD, OG image).

## Context

Phase 1 shipped the technical SEO foundation. The site is crawlable and well-structured but has almost no rankable content depth. Phase 2 is the content-acquisition layer. It was scoped into two sub-projects:

- **Sub-project A (this spec):** three keyword landing pages plus an expanded FAQ. Finite, build now.
- **Sub-project B (separate later spec):** an ongoing blog / resources hub. Out of scope here.

Target keyword clusters, all selected by the product owner:

1. Niche identity terms (messianic / Torah-observant matchmaking). Highest intent, near-zero competition.
2. Polygyny / biblical (plural) marriage. A differentiator no mainstream app serves; doctrinally sensitive.
3. Cross-border / diaspora (international, verified, 100+ languages).

## Goals

- Add three evergreen, server-rendered landing pages, one per cluster, that target distinct high-intent queries.
- Deepen the FAQ from 6 to roughly 16 to 20 questions, clustered by theme, to win AEO/GEO answer-engine surfacing.
- Pass internal link equity to the new pages and register them for crawl/discovery.
- Do all of this on the existing marketing design system, introducing no new design language.

## Non-goals

- No blog / resources hub (Sub-project B).
- No new doctrinal or scriptural assertions. The polygyny page keeps claims grounded in positioning already published on the site (the existing FAQ already states polygyny is a recognised path).
- No paid acquisition, no off-site link building.

## Architecture

### Route pages (server components)

Three new routes, each a **server component** (no `"use client"`), so each exports `metadata` directly and emits JSON-LD without the co-located `layout.tsx` workaround the existing client marketing pages use.

| Slug | Cluster | Primary intent phrases |
|------|---------|------------------------|
| `/messianic-matchmaking` | Niche identity | messianic dating, Torah-observant matchmaking, Hebrew Roots singles |
| `/biblical-polygyny` | Plural marriage | biblical polygyny, plural marriage community, faith-based plural marriage |
| `/faith-marriage-abroad` | Cross-border | international faith-based marriage, verified spouse abroad, diaspora matchmaking |

Each route file is thin: it imports a typed content object and composes the shared sections below.

### Shared section primitives

New folder `src/components/app/landing/`, one concern per file:

- `LandingHero` — eyebrow, H1 (keyword-led), subhead, primary CTA to `/waitlist`.
- `FeatureGrid` — 2 to 3 value cards specific to the cluster.
- `LandingFaq` — **client** component (accordion interactivity); renders a page-specific Q&A set and emits FAQPage JSON-LD.
- `LandingCta` — closing conversion band linking to `/waitlist`.

All reuse the existing marketing chrome (`MarketingHeader`, `MarketingFooter`) and the established tokens (`--ink`, `--ink-2`, `--lavender`, `--lime`, `--card`, `--hairline`) and the `clamp()` type rhythm from `src/app/page.tsx` and `src/app/faq/page.tsx`. No new visual system.

### Content modules

Per-page copy lives in a typed content object (co-located with the route or in `src/app/<slug>/content.ts`). Shape:

```ts
type LandingContent = {
  eyebrow: string;
  h1: string;          // includes a colored terminal accent span like the existing hero
  subhead: string;
  features: { title: string; body: string }[];   // 2-3
  faqs: { q: string; a: string }[];                // 3-5
  metaTitle: string;   // feeds the page <title> via metadata
  metaDescription: string;
};
```

This keeps the rendering generic (approach C) while letting each page differ in copy and shape.

## Data flow

Fully static (SSG). No runtime fetch, no client data. Content is compile-time constants. Pages render: JSON-LD scripts, then `MarketingHeader`, then composed sections, then `MarketingFooter`.

## Structured data per page

- `WebPage` plus `BreadcrumbList` JSON-LD (Home > page).
- `FAQPage` JSON-LD emitted by `LandingFaq` from that page's `faqs`.
- Unique `metadata`: `title` (via template `%s · Ahavah`), `description`, `alternates.canonical: "/<slug>"`, and openGraph `url`/`title`/`description`. Reuses the global `/og.png`.

## Expanded FAQ (`/faq`)

Grow the existing `FAQS` array in `src/app/faq/page.tsx` from 6 to roughly 16 to 20 entries, organised into four themes:

1. General (what Ahavah is, free?, launch timing, PWA)
2. Beliefs and marriage (who it is for, polygyny path, courtship not dating)
3. Verification and safety (the three tiers, Stripe Identity, data handling)
4. Cross-border (languages, distance, relocation)

Light UI grouping with section subheads inside the existing accordion. The existing FAQPage JSON-LD already maps the whole array, so it scales with no schema change.

## SEO plumbing and internal linking

- Add the three slugs to `src/app/sitemap.ts` (priority 0.7, changeFrequency monthly). They are already crawl-allowed (not in the `robots.ts` disallow list); no robots change needed.
- Add a **"Who it's for"** link column to `MarketingFooter` pointing at the three landing pages, so crawlers discover them and they receive internal link equity. Add contextual links from the home page where natural.

## Copy rules

- I draft all copy. One consistent voice across all three pages and the FAQ.
- **No em dashes** in any user-facing string (standing project rule). Use periods, commas, or restructure.
- Polygyny page: claims stay grounded in already-published positioning. No new scriptural or doctrinal assertions invented.
- Avoid the phrase "dating app" in body copy; use matchmaking / find a spouse / courtship, consistent with the rest of the site.

## Error handling

Static pages, so no data-error paths. Bad URLs fall through to the Next default 404. Every internal link added must resolve (no 404 / soft-404), verified before done.

## Testing and verification (gate before "done")

1. `tsc` clean and `next build` clean (rerun `tsc` after build so regenerated `.next/types` are picked up).
2. **Rendered screenshots** of each of the three pages plus the expanded `/faq`, actually viewed (headless Chrome), not class-name checks. Per the verify-rendered-pixels rule.
3. Post-deploy live `curl` of each page confirming: unique `<title>`, `canonical`, WebPage/BreadcrumbList/FAQPage JSON-LD present and valid; and the updated `sitemap.xml` lists the three new URLs.
4. Follow every new internal link on the live site (footer + home) and confirm no 404/soft-404, real content not placeholders.

## Deploy

Standard web flow: push `master`, Vercel builds and deploys. Verify live per the gate above.

## Decomposition note

Sub-project B (blog / resources hub) is intentionally excluded and will get its own spec and plan when this ships and is validated.

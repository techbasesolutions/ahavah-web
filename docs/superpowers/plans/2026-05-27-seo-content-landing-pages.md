# SEO Content Layer (Landing Pages + Expanded FAQ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three keyword landing pages and a deeper clustered FAQ to win high-intent organic and answer-engine traffic, built entirely on the existing marketing design system.

**Architecture:** Three server-component routes (`/messianic-matchmaking`, `/biblical-polygyny`, `/faith-marriage-abroad`) compose a small set of reusable marketing sections from `src/components/app/landing/`. The sections reuse the existing `MarketingHeader`/`MarketingFooter` and design tokens. Content is inlined per page as typed consts (matching the established `community`/`faq` pattern). Each page exports its own `metadata` and emits WebPage + BreadcrumbList JSON-LD; the FAQ block emits FAQPage JSON-LD.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, Tailwind v4, Base UI kit primitives, lucide-react, pnpm.

---

## Conventions (read before starting)

- Per `AGENTS.md`: this is Next 16, not the Next.js in your training data. Read `node_modules/next/dist/docs/` before any non-trivial Next API use (especially `metadata`/`Metadata` typing).
- **No em dashes** in any user-facing string. Standing project rule. Use periods/commas or restructure.
- Avoid the literal phrase "dating app" in body copy. Use "matchmaking", "find a spouse", "courtship".
- Marketing pages use arbitrary Tailwind values (`text-[clamp(...)]`), so each new page/section file that uses them needs a top-of-file `/* eslint-disable no-restricted-syntax */` (same as `src/app/page.tsx`, `src/app/community/page.tsx`).
- Landing CTAs link to `/waitlist` (the dedicated capture wizard), not `/`.
- Typecheck: `pnpm exec tsc --noEmit`. Build: `pnpm build`. Lint a file: `pnpm lint`.
- Server components MAY render the `"use client"` `MarketingHeader`/`MarketingFooter`/`LandingFaq` — this is supported and intended.

## File Structure

- Create `src/components/app/landing/landing-sections.tsx` — `LandingHero`, `FeatureGrid`, `LandingCta` (server-compatible, no hooks).
- Create `src/components/app/landing/landing-faq.tsx` — `LandingFaq` (`"use client"`; accordion + FAQPage JSON-LD).
- Create `src/components/app/landing/landing-jsonld.ts` — `buildLandingGraph()` helper (WebPage + BreadcrumbList).
- Create `src/app/messianic-matchmaking/page.tsx` — server page + inline content.
- Create `src/app/biblical-polygyny/page.tsx` — server page + inline content.
- Create `src/app/faith-marriage-abroad/page.tsx` — server page + inline content.
- Modify `src/app/faq/page.tsx` — grouped + expanded FAQ.
- Modify `src/app/sitemap.ts` — add the three new routes.
- Modify `src/components/app/marketing-footer.tsx` — add a "Who it's for" link column.

---

### Task 1: Landing JSON-LD helper

**Files:**
- Create: `src/components/app/landing/landing-jsonld.ts`

- [ ] **Step 1: Write the helper**

```ts
// Builds WebPage + BreadcrumbList structured data for a landing page.
// FAQPage is emitted separately by LandingFaq. Kept tiny + pure so each
// server page can `JSON.stringify` the result into a single <script>.
const BASE = "https://ahavah.app";

export function buildLandingGraph(opts: {
  slug: string; // e.g. "messianic-matchmaking" (no leading slash)
  name: string; // page title text
  description: string;
}) {
  const url = `${BASE}/${opts.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: opts.name,
        description: opts.description,
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: opts.name, item: url },
        ],
      },
    ],
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors referencing this file).

- [ ] **Step 3: Commit**

```bash
git add src/components/app/landing/landing-jsonld.ts
git commit -m "feat(landing): JSON-LD helper for landing pages"
```

---

### Task 2: Landing section primitives (Hero, FeatureGrid, Cta)

**Files:**
- Create: `src/components/app/landing/landing-sections.tsx`

- [ ] **Step 1: Write the sections**

```tsx
// Reusable marketing sections for the SEO landing pages. Server-compatible
// (no hooks). Reuses the landing design tokens + clamp() rhythm established
// in src/app/page.tsx / src/app/community/page.tsx.
/* eslint-disable no-restricted-syntax */

import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHero({
  eyebrow,
  title,
  subhead,
}: {
  eyebrow: string;
  title: ReactNode; // allow a colored accent span
  subhead: string;
}) {
  return (
    <header className="flex flex-col gap-4 max-w-[760px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
        {eyebrow}
      </span>
      <h1
        className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
        style={{
          fontFamily: "var(--font-display)",
          lineHeight: 0.94,
          letterSpacing: "-0.025em",
          fontWeight: 400,
        }}
      >
        {title}
      </h1>
      <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">{subhead}</p>
      <div className="mt-2">
        <Button
          tone="elevated"
          size="tap"
          render={<Link href="/waitlist" prefetch={false} />}
          className="rounded-xl"
        >
          Join the waitlist
        </Button>
      </div>
    </header>
  );
}

export function FeatureGrid({
  features,
}: {
  features: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <div
          key={f.title}
          className="rounded-2xl border border-(--hairline) bg-(--card) p-6 flex flex-col gap-2"
        >
          <h2 className="m-0 text-lg font-bold text-(--ink) tracking-tight">{f.title}</h2>
          <p className="m-0 text-base leading-[1.65] text-(--ink-2)">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

export function LandingCta({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="rounded-3xl border border-lavender/30 bg-lavender/10 p-8 lg:p-12 flex flex-col gap-4 items-start">
      <h2
        className="m-0 text-(--ink) text-[clamp(28px,4vw,44px)]"
        style={{ fontFamily: "var(--font-display)", lineHeight: 1.0, fontWeight: 400 }}
      >
        {heading}
      </h2>
      <p className="m-0 text-base lg:text-lg leading-[1.6] text-(--ink-2) max-w-[620px]">{body}</p>
      <Button
        tone="elevated"
        size="tap"
        render={<Link href="/waitlist" prefetch={false} />}
        className="rounded-xl"
      >
        Join the waitlist
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/landing/landing-sections.tsx
git commit -m "feat(landing): hero, feature grid, cta sections"
```

---

### Task 3: LandingFaq client section (accordion + FAQPage JSON-LD)

**Files:**
- Create: `src/components/app/landing/landing-faq.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

// Per-page FAQ section for landing pages. Renders the accordion AND emits
// FAQPage structured data built from the same array (AEO/answer engines).
/* eslint-disable no-restricted-syntax */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function LandingFaq({
  heading,
  faqs,
}: {
  heading: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="flex flex-col gap-5 max-w-[760px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h2 className="m-0 text-2xl lg:text-3xl font-bold text-(--ink) tracking-tight">{heading}</h2>
      <Accordion className="flex flex-col gap-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`lf-${i}`}
            className="rounded-2xl border border-(--hairline) bg-(--card) px-5"
          >
            <AccordionTrigger className="py-4 text-base font-semibold text-(--ink) hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-meta leading-relaxed text-(--ink-2)">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/landing/landing-faq.tsx
git commit -m "feat(landing): per-page FAQ section with FAQPage schema"
```

---

### Task 4: `/messianic-matchmaking` page

**Files:**
- Create: `src/app/messianic-matchmaking/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// /messianic-matchmaking — SEO landing page (niche identity cluster).
// Server component: exports metadata + emits WebPage/BreadcrumbList JSON-LD.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";

const TITLE = "Messianic & Torah-observant matchmaking";
const DESCRIPTION =
  "Ahavah is matchmaking for Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Verified profiles, shared-belief filters, members across the diaspora.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/messianic-matchmaking" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/messianic-matchmaking" },
};

const FEATURES = [
  {
    title: "Built around shared belief",
    body: "Filter by observance, assembly, and the convictions that actually matter to a marriage. No swiping past people who could never share your Sabbath or your table.",
  },
  {
    title: "Verified, not anonymous",
    body: "Every member passes identity verification before matching. Three tiers of trust, so you know the person across the screen is real.",
  },
  {
    title: "Across borders, in your language",
    body: "Members span the diaspora and over 100 languages. Distance is not a dealbreaker when the goal is marriage.",
  },
];

const FAQS = [
  {
    q: "Who is Ahavah for?",
    a: "Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Members across the diaspora meet with verified identity and shared-belief filters.",
  },
  {
    q: "How is this different from a mainstream app?",
    a: "Ahavah is built for marriage, not casual dating. Profiles are verified, belief filters come first, and the culture is courtship-minded rather than swipe-driven.",
  },
  {
    q: "Is it free to join?",
    a: "The waitlist is free. At launch the core experience is free, with optional Premium and per-action tokens.",
  },
  {
    q: "When does it launch?",
    a: "Founding members are invited in summer 2026. Join the waitlist for a one-tap sign-in link when invites open.",
  },
];

export default function MessianicMatchmakingPage() {
  const graph = buildLandingGraph({ slug: "messianic-matchmaking", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Messianic matchmaking"
          title={<>Matchmaking for Torah-observant believers<span className="text-(--color-lime)">.</span></>}
          subhead="Ahavah is where Messianic, Hebrew Roots, and Torah-observant believers meet a spouse who shares their walk. Verified profiles, shared-belief filters, and members across the diaspora."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="Find someone who shares your walk."
          body="The waitlist is free and takes a minute. Founding members are invited first."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/messianic-matchmaking/page.tsx
git commit -m "feat(landing): /messianic-matchmaking page"
```

---

### Task 5: `/biblical-polygyny` page

NOTE: doctrinally sensitive. Copy below stays grounded in positioning already published in `src/app/faq/page.tsx` (polygyny is a recognised path, not for never-married singles only). No new scriptural claims. Flag for owner review at the verification step.

**Files:**
- Create: `src/app/biblical-polygyny/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// /biblical-polygyny — SEO landing page (plural-marriage cluster).
// Doctrinally sensitive: claims stay grounded in existing site positioning.
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";

const TITLE = "Biblical plural marriage matchmaking";
const DESCRIPTION =
  "Ahavah recognises biblical plural marriage as a path. Verified members, shared-belief filters, and a platform with a place for it instead of forcing the conversation off-app.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/biblical-polygyny" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/biblical-polygyny" },
};

const FEATURES = [
  {
    title: "Recognised, not hidden",
    body: "Members can be open about seeking or living plural marriage. The platform has a place for it instead of forcing the conversation off-app.",
  },
  {
    title: "Verified members",
    body: "Identity verification applies to everyone. Trust signals matter even more when families are involved.",
  },
  {
    title: "Filter by conviction",
    body: "Match on observance and belief, including views on marriage, so first conversations start from common ground.",
  },
];

const FAQS = [
  {
    q: "Does Ahavah support plural marriage?",
    a: "Yes. Polygyny is a recognised path on the platform, so it is not for never-married singles only. Members can be open about what they are seeking.",
  },
  {
    q: "Is this only for men seeking additional wives?",
    a: "No. The platform serves anyone whose convictions include plural marriage, alongside the same verification and belief filters everyone uses.",
  },
  {
    q: "How do you keep it safe?",
    a: "All members pass identity verification, and the community guidelines apply equally. Report and block tools are built in.",
  },
  {
    q: "When can I join?",
    a: "Founding members are invited in summer 2026. Join the waitlist for a one-tap sign-in link when invites open.",
  },
];

export default function BiblicalPolygynyPage() {
  const graph = buildLandingGraph({ slug: "biblical-polygyny", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Biblical marriage"
          title={<>A platform that recognises plural marriage<span className="text-(--color-lime)">.</span></>}
          subhead="Most matchmaking platforms have no category for it. Ahavah treats biblical plural marriage as a recognised path, with verified members and shared-belief filters."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="A place for what you believe."
          body="The waitlist is free. Be open about what you are seeking from the start."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/biblical-polygyny/page.tsx
git commit -m "feat(landing): /biblical-polygyny page"
```

---

### Task 6: `/faith-marriage-abroad` page

**Files:**
- Create: `src/app/faith-marriage-abroad/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// /faith-marriage-abroad — SEO landing page (cross-border cluster).
/* eslint-disable no-restricted-syntax */

import type { Metadata } from "next";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";
import { LandingHero, FeatureGrid, LandingCta } from "@/components/app/landing/landing-sections";
import { LandingFaq } from "@/components/app/landing/landing-faq";
import { buildLandingGraph } from "@/components/app/landing/landing-jsonld";

const TITLE = "International faith-based marriage";
const DESCRIPTION =
  "Ahavah connects Torah-observant believers across the diaspora. Verified profiles, over 100 languages, and tools built for meeting a spouse who lives in another country.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faith-marriage-abroad" },
  openGraph: { title: `${TITLE} · Ahavah`, description: DESCRIPTION, url: "https://ahavah.app/faith-marriage-abroad" },
};

const FEATURES = [
  {
    title: "A worldwide community",
    body: "Members are spread across continents. If the right person lives abroad, that should be the start of the story, not the end.",
  },
  {
    title: "Over 100 languages",
    body: "Language should not stand between two believers. Ahavah is built to bridge it.",
  },
  {
    title: "Verified before you meet",
    body: "International introductions carry more risk. Identity verification and three tiers of trust reduce it before you ever talk.",
  },
];

const FAQS = [
  {
    q: "Can I match with someone in another country?",
    a: "Yes. Ahavah is built for the diaspora, so cross-border matching is the norm, not the exception.",
  },
  {
    q: "How many languages are supported?",
    a: "Over 100. The platform is designed so language differences do not block a connection.",
  },
  {
    q: "How do you handle trust across borders?",
    a: "Every member passes identity verification, with three tiers of trust signals. You see how verified someone is before you engage.",
  },
  {
    q: "When does it launch?",
    a: "Founding members are invited in summer 2026. Join the waitlist for a one-tap sign-in link when invites open.",
  },
];

export default function FaithMarriageAbroadPage() {
  const graph = buildLandingGraph({ slug: "faith-marriage-abroad", name: TITLE, description: DESCRIPTION });
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <MarketingHeader />
      <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-12">
        <LandingHero
          eyebrow="Across borders"
          title={<>Meet a spouse across borders<span className="text-(--color-lime)">.</span></>}
          subhead="Ahavah connects Torah-observant believers across the diaspora. Verified profiles, over 100 languages, and tools built for meeting someone who lives in another country."
        />
        <FeatureGrid features={FEATURES} />
        <LandingFaq heading="Common questions" faqs={FAQS} />
        <LandingCta
          heading="The right person might live abroad."
          body="The waitlist is free. Meet verified believers across the diaspora."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/faith-marriage-abroad/page.tsx
git commit -m "feat(landing): /faith-marriage-abroad page"
```

---

### Task 7: Expand the FAQ (`/faq`) into clustered groups

**Files:**
- Modify: `src/app/faq/page.tsx`

Replace the flat `FAQS` const (lines 25-50) with grouped data, build `ALL_FAQS` for the schema, and render subheads per group.

- [ ] **Step 1: Replace the `FAQS` const with grouped data**

Replace the existing `const FAQS: ReadonlyArray<...> = [ ... ];` block with:

```tsx
const FAQ_GROUPS: ReadonlyArray<{ theme: string; items: ReadonlyArray<{ q: string; a: string }> }> = [
  {
    theme: "General",
    items: [
      {
        q: "Who is Ahavah for?",
        a: "Messianic, Hebrew Roots, and Torah-observant believers seeking a spouse. Members across the diaspora can meet across borders with verified identity and shared-belief filters. Polygyny is a recognised path, so the platform is not for never-married singles only.",
      },
      {
        q: "Is Ahavah a dating app?",
        a: "Ahavah is matchmaking built for marriage, not casual dating. The culture is courtship-minded, and the tools are made to help you find a spouse.",
      },
      {
        q: "Is it free?",
        a: "The waitlist is free. At launch, the core experience is free; Premium and per-action tokens are optional.",
      },
      {
        q: "Will it work on my phone?",
        a: "Ahavah is a Progressive Web App. Add to Home Screen on iOS and Android. There is no separate app store binary at launch.",
      },
      {
        q: "When does it launch?",
        a: "Summer 2026 for founding members. The waitlist will receive an email with a one-tap sign-in link as soon as invites open.",
      },
    ],
  },
  {
    theme: "Beliefs and marriage",
    items: [
      {
        q: "What beliefs is Ahavah built around?",
        a: "Ahavah serves Messianic, Hebrew Roots, and Torah-observant believers. Shared-belief filters let you match on observance and conviction.",
      },
      {
        q: "Does Ahavah recognise plural marriage?",
        a: "Yes. Polygyny is a recognised path on the platform, so it is not for never-married singles only. Members can be open about what they are seeking.",
      },
      {
        q: "Is this for casual dating?",
        a: "No. Ahavah is for people seeking marriage. If you are looking for something casual, this is not the platform.",
      },
    ],
  },
  {
    theme: "Verification and safety",
    items: [
      {
        q: "What is verification?",
        a: "Three tiers (Bronze, Silver, Gold) of identity checks. Bronze is required to start matching. Higher tiers unlock more trust signals to other members.",
      },
      {
        q: "How is my data handled?",
        a: "Verification documents are processed by Stripe Identity; we only receive a verified or not-verified result. Profile data is used only to match you. See /privacy for the full policy.",
      },
      {
        q: "How do you keep the community safe?",
        a: "Identity verification, clear community guidelines, and built-in report and block tools. We act on every report.",
      },
      {
        q: "Can I report or block someone?",
        a: "Yes. Use the menu on any profile or chat to report or block, or email admin@ahavah.app.",
      },
    ],
  },
  {
    theme: "Across borders",
    items: [
      {
        q: "Can I match with someone in another country?",
        a: "Yes. Ahavah is built for the diaspora, so cross-border matching is the norm.",
      },
      {
        q: "How many languages are supported?",
        a: "Over 100. Language differences should not block a connection.",
      },
      {
        q: "Do I have to relocate?",
        a: "That is between you and your match. Ahavah helps you meet; where you build a life is your decision.",
      },
      {
        q: "How do I contact a real person?",
        a: "Email admin@ahavah.app. A human reads it.",
      },
    ],
  },
];

const ALL_FAQS = FAQ_GROUPS.flatMap((g) => g.items);
```

- [ ] **Step 2: Update the JSON-LD source**

In `FaqPage()`, change `mainEntity: FAQS.map(...)` to `mainEntity: ALL_FAQS.map(...)`. The `.map` callback body is unchanged.

- [ ] **Step 3: Replace the single Accordion render with grouped rendering**

Replace the existing `<Accordion className="flex flex-col gap-3"> ... </Accordion>` block with grouped output:

```tsx
<div className="flex flex-col gap-10">
  {FAQ_GROUPS.map((group) => (
    <section key={group.theme} className="flex flex-col gap-4">
      <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-(--color-lavender)">
        {group.theme}
      </h2>
      <Accordion className="flex flex-col gap-3">
        {group.items.map((faq, i) => (
          <AccordionItem
            key={`${group.theme}-${i}`}
            value={`${group.theme}-${i}`}
            className="rounded-2xl border border-(--hairline) bg-(--card) px-5"
          >
            <AccordionTrigger className="py-4 text-base font-semibold text-(--ink) hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-meta leading-relaxed text-(--ink-2)">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  ))}
</div>
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (If TS flags an unused `FAQS`, you removed it in Step 1 — confirm no stray references remain.)

- [ ] **Step 5: Commit**

```bash
git add src/app/faq/page.tsx
git commit -m "feat(faq): expand to 16 clustered questions across 4 themes"
```

---

### Task 8: Sitemap + footer internal links

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/components/app/marketing-footer.tsx`

- [ ] **Step 1: Add the three routes to the sitemap**

In `src/app/sitemap.ts`, add these three entries to the `routes` array (after the `/waitlist` line, before `/privacy`):

```ts
    { path: "/messianic-matchmaking", priority: 0.7, changeFrequency: "monthly" },
    { path: "/biblical-polygyny", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faith-marriage-abroad", priority: 0.7, changeFrequency: "monthly" },
```

- [ ] **Step 2: Add a "Who it's for" column to the footer**

In `src/components/app/marketing-footer.tsx`, add this const after `PRODUCT_LINKS` (line 26):

```tsx
const AUDIENCE_LINKS = [
  { href: "/messianic-matchmaking", label: "Messianic matchmaking" },
  { href: "/biblical-polygyny",     label: "Biblical marriage" },
  { href: "/faith-marriage-abroad", label: "Across borders" },
];
```

Change the desktop grid from 4 to 5 columns and insert the new column. Replace the desktop grid container line:

```tsx
<div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 mb-12">
```

with:

```tsx
<div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8 mb-12">
```

and add `<FooterCol title="Who it's for" links={AUDIENCE_LINKS} />` immediately after the `<FooterCol title="Product" ... />` line in the desktop grid.

Then add the matching mobile accordion column: after `<FooterAccordionCol title="Product" links={PRODUCT_LINKS} />` add:

```tsx
<FooterAccordionCol title="Who it's for" links={AUDIENCE_LINKS} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.
Run: `pnpm lint`
Expected: PASS (no new errors).

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts src/components/app/marketing-footer.tsx
git commit -m "feat(seo): register landing pages in sitemap + footer nav"
```

---

### Task 9: Build, render verification, deploy, live verification

**Files:** none (verification + deploy).

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: PASS. The three new routes appear in the route list as static (prerendered).

- [ ] **Step 2: Re-typecheck after build**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (regenerated `.next/types` are clean).

- [ ] **Step 3: Render screenshots locally (per verify-rendered-pixels rule)**

Start the prod server: `pnpm start` (port 3000) and capture rendered screenshots (headless Chrome / CDP) of, and actually view:
- `http://localhost:3000/messianic-matchmaking`
- `http://localhost:3000/biblical-polygyny`
- `http://localhost:3000/faith-marriage-abroad`
- `http://localhost:3000/faq`

Confirm: hero renders with display font + lime accent, feature grid is 3-up on desktop, FAQ accordion expands, footer shows the new "Who it's for" column, no layout break. Stop the server when done.

- [ ] **Step 4: Owner review of polygyny copy**

Surface the `/biblical-polygyny` screenshot + copy to the owner for doctrinal sign-off before deploy (per the spec guardrail). Hold deploy of that page if changes are requested; the other two and the FAQ can ship regardless.

- [ ] **Step 5: Deploy**

```bash
git push origin master
```
Vercel builds and deploys. Wait for the deployment to go live.

- [ ] **Step 6: Live verification (curl)**

For each of the three new URLs and `/faq`, confirm via `curl -s <url>`:
- unique `<title>` and `<link rel="canonical">` matching the page
- WebPage + BreadcrumbList JSON-LD present (landing pages); FAQPage JSON-LD present (landing pages + /faq)
And confirm `curl -s https://ahavah.app/sitemap.xml` lists the three new URLs.

- [ ] **Step 7: Follow every internal link (per renders-not-works rule)**

On the live site, click/curl each new footer "Who it's for" link and each landing CTA. Confirm no 404 / soft-404 and that content is the real page, not a fallback.

- [ ] **Step 8: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "fix(landing): post-verification adjustments"
git push origin master
```

---

## Self-Review

**Spec coverage:**
- 3 landing pages (one per cluster): Tasks 4, 5, 6. ✓
- Approach C shared sections on existing design system: Tasks 1-3. ✓
- Per-page metadata + canonical + WebPage/BreadcrumbList/FAQPage JSON-LD: Tasks 1, 3, 4-6. ✓
- Expanded clustered FAQ (~16): Task 7. ✓
- Sitemap registration + internal linking footer column: Task 8. ✓
- No em dashes / no "dating app" in body: enforced in Conventions + copy reviewed. ✓
- Verification gate (tsc, build, screenshots, live curl, link-following): Task 9. ✓
- Polygyny doctrinal guardrail + owner review: Task 5 note + Task 9 Step 4. ✓

**Placeholder scan:** No TBD/TODO; all copy and code is complete inline.

**Type consistency:** `buildLandingGraph({slug,name,description})` defined in Task 1, called identically in Tasks 4-6. `LandingHero`/`FeatureGrid`/`LandingCta` props defined in Task 2 match usage. `LandingFaq({heading,faqs})` defined in Task 3 matches usage. `FAQ_GROUPS`/`ALL_FAQS` defined and used within Task 7.

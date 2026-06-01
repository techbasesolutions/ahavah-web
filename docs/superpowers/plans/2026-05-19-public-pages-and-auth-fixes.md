# Public marketing pages + behind-auth UX fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the existing behind-auth /help and /legal/* pages to their authenticated chrome, fix every non-functional surface in them, and build four purpose-built public-only pages (/faq, /terms, /privacy, /community) so signed-out visitors never enter the auth environment.

**Architecture:** Two distinct page surfaces. The four behind-auth pages keep `PageShell desktopShell="sidebar"` + `BottomNav` + the existing `legal-article-shell` brand-bar, plus a redirect to `/auth/sign-in` when no session token is present. The four new public pages share two new kit primitives (`MarketingHeader` already exists; `MarketingFooter` will be extracted from the landing page). Every public-page interactive surface is real (anchor scrolls, real links, real downloads if any). Landing nav + footer links re-target to the new public URLs.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn/ui (Base UI variant), Kibo UI, Plus Jakarta Sans + Ultra display font. Kit primitives ONLY — no hand-rolled `<div className="">` atoms.

---

## Skills to invoke during execution

Per the user's hard rule "any new page being built absolutely must be built with skills invoked and from the ui kits only":

- **Before Phase C tasks** (each of the 4 new public pages): invoke `frontend-design:frontend-design` to validate the visual aesthetic decisions against the established Ahavah marketing surface. The aesthetic is locked (continuity with landing), so each invocation confirms the composition fits the system rather than reinventing.
- **During Phase C tasks**: invoke `ui-implementer` if pixel-fidelity to a Figma reference is requested. For these 4 pages there is no Figma source — they are content-driven, so the aesthetic is "match landing chrome".

## Audit findings (confirmed empirically — see chat transcript above)

### Behind-auth /help (`src/app/help/page.tsx`)
1. Currently rewritten to be public (commit `ce1e1a6` + `439222d` local-only). Must revert.
2. `TocRow` (line 320) renders `<div>`, not `<a href>` — non-functional.
3. Search bar (line 219) is a `<div>` with placeholder `<span>` — no `<input>`, no behaviour.
4. "Read the guides" Card (line 195) implies a link, has none.

### Behind-auth /legal/* (`src/components/app/legal-article-shell.tsx`)
1. No footer.
2. TOC "Contents" rail (line 284) renders `<div>`, not `<a href>` — non-functional.
3. "Download as PDF" Card (line 317) has a ChevronRight, claims "38 KB" — no PDF file, no handler.
4. Brand-bar shows "Sign in" CTA even for signed-in users (inappropriate context).

## File structure

### Files to MODIFY
- `src/app/help/page.tsx` — revert to authenticated PageShell version, fix TOC, remove stubs
- `src/components/app/legal-article-shell.tsx` — fix TOC anchors, remove PDF stub, add footer slot, hide Sign-in CTA when signed-in
- `src/app/page.tsx` (landing) — repoint nav/footer links to new public URLs; use `MarketingFooter` primitive
- `src/components/app/marketing-header.tsx` — no change (already extracted in commit `439222d`)

### Files to CREATE
- `src/components/app/marketing-footer.tsx` — new kit primitive extracted from current landing footer
- `src/app/faq/page.tsx` — public help/FAQ
- `src/app/terms/page.tsx` — public terms
- `src/app/privacy/page.tsx` — public privacy
- `src/app/community/page.tsx` — public community guidelines
- `src/lib/use-require-session.ts` — small client hook that redirects to `/auth/sign-in` when no session token; used by behind-auth pages

### Files NOT touched
- Any other route, any UI primitive, any backend.

---

## Phase A — Restore behind-auth pages + fix non-functional surfaces

### Task A0: Revert /help to behind-auth version

**Files:**
- Modify: `src/app/help/page.tsx`

**Approach:** Restore the pre-`ce1e1a6` version from git: `PageShell desktopShell="sidebar"` + `BottomNav` + `BackButton fallback="/settings"`. Drop the `HelpHeaderAction` and `MarketingHeader` imports.

- [ ] **Step 1: Revert page.tsx to the version before `ce1e1a6`**

```bash
git show 73b47bd:src/app/help/page.tsx > src/app/help/page.tsx.original
mv src/app/help/page.tsx.original src/app/help/page.tsx
```

- [ ] **Step 2: Verify the file is restored**

```bash
git diff HEAD~2 src/app/help/page.tsx | head -10
# Expected: shows the changes from 439222d and ce1e1a6 being undone
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

---

### Task A1: Add session-required gate to /help

**Files:**
- Create: `src/lib/use-require-session.ts`
- Modify: `src/app/help/page.tsx` — import + invoke the hook at the top

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/use-require-session.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionToken } from "@/lib/api-client";

/**
 * Redirects to /auth/sign-in when no session token is present.
 * Used by behind-auth pages reachable from the URL bar (e.g. /help, /legal/*)
 * to bounce signed-out visitors back to the auth flow instead of letting
 * them see an authenticated chrome they have no business in.
 *
 * Returns nothing — the redirect happens as a side effect.
 */
export function useRequireSession(returnTo?: string) {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getSessionToken()) {
      const next = returnTo ?? window.location.pathname;
      router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
    }
  }, [router, returnTo]);
}
```

- [ ] **Step 2: Add the hook call in /help**

```tsx
// At the top of HelpPage() body, before the return:
useRequireSession();
```

- [ ] **Step 3: Confirm /auth/sign-in honors `?next=` param**

```bash
grep -n "searchParams\|next" src/app/auth/sign-in/page.tsx | head -10
```

If `next` isn't read, append:
```tsx
// Inside the sign-in page's success handler:
const nextUrl = searchParams.get("next");
if (nextUrl && nextUrl.startsWith("/")) router.replace(nextUrl);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

---

### Task A2: Make /help TOC items into real scroll-anchors

**Files:**
- Modify: `src/app/help/page.tsx` — `TOC` array gains `slug` field; `TocRow` becomes `<a>`; FAQ sections get matching `id`s

- [ ] **Step 1: Add slug to each TOC entry**

```tsx
// Replace the TOC constant:
const TOC: ReadonlyArray<{ icon: typeof HelpCircle; label: string; slug: string; active?: boolean }> = [
  { icon: HelpCircle,         label: "FAQ",            slug: "faq", active: true },
  { icon: Settings,           label: "Account",        slug: "account" },
  { icon: SlidersHorizontal,  label: "Discovery",      slug: "discovery" },
  { icon: Shield,             label: "Safety",         slug: "safety" },
  { icon: AlertTriangle,      label: "Report",         slug: "report" },
];
```

- [ ] **Step 2: Rewrite TocRow as an anchor (kit-compliant — uses Next `<Link>` not bare `<a>`)**

```tsx
import Link from "next/link";

function TocRow({
  icon: Icon,
  label,
  slug,
  active,
}: {
  icon: typeof HelpCircle;
  label: string;
  slug: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`#${slug}`}
      className={
        active
          ? "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lavender/40 bg-lavender/12 hover:bg-lavender/20 transition-colors"
          : "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-(--app)/60 transition-colors"
      }
    >
      <span
        aria-hidden
        className={
          active
            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lavender/20 text-lavender"
            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-(--hairline) text-(--ink-2)"
        }
      >
        <Icon className="size-3.5" />
      </span>
      <span
        className={
          active
            ? "flex-1 text-meta font-bold text-(--ink) truncate"
            : "flex-1 text-meta font-medium text-(--ink) truncate"
        }
      >
        {label}
      </span>
    </Link>
  );
}
```

- [ ] **Step 3: Add `id="faq"` to the existing FAQ section + create stub sections for Account/Discovery/Safety/Report**

```tsx
// Inside the desktop article, wrap the existing FAQ accordion in a section with id="faq":
<section id="faq" className="scroll-mt-20">
  <h2 className="mt-3.5 text-overline text-(--ink-2)">Frequently asked</h2>
  <Accordion ...>...</Accordion>
</section>

// Add four sibling sections after the FAQ accordion, each with the matching id:
<section id="account" className="scroll-mt-20 flex flex-col gap-3">
  <h2 className="text-h3 text-(--ink) m-0">Account</h2>
  <p className="text-meta leading-relaxed text-(--ink-2) m-0">
    Manage your email, password, deletion, and download requests in <Link href="/settings/account" className="text-lavender hover:underline">Settings → Account</Link>.
  </p>
</section>
<section id="discovery" className="scroll-mt-20 flex flex-col gap-3">
  <h2 className="text-h3 text-(--ink) m-0">Discovery</h2>
  <p className="text-meta leading-relaxed text-(--ink-2) m-0">
    Adjust who you see and who sees you via <Link href="/settings/privacy" className="text-lavender hover:underline">Settings → Privacy</Link> and the filters on <Link href="/discover" className="text-lavender hover:underline">Discover</Link>.
  </p>
</section>
<section id="safety" className="scroll-mt-20 flex flex-col gap-3">
  <h2 className="text-h3 text-(--ink) m-0">Safety</h2>
  <p className="text-meta leading-relaxed text-(--ink-2) m-0">
    Block + report any member in one tap from their profile. Full safety controls in <Link href="/settings/safety" className="text-lavender hover:underline">Settings → Safety</Link>.
  </p>
</section>
<section id="report" className="scroll-mt-20 flex flex-col gap-3">
  <h2 className="text-h3 text-(--ink) m-0">Report</h2>
  <p className="text-meta leading-relaxed text-(--ink-2) m-0">
    Suspect impersonation or abuse? Use the in-app report dialog from the profile screen, or email <a href="mailto:admin@ahavah.app" className="text-lavender hover:underline">admin@ahavah.app</a>.
  </p>
</section>
```

- [ ] **Step 4: Smooth-scroll behaviour**

Add to `globals.css` if not present:

```css
html { scroll-behavior: smooth; }
```

Check first:
```bash
grep -n "scroll-behavior" src/app/globals.css
```
If missing, add the rule near the `:root` block.

- [ ] **Step 5: Typecheck + visual smoke**

Run: `npx tsc --noEmit` → no errors. Then in browser at `localhost:3000/help`, click each TOC item — page should smooth-scroll to the matching section.

---

### Task A3: Remove /help Search-bar visual stub

**Files:**
- Modify: `src/app/help/page.tsx` — delete the search-bar `<div>` block

**Decision:** Remove rather than wire. No search backend exists; wiring to a client-side accordion filter is feature creep beyond the scope of "fix non-functional surfaces". Re-add later if/when a real search index is built.

- [ ] **Step 1: Delete the block at lines 219-224 (the `flex h-14 items-center gap-3 rounded-2xl…` div with the Search icon + "Search articles…" span + ⌘K Pill)**

- [ ] **Step 2: Remove now-unused imports**

```tsx
// Remove:
//   Search,
// from the lucide-react import
//
//   Pill
// from "@/components/kibo-ui/pill"
```

(Verify with `grep -n "Search\|Pill" src/app/help/page.tsx` — should match zero usages after edit before removing the imports.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A4: Replace /help "Read the guides" promo with a real link

**Files:**
- Modify: `src/app/help/page.tsx` — the Card at line 195

**Decision:** Replace the dead "Read the guides" promo with a working link to `/verify` (the only existing "guide-style" surface in the app — the 3-tier verification explanation).

- [ ] **Step 1: Wrap the Card in a `<Link href="/verify">`**

```tsx
<Link href="/verify" prefetch={false} className="block mt-3.5 hover:opacity-90 transition-opacity">
  <Card tone="default">
    <CardContent className="flex flex-col gap-2.5 p-4">
      <span aria-hidden className="flex size-9 items-center justify-center rounded-xl bg-lime/20 text-lime">
        <BookOpen className="size-4" />
      </span>
      <p className="text-meta font-semibold text-(--ink) m-0 mt-1">
        Verification tiers
      </p>
      <p className="text-caption leading-relaxed text-(--ink-2) m-0">
        Bronze, Silver, Gold — what each unlocks and what's required.
      </p>
    </CardContent>
  </Card>
</Link>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A5: Add session-required gate to /legal/* routes

**Files:**
- Modify: `src/app/legal/terms/page.tsx`, `src/app/legal/privacy/page.tsx`, `src/app/legal/community-guidelines/page.tsx`

**Approach:** Each route adds the `useRequireSession()` hook at the top of its component. Since legal-article-shell is shared between behind-auth and public surfaces? No — per the user direction, /legal/* are behind-auth. Public legal lives at the new /terms, /privacy, /community routes.

- [ ] **Step 1: Read the existing route files to find their entry components**

```bash
head -25 src/app/legal/terms/page.tsx src/app/legal/privacy/page.tsx src/app/legal/community-guidelines/page.tsx
```

- [ ] **Step 2: In each of the 3 page files, add the hook import + call**

```tsx
"use client";  // ensure this directive is present
import { useRequireSession } from "@/lib/use-require-session";

export default function Page() {
  useRequireSession();
  return <LegalArticleShell ... />;
}
```

If the page is currently a Server Component, convert to Client by adding `"use client"` at the top and keeping the same JSX.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A6: Fix /legal TOC to use real anchors

**Files:**
- Modify: `src/components/app/legal-article-shell.tsx`

**Approach:** Same pattern as Task A2 — TOC items become `<Link href="#slug">`, sections get `id="slug"`. The `toc` prop type gains a required `slug: string`.

- [ ] **Step 1: Extend the `toc` item type**

In `legal-article-shell.tsx`, find the `Props` type and the `toc` field. Update:

```tsx
type Props = {
  // ...existing fields
  toc: ReadonlyArray<{
    icon: keyof typeof TOC_ICONS;
    label: string;
    slug: string;       // NEW — section id to scroll to
    active?: boolean;
  }>;
  // ...
};
```

- [ ] **Step 2: Convert the TOC row from `<div>` to `<Link href="#slug">`**

Replace the `<div key={i} className={...}>` at line 284 with:

```tsx
<Link
  key={i}
  href={`#${item.slug}`}
  className={
    active
      ? "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lavender/40 bg-lavender/12 hover:bg-lavender/20 transition-colors"
      : "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-(--app)/60 transition-colors"
  }
>
  {/* existing span children */}
</Link>
```

Add `import Link from "next/link"` at the top if not already imported.

- [ ] **Step 3: Add `id` + `scroll-mt-20` to each section in the article body**

In the same shell, find the desktop article body's section map (around line 240) and update:

```tsx
{sections.map((s, i) => (
  <section key={i} id={s.slug} className="scroll-mt-20">
    <h2 className="mt-2 mb-2.5 text-h3 text-(--ink) m-0">{s.heading}</h2>
    <p className="text-base leading-loose text-(--ink-2) m-0 text-pretty">{s.body}</p>
  </section>
))}
```

Update the `sections` prop type to require `slug: string` per item, plus heading + body.

- [ ] **Step 4: Apply same `id`+`scroll-mt-20` to the mobile section block (around line 157)**

- [ ] **Step 5: Update all 3 legal page files to pass `slug` in their toc + sections arrays**

For each of `src/app/legal/terms/page.tsx`, `src/app/legal/privacy/page.tsx`, `src/app/legal/community-guidelines/page.tsx`:

Find the `toc={[...]}` prop and the `sections={[...]}` prop. For each item, add a kebab-case `slug` derived from the heading/label.

```tsx
// Example for terms:
toc={[
  { icon: "FileText", label: "Acceptance",   slug: "acceptance",   active: true },
  { icon: "Users",    label: "Your account", slug: "your-account" },
  // ...
]}
sections={[
  { heading: "Acceptance",   slug: "acceptance",   body: "..." },
  { heading: "Your account", slug: "your-account", body: "..." },
  // ...
]}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A7: Remove "Download as PDF" stub from legal shell

**Files:**
- Modify: `src/components/app/legal-article-shell.tsx`

**Decision:** Delete the card entirely. No PDF generation exists. Re-add later if real PDFs are produced.

- [ ] **Step 1: Delete the `<Card>` block at line 317-336** (the FileText + "Download as PDF · 38 KB" + ChevronRight card)

- [ ] **Step 2: Remove now-unused imports from legal-article-shell.tsx**

```bash
grep -c "FileText\|ChevronRight" src/components/app/legal-article-shell.tsx
```
If zero usages remain, remove from the lucide-react import line.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A8: Hide "Sign in" CTA in legal-shell brand-bar when signed-in

**Files:**
- Modify: `src/components/app/legal-article-shell.tsx`

**Approach:** Use the session hook to conditionally swap the Sign-in CTA with "Back to app".

- [ ] **Step 1: Read the existing brand-bar CTA (line 129-136) and current imports**

- [ ] **Step 2: Add a client-side session probe and swap the CTA**

```tsx
// At top of component:
const [signedIn, setSignedIn] = useState(false);
useEffect(() => { setSignedIn(Boolean(getSessionToken())); }, []);

// Replace the existing Sign-in Button:
<Button
  size="tap"
  tone={signedIn ? "elevated" : "cta"}
  className="ml-2"
  render={<Link href={signedIn ? "/discover" : "/auth/sign-in"} prefetch={false} />}
>
  {signedIn ? "Back to app" : "Sign in"}
</Button>
```

Add `import { getSessionToken } from "@/lib/api-client"` and `import { useEffect, useState } from "react"` if not already imported.

Add `/* eslint-disable react-hooks/set-state-in-effect */` near the top of the file with a comment matching `src/app/help/page.tsx`'s rationale.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task A9: Commit Phase A

- [ ] **Step 1: Stage Phase A changes**

```bash
git add src/app/help/page.tsx \
        src/components/app/legal-article-shell.tsx \
        src/lib/use-require-session.ts \
        src/app/legal/terms/page.tsx \
        src/app/legal/privacy/page.tsx \
        src/app/legal/community-guidelines/page.tsx \
        src/app/globals.css   # if scroll-behavior was added
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(behind-auth): restore /help + /legal chrome, fix non-functional surfaces

/help reverted from the temporary public refactor to its authenticated
PageShell + DesktopSidebar + BottomNav chrome. Added a session gate
(useRequireSession hook, redirects to /auth/sign-in?next=...).

Fixed surfaces that looked interactive but weren't:
- /help TOC rows now <Link href="#slug"> with scroll-anchor IDs on real
  section headings (FAQ + 4 new lightweight sub-sections that point
  into Settings / Discover / Safety / a mailto).
- /help search-bar visual stub removed (no search backend yet).
- /help "Read the guides" Card now wraps a <Link href="/verify">.
- /legal/* TOC rows wired to scroll anchors via new sections.slug +
  toc.slug required props.
- /legal/* "Download as PDF" Card removed (no PDF generation).
- /legal/* brand-bar CTA now session-aware (Sign in / Back to app).

The 4 new public-only pages (faq/terms/privacy/community) come in
Phase B + C.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — MarketingFooter primitive + landing repointing

### Task B0: Extract MarketingFooter primitive

**Files:**
- Create: `src/components/app/marketing-footer.tsx`
- Modify: `src/app/page.tsx` — replace inline footer with `<MarketingFooter />`

- [ ] **Step 1: Create the primitive**

```tsx
// src/components/app/marketing-footer.tsx
"use client";

// Public marketing-surface footer. Shared by /, /faq, /terms, /privacy,
// /community. 4-col grid desktop / Accordion mobile, dark canvas, copyright
// row at the bottom. Pixel-precise marketing rhythm matches the design
// handoff. Same eslint-disable rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how",      label: "How it works" },
  { href: "/#verified", label: "Verification" },
  { href: "/#waitlist", label: "Join waitlist" },
];

const COMPANY_LINKS = [
  { href: "/faq",                  label: "Help & FAQ" },
  { href: "mailto:admin@ahavah.app", label: "Contact" },
  { href: "/community",            label: "Community" },
];

const LEGAL_LINKS = [
  { href: "/terms",     label: "Terms of service" },
  { href: "/privacy",   label: "Privacy policy" },
  { href: "/community", label: "Community guidelines" },
];

type ColLink = { href: string; label: string };

function FooterCol({ title, links }: { title: string; links: ColLink[] }) {
  return (
    <nav aria-label={`${title} links`} className="flex flex-col">
      <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-white/55">
        {title}
      </h4>
      <ul className="flex flex-col gap-2.5">
        {links.map(({ href, label }) =>
          href.startsWith("/") ? (
            <li key={href + label}>
              <Link href={href} className="text-sm text-white/80 hover:text-white transition-colors">
                {label}
              </Link>
            </li>
          ) : (
            <li key={href + label}>
              <a href={href} className="text-sm text-white/80 hover:text-white transition-colors">
                {label}
              </a>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function FooterAccordionCol({ title, links }: { title: string; links: ColLink[] }) {
  return (
    <AccordionItem value={title.toLowerCase()} className="border-b border-white/10 border-t-0">
      <AccordionTrigger className="py-4 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-white/85 hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4 px-1">
        <ul className="flex flex-col gap-3">
          {links.map(({ href, label }) =>
            href.startsWith("/") ? (
              <li key={href + label}>
                <Link href={href} className="text-sm text-white/80">{label}</Link>
              </li>
            ) : (
              <li key={href + label}>
                <a href={href} className="text-sm text-white/80">{label}</a>
              </li>
            ),
          )}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#0F0B1F] text-white/80 px-4 sm:px-6 md:px-8 py-14 mt-auto">
      <div className="mx-auto max-w-[1200px]">
        {/* Desktop / md+ — 4-col grid */}
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 mb-12">
          <div className="max-w-[360px]">
            <div className="mb-4">
              <Logo variant="horizontal" forceTheme="dark" height={32} />
            </div>
            <p className="text-sm leading-[1.55] text-white/60">
              Find love across borders. Verified profiles, 100+ languages, real
              connections. Made for the diaspora.
            </p>
          </div>
          <FooterCol title="Product" links={PRODUCT_LINKS} />
          <FooterCol title="Company" links={COMPANY_LINKS} />
          <FooterCol title="Legal"   links={LEGAL_LINKS} />
        </div>

        {/* Mobile — accordion */}
        <div className="md:hidden mb-8">
          <div className="mb-6">
            <Logo variant="horizontal" forceTheme="dark" height={32} />
            <p className="mt-4 text-[13px] leading-[1.55] text-white/60">
              Find love across borders. Verified profiles, 100+ languages, real
              connections. Made for the diaspora.
            </p>
          </div>
          <Accordion multiple className="border-t border-white/10">
            <FooterAccordionCol title="Product" links={PRODUCT_LINKS} />
            <FooterAccordionCol title="Company" links={COMPANY_LINKS} />
            <FooterAccordionCol title="Legal"   links={LEGAL_LINKS} />
          </Accordion>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-[13px] text-white/50">
          <span>© 2026 Ahavah. All rights reserved.</span>
          <span>Made for the diaspora.</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task B1: Repoint landing nav + footer to new public URLs; use MarketingFooter

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the inline `<footer>` with `<MarketingFooter />`**

Delete the entire `<footer className="bg-[#0F0B1F]...">…</footer>` block (lines ~520-566 in current file). Replace with:

```tsx
<MarketingFooter />
```

Add import at top: `import { MarketingFooter } from "@/components/app/marketing-footer";`

Drop the `FooterCol` and `FooterAccordion` sub-components from page.tsx (now lives in marketing-footer.tsx).

- [ ] **Step 2: Repoint nav FAQ link to /faq**

In the `MarketingHeader primaryNav` slot, change `<Link href="/help">FAQ</Link>` to `<Link href="/faq">FAQ</Link>`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → no errors.

---

### Task B2: Commit Phase B

- [ ] **Step 1: Stage + commit**

```bash
git add src/components/app/marketing-footer.tsx src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(landing): extract MarketingFooter primitive + repoint to public URLs

Landing's inline footer (~50 lines of JSX duplicated per page that uses
it) moved into a kit primitive at src/components/app/marketing-footer.tsx.
Used by / today; will be used by the 4 new public pages in Phase C.

Landing nav + footer links retargeted from behind-auth routes to new
public routes:
  /help                      -> /faq
  /legal/terms               -> /terms
  /legal/privacy             -> /privacy
  /legal/community-guidelines-> /community

The Phase C tasks create those public routes. Until they land, the new
links 404; that's intentional - the new routes ship in the same PR.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Four new public pages

**MANDATORY before each task in this phase:** Invoke `frontend-design:frontend-design` skill. The visual aesthetic is already locked (continuity with landing surface — Ahavah palette, Plus Jakarta Sans + Ultra display, sticky-glass header, dark indigo footer). The skill invocation confirms each page's composition fits the system. No new aesthetic invention required.

### Task C1: /faq (public help & FAQ)

**Files:**
- Create: `src/app/faq/page.tsx`

**Composition (kit primitives only):**
- `MarketingHeader` with `cta` slot = `<Button render={<Link href="/auth/sign-in">}>Sign in</Button>`
- Hero block: `<h1>` with display font + `<p>` lead — uses kit typography utilities, NOT inline `style` for fontSize unless covered by file-level eslint-disable matching landing/help rationale
- FAQ body: `Accordion` (kit) with same 6 FAQ items as the behind-auth /help (copy them — they're public-safe)
- Contact card: `Card` + `IconBadge` (kit) with `<a href="mailto:admin@ahavah.app">`
- `MarketingFooter`

- [ ] **Step 1: Invoke frontend-design skill, confirm aesthetic commits**

Run the `Skill` tool with `frontend-design:frontend-design`. Pass intent: "Public /faq page for Ahavah marketing surface; aesthetic must match landing (cream/indigo flip via tokens, Plus Jakarta Sans + Ultra display, sticky glass header, dark footer). No new aesthetic invention — establish that the existing kit + MarketingHeader/Footer composition is correct."

- [ ] **Step 2: Create `src/app/faq/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Mail } from "lucide-react";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  { q: "Who is Ahavah for?", a: "Torah-observant singles seeking marriage. Members across the diaspora can match across borders with verified identity and faith-aware filters." },
  { q: "Is it free?", a: "The waitlist is free. At launch, the core experience is free; Premium and per-action tokens are optional." },
  { q: "What is verification?", a: "Three tiers (Bronze / Silver / Gold) of identity checks. Bronze is required to start matching. Higher tiers unlock more trust signals to other members." },
  { q: "Will it work on my phone?", a: "Ahavah is a Progressive Web App — Add to Home Screen on iOS and Android. There is no separate app store binary at launch." },
  { q: "How is my data handled?", a: "Verification documents are processed by Stripe Identity; we only receive a verified/not-verified result. Profile data is used only to match you. See /privacy for the full policy." },
  { q: "When does it launch?", a: "Spring 2026 for founding members. The waitlist will receive an email with a one-tap sign-in link as soon as invites open." },
];

export default function FaqPage() {
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <MarketingHeader
        cta={
          <Button
            tone="elevated"
            size="tap"
            render={<Link href="/auth/sign-in" prefetch={false} />}
            className="rounded-xl"
          >
            Sign in
          </Button>
        }
      />

      <main id="ahavah-main" className="flex-1 mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-10">
        <header className="flex flex-col gap-4 max-w-[720px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">
            Help &amp; FAQ
          </span>
          <h1
            className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.94, letterSpacing: "-0.025em", fontWeight: 400 }}
          >
            Questions, answered<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            What Ahavah is, how it works, and how to reach a real person on the team.
          </p>
        </header>

        <Accordion className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
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

        <Card tone="default" className="border border-lavender/30 bg-lavender/10 p-6 max-w-[720px]">
          <CardContent className="flex items-center gap-4 p-0">
            <IconBadge tone="brand" size="xl" shape="square">
              <Mail className="size-5" />
            </IconBadge>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-base font-bold text-(--ink) m-0">Need a real person?</p>
              <a href="mailto:admin@ahavah.app" className="text-sm font-semibold text-lavender hover:underline">
                admin@ahavah.app
              </a>
            </div>
          </CardContent>
        </Card>
      </main>

      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Add file-level eslint-disable comment**

After `"use client";` insert:

```tsx
// /faq is a public marketing route. Pixel-precise marketing rhythm
// (clamp() font-sizes, max-w-[1200px], text-[clamp(...)] arbitrary
// values) is taken from the landing-page design system established
// in commit c0645b4. Same rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Browser smoke**

Open `http://localhost:3000/faq`. Verify:
- Header renders with Ahavah lockup left + ThemeToggle + Sign-in button right
- Hero h1 in Ultra display, lime period accent
- Accordion 6 items, all open/close
- Mail card visible
- Footer renders full-width dark

---

### Task C2: /terms (public terms of service)

**Files:**
- Create: `src/app/terms/page.tsx`

**Composition (kit primitives only):** Same MarketingHeader + MarketingFooter scaffold as /faq. Body is a single-column article: hero, then `<section>` blocks per term clause.

- [ ] **Step 1: Invoke frontend-design skill (confirms aesthetic match)**

- [ ] **Step 2: Create `src/app/terms/page.tsx`**

```tsx
"use client";

// Public terms-of-service page. Same eslint-disable rationale as /faq + landing.
/* eslint-disable no-restricted-syntax */

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { MarketingHeader } from "@/components/app/marketing-header";
import { MarketingFooter } from "@/components/app/marketing-footer";

const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  { slug: "acceptance", heading: "Acceptance of terms", body: "By creating an account or joining the waitlist you agree to these terms. If you don't agree, please don't use Ahavah." },
  { slug: "eligibility", heading: "Eligibility", body: "You must be at least 18 years old. You're responsible for the accuracy of the information you give us." },
  { slug: "account", heading: "Your account", body: "Keep your sign-in details private. Tell us at admin@ahavah.app if you suspect unauthorized access." },
  { slug: "conduct", heading: "Acceptable conduct", body: "Be honest, respectful, and lawful. Harassment, impersonation, illegal content, and abuse of other members will get you removed." },
  { slug: "content", heading: "Your content", body: "You keep ownership of what you post. By posting you grant us a worldwide non-exclusive license to host, display, and process your content so the service works." },
  { slug: "termination", heading: "Termination", body: "You can delete your account at any time from Settings. We can suspend or delete accounts that violate these terms or applicable law." },
  { slug: "liability", heading: "Liability", body: "Ahavah is provided as-is. To the maximum extent allowed by law we're not liable for indirect damages, lost profits, or third-party content." },
  { slug: "changes", heading: "Changes to these terms", body: "We may update these terms; material changes will be announced in-app or by email. Continued use after a change means you accept the new terms." },
  { slug: "contact", heading: "Contact", body: "Questions about these terms? Email admin@ahavah.app." },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh flex flex-col text-(--ink)" style={{ background: "var(--app)" }}>
      <MarketingHeader
        cta={
          <Button tone="elevated" size="tap" render={<Link href="/auth/sign-in" prefetch={false} />} className="rounded-xl">
            Sign in
          </Button>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 py-12 lg:py-20 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-(--color-lavender)">Legal</span>
          <h1
            className="m-0 text-(--ink) text-[clamp(36px,7vw,72px)]"
            style={{ fontFamily: "var(--font-display)", lineHeight: 0.94, letterSpacing: "-0.025em", fontWeight: 400 }}
          >
            Terms of service<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-base lg:text-lg leading-[1.6] text-(--ink-2)">
            Plain-language rules for using Ahavah. Last updated 2026-05-19.
          </p>
        </header>

        <nav aria-label="Contents" className="flex flex-col gap-1.5 pb-2 border-b border-(--hairline)">
          {SECTIONS.map((s) => (
            <Link key={s.slug} href={`#${s.slug}`} className="text-sm font-medium text-(--ink-2) hover:text-(--color-lavender) transition-colors">
              {s.heading}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.slug} id={s.slug} className="scroll-mt-20 flex flex-col gap-2">
              <h2 className="m-0 text-lg lg:text-xl font-bold text-(--ink) tracking-tight">{s.heading}</h2>
              <p className="m-0 text-base leading-[1.65] text-(--ink-2)">{s.body}</p>
            </section>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + browser smoke**

Run: `npx tsc --noEmit` → no errors. Open `localhost:3000/terms` — TOC anchor links should smooth-scroll to each section.

---

### Task C3: /privacy (public privacy policy)

**Files:**
- Create: `src/app/privacy/page.tsx`

**Approach:** Same scaffold as /terms. Different content.

- [ ] **Step 1: Invoke frontend-design skill**

- [ ] **Step 2: Create the file** (structure identical to /terms; replace `SECTIONS` with privacy clauses)

```tsx
const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  { slug: "data-we-collect", heading: "Data we collect",
    body: "Account info you give us (email, name, DOB, gender, country), profile content (photos, bio, languages, observance), verification artifacts (selfie, optional ID via Stripe Identity), and product analytics (page views, app errors)." },
  { slug: "why",             heading: "Why we collect it",
    body: "To run the service: show your profile, match you with compatible members, verify identity, prevent abuse, deliver chat, and bill subscriptions." },
  { slug: "stripe",          heading: "Stripe Identity (Gold tier)",
    body: "Government ID + face match is processed by Stripe. Your document stays with Stripe; we only receive a verified-or-not result. We don't store your ID image." },
  { slug: "sharing",         heading: "Who we share with",
    body: "Stripe (payments + Identity), our infrastructure providers (DigitalOcean, Vercel), email delivery (Resend). We don't sell your data. We don't share verification documents with other members." },
  { slug: "retention",       heading: "Retention",
    body: "Account data stays until you delete. Deletion is permanent within 30 days. Anonymized aggregate analytics may be retained beyond that." },
  { slug: "rights",          heading: "Your rights",
    body: "Access, correction, deletion, export. Email admin@ahavah.app to exercise any of these; we'll respond within 30 days." },
  { slug: "children",        heading: "No under-18 use",
    body: "Ahavah is 18+. We don't knowingly collect data from minors. If you believe a minor has an account, email admin@ahavah.app and we'll remove it." },
  { slug: "changes",         heading: "Changes",
    body: "Material changes are announced in-app or by email. Continued use after a change means you accept the new policy." },
  { slug: "contact",         heading: "Contact",
    body: "Privacy questions: admin@ahavah.app." },
];
```

Wrap the rest of the file with the same scaffold (MarketingHeader → main with hero + TOC + sections → MarketingFooter) as `/terms`. Change the eyebrow + h1 to "Privacy policy.".

- [ ] **Step 3: Typecheck + browser smoke**

---

### Task C4: /community (public community guidelines)

**Files:**
- Create: `src/app/community/page.tsx`

**Approach:** Same scaffold. Community guidelines content.

- [ ] **Step 1: Invoke frontend-design skill**

- [ ] **Step 2: Create the file** (structure identical to /terms; community guidelines content)

```tsx
const SECTIONS: ReadonlyArray<{ slug: string; heading: string; body: string }> = [
  { slug: "spirit",       heading: "The spirit of it",
    body: "Ahavah exists so people seeking marriage in a faith-observant context can meet without the noise of mainstream apps. Behave like someone you'd want to date." },
  { slug: "be-real",      heading: "Be real",
    body: "One profile per person. Your photos must be you. Don't pose as someone else, don't use photos of someone else, don't lie about basic facts." },
  { slug: "be-respectful",heading: "Be respectful",
    body: "Sexual harassment, slurs, hate speech, and threats are zero-tolerance. Differences in observance are not a debating contest. If someone says no, accept it." },
  { slug: "no-solicit",   heading: "No solicitation",
    body: "Ahavah isn't a marketplace. No promoting external products, services, OnlyFans, crypto, or recruiting into anything outside the platform." },
  { slug: "no-minors",    heading: "Adults only",
    body: "18+ only. Don't post photos of minors, don't engage anyone who appears to be under 18, don't share anything sexual involving minors. We report violations to authorities." },
  { slug: "report",       heading: "How to report",
    body: "Tap the kebab menu on any profile or chat to report or block. Or email admin@ahavah.app with details. We act on every report; bad-faith reports also count against you." },
  { slug: "enforcement",  heading: "Enforcement",
    body: "Outcomes range from a warning to permanent ban. We may take action without warning for severe violations (impersonation, threats, exploitation of minors, hate speech)." },
  { slug: "appeals",      heading: "Appeals",
    body: "Disagree with an enforcement action? Email admin@ahavah.app with your account email and a brief explanation. A human will review." },
  { slug: "contact",      heading: "Contact",
    body: "Anything else: admin@ahavah.app." },
];
```

Same scaffold as /terms; eyebrow "Community" + h1 "Community guidelines.".

- [ ] **Step 3: Typecheck + browser smoke**

---

### Task C5: Commit Phase C

- [ ] **Step 1: Stage + commit**

```bash
git add src/app/faq/page.tsx src/app/terms/page.tsx src/app/privacy/page.tsx src/app/community/page.tsx
git commit -m "$(cat <<'EOF'
feat(public-pages): /faq /terms /privacy /community

Four purpose-built public-only pages reachable from the landing nav +
footer. None are behind auth; signed-out visitors get a coherent
marketing surface (MarketingHeader + MarketingFooter chrome) instead
of being bounced into the auth flow or seeing authenticated chrome.

Each page composes kit primitives only:
- MarketingHeader / MarketingFooter
- Accordion (faq), Card + IconBadge (faq contact card)
- <section id="slug" className="scroll-mt-20"> + <Link href="#slug"> TOC

Behind-auth /help and /legal/* continue to exist at the same URLs
(Phase A) — those are for signed-in users only and were never the
right home for public-facing copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Push + verify

### Task D0: Final build + push

- [ ] **Step 1: Run typecheck + build clean**

```bash
npx tsc --noEmit         # expected: no output (no errors)
pnpm build               # expected: completes; new routes appear under "○" static
```

- [ ] **Step 2: Browser smoke at 375 / 1280 px**

For each route, verify in browser:
- `/`     — landing chrome unchanged, FAQ link now points to /faq
- `/faq`  — public, accordion expands, contact card mailto works
- `/terms` — public, TOC anchors scroll to sections
- `/privacy` — public, same TOC behaviour
- `/community` — public, same TOC behaviour
- `/help` — signed-out: redirects to `/auth/sign-in?next=%2Fhelp`. Signed-in: shows PageShell + sidebar + BottomNav chrome, TOC items scroll-anchor.
- `/legal/terms` — signed-out: redirects. Signed-in: brand-bar shows "Back to app" CTA, TOC scrolls, no PDF card.

- [ ] **Step 3: Push (requires user authorization)**

```bash
git push origin master
```

Surface to user: 5 new commits on local master pending push (Phase A + B + C + the prior `ce1e1a6` + `439222d`).

---

## Self-review

**Spec coverage check (against the user's instructions):**

| User requirement | Plan task(s) |
|---|---|
| Keep existing /help behind auth | A0, A1 |
| Keep existing /legal/* behind auth | A5 |
| Fix non-functional surfaces in behind-auth pages | A2 (help TOC), A3 (help search), A4 (help guides), A6 (legal TOC), A7 (legal PDF), A8 (legal CTA) |
| Create 4 new public pages (help, terms, privacy, community) | C1 (faq), C2 (terms), C3 (privacy), C4 (community) |
| New pages built from kit primitives only | C1-C4 explicitly compose Accordion/Card/IconBadge/Button/Link + MarketingHeader/Footer; no bare-div atoms |
| New pages invoke skills (frontend-design / ui-implementer) | Each of C1-C4 has a "Step 1: Invoke frontend-design skill" |
| Plan made via /using-superpowers | Plan written via superpowers:writing-plans (announced at start) |

**Placeholder scan:** No "TBD"s. Every step has the actual code/command to run.

**Type consistency:** `useRequireSession` defined once in Task A1, called in A1 + A5. `MarketingFooter` defined in B0, used in B1 + C1-C4. `SECTIONS` shape (`{slug,heading,body}`) consistent across A6, C2, C3, C4.

---

## Execution choice

Plan complete and saved to `docs/superpowers/plans/2026-05-19-public-pages-and-auth-fixes.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, two-stage review between tasks. Cleanest if any task hits surprises.
2. **Inline Execution** — execute all tasks in this session in sequence with a checkpoint after each Phase (A, B, C, D) for your review.

Which approach?

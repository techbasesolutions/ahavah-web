# Desktop + Light-Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Implement task-by-task with two-stage review.

**Goal:** Ship desktop layouts for all 14 routes against the new light-mode design system handoff at `docs/handoff-desktop/`, without touching mobile (≤414px column) behavior.

**Source of truth:** `docs/handoff-desktop/` (README, tokens.css, design-system-v2.md, screens/01-…14-…md). The handoff is the spec — read it before each task.

**Architecture:**
- Light mode is the **desktop default**. Mobile PWA stays dark.
- Theme switching via `data-theme="light"|"dark"` attribute on `<html>`. A `ThemeProvider` chooses based on viewport (≥`md` → light, `<md` → dark) until a user pref is wired later.
- Mobile shell (`.ahavah-app` 414px column) renders unchanged at `<md`. Desktop shell (sidebar 260 + content) renders at `≥md`. Both compose the same routes.
- All chrome primitives (Button, Card, Pill, Input, Avatar, Sheet, etc.) gain theme-aware token usage. **No new primitives.** Extend variants on existing kit components only.
- Mobile dark behavior is regression-tested by leaving existing classnames intact and overlaying new tokens via CSS vars consumed by the same classes.

**Tech stack:** Next.js 16 App Router, React 19, Tailwind v4 `@theme`, kit (shadcn/Base UI) + Kibo UI, lucide-react.

**Non-negotiables (from handoff README + prior session feedback):**
1. Mobile design is untouched. If a route renders on mobile today, it must render identically on mobile after this work.
2. No freestyling — use kit primitives. Extend via cva variants if a variant is missing; do not handroll markup that duplicates a primitive.
3. Lime/lavender/pink/bronze/silver/gold fills pair with **text-black only** in both themes.
4. The 4-point sparkle SVG path is brand-owned — copy it from `design-system.md`, do not redraw.
5. Plus Jakarta Sans throughout. No new font imports.
6. Tap targets ≥44px even on desktop.
7. Mobile column class `.ahavah-app` stays at 414px max-width on `<md` viewports.

---

## Wave 1 · Foundation (light tokens + theme switching)

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/system/theme-provider.tsx`
- Modify: `src/app/layout.tsx`

**Tasks:**
- [ ] Add `[data-theme="light"]` override block in `globals.css` with all light-mode CSS variables from `docs/handoff-desktop/tokens.css` (semantic chrome aliases `--app/--card/--canvas/--ink/--ink-2/--ink-3/--hairline/--border/--status/--nav-bg/--nav-border/--nav-inactive/--pill-glass*/--shadow-soft/--shadow-cta/--scrim-strong` plus the darkened `--color-lime` for AA on white). Keep all existing dark-mode vars intact.
- [ ] Add desktop-only canvas + font surface rules: when `data-theme="light"`, body bg → `var(--canvas)`, color → `var(--ink)`. Mobile `.ahavah-app` keeps its `oklch(0.18 0.11 280)` indigo bg.
- [ ] Create `ThemeProvider` client component that sets `document.documentElement.dataset.theme` based on `window.matchMedia('(min-width: 768px)')` (light at md+, dark below). Re-evaluates on resize.
- [ ] Wire ThemeProvider into `src/app/layout.tsx` inside `<body>`.
- [ ] Verify: typecheck clean; existing dark mobile pages render unchanged at 414px viewport; html element gets `data-theme="light"` at ≥768px.

**Verification:**
- `npx tsc --noEmit` clean.
- Open `/` at 1440×900 → `data-theme="light"` on `<html>`, body bg cream.
- Open `/` at 390×844 (iPhone 13) → `data-theme="dark"` on `<html>`, mobile column unchanged.

---

## Wave 2 · Desktop shell

**Files:**
- Create: `src/components/app/desktop-sidebar.tsx`
- Create: `src/components/app/desktop-topbar.tsx`
- Create: `src/components/app/desktop-shell.tsx`
- Modify: `src/components/app/page-shell.tsx` (compose desktop-shell at `≥md`)

**Tasks:**
- [ ] Build `DesktopSidebar` per `design-system-v2.md §Layout · Page shell (desktop)`: 260px wide, `var(--nav-bg)` surface, `var(--nav-border)` right hairline, brand mark top, 5 nav items (Discover/Map/Matches/Inbox/Profile) with lucide icons + lime active state, monetization pill at bottom. Use `<Link>` from next/link.
- [ ] Build `DesktopTopBar`: 56px tall, sticky, `border-bottom: 1px var(--nav-border)`, accepts `title` + `actions` slots.
- [ ] Build `DesktopShell({sidebar, topBar, children})`: CSS grid `260px 1fr`, full viewport height, content area `padding: 32`.
- [ ] In `PageShell`, detect `≥md` (CSS-based: `hidden md:flex`); render `<DesktopShell>` wrapper around children at md+, render existing mobile shell at `<md`. No JS branching.
- [ ] Sidebar must NOT render on: `/`, `/auth/*`, `/onboarding/*`, `/match`, `/paywall`, `/locked`. Pages opt-in via a `desktopShell="full-bleed"|"sidebar"` prop on `PageShell`.

**Verification:** `/discover` at 1440×900 shows sidebar + topbar; at 414px shows mobile-only chrome.

---

## Wave 3 · Entry screens (no sidebar)

Per `screens/01-welcome.md`, `02-sign-up.md`, `03-onboarding.md`. All three are full-bleed.

**Files:**
- Modify: `src/app/page.tsx` (welcome)
- Modify: `src/app/auth/sign-up/page.tsx` (or equivalent)
- Modify: `src/app/onboarding/*` shells

**Tasks:**
- [ ] Welcome `/`: 7fr/5fr split per `01-welcome.md`. Left = gradient `linear-gradient(135deg, var(--app), color-mix(in oklch, var(--lavender) 20%, var(--app)))`, brand mark, 80px headline ("Find love across borders.") with lime period, subhead, stat row (3 cells), decorative sparkles. Right = card with overline, t-display "Create your account", email Input (lg), provider chip grid (5 cols), `Button tone="cta" size="cta"` "Send me a code", sign-in link. Reuse `requestEmailOtp` from `src/lib/auth-otp.ts`. **At `<md`**, render the existing mobile welcome unchanged.
- [ ] Sign-up `/auth/...`: per `02-sign-up.md` — single centered card, OTP-input pattern.
- [ ] Onboarding `/onboarding/*`: per `03-onboarding.md` — centered card with prompt + input + Continue.

**Verification:** Welcome at 1440×900 matches `desktop-screens.html` frame 01; at 390×844 unchanged.

---

## Wave 4 · Core dating screens

Per `screens/04-discover.md`, `05-profile-detail.md`, `06-match.md`.

**Files:**
- Modify: `src/app/discover/page.tsx`
- Modify: `src/app/profile/[uuid]/page.tsx`
- Create or modify: `src/app/match/page.tsx`

**Tasks:**
- [ ] Discover desktop layout: 260/1fr/320 grid per `04-discover.md`. Left rail = filters panel (chip cards). Center = 460×640 photo card + 28px gap + action row (Skip 64 lavender, Play 80 lime, Like 64 pink). Right rail = "New likes" gradient card (non-premium only) + "Recently seen" 3 row cards. All logic reuses `useDiscoverDeck`, `useDecisions`. **`<md`: existing mobile deck unchanged.**
- [ ] Profile detail: desktop 2-column per `05-profile-detail.md`. Left = photo column with carousel + scrim. Right = scrollable bio + verification + compatibility + actions.
- [ ] Match: full-bleed celebration per `06-match.md` — gradient bg, two avatars overlap, lime "It's a match" headline, two CTAs ("Send message" / "Keep swiping").

**Verification:** Mobile dark `/discover` swipe still works at 414px. Desktop shows 3-column layout.

---

## Wave 5 · Connection screens

Per `screens/07-map.md`, `08-matches.md`, `09-inbox.md`.

**Files:**
- Modify: `src/app/map/page.tsx`
- Modify: `src/app/matches/page.tsx`
- Modify: `src/app/inbox/page.tsx` (and `src/app/chat/[id]/page.tsx`)

**Tasks:**
- [ ] Map: desktop = sidebar + 2-column (map left, candidate rail right).
- [ ] Matches: desktop = sidebar + grid (4 cards per row at 1440), pill tabs "Matches/Liked you" at top.
- [ ] Inbox: desktop = sidebar + 2-column (thread list left, active thread right). Mobile remains drilldown.

---

## Wave 6 · Account screens

Per `screens/10-profile.md`, `11-paywall.md`, `12-verify.md`, `13-settings.md`, `14-locked.md`.

**Files:**
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/paywall/page.tsx`
- Modify: `src/app/verify/page.tsx`
- Modify: `src/app/settings/*/page.tsx`
- Modify: `src/app/locked/page.tsx` (or create)

**Tasks:**
- [ ] Profile (own): desktop sidebar + 2-column (hero photo + edit panel).
- [ ] Paywall: full-bleed gradient hero + plan cards.
- [ ] Verify: sidebar + tier cards (Bronze/Silver/Gold).
- [ ] Settings: sidebar + nested side-tabs.
- [ ] Locked: full-bleed centered card.

---

## Final verification

- [ ] `npx tsc --noEmit` clean across the repo.
- [ ] `npx vitest run` — same baseline failures as before (auth-otp/chat-stanza/photo-storage), no new failures.
- [ ] Manual: visit every route at 1440×900 (light) AND 414×900 (dark). Mobile dark must be visually unchanged from baseline (screenshot diff acceptable on chrome only).
- [ ] No `console.error` in browser on any route.

---

## Out of scope

- New routes beyond the 14 listed.
- Onboarding sub-step content beyond shell + name step.
- Settings sub-pages beyond top-level.
- User-toggleable theme picker (auto-by-breakpoint only for now).
- Storybook stories.
- Visual regression test infra.

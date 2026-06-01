# 2026-05-18 — Desktop layouts for 8 pages with no canonical spec

## Why this exists

The canonical handoff (`Ahavah-Claude Design/handoff/screens/01–14`) covered the
14 primary screens. The auth + edge-state surfaces grew shells in this session
(`OnboardingShell`, `SettingsShell`, `VerifyTierShell`, `EdgeStateCard`). What's
left are 8 routes that are functionally part of the product but never received
a canonical desktop design — they currently render a single mobile column that
visually stretches across the sidebar content area on `md+`.

This plan proposes a per-page treatment. **It is a proposal; nothing ships
without your approval on the divergence points called out below.**

## Pages in scope

| Route | Current state | Type |
|---|---|---|
| `/profile/edit` | 8-section vertical form, single mobile column | App: deep settings form |
| `/profile/tokens` | `max-w-960` centered, 2-col SKU grid (minimal adapt) | App: wallet |
| `/help` | FAQ accordion + contact cards, mobile column | Support |
| `/legal/terms` | Single article column | Static content |
| `/legal/privacy` | Single article column | Static content |
| `/legal/community-guidelines` | Single article column | Static content |
| `/billing-portal` | Stripe redirect surface | Transient |
| `/admin/reports` | Report-card list, mobile column | Admin |

## Lessons from this session, applied here

Every rule below comes out of feedback the user gave during Tasks 13–26.

1. **Kit primitives only.** No hand-rolled `<button>`, `<details>`, or raw
   `<div>` chrome that duplicates `Card`, `Sheet`, `Item`, `Button`, `Tabs`,
   `Accordion`. If the kit doesn't have it, the answer is "extend the kit
   primitive," not "hand-roll it here."
2. **Theme-aware tokens only.** No `text-white`, no `bg-bg-elevated` (which
   silently hardcodes `text-white`), no `text-text-secondary`. Use `--ink /
   --ink-2 / --ink-3 / --card / --hairline / --color-lavender / --color-lime /
   --color-pink` only.
3. **Card `tone="default"` not `tone="elevated"`** on these pages. `elevated`
   forces `text-white` on the inner content which is invisible in light mode.
4. **Surface divergences in this doc before writing code.** Anywhere I would
   normally just "decide and ship," I list Option A / Option B / Option C and
   wait for your pick. No invented scope, no retained "useful additions."
5. **No bracket utilities.** All sizing must use Tailwind v4 native spacing
   scale or `@theme` tokens. Add a token if the value isn't already covered.
   Bracket utilities like `text-[40px]` / `gap-[18px]` / `max-w-[420px]` are
   linted as errors.
6. **Mobile layout is sacred.** Every change is purely additive on `md+`.
   `md:hidden` and `hidden md:flex` carve the surface. The mobile column never
   degrades.
7. **No `useEffect` + `setState` for external state.** Use
   `useSyncExternalStore` (proven in `useIsDesktop` this session).
8. **One PR per page, not a mega-commit.** Verify per page in both themes
   before moving on. Lint-staged guards each commit.

## Per-page proposal (read before approving)

Every page below has at least one decision point flagged `[CHOOSE A/B]` — I
will not implement until you've picked.

---

### 1 · `/profile/edit`

**Problem.** 8 section components stacked vertically (Photos, Identity, Faith,
Doctrine, Lifestyle, Interests, Practical, Verification). On desktop the column
stretches and the user scrolls forever.

**Kit primitives.** `Card`, `Tabs` or section sidebar via `Item`/`ItemGroup`,
existing `PhotoEditSection` etc.

**Decision:**
- `[A]` Sticky section nav on the left (240px), content panel on the right
  (1fr). Click "Faith" → page scrolls to that section. Mirrors `SettingsShell`
  rhythm. Uses kit `Item`/`ItemGroup`.
- `[B]` Tabbed surface via kit `Tabs` — each section is a tab. Less scrolling
  but loses the "see everything at a glance" affordance.

**[CHOOSE A/B for the section nav pattern]**

Other notes:
- Completeness card stays at the top, full width.
- Done CTA stays at the bottom of the content panel.

---

### 2 · `/profile/tokens` (wallet)

**Problem.** Got a quick max-w + 2-col SKU grid earlier. Still feels thin.

**Kit primitives.** `Card` (tone=default), `Choicebox`, `Button`, `Pill`.

**Decision:** what should occupy the rest of the desktop canvas?
- `[A]` 2-col split: left (balance hero + 2-col Choicebox SKU grid), right
  (cross-sell card + token-use legend "1 token = reveal / day pass / boost").
  Adds the legend; that's invented scope.
- `[B]` Keep single-column max-w-960 (the current minimal adapt), just polish
  the typography hierarchy.

**[CHOOSE A/B — A invents a "what tokens do" legend; B is more honest]**

---

### 3 · `/help`

**Problem.** FAQ accordion + 2 contact `Item` cards. Stretches.

**Kit primitives.** `Card`, kit `Accordion` (replaces hand-rolled
`<details>`/`<summary>`), `Item`/`ItemGroup`.

**Decision:**
- `[A]` Centered max-w-720 article column. FAQ becomes kit `Accordion`,
  contact cards stay in `ItemGroup` below. Clean, narrow, focused.
- `[B]` 2-col split: FAQ accordion on left (8/12), contact card pinned right
  (4/12). More visual real estate.

**[CHOOSE A/B — A is the conservative choice; B feels more "settings detail"]**

Either way:
- Replace native `<details>` with kit `Accordion` (real kit-only fix).

---

### 4–6 · `/legal/terms`, `/legal/privacy`, `/legal/community-guidelines`

**Problem.** Three near-identical article columns stretching on desktop.

**Kit primitives.** `Card` for the contact-CTA panel at the bottom of each
article. No new kit primitives needed.

**Decision:**
- `[A]` Centered max-w-720 `<article>` column. Same treatment as the canonical
  reading width. No divergence between the three pages.
- `[B]` Add a kit `Card` sidebar with a "Last updated" timestamp and
  cross-links to the other two legal docs. Invents scope — the canonical pack
  doesn't have this.

**[CHOOSE A/B — strongly recommend A; B would be useful but it's invented]**

Shared work:
- Extract a `LegalArticleShell` component so all three are one source of truth.

---

### 7 · `/billing-portal`

**Problem.** A transient "Opening Stripe…" surface. Never visible long.

**Decision:**
- `[A]` Leave as-is. No layout change beyond the token sweep already shipped.
- `[B]` Center the message vertically + add a small kit `Card` tile so the
  loading state feels intentional rather than empty.

**[CHOOSE A/B — strongly recommend A; this page is in-flight only]**

---

### 8 · `/admin/reports`

**Problem.** Vertical list of full-width report `Card`s. Stretches absurdly
on a 1440px sidebar canvas.

**Kit primitives.** `Card`, `Pill`, `Button`, `ItemGroup`, `ScrollArea`.

**Decision:** the desktop affordance for moderation.
- `[A]` 2-col split: left rail (320px) lists report rows via `ItemGroup` →
  selected row populates a detail card on the right (1fr). Matches the inbox
  split-view pattern shipped in Task 15.
- `[B]` Keep a single column but constrain to `max-w-960` and switch the cards
  to a horizontal 2-col grid (cards-per-row=2). Less invasive.
- `[C]` Status quo. This is internal-only; design polish is low priority.

**[CHOOSE A/B/C — A is the most "real product" treatment; B is fastest; C is fine if you never look at this surface]**

## Tokens / kit additions required

If we pick the proposed routes, these touch globals.css `@theme`:

- `--max-w-content`: 720px (reading width for legal + help)
- `--max-w-wallet`: 960px (already used by /profile/tokens — extract to token)

If you pick option A for `/profile/edit`:
- `--sidebar-section-nav`: 240px

If you pick option A for `/admin/reports`:
- `--max-w-admin`: 1080px (or reuse `--max-w-wallet`)

No new kit primitives need to be hand-rolled — all surfaces use existing
shadcn / Kibo / app components.

## Order of work, once approved

1. `/legal/*` (three pages share a shell → highest leverage)
2. `/help` (single, conservative)
3. `/billing-portal` (probably zero work — confirm option A)
4. `/profile/tokens` (small refactor)
5. `/profile/edit` (largest scope — new section nav)
6. `/admin/reports` (split view OR grid)

Each lands as its own commit. Pre-commit hook lints; husky catches regressions.

## What I will NOT do without explicit approval

- Add cross-links between legal pages (option B above)
- Invent a "what tokens do" legend on /profile/tokens
- Add empty-state polish to /billing-portal
- Touch the mobile layouts on any of these (they already work)
- Introduce new kit primitives (anything net-new ships as a separate plan)

## Outstanding questions

1. **Section nav pattern for `/profile/edit`** — A (sticky sidebar) or B (Tabs)?
2. **/profile/tokens scope** — A (legend) or B (just polish)?
3. **/help layout** — A (centered) or B (2-col)?
4. **/legal/* scope** — A (centered only) or B (with sidebar)?
5. **/billing-portal** — A (no change) or B (centered card)?
6. **/admin/reports** — A (inbox-style split) or B (2-col grid) or C (no
   change)?

Reply with your picks (e.g. "1A 2B 3A 4A 5A 6A") and I'll execute in the
listed order, one PR per page, verifying in both themes before moving on.

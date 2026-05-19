# Landing rebuild plan — Figma → kit-primitive `/`

Date: 2026-05-19
Author: Claude (Opus 4.7)
Source designs: `Landing Page/Ahavah-handoff/ahavah/project/Ahavah Landing.html` (desktop), `Ahavah Landing Mobile.html` (mobile), `tokens.css` (shared)
Target: `src/app/page.tsx` (full replace)

---

## 1. Intent

Replace the current `/` (commit `77dd0f0`, my own composition from primitives) with a pixel-accurate kit-primitive translation of the two design HTMLs. Same content, same sections, same brand tokens — but matched to the design's exact typography scale, section rhythm, and mobile/desktop divergence points.

## 2. Source-of-truth deltas (design vs current `/`)

| # | Element | Design | Current `/` |
|---|---|---|---|
| 1 | Theme | Layout per design; **colors per project's existing `globals.css` semantic tokens** (`:root` for dark, `[data-theme="light"]` for light — both already complete) | Same token system, but layout/sizing wrong |
| 2 | Hero headline | `font-display` Ultra at `clamp(56px, 9vw, 132px)` (desktop) / `clamp(52px, 14vw, 96px)` (mobile) | `clamp(34px, 7vw, 76px)` — too small, also using PJS font-black not Ultra |
| 3 | Section title (`h2`) | `font-display` Ultra at `clamp(40px, 5.4vw, 76px)` (desktop) / `clamp(36px, 9vw, 56px)` (mobile) | `font-bold` PJS at `clamp(24px, 3.5vw, 38px)` — wrong font + half the size |
| 4 | Section bg rhythm | `section--alt` (features + verified) uses `var(--bg-canvas)`; others transparent | All sections transparent |
| 5 | CTA band gradient | `linear-gradient(135deg, #5524F5 0%, #9F76EA 60%, #BC96FF 100%)` (indigo → lavender) | `#0E0040 → #1e0a6e → #5524F5` (near-black → indigo — wrong vibe) |
| 6 | How-it-works step | Numbered badge **outside / above** the media tile | Badge **inside card, below** the image |
| 7 | Mobile hero visual | Card-stack — 3 layered profile cards with rotated lime "like" badge | None — phone hidden on mobile, blank space |
| 8 | Mobile sticky CTA | Bottom-fixed pill appearing on scroll-past-hero; tap returns to form | Not present |
| 9 | Mobile footer | `<details>` accordion per column | Always-open 2-col grid |
| 10 | Tier ring | `box-shadow: inset 0 0 0 1.5px var(--bronze/silver/gold)` (per-tier) | `Card tier="bronze"` exists but `--color-bronze/silver/gold` tokens are **undefined** in `globals.css` — ring renders invisible |
| 11 | Header CTA | "Join waitlist" pill (dark inverse button) | "Sign in" outline button + theme toggle — **theme toggle stays** per user direction; "Sign in" becomes "Join waitlist" CTA, scrolls to `#waitlist` |
| 12 | Brand canvas | Wraps hero → CTA band only (footer outside) | Wraps whole page incl. footer |

The visual gap is large enough that this is a full rewrite of `page.tsx`, not an in-place tweak.

## 3. Kit-primitive mapping (no hand-rolled atoms)

| Design element | Kit primitive | Notes |
|---|---|---|
| Brand lockup (nav + footer) | `Logo` (`@/components/brand/logo`) | **Untouched.** `variant="horizontal"`, sized via `height` prop. Footer uses `forceTheme="dark"` so the dark-bg version renders. |
| CTA brand-mark watermark | `LogoMark` (`@/components/brand/logo-mark`) | Reused for both CTA band watermark AND mobile card-stack like badge (no, the like badge is just a `Heart` icon — see below). |
| "Pre-launch" / overlines | `Pill` (`@/components/kibo-ui/pill`) | `variant="lavender"`. Overline text is plain `<span>` with utility classes (uppercase tracked text — not a primitive). |
| Hero email input | `Input` | `size="lg"`, `error={msg?.kind==="error"}`. Existing primitive. |
| Hero submit + CTA-band button | `Button` | `tone="cta"` (lime bg) + `size="lg"`. Existing. |
| Header "Join waitlist" | `Button` | `tone="elevated"` (dark inverse) + `size="sm"`, `onClick` scrolls to `#waitlist`. Theme toggle (`ThemeToggle variant="icon"`) stays to the left of it. |
| Feature card (6×) | `Card tone="elevated"` + `IconBadge tone={…}` | Existing. Tones map: `lavender→brand`, `lime→cta`, `pink→destructive`, `success→success`, `indigo→elevated`, `gold→muted` (these are existing IconBadge tones used today; matching the live palette to the design palette). |
| How-it-works step (3×) | `Card tone="elevated"` for media, separate `<span>` badge above | Badge is `inline-grid place-items-center size-11 rounded-xl bg-[--color-indigo-deep] text-(--color-lime) font-display`. Stays outside the card per design. |
| Tier card (3×) | `Card tone="tier-active" tier="bronze\|silver\|gold"` | Requires defining `--color-bronze/silver/gold` tokens (see §4). |
| Tier chip (square colored tile w/ icon) | `IconBadge tone="tier" shape="square" size="xl"` + inline `--tier-color` | Existing pattern (verify-tier-shell uses it). |
| Quote card | `Card tone="elevated"` | Existing. |
| Brand-mark watermark inside CTA band | `LogoMark` | **Untouched.** Rendered with `style={{opacity:0.16, transform:'rotate(-12deg)'}}`. |
| Mobile footer accordion | `Accordion` from `@/components/ui/accordion.tsx` | Use kit `Accordion type="multiple"` — matches design's `<details>` collapse behaviour with kit consistency. Visible only on `<md`. |
| Mobile bottom CTA bar | New `app/` component: `LandingStickyCta` | Wraps a `<Button>`. Visibility via React `useEffect` + `IntersectionObserver` on `#waitlist`. |
| Mobile hero card-stack | New `app/` component: `LandingCardStack` | Three rotated photo `<Card tone="flat">`s with absolute positioning. Each card is a kit `Card` — internal `img` is decorative. **Or:** consider keeping the visual as inline JSX (3 absolutely-positioned divs is a layout, not a component). Recommendation: inline JSX, since these aren't reusable. Annotated with a comment explaining the design source. |
| Desktop hero phone mockup | Existing `PhoneMockup` sub-component in `page.tsx` | Already matches design fairly closely. Keep it; minor tweaks to match dimensions. |

Any hand-rolled `<div className="…">` that appears in the rebuilt page must be **layout-only** (flex/grid containers, positioning wrappers, decorative SVG hosts). No bespoke atoms.

## 4. Global changes outside `page.tsx`

### 4.1 Define tier-color tokens (`globals.css`)

The `@theme` block (line 23 onwards) is missing tier-color tokens. Add three lines:

```css
@theme inline {
  /* …existing… */
  --color-bronze: #CD7F32;
  --color-silver: #C0C0C0;
  --color-gold:   #FFD700;
}
```

This fixes the long-standing gap noted in the next-task list. The `Card tier="…"` ring will now render across the whole app (incl. `/verify`).

### 4.2 No other global changes

- `globals.css` light theme already maps `--app/--ink/--bg-canvas` correctly per design.
- Ultra + PJS already loaded as `--font-display` and `--font-sans`.
- No new dependencies.
- No changes to `Logo`, `LogoMark`, theme-provider, layout.tsx.

## 5. Colors — semantic tokens only, theme-adaptive

The landing inherits whatever theme the app is in. **No `data-theme="light"` wrapper.** Per user direction: layout from the design HTMLs, colors from the project's existing source-of-truth tokens in `globals.css` (`:root` for dark, `[data-theme="light"]` for light — both already complete and audited).

**Color rules in the rebuild:**

- Surfaces: `var(--app)`, `var(--card)`, `var(--bg-canvas)` — never hardcoded `#FBF9F4` / `#0F0B1F` / `#ECE9E0` from the design HTML.
- Ink: `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`.
- Borders: `var(--hairline)`, `var(--border)`.
- Brand: `var(--color-indigo)`, `var(--color-lime)`, `var(--color-lavender)`, `var(--color-pink)`, `var(--color-success)`.
- Tier: `var(--color-bronze)`, `var(--color-silver)`, `var(--color-gold)` (added in §4.1).
- Shadows + scrims: the existing `--shadow-soft` / `--shadow-cta` / `--scrim-strong` tokens, or arbitrary Tailwind for one-offs.

The `BRAND_CANVAS` gradient already uses `var(--app)` + `var(--color-*)` tokens — it adapts automatically. No changes needed there.

**Header keeps the theme toggle** (`ThemeToggle variant="icon"`) per user direction. Users can flip between light/dark on the landing and the design layout holds in either mode because every color reference is semantic.

**Inverse surfaces (footer, CTA-band, sticky bar inverse button):** the footer + CTA band in the design are always dark-on-light contrast moments. These will hardcode `bg-(--color-indigo-deep)` (which is `#0F0B1F` in both themes via `--color-indigo-deep` if it exists, else `var(--color-indigo)` mixed — verify the token first; if not present I'll use `bg-[#0F0B1F]` and add a note). This matches the current `/`'s footer (already `bg-[#0F0B1F]`).

## 6. Sticky CTA bar (`LandingStickyCta`)

New file: `src/components/app/landing-sticky-cta.tsx`. Mobile-only (hidden ≥md). Layout per design:

- Position: `fixed bottom-0 left-0 right-0 z-60`
- Background: blurred `bg-app/80` with `backdrop-blur-xl`
- Border-top: `--border-subtle`
- Content: left = "Join the waitlist" title + "12,400+ already on the list · Spring 2026" sub. Right = `Button size="sm" tone="elevated"` "Join" that scrolls to `#waitlist`.
- Visibility: `translateY(120%)` by default, `translateY(0)` when `#waitlist` exits the viewport (IntersectionObserver with `rootMargin: '-40% 0px 0px 0px'`).
- Padding accounts for iOS safe-area (`pb-[calc(12px+env(safe-area-inset-bottom))]`).
- Hidden via `md:hidden` so desktop never sees it.

## 7. Typography + spacing — exact mappings

Per design `tokens.css` + landing HTMLs:

| Token | Value | Used for |
|---|---|---|
| `--font-display` | `'Ultra', …` | All `h1`/`h2`/stat-numbers/step badges |
| Hero `h1` size | `clamp(56px, 9vw, 132px)` desktop / `clamp(52px, 14vw, 96px)` mobile | Mobile-first via single `clamp` that handles both: `clamp(52px, 14vw, 132px)` would lose desktop intent. Use Tailwind responsive: base `text-[clamp(52px,14vw,96px)]` + `lg:text-[clamp(56px,9vw,132px)]`. |
| Section `h2` | `clamp(36px, 9vw, 56px)` mobile / `clamp(40px, 5.4vw, 76px)` desktop | Same responsive split. |
| Section padding | `padding-block: 80px` mobile / `120px` desktop | `py-20 lg:py-30` |
| Container max-width | `1200px` desktop / `480px` mobile | `max-w-[480px] lg:max-w-6xl mx-auto` |
| Container padding-inline | `24px` mobile / `32px` desktop tablet+ | `px-6 md:px-8` |
| Card radius | `--radius-2xl: 28px` | Tailwind `rounded-[28px]` or new arbitrary; matches Card primitive |

## 8. File-by-file change list

1. **`src/app/globals.css`** — add 3 tier-color tokens to `@theme inline`. ~3 lines.
2. **`src/app/page.tsx`** — full rewrite (~600 → ~700 lines). All kit primitives; no hand-rolled atoms beyond layout.
3. **`src/components/app/landing-sticky-cta.tsx`** — new file, ~50 lines. Wraps Button + IntersectionObserver.

No other files change.

## 9. Out of scope

- Real waitlist POST endpoint (still localStorage — listed in next-task queue).
- Phone-mockup vs card-stack platform detection — desktop gets phone (lg:+), mobile gets card-stack (<lg). No JS detection needed; pure CSS.
- Unsplash → self-hosted image migration (still Unsplash CDN; design uses same URLs).
- SEO meta tags (already set in `layout.tsx`).

## 10. Verification plan

After implementation:

1. `pnpm typecheck` — must pass.
2. `pnpm build` — must succeed (Next 16 turbopack).
3. Browser open at `localhost:3000` — verify against design HTMLs side by side at:
   - **375px** (iPhone SE / smallest target) — card-stack visible, sticky CTA appears after hero, accordion footer collapses.
   - **768px** (tablet) — still single column, phone mockup still hidden.
   - **1280px** (desktop) — 2-col hero with phone, 3-col features, full nav links visible.
4. Confirm tier-card rings render bronze/silver/gold (the `--color-*` token fix).
5. Confirm light-theme lock — `/` stays cream regardless of `data-theme` on `<html>`.
6. No regression on other routes (light/dark toggle, sign-in flow).

## 11. Risks + open questions

| # | Risk | Mitigation |
|---|---|---|
| R1 | `data-theme="light"` on a child div may not cascade through portals (dropdown, dialog) | Landing has no portal-rendered UI. N/A. |
| R2 | The 132px Ultra display headline may overflow on narrow phones | `clamp(52px, 14vw, 96px)` mobile floor matches design; tested in design HTML at 375px. |
| R3 | `--color-bronze/silver/gold` tokens may collide with existing usage | Searched `src/` — only `card.tsx` references them. Safe. |
| R4 | Removing the theme toggle from landing header may surprise users mid-session | Landing is pre-signup; users haven't customised yet. Toggle reappears post-auth. |

## 12. Approval — confirmed 2026-05-19

1. ~~Force light theme~~ → **Layout from design, colors from project's semantic tokens** (theme-adaptive). Approved.
2. ~~Remove theme toggle~~ → **Keep theme toggle** in landing header. Approved.
3. **Add `--color-bronze/silver/gold` tokens** to `@theme inline` in `globals.css`. Approved.
4. **New file `src/components/app/landing-sticky-cta.tsx`**. Approved.

Implementation order: tokens → sticky-cta component → page rewrite → `pnpm typecheck` → `pnpm build` → browser verify at 375 / 768 / 1280px against both HTML designs side-by-side.

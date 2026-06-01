# Ahavah Design System — Comprehensive Spec

Built per the design-system-creation skill (Foundation → Components → Patterns).
Layered so an engineering agent can build primitives bottom-up; a designer can
review semantics top-down.

> **Theming:** Light mode is the desktop default. Dark mode (mobile PWA) is
> opt-in via `data-theme="dark"`. Brand colors are immutable across themes.

---

## Layer 1 · Foundation

### 1.1 Color tokens — primitive scale

Brand colors are not tinted into a 50→900 scale (we don't need 9 lavenders).
They are flat brand identities. Surfaces + ink scale separately per theme.

```css
:root {
  /* Brand (immutable) */
  --color-indigo:        oklch(0.46 0.30 270);   /* #5524F5 */
  --color-lime:          oklch(0.95 0.18 119);   /* #D7FF81 — dark mode */
  --color-lavender:      oklch(0.71 0.16 295);   /* #BC96FF */
  --color-pink:          oklch(0.65 0.24 17);    /* #FF4566 */

  /* Brand · tinted scales — only generated where they're actually used,
     not exposed as a full ramp. */
  --color-lime-10:       color-mix(in oklch, var(--color-lime) 10%, transparent);
  --color-lime-14:       color-mix(in oklch, var(--color-lime) 14%, transparent);
  --color-lavender-10:   color-mix(in oklch, var(--color-lavender) 10%, transparent);
  --color-lavender-14:   color-mix(in oklch, var(--color-lavender) 14%, transparent);
  --color-pink-10:       color-mix(in oklch, var(--color-pink) 10%, transparent);
  --color-pink-14:       color-mix(in oklch, var(--color-pink) 14%, transparent);

  /* Semantic state */
  --color-success:       oklch(0.85 0.21 138);
  --color-warning:       oklch(0.83 0.18 90);
  --color-danger:        var(--color-pink);

  /* Verification tier */
  --color-bronze:        #CD7F32;
  --color-silver:        #C0C0C0;
  --color-gold:          #FFD700;
}
```

### 1.2 Color tokens — semantic (theme-aware)

These are what components consume. Never reference primitives directly in a
component — always go through these aliases so theme flips propagate.

```css
[data-theme="light"], :root {
  --bg-app:        #FBF9F4;
  --bg-card:       #FFFFFF;
  --bg-canvas:     #ECE9E0;
  --bg-inverse:    #0F0B1F;

  --fg-default:    #0F0B1F;
  --fg-muted:      oklch(0.45 0.05 280);
  --fg-subtle:     oklch(0.60 0.04 280);
  --fg-inverse:    #FFFFFF;

  --border-subtle: rgba(15,11,31,0.06);
  --border-default: rgba(15,11,31,0.12);
  --border-strong: rgba(15,11,31,0.24);

  --color-lime:    oklch(0.78 0.22 119);   /* darkened for AA on white */
}
[data-theme="dark"] {
  --bg-app:        oklch(0.18 0.11 280);
  --bg-card:       oklch(0.13 0.06 280);
  --bg-canvas:     #000000;
  --bg-inverse:    #FFFFFF;

  --fg-default:    #FFFFFF;
  --fg-muted:      oklch(0.75 0.04 280);
  --fg-subtle:     oklch(0.66 0.05 280);
  --fg-inverse:    #0F0B1F;

  --border-subtle: rgba(255,255,255,0.08);
  --border-default: rgba(255,255,255,0.15);
  --border-strong: rgba(255,255,255,0.30);
}
```

### 1.3 Accessibility — WCAG AA contrast pairings (audited 2026-05-16)

| Surface       | text-default | text-muted | text-subtle | Notes                          |
|---------------|--------------|------------|-------------|--------------------------------|
| bg-app (lt)   | 16.4 ✓       | 6.1 ✓      | 4.7 ✓       | All pass AA body 4.5           |
| bg-card (lt)  | 18.9 ✓       | 7.0 ✓      | 5.4 ✓       |                                 |
| bg-app (dk)   | 12.8 ✓       | 6.4 ✓      | 5.5 ✓       |                                 |
| bg-card (dk)  | 16.1 ✓       | 8.1 ✓      | 7.0 ✓       |                                 |
| **lime**      | text-black 18.2 ✓ | white 1.12 ✗ | — | **Black only**                |
| **lavender**  | text-black 8.4 ✓  | white 2.72 ✗ | — | **Black only**                |
| **pink**      | text-black 6.6 ✓  | white 3.66 ✗ | — | **Black only**                |
| bronze        | text-black 6.55 ✓ | white 3.20 ✗ | — | **Black only**                |
| silver        | text-black 11.7 ✓ | white 1.82 ✗ | — | **Black only**                |
| gold          | text-black 14.4 ✓ | white 1.40 ✗ | — | **Black only**                |

### 1.4 Typography

Font: **Plus Jakarta Sans**, weights 300/400/500/600/700/800.

```css
:root {
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: ui-monospace, 'SFMono-Regular', Menlo, monospace;
}
```

| Token              | Size | LH    | Tracking  | Weight | Role                          |
|--------------------|------|-------|-----------|--------|-------------------------------|
| `--text-display`   | 30   | 1.10  | -0.02em   | 800    | Page titles                   |
| `--text-h1`        | 24   | 1.20  | -0.015em  | 800    | Section headings              |
| `--text-h2`        | 20   | 1.25  | -0.01em   | 700    | Card titles                   |
| `--text-h3`        | 18   | 1.30  | —         | 700    | Subheadings                   |
| `--text-body`      | 16   | 1.50  | —         | 400    | Default body                  |
| `--text-body-s`    | 16   | 1.50  | —         | 600    | Emphasized body               |
| `--text-meta`      | 14   | 1.45  | —         | 400    | Meta / captions in cards      |
| `--text-caption`   | 12   | 1.40  | —         | 400    | Microcopy                     |
| `--text-overline`  | 11   | 1.30  | 0.08em UP | 700    | Section labels                |
| `--text-marketing` | 80   | 0.95  | -0.03em   | 800    | Desktop hero only             |

### 1.5 Spacing — 4px base

```css
--space-0:  0;
--space-0_5: 2px;
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

Gutters (desktop): `32` outer · `24` between panels · `14–18` card pad ·
`8–14` element gap.

### 1.6 Radii

```css
--radius-xs:   6px;
--radius-sm:   10px;
--radius-md:   12px;
--radius-lg:   16px;   /* default */
--radius-xl:   22px;
--radius-2xl:  28px;
--radius-3xl:  36px;
--radius-full: 9999px;
```

### 1.7 Touch + sizing

```css
--size-tap:      44px;   /* iOS minimum */
--size-tap-lg:   48px;   /* Material comfortable */
--size-tap-xl:   56px;   /* Primary CTA */
--size-tap-2xl:  64px;   /* Hero circle */
```

### 1.8 Elevation / shadows

```css
/* Light mode */
--shadow-sm:   0 1px 2px rgba(15,11,31,0.05);
--shadow-md:   0 4px 12px rgba(15,11,31,0.08);
--shadow-lg:   0 10px 30px rgba(15,11,31,0.12);
--shadow-xl:   0 24px 60px rgba(15,11,31,0.18);
--shadow-cta:  0 8px 24px -4px rgba(85,36,245,0.15),
               0 2px 8px -2px rgba(15,11,31,0.08);

/* Dark mode */
[data-theme="dark"] {
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.30);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.40);
  --shadow-lg:  0 10px 30px rgba(0,0,0,0.50);
  --shadow-xl:  0 24px 60px rgba(0,0,0,0.60);
  --shadow-cta: 0 8px 24px -4px rgba(255,255,255,0.12),
                0 2px 8px -2px rgba(255,255,255,0.08);
}
```

### 1.9 Motion

```css
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:      cubic-bezier(0.7, 0, 0.84, 0);
--ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);

--duration-1:   150ms;   /* hover, focus */
--duration-2:   250ms;   /* entrance */
--duration-3:   400ms;   /* drawer / sheet */
--duration-4:   1000ms;  /* match badge carve-out */
```

All animations respect `@media (prefers-reduced-motion: reduce)` →
duration collapses to `0.01ms` site-wide via `globals.css`.

### 1.10 Breakpoints

```css
--bp-sm:  640px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1280px;
--bp-2xl: 1440px;
```

Mobile column max 414px (matches `/ahavah-app` class). Desktop sidebar
appears at `≥md`.

---

## Layer 2 · Components

Each component below documents: **anatomy** · **variants** · **states**
· **accessibility** · **do / don't**.

### Button

**Anatomy** — container (paint surface + border) · label (text) · icon
(optional, leading or trailing).

**Variants**
- `tone="cta"` — lime fill, black text — primary actions (Continue, Save, Send)
- `tone="brand"` — lavender fill, black text — brand-flavored secondary
- `tone="action"` — pink fill, black text — destructive or high-energy (Like, Confirm-delete)
- `tone="elevated"` — card-color fill, ink text — quiet but visible
- `tone="outline"` — transparent fill, ink text, border — tertiary
- `variant="ghost"` — text-only, no fill — least emphasis
- `variant="link"` — inline link styling — inside running text

**Sizes** (height / padding / radius / fontSize / fontWeight)
- `xs` — 24 / 8 / 10 / 12 / 600
- `sm` — 32 / 12 / 12 / 13 / 600
- `tap` — 44 / 16 / 12 / 14 / 600
- `cta` — 56 / 24 / 16 / 16 / 700
- `circle-{lg|xl|2xl}` — 48 / 56 / 64 square, fully rounded

**States**
- Default · Hover (+4% bg) · Active (+8% bg + translateY 1px) · Focus
  (white 2px outline + 2px offset) · Disabled (opacity 0.5, no pointer)
  · Loading (spinner replaces label, `aria-busy="true"`)

**Accessibility**
- `role="button"` (native `<button>` element)
- Keyboard: Enter / Space activates
- Focus ring meets WCAG 1.4.11 (≥3:1 against canvas) — opaque white,
  2px outline + 2px offset
- Disabled state never relies on color alone; opacity-0.5 +
  `aria-disabled="true"`

**Do / don't**
- ✓ Pair lime / lavender / pink CTAs with **black** text always
- ✗ Never put white text on a brand fill — fails AA
- ✓ One primary CTA per screen surface; secondaries downgrade to ghost
- ✗ Don't use `tone="action"` (pink) for delete confirmations — pink is
  energy in our brand, not danger; use ghost + red-tinted disclosure text

```tsx
<Button tone="cta" size="cta" leadingIcon={<Sparkles/>}>
  Upgrade to Premium
</Button>
```

---

### Pill / Badge

**Anatomy** — fully rounded pill · 24px height · 10px padding · optional
leading icon.

**Variants**
- `lime` · `lavender` · `pink` · `success` — solid brand fills with black text
- `lavOutline` — transparent + 1px lavender border + lavender text
- `glassDark` — translucent inverse (rgba(15,11,31,0.06) light / rgba(0,0,0,0.30) dark)
  with text-default / inverse, used over photos

**States** — static only. For interactive pills (filter chips, segmented
tabs), use a Button variant instead.

**Accessibility**
- Decorative pills are `aria-hidden`
- Status pills (e.g. unread count "3") need `aria-label="3 unread"`
- Don't rely on color alone for state — include text or an icon

---

### Card

**Anatomy** — background surface · padding · radius · optional border ·
optional shadow.

**Variants**
- `default` — `bg-card` + `border-subtle` + radius-lg
- `elevated` — same + `shadow-md`
- `gradient` — Persian-Indigo→Lavender gradient, white text, no border
- `overlap` — sits over a photo bottom edge: bg-app + radius-3xl top corners
  + inverse-direction shadow `0 -8px 24px rgba(0,0,0,0.20)`
- `tier-active` — `inset 0 0 0 1.5px var(--color-{tier})`

**States** — static. Interactive cards (Match grid, profile cards) wrap
in a `<Button variant="ghost" size="block">` for hover state.

**Sub-anatomy** — Header (title + optional action) · Content · Footer
(actions row).

---

### Input

**Anatomy** — wrapper · optional leading icon · text input · optional
trailing icon or addon button.

**Variants**
- `default` — bg-card surface
- `elevated` — bg-app surface (use inside a card to avoid surface clash)

**Sizes**
- `sm` — 40 height, 14px font, radius-md
- `md` — 48 height, 16px font, radius-md
- `lg` — 56 height, 16px font, radius-lg (default for forms)

**States**
- Default — border-subtle
- Hover — border-default
- Focus — border 1.5px lavender, no extra shadow ring (the border IS the focus)
- Filled — same as default, value present
- Error — border 1.5px pink, helper text in pink below
- Disabled — opacity 0.5, no pointer

**Accessibility**
- Every input has a `<label>` (visible or sr-only)
- Error messages associated via `aria-describedby`
- Required fields marked with `aria-required="true"` and visible *
- Type-specific keyboards: `type="email"`, `inputMode="numeric"`, etc.

---

### Avatar

**Anatomy** — circular container · photo OR fallback initial · optional
status dot · optional ring.

**Variants**
- `photo` — user's uploaded image, object-fit cover
- `brand-fallback` — `bg-inverse` (indigo) + `var(--color-lime)` initial,
  weight 800. **Don't flip this in light mode** — the brand recognition
  lives in the indigo disc.
- `name-gradient` — deterministic name-seeded gradient (for photo
  placeholder cards, not avatars)

**Sizes** — 28 / 32 / 40 / 44 / 48 / 56 / 64 / 80px.

**States**
- `ring="lime"` — 2.5px lime border (unread message, active chat)
- `online` — 12px lime dot bottom-right with 2.5px app-bg ring

**Accessibility**
- `role="img"` + `aria-label="<name>'s photo"` when a photo is loaded
- Decorative initials are `aria-hidden`

**Do / don't**
- ✓ Always set `flex-shrink: 0` + `aspect-ratio: 1` — avatars in flex
  rows otherwise get squashed into ovals
- ✗ Don't put gradient avatars in flex rows next to name+message text —
  they squash without the shrink guards

---

### Icon

**System** — Lucide (lucide-react@0.451). 24×24 viewBox, stroke=2,
round caps / joins.

**Sizes** — 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32px.

**Color** — reads `currentColor` so parent text color cascades.

---

### Sparkle (brand mark)

**The 4-point sparkle is the bespoke SVG owned by the brand.**
One canonical path:

```svg
<svg viewBox="0 0 100 100" fill="#D7FF81">
  <path d="M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z"/>
</svg>
```

Color variants: lime (canonical) · pink · lavender · custom hex.
Tile lockup: indigo rounded-square with the sparkle inside (app icon).

---

### Toggle (Switch)

**Anatomy** — track (48×28) · knob (22 circle).

**States**
- Off — track `--border-default`, knob left
- On — track `--color-lime`, knob right
- Disabled — opacity 0.5

**Accessibility**
- `role="switch"` + `aria-checked`
- Keyboard: Space toggles
- Label adjacent via `<label>` wrap

---

### Tabs

**Variants**
- `pill` — segmented pill row, active = lime fill (used in /matches)
- `underline` — text row with underline indicator (alternative; not
  currently shipped)

---

## Layer 3 · Patterns

### Form pattern

```
┌────────────────────────────────────┐
│ Title (t-h2)                       │
│ Helper (t-meta, fg-muted)          │
│                                    │
│ Field group (vertical, gap 14):    │
│   Label (t-meta, fg-default)       │
│   Input (lg)                       │
│   Helper / error (t-caption)       │
│                                    │
│ Submit (cta, full width)           │
│ Secondary link below (link variant)│
└────────────────────────────────────┘
```

- Labels above inputs (not floating)
- Helper text below input, ≤ 1 line; error replaces helper
- Submit is full-width on mobile, auto-width on desktop forms ≥ 640px
- Don't break field labels across lines

### Empty state pattern

```
┌────────────────────────────────────┐
│        ✦ Sparkle / Icon            │
│                                    │
│        Title (t-h3)                │
│   Description (t-meta, fg-muted)   │
│                                    │
│         [Secondary CTA]            │
└────────────────────────────────────┘
```

- Sparkle for brand-friendly empties (no matches, no messages)
- Lucide icon for utility empties (no results, no internet)
- CTA is `tone="outline"` (don't lead with bright lime in an empty)

### Loading state pattern

- Skeleton blocks (radius-md, `bg-border-subtle`, animate-pulse) for
  list rows + grid cards
- Inline spinner (Loader2, 16px, animate-spin) inside buttons during
  submission — replaces the label and sets `aria-busy="true"`
- Never show a fullscreen spinner; show the chrome + skeletonize content

### Error state pattern

- Inline error toast (top, slide-down, `bg-pink-10`, pink left border,
  ink text) for transient failures
- Card-level alert (icon + title + body + retry CTA) for fetch failures
- Form-field error (pink border + helper) for validation
- Never use a modal dialog for errors — they're disruptive

### Layout — Page shell (desktop)

```
┌──────────┬─────────────────────────┐
│ Sidebar  │ Top bar                  │
│ 260px    ├─────────────────────────┤
│          │                          │
│          │ Content                  │
│          │ padding 32               │
└──────────┴─────────────────────────┘
```

Sidebar always present except: Welcome / Sign-up / Onboarding / Match /
Paywall / Locked / Banned / Maintenance / Offline (full-bleed surfaces).

### Layout — Page shell (mobile)

- 414px-max column on black canvas
- Floating BottomNav: 5 tabs, `position: fixed`, `inset-x-4 bottom-3`
- Content area uses `pb-20` to clear the nav
- Top header inside the column: 56px tall

---

## Governance

- **New tokens** require a designer-ratified contrast check.
  Script: `pnpm run audit:contrast` (see `scripts/audit-contrast.mjs`).
- **New components** ship with: spec block (this format) · React
  component · unit test · Storybook story (when Storybook ships).
- **Versioning** — semantic. Pin via `@ahavah/design-system@<version>`
  once the package is split out.
- **Deprecation** — 3-month notice. Mark with JSDoc `@deprecated` and
  log a console.warn in dev builds.

---

## Quick-reference cheat sheet

```css
/* Most-used tokens in component code */
background: var(--bg-card);
color:      var(--fg-default);
border:     1px solid var(--border-subtle);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-md);
padding:    var(--space-5) var(--space-6);
font: 400 var(--text-body)/1.5 var(--font-sans);
```

```tsx
/* Most-used button */
<Button tone="cta" size="cta">Continue</Button>

/* Most-used avatar */
<Avatar size="tap-lg" variant="brand-fallback">{firstName[0]}</Avatar>

/* Most-used card */
<Card>
  <CardHeader>
    <CardTitle>…</CardTitle>
    <CardDescription>…</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>
```

# Ahavah Design System — Light Mode

Light mode is the **default for desktop**. Dark mode (the current
mobile PWA) is opt-in via `data-theme="dark"` on any subtree.

All semantic tokens below are CSS variables defined in `tokens.css`.
Brand colors (lime / lavender / pink / indigo / tier colors) are the
same in both themes.

---

## 1. Colors

### Brand (immutable across themes)

| Token         | Value (CSS)                  | Hex      | Pair with    | Use                          |
|---------------|------------------------------|----------|--------------|------------------------------|
| `--indigo`    | `oklch(0.46 0.30 270)`       | #5524F5  | text-white   | Persian Indigo · brand base  |
| `--lime`      | `oklch(0.95 0.18 119)` *     | #D7FF81  | text-black   | Mindaro · primary CTA fill   |
| `--lavender`  | `oklch(0.71 0.16 295)`       | #BC96FF  | text-black   | Brand accent · pills · chat  |
| `--pink`      | `oklch(0.65 0.24 17)`        | #FF4566  | text-black   | Action / danger / Pass btn   |
| `--success`   | `oklch(0.85 0.21 138)`       | #9FE870  | text-black   | Online dot                   |
| `--bronze`    | `#CD7F32`                    | —        | text-black   | Verification tier 1          |
| `--silver`    | `#C0C0C0`                    | —        | text-black   | Verification tier 2          |
| `--gold`      | `#FFD700`                    | —        | text-black   | Verification tier 3          |

\* In light mode the lime token darkens slightly to `oklch(0.78 0.22 119)`
to clear AA against white cards. Same brand color, more weight.

**WCAG pairings (verified):** lime / lavender / pink fills MUST pair with
black text. White on any of these fails AA contrast.

### Surfaces (light mode)

| Token             | Hex     | Use                                  |
|-------------------|---------|--------------------------------------|
| `--app`           | #FBF9F4 | Warm cream — page background         |
| `--card`          | #FFFFFF | Elevated cards, modals, sheets       |
| `--canvas`        | #ECE9E0 | Page outside the column (wider bg)   |
| `--ink`           | #0F0B1F | Primary text (near-black, indigo bias) |
| `--ink-2`         | ~#5C4F7F | Secondary text                       |
| `--ink-3`         | ~#7B6F95 | Muted text                           |
| `--hairline`      | rgba(15,11,31,0.06) | Subtle dividers           |
| `--border`        | rgba(15,11,31,0.12) | Visible borders           |

### Surfaces (dark mode reference)

| Token             | Hex     | Use                                  |
|-------------------|---------|--------------------------------------|
| `--app`           | #1A1340 | Indigo — page background             |
| `--card`          | #0F0B1F | Cards · sheets                       |
| `--canvas`        | #000000 | Page surrounding the 414px column    |
| `--ink`           | #FFFFFF | Primary text                         |
| `--ink-2`         | #B5B0CC | Secondary text                       |

### Shadows (light)

```css
--shadow-soft: 0 8px 24px rgba(15,11,31,0.10);
--shadow-cta:  0 8px 24px -4px rgba(85,36,245,0.15),
               0 2px 8px -2px rgba(15,11,31,0.08);
```

### Scrims (over photos)

```css
--scrim-strong: linear-gradient(180deg, rgba(15,11,31,0) 0%, rgba(15,11,31,0.55) 100%);
```

---

## 2. Typography

**Plus Jakarta Sans**, weights 300 / 400 / 500 / 600 / 700 / 800.
Load from Google Fonts:

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"/>
```

### Type scale

| Class         | Size / Line-height | Tracking   | Weight | Use                              |
|---------------|--------------------|------------|--------|----------------------------------|
| `.t-display`  | 30 / 1.10          | -0.02em    | 800    | Page titles · hero headings       |
| `.t-h1`       | 24 / 1.20          | -0.015em   | 800    | Section headings                  |
| `.t-h2`       | 20 / 1.25          | -0.01em    | 700    | Card titles                       |
| `.t-h3`       | 18 / 1.30          | —          | 700    | Subheadings · row titles          |
| `.t-body`     | 16 / 1.50          | —          | 400    | Default body text                 |
| `.t-body-s`   | 16 / 1.50          | —          | 600    | Emphasized body                   |
| `.t-meta`     | 14 / 1.45          | —          | 400    | Captions inside cards             |
| `.t-caption`  | 12 / 1.40          | —          | 400    | Microcopy · hints                 |
| `.t-overline` | 11 / 1.30          | 0.08em UPP | 700    | Section labels above headings     |

**Minimum body text 12px** for captions; **16px for inputs** (prevents
iOS zoom-on-focus, even on desktop where it doesn't apply — consistency
between PWA + web).

**Desktop hero headlines** can scale up to 80px (`fontSize:80, lineHeight:0.95,
letterSpacing:-0.03em`) for the welcome screen split-hero. Otherwise stick
to the scale above.

---

## 3. Spacing & radii

```css
--radius:      1rem;       /* 16px base */
--radius-sm:   9.6px;
--radius-md:   12.8px;
--radius-lg:   16px;
--radius-xl:   22.4px;
--radius-2xl:  28.8px;
--radius-3xl:  35.2px;
--tap:         44px;       /* iOS minimum */
--tap-lg:      48px;       /* Material comfortable */
--tap-xl:      56px;       /* Primary CTA */
--tap-2xl:     64px;       /* Hero / circle action */
```

Gutters: **32px** outer (desktop) · **24px** between major panels ·
**14–18px** padding inside cards · **8–14px** internal element gaps.

---

## 4. Component primitives

### Button — `PrimaryBtn`

| Tone        | Background          | Text color         | Border    |
|-------------|---------------------|--------------------|-----------|
| `cta`       | `--lime`            | `--cta-ink` (#000) | none      |
| `brand`     | `--lavender`        | #000               | none      |
| `action`    | `--pink`            | #000               | none      |
| `elevated`  | `--card`            | `--ink`            | hairline  |
| `dark`      | `--ink`             | `--app`            | none      |
| `outline`   | transparent         | `--ink`            | `--border`|

Size **`cta`**: h=56, paddingInline=24, radius=16, fontSize=16, weight=700.
Size **`tap`**: h=44, paddingInline=16, radius=12, fontSize=14, weight=600.

Shadow (default `lift="float"`): `--shadow-cta`.

### Button — circle (`CircleBtn`)

Round action buttons. Sizes 44 / 48 / 56 / 64 / 80px. Same tone map.
Used in Discover (Skip/Play/Like = 64/80/64 on desktop, 48/56/48 on mobile).

### Pill (badge)

Height 24, paddingInline 10, radius 999, fontSize 12, weight 700.
Variants: `lime` · `lavender` · `pink` · `success` · `lavOutline`
(transparent + 1px lavender border + lavender text) · `glassDark`
(rgba(15,11,31,0.06) bg + ink color in light / rgba(0,0,0,0.30) +
white in dark).

### Card

Default — `background: var(--card); border-radius: var(--radius-2xl);
border: 1px solid var(--hairline);`

Variants:
- **Gradient hero** — `linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%);`
  text-white.
- **Overlap** — same as default + `box-shadow: 0 -8px 24px rgba(0,0,0,0.20);`
  for cards that sit over the bottom of a photo.
- **Tier active** — `box-shadow: inset 0 0 0 1.5px <tier-color>` (bronze/silver/gold).

### Input

Height 56, radius 16, paddingInline 18, fontSize 16. Default border
`var(--hairline)`; focus / active border `var(--lavender)` 1.5px.
Background `var(--card)`.

### Avatar (`AvatarFallback variant="brand"`)

Indigo disc + lime initial. The brand fallback for missing photos:

```css
background: var(--bg-indigo);  /* same in light mode — DO NOT change to white */
color:      var(--lime);
font-weight: 800;
```

Sizes (square, equal width & height, `flex-shrink:0`, `aspect-ratio:1`):

| Token          | px  | Use                                                  |
|----------------|-----|------------------------------------------------------|
| xs             | 28  | Chat-bubble micro · profile-detail meta              |
| sm             | 32  | Inline avatars                                       |
| md             | 40  | Small list rows                                      |
| tap            | 44  | Map markers · 44px touch                             |
| tap-lg         | 48  | Chat header · inbox rows · top-right user avatar     |
| tap-xl         | 56  | Story rows · large list rows                         |
| tap-2xl        | 64  | Profile hero (mobile)                                |
| desktop-hero   | 80  | Profile hero (desktop only)                          |

**Online dot** — 12px lime circle with 2.5px ring matching the
surrounding bg, positioned absolute bottom-right of the avatar.

### Icon

Lucide icons via `lucide-react@0.451`. Stroke=2, round caps + joins,
24×24 viewBox. Default size 20. Color reads `currentColor` so the
parent text color cascades.

### Sparkle

The brand mark. SVG path:

```html
<svg viewBox="0 0 100 100">
  <path d="M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z"
        fill="#D7FF81"/>
</svg>
```

Render at 20–96px. Color follows context (lime is canonical; pink and
lavender variants exist for decorative use).

---

## 5. Layout primitives

### DesktopShell

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar (260px) │ Top bar (h=72)                          │
│   Brand mark    ├──────────────────────────────────────── │
│   Nav rows      │                                          │
│   Premium upsell│ Content area                             │
│   User pin      │ padding 32px                             │
└──────────────────────────────────────────────────────────┘
```

- Sidebar always present except on Welcome / Sign-up / Onboarding /
  Match / Paywall / Locked (full-bleed surfaces).
- Top bar present everywhere except Map (full-bleed) and edge states.

### Sidebar nav

5 items: Discover · Map · Matches · Inbox (with unread badge) ·
Profile. Active item: lime-filled circle behind the icon (40px), bold
label. Inactive: lavender icon, regular weight, no background.

Active background tint: `color-mix(in oklch, var(--lime) 14%, transparent)`
on the entire row (rounded 14px).

---

## 6. Motion

All animations honor `prefers-reduced-motion: reduce`.

| Pattern             | Duration | Easing       | Use                              |
|---------------------|----------|--------------|----------------------------------|
| fadeUp (entrance)   | 250ms    | easeOut      | Page sections, list rows         |
| fadeUp (exit)       | 200ms    | easeIn       | Modal/sheet dismiss              |
| Stagger             | 60ms ×N  | —            | Capped after 7 siblings          |
| Drawer / sheet      | 280ms    | easeInOut    | Side panels, bottom sheets       |
| Card swipe rebound  | 300ms    | spring(180,18)| Discover deck                    |
| Match badge climax  | 1000ms   | spring       | **Carve-out** — celebration only |

Card-swipe rotation: ±15° at ±200px drag. Overlays (LIKE/NOPE) ramp
from opacity 0 at ±40px to 1 at ±140px (commit threshold).

---

## 7. Photo placeholders

When a user has no photo uploaded, render a name-seeded brand gradient
plus their first initial in `rgba(255,255,255,0.18)` at 160px+ font
size (the size that reads as a "photo placeholder", not "avatar").

Gradients (canonical mapping by name; deterministic):

```js
const NAME_GRADIENTS = {
  Yael:   "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Adina:  "linear-gradient(135deg,#FF4566 0%,#BC96FF 100%)",
  Daniel: "linear-gradient(135deg,#1A1340 0%,#5524F5 100%)",
  Esther: "linear-gradient(135deg,#BC96FF 0%,#FF4566 100%)",
  Caleb:  "linear-gradient(135deg,#5524F5 0%,#FF4566 100%)",
  Yosef:  "linear-gradient(135deg,#0F0B1F 0%,#5524F5 100%)",
  Rivka:  "linear-gradient(135deg,#FF4566 0%,#5524F5 100%)",
  Tirzah: "linear-gradient(135deg,#BC96FF 0%,#5524F5 100%)",
  Ehud:   "linear-gradient(135deg,#5524F5 0%,#9F76EA 70%,#BC96FF 100%)",
  Default:"linear-gradient(135deg,#5524F5,#BC96FF)",
};
```

For production, replace these placeholders with the real user's
uploaded photos via the existing `photoOrGradient` helper at
`ahavah-web/src/lib/photo-or-gradient.ts`.

---

## 8. Light vs dark — what flips, what doesn't

**Flips (theme-driven):**
- Background (cream ↔ indigo)
- Card surface (white ↔ dark indigo)
- Text colors (near-black ↔ white)
- Hairlines / borders (subtle ↔ subtle, both contextual)
- Shadow color (indigo-tinted dark ↔ pure black)
- Status bar text color (dark ↔ white)

**Stays the same:**
- All brand colors (lime / lavender / pink / indigo / tier colors)
- The brand mark (always the lime sparkle on indigo tile)
- Avatar fallback (indigo disc + lime initial — DON'T flip these
  to white-on-indigo, the brand recognition lives in the indigo bg)
- Photo gradients
- Chat bubbles (lavender for them, lime for me; both have black text)
- Action button tones (lime CTA stays lime, etc.)

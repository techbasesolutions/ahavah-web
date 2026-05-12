# Sub-plan 25 — axis-9 contrast measurement sweep

Date: 2026-05-12. Branch: `sub-plan-25-contrast-sweep`.

Carries forward the SP20 L3 axis-9 task (color contrast / WCAG AA) from the
12-axis onboarding audit. SP20 covered axis 9 by visual inspection only; this
sweep replaces that with measured numbers.

## Method

`scripts/audit-contrast.mjs` (one-off, no deps). Reads brand tokens from
`src/app/globals.css` lines 60-75 (OKLCH) and tier hex values from
`src/app/verify/page.tsx` (`#CD7F32 / #C0C0C0 / #FFD700`). For each
(foreground, background) pair actually used in product code:

1. OKLCH -> OKLab -> linear sRGB (Ottosson's matrix) -> gamma-encoded sRGB.
2. Linearize each channel per WCAG 2.x, compute luminance
   `L = 0.2126 R + 0.7152 G + 0.0722 B`.
3. Contrast = `(L_lighter + 0.05) / (L_darker + 0.05)`.
4. Alpha-mixed colors (`white/85`, `white/70`) composited over their backdrop
   in linear-light space before measuring.

Thresholds per WCAG 2.1: 4.5:1 normal body text, 3.0:1 large / UI / icons.

## Results

Run command: `node scripts/audit-contrast.mjs`. Latest output (post-audit;
no token changes were needed):

```
Pair                         | Ratio | Min | Result | Used in
-------------------------------------------------------------
white         on lime        |  1.12 | 4.5 | FAIL   | (diagnostic) text-white on lime CTA — should fail badly
white         on gold        |  1.40 | 3.0 | FAIL   | (alternative) white on gold
white         on silver      |  1.82 | 3.0 | FAIL   | (alternative) white on silver
white         on lavender    |  2.72 | 4.5 | FAIL   | (diagnostic) text-white on lavender pill
white         on bronze      |  3.14 | 3.0 | PASS   | (alternative) white on bronze — hero icon if swapped
white         on pink/danger |  3.66 | 4.5 | FAIL   | (diagnostic) text-white on pink/danger surface
pink          on indigo      |  5.25 | 4.5 | PASS   | text-pink hero icon (banned page) — body threshold for completeness
pink          on elevated    |  5.53 | 4.5 | PASS   | text-pink inside Cards
text-muted    on indigo      |  6.13 | 4.5 | PASS   | small captions inside .ahavah-app
text-muted    on elevated    |  6.45 | 4.5 | PASS   | small captions inside Cards
black         on bronze      |  6.55 | 3.0 | PASS   | Bronze tier IconBadge (UI)
text-muted    on canvas      |  6.69 | 4.5 | PASS   | small captions on /map
lavender      on indigo      |  7.08 | 4.5 | PASS   | lavender text/links on .ahavah-app canvas
lavender      on elevated    |  7.45 | 4.5 | PASS   | lavender text/links inside Cards
black         on lavender    |  7.58 | 4.5 | PASS   | lavender pill label (Button.tone='lavender')
text-secondary on indigo     |  8.59 | 4.5 | PASS   | secondary copy on .ahavah-app body
text-secondary on elevated   |  9.04 | 4.5 | PASS   | secondary copy inside Cards / popovers
text-secondary on canvas     |  9.38 | 4.5 | PASS   | secondary copy on /map
black         on silver      | 11.32 | 3.0 | PASS   | Silver tier IconBadge (UI)
success       on indigo      | 12.93 | 3.0 | PASS   | online dot color, occasional success text
white/70      on indigo      | 13.76 | 3.0 | PASS   | placeholder hint text (large/UI threshold)
black         on gold        | 14.68 | 3.0 | PASS   | Gold tier IconBadge (UI)
white/85      on indigo      | 16.49 | 4.5 | PASS   | tier-card body copy (verify page)
lime          on indigo      | 17.13 | 3.0 | PASS   | lime accents (number-stepper active, brand dot)
white/85      on elevated    | 17.35 | 4.5 | PASS   | tier-card body copy inside elevated Cards
black         on lime        | 18.35 | 4.5 | PASS   | lime CTA label (Button.tone='brand' primary-foreground)
white         on indigo      | 19.22 | 4.5 | PASS   | body inside .ahavah-app
white         on elevated    | 20.23 | 4.5 | PASS   | body inside Cards, popovers, sheets
white         on canvas      | 21.00 | 4.5 | PASS   | body on /map, /chat (outside .ahavah-app)

Total pairs:     29
Passing:         24
Failing:         5
```

## Interpretation

Every (fg, bg) pair that is actually used in product code passes its WCAG
threshold. The 5 FAIL rows are all **diagnostic / hypothetical** pairings the
audit script tests deliberately to guard against drift:

| Pair | Ratio | Reason it's tested but unused |
|------|-------|-------------------------------|
| white on lime | 1.12 | Tested to confirm lime CTA must keep text-black. Codified in `Button.tone='brand'/cta`, `Badge.lime`, `IconBadge.cta`, `Toggle.aria-pressed`, etc. |
| white on gold | 1.40 | Tested to confirm tier IconBadge must keep text-black (not text-white). |
| white on silver | 1.82 | Same as gold. |
| white on lavender | 2.72 | Tested to confirm lavender pill / chat-bubble must keep text-black. Codified in `Badge.lavender`, `Button.tone='lavender'`, `chat-bubble` surfaces. |
| white on pink/danger | 3.66 | Tested to confirm danger pill must keep text-black if pink ever becomes a button surface. Currently `text-pink` appears as an icon color only (over indigo / elevated) and passes at 5.25 / 5.53. |

White on bronze is included as a near-miss reference (3.14 just over the
3.0 UI threshold). The product uses black on bronze (6.55) for the
`IconBadge.tone='tier'` variant — already the safer choice.

## Token changes

**None.** No real product pair fails its WCAG threshold; existing tokens
already pass.

Note: The previous SP20 L3 bump on `--color-text-muted` (oklch 0.53 -> 0.66)
remains in place. Re-measured by this sweep at 6.13 / 6.45 / 6.69 across the
three backgrounds, all comfortably above 4.5.

## Consumer changes

**None.** The `IconBadge.tone='tier'` variant uses `text-black`, which is the
correct choice for all three tier colors (bronze 6.55, silver 11.32, gold
14.68). No tier hero or badge needs a `text-white` swap.

## FAILs intentionally left unchanged

All 5 FAIL rows are intentionally left in the audit script as guards against
future regressions. They flag pairings that **must not** ship — text-white on
brand-bg surfaces or on tier colors. The contrast-pairing rule is documented
in the comment block at `src/app/globals.css` lines 59-75 directly alongside
the tokens so a future developer typing `bg-lime text-white` has the warning
right next to the token definitions.

## Comment / rule changes

- `src/app/globals.css` lines 59-75 — added a brand-pairing rule block above
  the brand tokens. Lists which text colors are safe on each background.
- `src/app/globals.css` line 70 — extended the pre-existing `--color-text-muted`
  bump comment to cite this sweep's measured numbers + the audit script path.

## Verification

- Audit script run twice (pre + post). Same output both times — no tokens
  changed during the run.
- All 24 product pairs PASS their thresholds.
- 5 diagnostic FAILs are documented and intended; they catch hypothetical
  regressions.

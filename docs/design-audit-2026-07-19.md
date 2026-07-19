# Systemic design audit — app vs Claude Design system (2026-07-19)

Trigger: visible tab-strip and empty-state disparity on /views. Scope:
full diff of the Claude Design project ("Full Ahavah" export: tokens.css,
ds.jsx primitives, screens.jsx / desktop.jsx canonicals, recent feature
exports) against the app kit (globals.css @theme + src/components/ui +
src/components/app).

## Verdict in one paragraph

The app's token foundation is faithful: brand colors, radius scale, type
scale, tap targets, shadows, and the light theme match the design system
almost value-for-value, because the kit was originally built from this
project's own artifacts. The systemic drift is concentrated in a small
set of PRIMITIVES that were either mistranscribed at kit-build time or
invented without a design counterpart, plus two token-level defects.
Because primitives are shared, each divergence multiplies across every
surface that composes it.

## Class 1 — primitive mistranscribed at kit-build time

### 1. Tabs variant "brand" (HIGH visibility)
- DESIGN (screens.jsx MatchesScreen, comment says "per kit"): pill-shaped
  segmented control — hairline-bordered track, radius 14, padding 4, gap
  4; triggers flex-1, height 40, radius 10; active = lime fill, black
  text, 700; inactive = ink-2, 500, 13-14px. Recent exports add: count
  pill INVERTS inside the active trigger (black bg, lime text).
- APP (tabs.tsx `brand`): "full-bleed underline tabs, lime active text" —
  border-b track, lime underline + lime text on active.
- AFFECTED: /matches (3 tabs), /views (2 tabs). Every future tabbed
  surface inherits whichever wins.
- ROOT: the app variant contradicts the kit spec comment in the design
  project itself; it was never right, and the /sot-sync conflict policy
  ("existing chrome stays app-styled") kept deferring to it across the
  You Liked, Map Lens context frames, and Who Viewed You transcriptions.

## Class 2 — primitives invented without a design counterpart

### 2. EmptyState atom (HIGH visibility, widest blast radius)
- DESIGN (consistent across screens.jsx LockedScreen + You Liked + Who
  Viewed You exports): icon in an 88px soft-tint tile
  (color-mix lavender 14%, circle in exports / rounded-24 in
  screens.jsx), 20px/700 title, meta body, and when there is an action a
  LIME FILLED PILL button (h48, r999, black text, 700).
- APP (empty-state.tsx): LogoMark for "brand" presets, bare lucide icon
  size-14 for the rest, no tile, action = OUTLINE button. ErrorState
  same pattern.
- AFFECTED: discover, matches (2 empties), inbox, profile/[uuid]
  (unavailable), views (2 empties), every ErrorState.
- Compounding defect: /views empty uses the `profile-unavailable` preset
  whose icon is EyeOff (crossed-out eye = "hidden") where the design
  shows an open Eye. Semantic miss.

### 3. Count pill inside active tab
- DESIGN: inverts to black-on-lime inside the lime active trigger.
- APP: lime pill everywhere. (Only matters once #1 is fixed.)

## Class 3 — token-level defects

### 4. `text-body-s` does not exist (SILENT, widespread)
The app declares `--text-body-strong` (16/1.5/600) but code widely uses
`text-body-s` — a class that resolves to NOTHING in Tailwind v4, so
those labels silently inherit default size/weight instead of 16/600.
Matches-family card names and other labels are quietly unstyled.
Fix: declare `--text-body-s` (alias of body-strong values) or rename
usages; declare-alias is the zero-churn fix.

### 5. `--text-muted` / ink-3 lightness — RETRACTED after code review
- DESIGN tokens.css: oklch(0.66 0.05 280). APP: oklch(0.72 0.05 280).
- The app value is a DOCUMENTED, deliberate WCAG-contrast correction
  (globals.css comment dated 2026-06-16, verified by
  scripts/audit-contrast.mjs: 0.66 passed the math but failed
  perception). This is a justified accessibility divergence, kept.
  Ideally the design project's tokens.css adopts 0.72 to close the gap
  from the other side.

## Class 4 — minor tint/geometry deltas (systemic but subtle)

6. IconBadge tints: design color-mix 14% (brand/success/destructive);
   app uses /10 (10%). Every profile/settings/paywall row tile slightly
   fainter than designed.
7. BottomNav radius: design 24px; app rounded-3xl (35.2px). All mobile
   surfaces.
8. Switch size: design sheet switch 50x30; app default 32x18. Filter
   sheet + settings toggles read small vs design.
9. FiltersSheet: design shows a grab handle (44x5 pill); app has none.
10. Sheet top radius 28 (design) vs rounded-t-3xl 35.2 (app). Subtle.

## Design-side inconsistency needing a ruling (not an app bug)

CTA button radius: ds.jsx PrimaryBtn specifies radius 16 (cta) / 12
(tap), but every RECENT export draws primary CTAs as full pills (r999):
Go to Discover, Upgrade to Premium, Apply filters. The app is muddled
the same way (size="cta" is rounded-2xl 28.8 + frequent rounded-full
overrides). Recommendation: adopt the full-pill CTA as the ruling
(matches all recent design output), update ds.jsx expectation, normalize
the app's `cta` size to rounded-full.

## Where the app is FAITHFUL (verified value-for-value)

- Brand oklch colors, tier colors, success; light-theme values including
  the deliberately darkened light-mode lime; theming via data-theme.
- Radius scale (1rem base, same multipliers — the /views circle-tile bug
  was a class choice, not a token gap).
- Type scale display→overline: sizes, line-heights, tracking, weights
  all match (modulo #4/#5 above).
- Tap targets 44/48/56/64; input heights/radii; hairline/border/nav/
  pill-glass/shadow/scrim token values.
- Button tone taxonomy (cta/brand/action/elevated/dark/outline), badge/
  pill variant taxonomy (lime/lavender/pink/success/glassDark/
  lavOutline), avatar, photo-tile radii, card tones, desktop shell
  (ported from desktop.jsx), floating bottom-nav concept with lime
  active disc and badge.

## Remediation program (proposed, pending approval)

Phase 1 — kit corrections, zero product change, one PR:
1. tabs.tsx `brand` → segmented pill per kit spec + inverted active
   count pill. (Restyles /matches + /views automatically.)
2. empty-state.tsx → soft-tint tile media (per-preset icon/color) +
   lime pill CTA; ErrorState matched; /views icon → open Eye.
3. globals.css: declare `--text-body-s`; `--text-muted` → 0.66.
4. icon-badge.tsx tints /10 → 14% color-mix.
5. bottom-nav radius → 24px token; switch default → design scale;
   filters-sheet grab handle.

Phase 2 — DONE (operator ruling 2026-07-19: full pill wins). Button
`size="cta"` radius normalized rounded-2xl → rounded-full; no usage
carried a per-instance radius override, so the single kit change
covers all 30 call sites. The design project's ds.jsx PrimaryBtn
(radius 16) should be updated on the design side to match its own
exports.

Sweep duty: these primitives touch nearly every route. Verification
must render EVERY surface composing them at 390 AND desktop (both
themes for EmptyState surfaces), not a sample.

## Process correction (why this drifted)

A difference that repeats across three consecutive design exports is
the design system speaking, not a designer's approximation of app
chrome. The /sot-sync conflict policy has been amended in practice:
recurring primitive-level conflicts now escalate to a kit-alignment
decision instead of silently resolving toward the older kit.

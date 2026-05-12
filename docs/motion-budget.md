# Motion budget

Canonical motion-timing rules for the Ahavah PWA. Cite this doc from any plan,
sub-plan, or PR that touches an animation. Two budgets, two purposes.

## Two budgets, two purposes

### Interaction feedback: ≤300ms

The "did my tap register?" budget. WCAG 2.1 reaction-feel guidance + Apple HIG
(Human Interface Guidelines, "Motion" section) treat 300ms as the upper bound
before a tap feels laggy. Material Motion's "small / medium" durations
(75-300ms) sit in the same bracket.

Examples that must fit this budget:

- Button tap (`active:scale-95 transition-transform`, 150-200ms)
- Hover lift / glow (`hover:scale-105`, 150-200ms)
- Toggle on/off (`Switch`, 150ms)
- Accordion expand-collapse (200-300ms)
- Menu / popover open-close (200ms)
- Tab indicator slide (200ms)

These are enforced at the variant level (`cva`, Tailwind utility classes). They
should never appear as inline `transition={{ duration: 0.5 }}` overrides — if
you find yourself doing that on a tap or hover, the variant is wrong.

### Staggered entrance reveal: ≤500ms

The "page just loaded — what's here?" budget. This is choreography on first
paint: items fade-up in cascade so the screen reads alive without making the
user wait. 500ms is the upper end of "feels intentional but not slow" per
common motion-design references (Material Motion "expressive long",
Apple HIG choreography section).

Examples that must fit this budget:

- Item cascades (list/grid fade-up with `delay: i * 0.05`)
- First-paint sequences (header → body → CTA stack via incremental delay)
- Hero entrance (icon → title → subline → primary action)

Measured as `max(delay + duration)` across the longest cascade chain in a
single route. Cap with `Math.min(i, N) * step` for variable-length lists so
total stays bounded regardless of item count.

## Reduce-motion guarantee

`src/app/globals.css` lines 259-268 contains the project-wide reduce-motion
override:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Any new motion code must NOT bypass this block. CSS transitions, CSS animations,
and `motion.*` JSX elements all collapse to ~0ms when the user has the OS
"reduce motion" preference on. Do not use JS-driven RAF loops or imperative
spring physics that ignore the media query.

## Pre-merge audit

```bash
node scripts/audit-motion.mjs
```

Globs every `*.tsx` under `src/`, regexes out `transition={{ ... }}` literals,
samples `i` across `[0, 1, 2, ..., 24]` to capture the worst-case index in
`Math.min(i, N)` cascades, and tags each file PASS (≤500ms) / FAIL (>500ms).

Writes `docs/motion-audit-latest.md` with the current snapshot — the dated
file `docs/motion-audit-2026-05-12.md` preserves the SP26 pre-fix + post-fix
history and is NOT overwritten by re-runs.

Looping animations (`repeat: Infinity`, `repeat: <n>`) are excluded — they are
continuous decoration, not entrance reveals.

All entrance cascades should PASS the ≤500ms budget. Interaction feedback rules
are enforced via component variants (cva, no inline overrides) and are not
script-measured.

## Pattern cookbook

Reach for one of these three patterns. They all fit the 500ms budget.

### 4 items: tight stagger

```tsx
{ITEMS.map((item, i) => (
  <motion.div
    key={item.id}
    {...fadeUp}
    transition={{ duration: 0.3, delay: i * 0.06 }}
  >
    {/* ... */}
  </motion.div>
))}
```

Total = `max(i) * 0.06 + 0.3` = `0.18 + 0.30` = **480ms** at i=3.

### 6 items: tighter stagger

```tsx
{ITEMS.map((item, i) => (
  <motion.div
    key={item.id}
    {...fadeUp}
    transition={{ duration: 0.25, delay: i * 0.04 }}
  >
    {/* ... */}
  </motion.div>
))}
```

Total = `5 * 0.04 + 0.25` = **450ms** at i=5.

### Variable-length list (12+ items): cap with `Math.min`

```tsx
{COUNTRIES.map((country, i) => (
  <motion.div
    key={country.code}
    {...fadeUp}
    transition={{
      duration: 0.25,
      delay: Math.min(i, 6) * 0.04,
    }}
  >
    {/* ... */}
  </motion.div>
))}
```

Total = `min(i, 6) * 0.04 + 0.25` = `0.24 + 0.25` = **490ms** for any list
length, because items 7+ all start with the same offset as item 6.

### Composing cascades with a header lead-in

When a route has a header → body cascade, allocate budget across both halves:

```tsx
<motion.div {...fadeUp} transition={{ duration: 0.3 }}>
  <h1>...</h1>
</motion.div>

<div className="mt-6">
  {ITEMS.map((item, i) => (
    <motion.div
      key={item.id}
      {...fadeUp}
      transition={{
        duration: 0.25,
        delay: 0.1 + Math.min(i, 4) * 0.04,
      }}
    >
      {/* ... */}
    </motion.div>
  ))}
</div>
```

Total = `0.10 + 4 * 0.04 + 0.25` = **510ms** — over budget by 10ms; tighten
duration to 0.2 to land at **460ms**, or remove the 0.1 header lead-in.

## What NOT to do

- Don't write `delay: 0.2 + i * 0.05` without a `Math.min` cap — at i=10 you're
  at 700ms before the duration kicks in. Use the cap pattern instead.
- Don't use `duration: 0.5` or higher for entrance items — the duration eats
  too much of the 500ms total and leaves no room for stagger.
- Don't mix entrance motion with `repeat: Infinity` decoration on the same
  element — they have different budgets and are evaluated separately by the
  audit script.

## Celebration screens are exempt

One-shot celebration moments (e.g. `/match` after a mutual like) follow a
per-feature budget defined in the sub-plan that ships them, NOT this doc's
≤500ms entrance-cascade rule. They are first-class hero moments where the
choreography IS the product, not preamble to interaction.

Current carve-outs:

- `/match` — entrance cascade ≤1.0s end-to-end, confetti burst lifetime ≤1.4s
  per `docs/superpowers/plans/2026-05-12-sub-plan-19-match-celebration-polish.md`.
  The audit script will flag `/match` as FAIL on next run; that is expected.
  When auditing, ignore `src/app/match/page.tsx` and re-verify the SP19 budget
  by reading the file's existing transition values against SP19's spec.

If a future feature ships a celebration screen, add it here with a link to its
own budget definition before merging.

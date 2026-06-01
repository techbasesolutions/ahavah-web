# Ahavah — Handoff Package

> Everything an engineering agent needs to build Ahavah's desktop web app
> in light mode, while staying brand-consistent with the existing dark
> mobile PWA.

Built from the production `ahavah-web` codebase. The tokens, type scale,
component shapes, and copywriting tone in this package match what
already ships at `/discover`, `/profile`, etc. — adapted for desktop
viewports + light surfaces.

---

## How to read this package

```
handoff/
├── README.md               ← you are here
├── tokens.css              ← drop-in CSS variables (dark + light)
├── design-system.md        ← full DS spec — colors, type, components
├── desktop-screens.html    ← visual reference: all 14 desktop screens
├── light-system.html       ← visual reference: light-mode DS artboards
└── screens/                ← per-screen build specs (one .md per route)
    ├── 01-welcome.md
    ├── 02-sign-up.md
    ├── 03-onboarding.md
    ├── 04-discover.md
    ├── 05-profile-detail.md
    ├── 06-match.md
    ├── 07-map.md
    ├── 08-matches.md
    ├── 09-inbox.md
    ├── 10-profile.md
    ├── 11-paywall.md
    ├── 12-verify.md
    ├── 13-settings.md
    └── 14-locked.md
```

### Order of operations for the build agent

1. **Read `tokens.css`** — paste it once into your global stylesheet.
   Everything else references these CSS variables. Light mode is the
   default for the desktop app; wrap any subtree in
   `data-theme="dark"` to flip surfaces.
2. **Read `design-system.md`** — covers shared component shapes
   (buttons, pills, cards, inputs, avatars, icons). Build these as
   reusable primitives before the screens.
3. **Open `desktop-screens.html`** in a browser. Use it as the visual
   source-of-truth for layout, density, and spacing. Each screen sits
   in a 1440×900 frame.
4. **For each route, read `screens/NN-<route>.md`** — it lists exact
   columns, gutters, content order, copy, and which DS primitives to
   compose.

### What this package does NOT cover

- Mobile/PWA — already shipped, no changes intended.
- Backend wiring — endpoints, schema, decisions engine, scoring,
  chat WebSocket — all live in `ahavah-web/src`. Reuse as-is.
- The 14 onboarding sub-steps beyond the `name` step (gender, DOB,
  country, …). Same layout, just swap the prompt + input.
- Settings sub-pages (account, privacy, notifications, etc.) — same
  shell, different content panel.

### Brand rules (non-negotiable)

- **Lime, lavender, pink, indigo** stay vivid in both themes. They are
  brand identity. Don't desaturate.
- **Lime / lavender / pink fills pair with text-black only.**
  White on these fails WCAG AA. The audit comment in `globals.css`
  is gospel.
- **Plus Jakarta Sans** throughout, weights 300–800. No font swaps.
- **The 4-point sparkle** is the brand mark. It's the only bespoke SVG
  we own. Don't redraw it; copy the path from `design-system.md`.
- **Tap targets ≥44px.** Even on desktop — the brand identity is
  generous, breathing UI.

### Verification

Every screen in the handoff has been visually verified at 1440×900.
If a layout looks tight on your viewport, scale the artboard to fit
rather than rearranging — the proportions are deliberate.

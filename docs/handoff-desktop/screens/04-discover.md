# 04 — Discover (`/discover`)

Center photo card flanked by two rails. The mobile experience compressed
3 functions into one screen (filters in a sheet, profile in a modal,
likes hidden behind paywall) — desktop reveals all three at once.

## Layout (1440×900)

Sidebar (260) + content (1180).

Content area is `padding: 24` and a `260 / 1fr / 320` grid with 24px gap.

```
┌────────┬─────────────────────────────┬────────────┐
│ FILTERS│ CENTER CARD                  │ RAILS      │
│ 260px  │ 460×640 + 28px gap + actions │ 320px      │
│        │                               │            │
│ FILTERS│ Photo timeline (3 segments,  │ "NEW LIKES"│
│ overlin│   active = lime, glow):       │            │
│        │                               │ Gradient   │
│ 5 chip │ Photo (full bleed gradient,  │   card     │
│ cards: │   E placeholder @240px white │   "3 likes │
│  Age   │   18% opacity center)        │    this    │
│  Range │                               │    week"   │
│  27-38 │ Caption (gradient bottom):   │   3 blurred│
│        │   Ehud, 42  ›                │     40px   │
│ Country│   ↳ Blackmans, BB · 2h ago   │     avatars│
│ Israel,│                               │   lime btn │
│  US    │ (below card, 28px gap:)      │   "Unlock  │
│        │ Action row:                   │    w/ Prem"│
│ Lang.  │   Skip (--lavender, 64px) -  │            │
│ Hebrew,│   Play (--lime, 80px) -      │ "RECENTLY  │
│  Eng   │   Like (--pink, 64px)        │  SEEN"     │
│        │                               │            │
│ Marital│                               │ 3 row cards│
│ Never  │                               │   44px brand│
│  married                               │   avatar +  │
│        │                               │   name +    │
│ Verified                               │   location + │
│  only  │                               │   online dot │
│  Yes   │                               │   chevron   │
│        │                               │            │
│ "Reset │                               │            │
│  filtrs│                               │            │
│  " ghost                               │            │
└────────┴─────────────────────────────┴────────────┘
```

## Top bar (replaces page padding-top)

- Title: "Discover" (`.t-h1`, --ink)
- Right: `glassDark` Pill "1 filter" + bell icon button (40×40, --card)

## Component spec — card

- Container: 460×640, radius 28, gradient bg
- Shadow: `0 24px 60px rgba(0,0,0,0.45)`
- Timeline: `top: 22px`, h=5px, segments lime when active w/ box-shadow glow
- Glyph placeholder: absolute-centered initial in 240px/800 weight,
  `rgba(255,255,255,0.18)`
- Bottom caption gradient: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)`,
  `padding: 100px 32px 28px`

## Action buttons

```
Skip   — tone="brand"   size=64  X icon, strokeWidth 2.4, black
Play   — tone="cta"     size=80  Play icon filled black
Like   — tone="action"  size=64  Heart icon filled white
```

## Behaviour

- Reuse existing logic from `ahavah-web/src/app/discover/page.tsx`:
  `useDiscoverDeck`, `useDecisions`, photo carousel pagination
  (left tap = prev, right = next).
- Like that creates a match → push `/match?matchId=<id>`.
- Filters rail items are tappable; tap opens the existing `FiltersSheet`
  but as a side-panel slide-in instead of bottom sheet on desktop.
- "New likes" gradient card only renders when user is non-premium.
- "Recently seen" rail is new on desktop (mobile doesn't have this);
  pulls from `useDiscoverDeck`'s previous 3 candidates.

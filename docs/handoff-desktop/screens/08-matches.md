# 08 — Matches grid (`/matches`)

4-column grid (up from mobile's 2-column). Tabs in the top bar toggle
between mutual matches and "Liked you" (paywall-gated count for
free users).

## Layout (1440×900)

```
┌────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR│  TOP BAR (h=72)                                      │
│ 260px  │    "Matches"                            [Matches][Liked you ●7]
│        ├─────────────────────────────────────────────────────┤
│        │  Content padding 32                                   │
│        │                                                       │
│        │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│        │  │photo│ │photo│ │photo│ │photo│   ← 4 cols, gap 20│
│        │  │ 4:5│ │ 4:5│ │ 4:5│ │ 4:5│                       │
│        │  └────┘ └────┘ └────┘ └────┘                       │
│        │  Name,a Name,a Name,a Name,a                          │
│        │  📍loc  📍loc  📍loc  📍loc                          │
│        │  [Message btn]  [Message btn]  [Message btn]  [...]  │
│        │                                                       │
│        │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│        │  …                                                    │
└────────┴─────────────────────────────────────────────────────┘
```

## Top-bar tabs

Pill-shaped toggle on the right side of the top bar:

```
┌─────────────────────────┐
│ [ Matches ]  Liked you ●7│   ← active = filled lime, inactive = transparent
└─────────────────────────┘
   border: 1px var(--hairline), radius 14, padding 4, gap 4
```

Active tab: `padding: 8px 18px`, bg `--lime`, color `--cta-ink`, weight 700.
Inactive: same padding, color `--ink-2`, weight 500, with a `lime` Pill
showing the count next to "Liked you".

## Card

```
┌──────────────┐
│              │
│  Photo       │  ← aspect 4/5, radius 18, gradient placeholder
│              │
└──────────────┘
Name, 27  ●lime ← online dot inline (NOT a corner overlay — clips on radius)
📍 Jerusalem, IL  ← t-caption, --ink-2

[ 💬 Message ]  ← h=40, radius 999, filled --lime, --cta-ink
```

Gap between meta + Message button: 10px.

## Behaviour

- Reuse existing fetch logic: `apiClient.get('/matches')` and
  `apiClient.get('/likes/incoming')`.
- Free users on "Liked you" tab see a paywall gate (blurred cards
  + count + Upgrade CTA) — see existing `LikesLockedState`.
- Photo-click → `/profile/<uuid>?from=matches`.
- Message-click → `/chat/<uuid>`.
- "Liked you" photo-click on liker → `/profile/<uuid>?from=likes`
  (so user can like back and create the match).

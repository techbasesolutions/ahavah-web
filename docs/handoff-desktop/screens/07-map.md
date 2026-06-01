# 07 — Map (`/map`)

Full-bleed Leaflet map with markers + selected-pin info card overlay.
The desktop version surfaces what mobile hides behind a bottom sheet.

## Layout (1440×900)

```
┌────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR│                                                       │
│ 260px  │  ┌───────────────────────────────────────────────┐  │
│        │  │ TOP BAR (h=68, full-width over map)            │  │
│        │  │ bg: rgba(0,0,0,0.55), backdrop-filter blur     │  │
│        │  │ "Discover Map"  · 2,840 visible · ⇉ filter btn│  │
│        │  └───────────────────────────────────────────────┘  │
│        │                                                       │
│        │     ○ ○ Markers scattered (photo-disc 48px           │
│        │       ○   + lime ring + state badge)                │
│        │  ○                                                    │
│        │       ○                                                │
│        │                                                       │
│        │ ┌────────────────┐         Attribution (bottom-right)│
│        │ │ SELECTED PIN   │         "Leaflet | © OSM …"      │
│        │ │ INFO CARD      │                                   │
│        │ │ 340px wide     │                                   │
│        │ │ photo 160h     │                                   │
│        │ │ name+age       │                                   │
│        │ │ city pill      │                                   │
│        │ │ compat pill    │                                   │
│        │ │ "Open chat" btn│                                   │
│        │ └────────────────┘                                   │
└────────┴─────────────────────────────────────────────────────┘
```

## Map base

- Tile provider: OpenStreetMap (free, no key).
- Min zoom 2, max zoom 10, `worldCopyJump`, start at `[20, 0]` zoom 2.
- z-index 0 (the top bar at z-20 overlays).
- Center on user's home country on first session mount (see
  `centroidOf()` + the `SESSION_FLAG` logic in the existing
  `ahavah-web/src/app/map/page.tsx`).

## Marker (`MapAvatar`)

- 48px photo disc (or name-seeded gradient fallback)
- `box-shadow: 0 0 0 3px var(--lime), 0 2px 8px rgba(0,0,0,0.45)`
- 18px white circle bottom-right with country flag SVG inside (use
  `country-flag-icons` SVG, falls back to emoji)
- 20px state badge top-right when matched / active chat / liked:
  - match → `--lime` + Sparkle icon
  - active-chat → `--lavender` + MessageCircle icon
  - liked → `--pink` + Heart icon

Click → push `/profile/<uuid>?from=map`.

## Cluster marker

Indigo bubble with lime number + lime border. Size scales with count:
- <10 → 36px
- 10–99 → 44px
- 100+ → 52px

```css
background: #1A1340;
color: var(--lime);
border: 2px solid var(--lime);
font-weight: 800;
box-shadow: 0 4px 12px rgba(0,0,0,0.35);
```

## Selected pin info card

- Position: `absolute; left: 32; bottom: 32; width: 340; z-index: 8`
- Photo header 160px tall, name-gradient background, large faded initial
- Body: t-h3 name + age, `--ink-2` location row, pill cluster
- "Open chat" filled lime button bottom

## Filter button (top-right)

48px circle, `var(--bg-elevated)` bg, white sliders icon.
**Stays dark in both themes** — the black/55 top-bar background means
the button needs dark fill for contrast in either theme.

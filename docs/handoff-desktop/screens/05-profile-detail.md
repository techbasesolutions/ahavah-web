# 05 — Profile detail (`/profile/[uuid]`)

Two columns: 540px photo gallery left, flex-grow bio panel right.
Action stack is part of the bio header (vertically stacked), not a
separate rail — the previous 3-column attempt squashed the bio to ~50px.

## Layout (1440×900)

Sidebar (260) + content (1180). Content padding `24 / 32`.

```
┌──────────────────────┬───────────────────────────────────────┐
│ GALLERY · 540px      │ BIO PANEL · 1fr (min 540)
│                      │
│ Back link            │ ┌──────────────────────────┬──────────┐
│   ← Back to discover │ │ NAME COL · 1fr            │ ACTIONS  │
│                      │ │   H1 "Ehud, 42" (40/-2.5%)│ 160px col│
│ Photo (4/5 aspect):  │ │   italic AKA              │          │
│   radius 24          │ │   📍 Blackmans, Barbados  │ Like 48h │
│   timeline top       │ │   pill cluster (5 chips)  │  lime    │
│   240px initial      │ └──────────────────────────┴──────────┘
│   compat chip lavender│
│     "✦ 66%" bottom-rt│ Bio paragraph (17/1.6):
│                      │   "Consultant by day, beach walker by
│ Thumbnail strip:     │    sunset…"  (3-line lede)
│   4 squares, gap 10  │
│   active: 2px lime   │ ──── About + Compatibility (2-col) ────
│   border, others 65% │
│   opacity            │ About                  Compatibility 66%
│                      │ Gender    Man          Calendar     78%●lime
│                      │ Work      Consultant   Family       62%●lav
│                      │ Education Bachelor's   Lifestyle    58%●pink
│                      │ Religion  Hebrew Isr.  Languages    90%●lime
│                      │ Children  3            Observance   72%●lav
│                      │ Languages English…     Polygyny     55%●pink
│                      │
│                      │ ──── Interests ────
│                      │   Pill row, white card + hairline border,
│                      │   8 pills + overflow → "+2 more"
│                      │
│                      │ ──── Footer (--ink-3) ────
│                      │  ⚠ Report or block · Joined 2mo ago · LS 2h
└──────────────────────┴───────────────────────────────────────┘
```

## Action stack (column inside the bio header)

```
[Like]    h=48, --lime, --cta-ink, weight 700, heart icon
[Message] h=48, --lavender, #000, weight 700, msg icon
[Pass]    h=40, transparent, --ink-2, 1px --hairline, X icon
```

## Compat bars

5px tall, bg `--hairline`, fill colored by score:
- ≥85% → `--lime`
- 65–84% → `--lavender`
- <65% → `--pink`

Mirrors the existing `compat-pill.tsx` `getVariant()`.

## Behaviour

- Photo carousel paginates the gallery (4-thumbnail strip below);
  click thumb or tap left/right halves of main photo.
- "Like" creates the match if mutual → push `/match?matchId=<id>`.
- "Message" works only if already matched; otherwise greyed out.
- "Pass" calls `/decisions` with `nope`, then router.back().
- "Report or block" opens the existing `BlockReportSheet` as a centered
  modal on desktop.

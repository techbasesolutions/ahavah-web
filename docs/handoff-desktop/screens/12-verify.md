# 12 — Verify (`/verify`)

Three tier cards stacked vertically in the content area, plus a context
rail on the right showing why-verify stats.

## Layout (1440×900)

```
┌────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR│ TOP BAR "Get verified" (h=72)                         │
│ 260px  ├─────────────────────────────────────────────────────┤
│        │ padding 32, grid 1fr / 360, gap 32                    │
│        │                                                       │
│        │ ┌────────────────────────────────┐  ┌─────────────┐ │
│        │ │ Subtitle (t-body, --ink-2):    │  │ WHY VERIFY  │ │
│        │ │  "Verified profiles get more   │  │ context rail│ │
│        │ │   matches and signal you're a  │  │ 360 wide    │ │
│        │ │   real person."                │  │             │ │
│        │ │                                 │  │ 3 stat rows:│ │
│        │ │ TIER CARDS (3 stacked, gap 18):│  │   3.4×      │ │
│        │ │                                 │  │   more match│ │
│        │ │ ┌─────────────────────────────┐│  │             │ │
│        │ │ │ 60×60 bronze tile + icon    ││  │   2.1×      │ │
│        │ │ │ "Bronze" + ✓ Verified label ││  │   more reply│ │
│        │ │ │ "Profile verified" caption  ││  │             │ │
│        │ │ │ Body copy (--ink-2)         ││  │   98%       │ │
│        │ │ │ "Completed" badge           ││  │   premium   │ │
│        │ │ └─────────────────────────────┘│  │   verified  │ │
│        │ │                                 │  │             │ │
│        │ │ ┌─────────────────────────────┐│  │ Privacy note│ │
│        │ │ │ Silver — same shape,        ││  │ (t-caption) │ │
│        │ │ │ active CTA: "Take 3 selfies"││  │  Stripe ID  │ │
│        │ │ │ btn bg = silver/12% tint    ││  │   holds the │ │
│        │ │ └─────────────────────────────┘│  │   document  │ │
│        │ │                                 │  └─────────────┘ │
│        │ │ ┌─────────────────────────────┐│                    │
│        │ │ │ Gold — same shape,          ││                    │
│        │ │ │ CTA: "Verify with gov ID"   ││                    │
│        │ │ └─────────────────────────────┘│                    │
│        │ └────────────────────────────────┘                    │
└────────┴─────────────────────────────────────────────────────┘
```

## Tier card

```css
padding: 24;
border-radius: 22;
background: var(--card);
box-shadow: inset 0 0 0 1.5px <tierColor>;  /* completed or active */
                                            /* hairline if neither */
display: grid;
grid-template-columns: 60px 1fr auto;
gap: 20;
align-items: center;
```

Left tile (icon container):
- 60×60, radius 18, bg = tierColor, color #000
- Icon: phone (bronze) / scan (silver) / id-card (gold), 28px

Middle column:
- t-h2 label + ✓ "Verified" inline (color tierColor) if done
- t-caption sub
- t-meta body

Right column:
- If not done: ghost button (1px tierColor border) with the CTA text
- If active step: same button but with `color-mix(in oklch, tierColor 12%, transparent)` bg
- If done: t-caption "Completed" in --ink-3

## Behaviour

- Reuse `useProfile()` for `ahavah_verification_tier` and legacy
  `verification level`.
- Bronze CTA → `/verify/bronze` (selfie flow)
- Silver CTA → `/verify/silver` (3-pose liveness)
- Gold CTA → `/verify/gold` (Stripe Identity)
- After each completes, refresh profile and re-render with done state.

## Tier colors

```css
--bronze: #CD7F32;
--silver: #C0C0C0;
--gold:   #FFD700;
```

All three must pair with **black** content (text + icon) — white-on-gold
is 1.40 contrast (fail), white-on-silver is 1.82 (fail).

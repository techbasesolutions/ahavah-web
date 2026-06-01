# 10 — Own profile (`/profile`)

Sidebar + content split into 480px hero column + flex action-list column.

## Layout (1440×900)

```
┌────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR│ TOP BAR "Profile" (h=72)                              │
│ 260px  ├─────────────────────────────────────────────────────┤
│        │ padding 32, grid 480 / 1fr, gap 32                    │
│        │                                                       │
│        │ ┌────────────────────┐  ┌─────────────────────────┐  │
│        │ │ HERO CARD          │  │ ACTION LIST (5 rows)    │  │
│        │ │ radius 28          │  │                          │  │
│        │ │ gradient (135deg,  │  │ Row pattern:             │  │
│        │ │   indigo→lavender) │  │   IconBadge (36px) ·     │  │
│        │ │ padding 28         │  │     Title (t-body-s)     │  │
│        │ │ color #fff         │  │     Subtitle (t-caption) │  │
│        │ │                    │  │   Chevron right          │  │
│        │ │ 80px brand avatar  │  │                          │  │
│        │ │   + 3px white ring │  │ Rows:                    │  │
│        │ │                    │  │   Edit profile (brand)   │  │
│        │ │ "Ehud, 42" t-h1    │  │   Verification (success) │  │
│        │ │ Pill glassDark     │  │   Subscription (success) │  │
│        │ │   ✓ Bronze verified│  │   Settings (muted)       │  │
│        │ │                    │  │   Help center (muted)    │  │
│        │ │ PrimaryBtn cta:    │  │                          │  │
│        │ │  ✦ Upgrade to      │  │ Each row: bg --card,     │  │
│        │ │    Premium         │  │   border --hairline,     │  │
│        │ └────────────────────┘  │   padding 22 24, gap 18, │  │
│        │                          │   radius 18              │  │
│        │ ┌────────────────────┐  └─────────────────────────┘  │
│        │ │ COMPLETENESS CARD  │                                │
│        │ │ padding 20         │                                │
│        │ │ "Profile compl…"   │                                │
│        │ │ "76%" (--lime)     │                                │
│        │ │ 8px progress bar   │                                │
│        │ │ Hint copy below    │                                │
│        │ └────────────────────┘                                │
└────────┴─────────────────────────────────────────────────────┘
```

## Hero card

```css
border-radius: 28;
background: linear-gradient(135deg, #5524F5 0%, #9F76EA 70%, #BC96FF 100%);
color: #fff;
padding: 28;
```

Avatar: 80px brand fallback (indigo + lime), `box-shadow: 0 0 0 3px rgba(255,255,255,0.4)`.

`Pill variant="glassDark"`: shield icon 11px + label. In light mode the
glass pill picks up the hero's gradient bg so it stays legible against
either gradient.

## Action rows

```css
display: flex;
align-items: center;
gap: 18;
padding: 22 24;
border-radius: 18;
background: var(--card);
border: 1px solid var(--hairline);
```

`IconBadge` tones:
- Edit profile → `brand` (lavender on lavender/14% bg)
- Verification → `success` (success on success/14% bg)
- Subscription → `success` (same as verification — both are positive growth)
- Settings → `muted` (--ink-3 on --hairline bg)
- Help center → `muted`

## Completeness card

- bg `--card`, padding 20, radius 18, border `--hairline`
- Header row: ".t-meta weight 600 Profile completeness" + "76%" in lime
- Progress bar: 8px tall, radius 4, bg `--hairline`, fill `--lime`, width to %
- Hint below: `.t-caption`, `--ink-3`

## Behaviour

- Reuse hero CTA visibility logic from `ahavah-web/src/app/profile/page.tsx`:
  hide Upgrade button for premium users.
- Completeness % comes from `ahavah-web/src/lib/profile-completeness.ts`.
- Subscription row routes: `/billing-portal` if premium, `/paywall` otherwise.
- Verification row label dynamic: bronze / silver / gold / "Verify your identity".

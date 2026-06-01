# 11 — Paywall (`/paywall`)

Centered modal-style card over a `--bg-elevated` canvas, with decorative
floating profile cards in the background to evoke "see who liked you".

No sidebar — this is a modal-equivalent surface.

## Layout (1440×900)

```
                  (decorative blurred profile cards in corners)
       Yael (60,60 rot-8)              Adina (1180,80 rot+6)

                  ┌────────────────────────────────────┐
                  │ MODAL CARD                          │
                  │ 640 wide, padding 48, radius 28     │
                  │ bg --app, border --hairline         │
                  │ shadow 0 30 80 rgba(0,0,0,0.55)     │
                  │ × close (top-right)                 │
                  │                                      │
                  │ Sparkle 56 lime (center)            │
                  │ "Ahavah Premium" t-display          │
                  │ "Match more. Worry less." t-meta    │
                  │                                      │
                  │ FEATURES — 3 rows:                  │
                  │  ✓ See everyone who liked you…      │
                  │  ✓ Help build a Torah-observant…    │
                  │  ✓ Cancel anytime from…             │
                  │ (IconBadge tone=cta circle 26)      │
                  │                                      │
                  │ TIERS — 3-col grid:                 │
                  │ ┌──────┬──────┬──────┐              │
                  │ │1 mo  │3 mo  │1 yr  │              │
                  │ │$4.99 │$11.99│$34.99│              │
                  │ │      │POPULAR│BEST… │              │
                  │ │      │      │ACTIVE│              │
                  │ └──────┴──────┴──────┘              │
                  │                                      │
                  │ PrimaryBtn cta: "Continue $34.99"   │
                  │ small disclaimer line               │
                  └────────────────────────────────────┘

       Daniel (80,560 rot+5)           Esther (1200,580 rot-6)
```

## Background photo cards

```js
// 4 floating profile cards, 200×260, radius 24, border 4px #fff,
// opacity 0.85, blur 0.5px, rotate per spec, shadow 0 16 50 rgba(0,0,0,0.45)
[
  { n:"Yael",   x:60,   y:60,  rot:-8 },
  { n:"Adina",  x:1180, y:80,  rot:6  },
  { n:"Daniel", x:80,   y:560, rot:5  },
  { n:"Esther", x:1200, y:580, rot:-6 },
]
```

Each card has a large faded initial in `rgba(255,255,255,0.20)`.

## Modal card

```css
width: 640;
padding: 48;
border-radius: 28;
background: var(--app);
border: 1px solid var(--hairline);
box-shadow: 0 30px 80px rgba(0,0,0,0.55);
```

## Tier card

Inactive:
```css
padding: 16;
border-radius: 18;
background: var(--card);
border: 1px solid var(--hairline);
```

Active (selected):
```css
background: color-mix(in oklch, var(--lime) 10%, var(--card));
border: 1.5px solid var(--lime);
```

Badge ("POPULAR" / "BEST VALUE") = `Pill variant="lime"`, positioned
`absolute top: -10` so it overhangs the top border.

## Behaviour

- Selected tier defaults to year ("$34.99 / BEST VALUE").
- CTA text reads `Continue $<price>` dynamically.
- On click: `POST /checkout/web` with `{tier_key: "month"|"quart"|"year"}`,
  navigate to returned Stripe URL.
- Error messages render below the CTA in `--pink`.
- Close → `/profile`.

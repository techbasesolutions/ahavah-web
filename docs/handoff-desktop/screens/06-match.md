# 06 — Match celebration (`/match`)

Full-bleed celebration, NO sidebar. Decorative radial gradient halo,
oversized photo pair, lime headline pill, composer + secondary actions.

## Layout (1440×900)

```
                Close (top-right, 48×48 ghost)

                radial halo (lime 18% center, pink 12% bottom)

                  ┌──────────────┐  ┌──────────────┐
                  │  Ehud photo  │  │  Yael photo  │
                  │  280×340     │  │  280×340     │
                  │  rotate -4°  │  │  rotate +6°  │
                  │  border 4px  │  │  border 4px  │
                  └──────────────┘  └──────────────┘
                       ↘ -50px overlap, +24px y-offset

                          ✦  (Sparkle 56 lime, centered)

                  ┌──────────────────────────┐
                  │  It's a match!  rotate -3│  ← lime pill
                  └──────────────────────────┘    48px text, 18/38 pad

                  "You and Yael liked each other."

         ┌────────────────────────────────┬────────────────┐
         │  Say hi to Yael…  [→ Send btn] │  View profile  │  (480 wide)
         └────────────────────────────────┴────────────────┘
                                                              (1px border)
```

## Halo

```css
background:
  radial-gradient(ellipse 50% 40% at 50% 30%,
    color-mix(in oklch, var(--lime) 18%, transparent), transparent 70%),
  radial-gradient(ellipse 60% 50% at 50% 90%,
    color-mix(in oklch, var(--pink) 12%, transparent), transparent 75%),
  var(--app);
```

## Headline pill

```css
background: var(--lime);
color: #000;
padding: 18px 38px;
border-radius: 22px;
font-size: 48; font-weight: 800; letter-spacing: -0.02em;
transform: rotate(-3deg);
box-shadow: 0 12px 40px rgba(215,255,129,0.45);
```

## Composer + profile button (combined input)

```css
height: 56;
border-radius: 16;
background: var(--card);
border: 1px solid var(--hairline);
padding: 0 8px 0 18px;
```

Right-side send button: CircleBtn `tone="cta"` size 44.

Adjacent ghost button (right of input, NOT inside): 56h × auto, 22px
horizontal pad, 1px `--border`, "View Yael's profile".

## Behaviour

- On mount, fire a `[50, 30, 80]` ms haptic vibration via
  `navigator.vibrate` (existing implementation in `/match/page.tsx`).
- Confetti motion is the existing `<Confetti>` component (uses
  `motion/react`, respects reduced-motion).
- "Send" submits to chat: prefill the typed message via
  `?prefill=<msg>` then navigate to `/chat/<matchId>`.
- Close routes back to `/discover`.

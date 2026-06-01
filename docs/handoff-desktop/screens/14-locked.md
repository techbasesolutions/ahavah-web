# 14 — Locked edge state (`/locked`)

Centered card on a dark canvas. Same shell pattern applies to all edge
states: `/banned`, `/maintenance`, `/offline`, `/update-required`.

No sidebar — user is signed out / blocked, navigation is irrelevant.

## Layout (1440×900)

```
                       (--bg-elevated background)

                  ┌────────────────────────────────────┐
                  │ CARD                                │
                  │ 560 wide, padding 48, radius 28     │
                  │ bg --app, border --hairline         │
                  │ shadow 0 30 80 rgba(0,0,0,0.55)     │
                  │ display: flex, column, center, gap 18│
                  │                                      │
                  │   ┌────┐                            │
                  │   │    │  96×96 IconBadge size       │
                  │   │ 🔒 │  bg lavender/14%             │
                  │   │    │  lock icon 44px lavender     │
                  │   └────┘                            │
                  │                                      │
                  │   "Account temporarily locked"      │
                  │   t-h1, centered                     │
                  │                                      │
                  │   "We noticed unusual activity on   │
                  │    your account. We've paused…"     │
                  │   t-body, --ink-2, max 420, lh 1.6   │
                  │                                      │
                  │   PrimaryBtn outline + mail icon    │
                  │   "Contact support"                 │
                  └────────────────────────────────────┘
```

## Icon tile

```css
width: 96;
height: 96;
border-radius: 24;
background: color-mix(in oklch, var(--lavender) 14%, transparent);
```

Inside: `lock` icon, 44px, `--lavender`.

## CTA

`PrimaryBtn tone="outline"`:
```css
height: 56;
border: 1px solid var(--border);
color: var(--ink);
background: transparent;
```

Icon: `mail` 16px, "Contact support" — `mailto:support@ahavah.app`.

## Other edge states (same shell)

| Route | Icon | Color | Title | Body | CTA |
|---|---|---|---|---|---|
| /banned | UserX | --pink | Your account is banned | We've removed your account for violating our community guidelines. | Read guidelines → /legal/community-guidelines |
| /maintenance | Settings | --lavender | We're under maintenance | Ahavah will be back shortly. Thanks for your patience. | (none — auto-refresh in JS) |
| /offline | WifiOff | --ink-3 | You're offline | Check your connection. We'll try again automatically. | Try again (refresh) |
| /update-required | Alert | --lime (sparkle accent) | A new version is available | We've shipped improvements. Refresh to update. | Refresh → window.location.reload() |

## Behaviour

- `/locked` is a server-side redirect from `/login` when the backend
  flags suspicious activity (existing logic).
- All edge-state routes are signed-out-safe — no auth check.
- `/offline` is rendered by the service worker (see
  `ahavah-web/src/components/sw-register.tsx`).

# 01 — Welcome (`/`)

Full-bleed marketing entry. No sidebar. Two columns at 7 / 5 ratio.

## Layout (1440×900)

```
┌──────────────────────────────────────────┬──────────────────┐
│ LEFT  · 7fr (~840px)                     │ RIGHT · 5fr (~600px)
│ padding 56 / 64                          │ padding 56 (all)
│ background: linear-gradient(135deg,      │ background: var(--card)
│   var(--app),                            │ border-left: 1px hairline
│   color-mix(in oklch, var(--lavender)    │
│    20%, var(--app)))                     │
│                                           │
│ BrandMark size="lg" (top)                 │ "START HERE" overline
│                                           │ "Create your account" t-display
│ Headline (80px / 0.95 / -0.03em / 800):  │ helper microcopy
│   "Find love                              │
│    across borders." (period in --lime)    │ Email input (56px height,
│                                           │   border 1.5px --lavender)
│ Subhead (20px / 1.55, --ink-2, max 460): │
│   "Verified profiles, 100+ languages,    │ Provider chip grid (5 cols, 40px:
│    real connections..."                   │   gmail / proton / yahoo /
│                                           │   hotmail / outlook)
│ Stat row (3 cells, gap 24):              │
│   12,400+  verified profiles             │ PrimaryBtn tone="cta"
│   63       countries served               │   "Send me a code"
│   3,200+   ongoing chats                  │
│                                           │ "Already have an account? Sign in"
│ Footer (--ink-3):                         │   (--lavender link)
│   © 2026 Ahavah — Made for the diaspora.  │
│                                           │
│ Decorative sparkles scattered:           │
│   80,420  / 52px lime                    │
│   420,180 / 40px lavender                │
│   640,520 / 32px pink                    │
└──────────────────────────────────────────┴──────────────────┘
```

## Behaviour

- Form submit POSTs to existing `/request-otp` endpoint (see
  `ahavah-web/src/lib/auth-otp.ts`).
- Email persists to `sessionStorage[PENDING_EMAIL_KEY]` so the
  sign-up screen can prefill.
- "Sign in" link routes to `/auth/sign-in`.

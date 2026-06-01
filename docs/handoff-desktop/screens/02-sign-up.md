# 02 — Sign up (`/auth/sign-up`)

Form-first layout for users who clicked "Create account". 5 / 7 ratio:
form left, brand illustration right.

## Layout (1440×900)

```
┌──────────────────────┬───────────────────────────────────────┐
│ LEFT  · 5fr (~600px) │ RIGHT · 7fr (~840px)
│ background: --card   │ background: linear-gradient(135deg,
│ padding 56 / 64      │   var(--bg-indigo), var(--bg-elevated))
│                      │ padding 64 (all)
│ BrandMark size="md"  │
│                      │ Floating photo cards (5 random profiles,
│ (centered vertical:) │   varying x/y/rotation/scale):
│  H1 t-display:       │   Yael   @ 60,80   rot -6
│   "Create your       │   Adina  @ 300,200 rot 4
│    account."         │   Daniel @ 540,120 rot -3
│  (period = --lime)   │   Esther @ 140,380 rot 5
│                      │   Rivka  @ 430,430 rot -4
│  Helper (--ink-2):   │ each: 180×220, radius 18, border 3px #fff,
│   "We'll email you   │   gradient bg per name, 80px initial @ 25% white
│    a 6-digit code…"  │   shadow 0 16px 40px rgba(0,0,0,0.45)
│                      │
│  Email input (filled │ (bottom-left over cards):
│    --lavender border)│   Sparkle size=36 lime
│                      │   "Real people.\n Verified profiles."
│  Password input      │   (32px/800, white, max 420)
│    + strength meter  │
│    (4 bars, 3 filled │   Subtext (16px, rgba(255,255,255,0.7)):
│    lime = "Good")    │   "Every member completes selfie verification
│                      │    before they can match."
│  Terms checkbox      │
│    (22px lime square)│
│                      │
│  PrimaryBtn tone="cta│
│    "Send me a code"  │
└──────────────────────┴───────────────────────────────────────┘
```

## Behaviour

- Prefill email from `sessionStorage[PENDING_EMAIL_KEY]` on mount.
- Password is captured only for strength UI; auth is OTP-only.
- Submit → `requestEmailOtp(email)` → navigate to `/onboarding/verify-email`.
- On error show inline error below the submit button (`var(--pink)`).

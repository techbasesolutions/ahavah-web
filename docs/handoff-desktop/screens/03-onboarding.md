# 03 — Onboarding wizard (`/onboarding/[step]`)

Three-column layout. Left + right are quiet context rails; center is the
800px focus column with the actual question + sticky CTA.

The wizard has 16 steps. This spec covers the **shell** plus the `name`
step as a worked example. All other steps reuse the shell — only the
prompt + input field changes.

## Layout (1440×900)

```
┌──────────────┬───────────────────────────┬──────────────┐
│ LEFT · 1fr   │ CENTER · 720px            │ RIGHT · 1fr  │
│ padding 48   │ padding 48 / 56           │ padding 48   │
│              │                            │ bg: --card   │
│ BrandMark sm │ Stepper row:               │              │
│              │   ← back button (40px)    │ "WHAT'S NEXT"│
│ bg:          │   16 segments, gap 4      │              │
│ linear-      │   filled to current step  │ Checklist:   │
│ gradient(    │   "1 / 16" microcopy      │ ✓ Name…      │
│ 135deg,      │                            │ 2 Photos     │
│ var(--app),  │ (vertical center:)        │ 3 Identity   │
│ +16% lav)    │  H1 (48 / 1.1 / -0.025em):│ 4 Faith…     │
│              │   "What's your name?"     │ 5 Lifestyle  │
│              │   (? in --lime)           │ 6 Looking for│
│              │                            │ 7 Verify     │
│              │  Helper (--ink-2):         │              │
│              │   "This is what people    │ Each step:   │
│              │    will see."              │ 24px badge   │
│              │                            │   (lime+✓ if │
│              │  Input row:                │    done, num │
│              │   label "First name"      │    on        │
│              │   Input 64h / radius 18   │    --hairline│
│              │   border 1.5px --lavender │    if not)   │
│              │   value "Ehud" + caret    │ + label      │
│              │   helper + char count     │              │
│              │                            │              │
│              │ PrimaryBtn tone="cta"      │              │
│              │   "Continue" (bottom)      │              │
└──────────────┴───────────────────────────┴──────────────┘
```

## Step inventory (all use the same shell)

| #  | Slug          | Prompt                                             | Input type      |
|----|---------------|----------------------------------------------------|-----------------|
| 1  | name          | What's your name?                                  | Text input      |
| 2  | dob           | When were you born?                                | Date picker     |
| 3  | gender        | I am a…                                            | 2-option radio  |
| 4  | country       | Where do you live?                                 | Country combobox|
| 5  | languages     | Languages you speak                                | Multi-pill grid |
| 6  | marital-status| Marital status                                     | Pill grid       |
| 7  | children      | Children                                           | Stepper 0–10    |
| 8  | bio           | Tell us about you                                  | Textarea (200ch)|
| 9  | assembly      | Assembly / community                               | Pill grid       |
| 10 | polygyny      | Polygyny stance                                    | Pill grid       |
| 11 | relocation    | Open to relocation?                                | Pill grid       |
| 12 | looking-for   | What you're looking for                            | Pill grid       |
| 13 | photos        | Upload 3+ photos                                   | 6 photo slots   |
| 14 | verify-email  | Confirm your email                                 | 6-digit OTP     |
| 15 | verify-phone  | Confirm your phone                                 | 6-digit OTP     |
| 16 | complete      | All set!                                           | (success state) |

## Behaviour

- Each step persists immediately to `useProfile().update({ ... })` so
  back-navigation never loses entered data.
- Continue button disabled until step's validation passes (see existing
  per-step components in `ahavah-web/src/app/onboarding/`).
- Step 16 fires `/finish-onboarding` then routes to `/discover`.

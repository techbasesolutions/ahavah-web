# Sub-plan 26 motion-budget audit

Generated: 2026-05-12

Static analysis of every `transition={{ ... }}` literal under
`src/`. For each file, totals = max(delay + duration) over all
inline motion entrances, sampled across i ∈ [0..24] to capture
the worst-case index in `Math.min(i, N)` cascades.

Budget: staggered entrance reveals must total <= 500 ms.
Interaction-feedback motion (button taps, hovers) is variant-level
CSS and not measured here.

```
File                                       | Items | Total (ms) | Result
------------------------------------------------------------------------
src/components/app/confetti.tsx            |     1 |          0 | PASS  
src/components/ui/number-stepper.tsx       |     1 |        200 | PASS  
src/components/app/chat-bubble.tsx         |     3 |        280 | PASS  
src/app/discover/page.tsx                  |     3 |        300 | PASS  
src/components/app/photo-slot.tsx          |     1 |        300 | PASS  
src/components/kibo-ui/deck/index.tsx      |     2 |        300 | PASS  
src/app/onboarding/bio/page.tsx            |     2 |        400 | PASS  
src/app/onboarding/children/page.tsx       |     2 |        400 | PASS  
src/app/onboarding/marital-status/page.tsx |     2 |        400 | PASS  
src/app/onboarding/name/page.tsx           |     2 |        400 | PASS  
src/app/onboarding/photos/page.tsx         |     1 |        400 | PASS  
src/app/settings/notifications/page.tsx    |     1 |        400 | PASS  
src/app/settings/page.tsx                  |     1 |        400 | PASS  
src/app/settings/privacy/page.tsx          |     2 |        400 | PASS  
src/app/help/page.tsx                      |     3 |        430 | PASS  
src/app/settings/account/page.tsx          |     2 |        430 | PASS  
src/app/onboarding/complete/page.tsx       |     3 |        450 | PASS  
src/app/onboarding/verify-email/page.tsx   |     3 |        450 | PASS  
src/app/onboarding/verify-phone/page.tsx   |     3 |        450 | PASS  
src/app/profile/edit/page.tsx              |    10 |        450 | PASS  
src/components/app/edge-state-shell.tsx    |     1 |        450 | PASS  
src/app/auth/sign-up/page.tsx              |     4 |        460 | PASS  
src/app/onboarding/assembly/page.tsx       |     3 |        460 | PASS  
src/app/onboarding/gender/page.tsx         |     3 |        460 | PASS  
src/app/onboarding/looking-for/page.tsx    |     3 |        460 | PASS  
src/app/onboarding/polygyny/page.tsx       |     3 |        460 | PASS  
src/app/onboarding/relocation/page.tsx     |     3 |        460 | PASS  
src/app/page.tsx                           |     4 |        460 | PASS  
src/app/profile/page.tsx                   |     3 |        460 | PASS  
src/app/onboarding/languages/page.tsx      |     6 |        470 | PASS  
src/app/onboarding/page.tsx                |     4 |        470 | PASS  
src/app/onboarding/verification/page.tsx   |     2 |        470 | PASS  
src/app/verify/page.tsx                    |     2 |        470 | PASS  
src/components/app/verify-tier-shell.tsx   |     4 |        470 | PASS  
src/app/onboarding/dob/page.tsx            |     3 |        480 | PASS  
src/app/paywall/page.tsx                   |     4 |        480 | PASS  
src/app/settings/safety/page.tsx           |     4 |        480 | PASS  
src/app/inbox/page.tsx                     |     5 |        500 | PASS  
src/app/match/page.tsx                     |     6 |        500 | PASS  
src/app/matches/page.tsx                   |     3 |        500 | PASS  
src/app/onboarding/country/page.tsx        |     4 |        500 | PASS  
src/app/profile/[uuid]/page.tsx            |     5 |        500 | PASS  
src/app/settings/blocked/page.tsx          |     3 |        500 | PASS  
src/app/settings/translate/page.tsx        |     3 |        500 | PASS  
```

Total files measured: 44
Passing: 44
Failing: 0


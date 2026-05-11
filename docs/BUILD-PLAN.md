# Ahavah PWA — Build Plan (consolidated, web-scoped)

**Last updated:** 2026-05-10 (settings buildout + EmptyState/ErrorState atoms)
**Scope:** `ahavah-web/` only (PWA consumer app). Backend, Expo+RN frontend, marketing site, admin tool — out of scope for this doc.
**Supersedes** the web-scoped subset of [`docs/superpowers/plans/2026-05-08-bumpy-style-dating-app.md`](../../docs/superpowers/plans/2026-05-08-bumpy-style-dating-app.md) (3,350 lines, covers all phases incl. backend) and the entire [`2026-05-09-ahavah-web-pwa-pivot.md`](../../docs/superpowers/plans/2026-05-09-ahavah-web-pwa-pivot.md) (126 lines, web pivot announcement).

For current state, gaps, failure patterns, see [`PROJECT-STATUS.md`](../PROJECT-STATUS.md).

---

## 1. What we're building

**Ahavah** — Bumpy-style international dating PWA. 4-tab consumer shell (Discover / Matches / Inbox / Profile) + onboarding wizard + paywall + verification + match/profile/chat. Dateasy-aesthetic visual language: Persian Indigo + Mindaro lime + Lavender + Pinkish Red on a dark canvas.

**Locked decisions** (reference: pivot plan + master plan + duolicious-audit):
- PWA-only. **No iOS / Android native.** No Expo. No React Native.
- Stack: **Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Base UI variant) + Kibo UI**.
- 414px-max-width column centered on pure-black canvas. Mobile-first viewport, no zoom.
- Dark-only ship.
- 4 main tabs (post Q&A strip per duolicious-audit Q4): Discover (swipe deck) / Matches / Inbox / Profile.
- Brand mark: 4-point sparkle on lime square (logo) and indigo square (alt). Bespoke SVG (one of the two documented exceptions to "no hand-rolled atoms").
- Sticker library: 12 confetti shapes (heart / sparkle / 5-point star / flower / blob / squiggle / small circle / triangle / quad-star / arrow / dot / cross). Bespoke SVGs (the second documented exception).

---

## 2. Anti-improvisation rules (the ones I keep drifting from)

From the pivot plan + master plan, with notes about which I've broken in past sessions:

1. **Every UI element must be a Kibo component, a shadcn component, or a `<div>` styled with design-token Tailwind classes.** No hand-rolled atoms beyond the two documented exceptions (BrandMark + StickerBadge). When a kit doesn't ship the exact thing → document the gap, then either compose from existing primitives or ask before adding a dependency.
2. **Never write a custom Button/Input/Card/Badge/Avatar/Switch/Slider/Sheet/Dialog/Tabs from scratch.** Use shadcn `add` first.
3. **Every step has an explicit `Run:` command + `Verify:` check.** No step marked done until verify passes.
4. **After each step, update todos.** No batching status updates.
5. **Phase D was the binary exit gate before Phase 0 / 6.** Phase D is not actually complete — see §3 below. Catching it up is build-action #1.
6. **Read `node_modules/next/dist/docs/` before writing non-trivial Next.js code** (per `AGENTS.md`). I have ignored this rule consistently; it's a latent risk on Next 16-specific APIs.

### Failure patterns documented in PROJECT-STATUS.md §9 — guard against these every session

| # | Pattern | Correction |
|---|---|---|
| 1 | Overstating completion (mark done before verifying) | Mark complete only after observed verification (typecheck output, build output, browser screenshot, tool result) |
| 2 | Freestyling design with raw className when primitive doesn't fit | Check (a) primitive covers it, (b) extend primitive, (c) only then className AND propose extraction |
| 3 | Misreading "fix it" scope (refactor vs visual change) | Confirm scope before acting |
| 4 | Pretending to have read docs (skim ≠ read) | Cite file/line range when claiming read |
| 5 | Ignoring AGENTS.md (no Next 16 docs read) | Read `node_modules/next/dist/docs/` before non-trivial Next API usage |
| 6 | Building app primitives where shadcn/Kibo would do | Plan's `[R]/[W]/[B]` tag is the source of truth |
| 7 | Not running dev server / browser to verify visuals | UI changes require browser observation, at minimum Playwright snapshot |
| 8 | Token bloat from re-reading | This BUILD-PLAN.md + PROJECT-STATUS.md + memory entry is the always-load context |

---

## 3. Phase D status — the foundational gap (UNRESOLVED)

The master plan makes Phase D a **binary exit gate** before any building starts. We skipped it. This is the root cause of the recurring "freestyling design" complaint.

| Phase D task | Required artifact | Status |
|---|---|---|
| **D.0** Dateasy reference inventory | `docs/dateasy-rules.md` extracting design rules from each of the 16 reference images | **PARTIAL (2026-05-11 update)** — file exists at [`docs/dateasy-rules.md`](dateasy-rules.md). Per-screen aesthetic-POV decisions for all 38 routes captured in PROJECT-STATUS.md §15 via the 39-route audit (Tasks 1–39). Each route has an explicit axis-1 verdict citing its aesthetic direction (e.g. tier flows = "premium luxury Apple-Wallet-vibe with metallic shimmer," `/banned` = "quiet/serious for terminal-state," `/maintenance` = "warm reassurance vs generic 503 boilerplate," `/onboarding` carousel = "celebrate-each-step", etc.). Deeper original-image inspection still pending for kit specifications. |
| **D.1** Visual brand sign-off | Palette / typography / iconography / photography / sticker rules locked | Palette ✓ in `globals.css`; typography (Plus Jakarta Sans) ✓; lucide icons ✓; **photography direction ✗**; **stickers: removed from app surfaces entirely (2026-05-11)** — `feedback_ahavah_no_stickers.md` defines the 4 permitted SparkleMark uses (BrandMark, EmptyState friendly variants, /onboarding intro carousel hero, /paywall hero). The 8 confetti shapes formerly in /match were removed during a prior kit-only refactor. `/design-system` route + 7 reproduction component files deleted in Task 39 audit. |
| **D.2** Figma source of truth | Figma file with component library + screens + states | **✗ — no Figma. Implementer is improvising per-screen.** Pattern 3 (solo, reference-driven) caps polish at 7/10. |
| **D.3** Motion + interaction spec | Motion tokens, swipe gesture, match choreography, microinteractions, reduce-motion | Reduce-motion ✓ via globals.css. **Swipe gesture ✗ (the central app interaction).** Motion tokens not defined. Match choreography static, not animated. |
| **D.4** Haptic + sound design | Haptic map per Phase D.4 | **N/A on web** (no haptic API) |
| **D.5** Copy + voice library | Voice doc + ~115 strings in `i18n/locales/en.json` | **✗ — strings improvised per-screen, no i18n setup** |
| **D.6** Asset pipeline + image rules | Photo size matrix, app-bundled budget, sticker SVG export, app icon set | App icons ✓ (in `public/`). Other items ✗. |

**Implication:** every screen built so far was per-screen improvisation. To stop the freestyling-loop, do D.0 catch-up (in progress), D.1 (4 missing sticker SVGs + photography direction), D.5 (string inventory) before scaling out screens.

---

## 4. Phase 6 Task 6.0 QA rubric — every screen must pass these 12

Reproduced from master plan lines 2088–2125. Current state in PROJECT-STATUS.md §7.

| # | Bar | What it requires |
|---|---|---|
| **R1** | 60fps swipe gesture | The swipe-deck pan animation runs at 60fps on a mid-tier device. **Any dropped frame = fail.** |
| **R2** | Sub-100ms tap feedback | Every interactive element shows visible feedback (press state OR haptic) within 100ms |
| **R3** | < 1.5s splash-to-deck warm | Skeleton UI within 500ms of cold start regardless of network |
| **R4** | Pixel-diff < 3% from Figma reference | Playwright `maxDiffPixelRatio: 0.03`. Failures block merge. |
| **R5** | Every state mocked AND implemented | Happy / loading / empty / error all exist per screen |
| **R6** | Typography 1px rule | Heading kerning, line-height, letter-spacing, tabular-figures match Figma to within 1px |
| **R7** | Haptic on meaningful interaction | N/A on web |
| **R8** | No spinner-over-blank loading states | Skeleton matches eventual layout's bones |
| **R9** | Reduce-motion mode works | OS reduce-motion respected (currently ✓) |
| **R10** | WCAG AA contrast on every text/bg combo | 4.5:1 normal text, 3:1 large/UI |
| **R11** | Every interactive has accessibility label | VoiceOver / TalkBack reads meaningfully |
| **R12** | Dynamic type respected | Up to 4th-largest iOS dynamic-type setting |

**Sign-off process:** for each screen, implementer self-checks the 12-point rubric. Currently we have R9 ✓ + 6 partial + 5 unmet. **No screen has been formally signed off through the rubric yet.**

---

## 5. Atom inventory (Phase 6 Task 6.1 — ~50 atoms)

### Built (25)

| Atom | Source | Notes |
|---|---|---|
| BrandMark | `components/brand/sparkle-mark.tsx` | Phase D documented exception |
| Button | shadcn (extended) | tone/lift/outlineSubtle/outlineTier/dashedCircle/row + full size set |
| Pill | Kibo | Brand-color via Badge variants (lime/lavender/pink) |
| TextInput / Input | shadcn (extended) | size + tone variants (default/elevated) |
| InputGroup + InputGroupIcon | app primitive | input + leading/trailing icon |
| Avatar | shadcn (extended) | size ladder (xs→tap-2xl) + auto-typography fallback |
| StoryRing / StoryAvatar | app primitive | rings (none/lime/online) + isAdd mode |
| Card | shadcn (extended) | tone variants (default/elevated/gradient/overlap/tier/tierInactive/hero/flat) |
| ListItem / ListRow | app primitive | + ListRowGroup / Content / Topline / Subline / Title / Subtitle / Message / Meta slots |
| BottomNavBar | app primitive | `components/app/bottom-nav.tsx` |
| HeaderBar / PageHeader | app primitive | + PageHeaderTitle / PageHeaderSubtitle / PageSection |
| InScreenTabs / Tabs | shadcn | |
| Sheet / Modal (Dialog) | shadcn | |
| Toast | shadcn (sonner) | |
| Skeleton | shadcn | (no per-screen layout variants built) |
| ProgressBar / Progress | shadcn | |
| ProgressDots | app primitive | size + tone variants |
| Switch / Checkbox / RadioGroup | shadcn | |
| Slider | shadcn | |
| Select | shadcn | |
| SegmentedControl / ToggleGroup | shadcn (extended) | width="auto"\|"full" |
| IconBadge | app primitive | tone/shape/size with size-aware compounds |
| StoriesRail | app primitive | horizontal scroller, hidden scrollbar |
| PhotoCaption | app primitive | bottom-up dark scrim |
| OnboardingShell | app primitive | wraps onboarding/* steps (TODO: migrate to PageShell + ProgressDots) |

### Inlined / partial (10) — should be extracted

| Atom | Where it's inlined | Action |
|---|---|---|
| StickerBadge (12 variants) | 8 shapes in `/match/page.tsx` as inline SVG functions | Extract to `<StickerBadge variant="..." size="..." />`; build the 4 missing variants |
| MatchConfetti | Static positioning in `/match/page.tsx` | Extract + add Phase D.3 staged-entry choreography |
| Heading / Body / Caption / Numeric | Raw `text-display`/`text-h1`/`text-body` etc tokens at call sites | Decision: leave as raw tokens (they are the primitive) OR wrap as named components |
| IconButton | Button `size="icon-tap"` / `size="circle"` | Decision: leave as size variants OR extract |
| SearchInput | InputGroup + Input + Search icon at call sites | Decision: leave composed OR extract preset |
| VerifiedBadge | Inline "Bronze verified" text in `/profile`, `/verify` | Extract per Phase 6 Task 6.1 — bronze/silver/gold tiers |
| CompatibilityPill | `<Pill variant="lime">94%</Pill>` per call site | Extract — never invent score client-side, read from `match.compatibility_score` or hide |
| Bubble (me/them/voice/image/sticker) | Local function helpers in `/chat/[id]` | Extract per Phase 6 Task 6.1 |
| VoiceMessage | Local helper in `/chat/[id]` | Extract — placeholder waveform, eventually Skia |
| ChatHeader / ChatInput | Inline JSX in `/chat/[id]` | Extract |

### Not built (15)

PhoneInput, CodeInput (OTP 6-box), PasswordInput, DatePicker, RadioStepper (5-pos), RangeSlider, CountryFlag, SwipeCard, SwipeDeck (the missing core interaction), PhotoGallery, TypingIndicator, StickerCallout, EmptyState (6 variants: no-matches / no-messages / no-search-results / filter-too-narrow / you-blocked-everyone / no-internet), ErrorState, PaywallCard, PermissionPrompt.

(HapticTrigger N/A on web.)

---

## 6. Screen inventory (Phase 6 Task 6.2 — ~40 screens)

### Built (17)

| Plan ref | Route | Caveat |
|---|---|---|
| A1/A2 | `/` | Welcome + sign-in landing (no real auth) |
| A6 | `/onboarding` | Intro carousel |
| A7 | `/onboarding/name` | |
| A8 | `/onboarding/dob` | Hydration warning (per SESSION-SUMMARY) — not re-verified |
| A9 | `/onboarding/gender` | |
| A11 | `/onboarding/photos` | |
| A12 | `/onboarding/country` | |
| A15 | `/onboarding/bio` | |
| B1 | `/discover` | **CRITICAL: visual only — no swipe gesture, no card stack, no LIKE/NOPE overlays.** The dating-app's central interaction is missing. |
| B2 | `/profile/[uuid]` | |
| B3 | `/match` | 8 of 12 confetti shapes; static positioning, no choreography |
| C1 | `/inbox` | Just rewritten with primitives + Kibo Pill |
| C2 | `/chat/[id]` | |
| D1 | `/verify` | Single page lists 3 tiers; **D2/D3/D4 individual flows NOT built** |
| E1 | `/profile` | |
| F1 | `/paywall` | |
| — | `/matches` | Just rewritten with primitives + Kibo Pill |
| — | `/design-system` | Showcase: 6 Dateasy reproductions + primitives notes (not in plan, but useful) |

**No built screen has all 4 states (R5).** Only happy paths.

### Not built (23)

**Auth (Group A):** A3 sign-up, A4 email verify, A5 phone OTP, A10 looking-for, A13 languages, A14 primary language, A16 personality stepper, A17–A19 permission prompts (notifications / camera / location), A20 onboarding complete.

**Discovery (Group B):** B4 filters drawer (Sheet), B5 empty deck, B6 recently swiped (premium).

**Chat (Group C):** C3 voice recording overlay, C4 in-chat image picker, C5 block/report Sheet, C6 first-time safety tip card.

**Verification (Group D):** D2 bronze (selfie) flow, D3 silver (liveness) flow, D4 gold (Stripe Identity) flow.

**Profile + settings (Group E):** E2 edit profile, E3 settings index, E4 notifications, E5 privacy, E6 safety center, E7 blocked users, E8 account deletion, E9 change email, E10 change phone, E11 logout. (10 screens — settings is currently a single `/profile` page with menu items but no sub-routes.)

**Premium (Group F):** F2 subscription mgmt, F3 cancellation flow, F4 restore purchases.

**Static / help (Group G):** G1 help center, G2 contact support, G3 bug report, G4 about, G5 privacy / terms.

**Edge cases (Group H):** H1 banned, H2 locked, H3 network error, H4 force-update, H5 maintenance.

---

## 7. Roadmap — ranked by leverage

### Tier 0: foundation gaps (unblocks everything)

1. **Phase D.0 catch-up — `docs/dateasy-rules.md` (in progress).** Without it every Phase 6 screen is improvised. (1 session done; deeper image inspection in follow-on)
2. **Build SwipeCard + SwipeDeck** — the missing central interaction. Use `motion` library (already in deps). Spec from Phase D.3 (60fps gesture, ±15° rotation max, velocity-commit at >1200 px/s, spring-back, LIKE/NOPE opacity ramp). (1–2 sessions)
3. **Stand up Playwright with visual regression.** R4 cannot pass without this. (1 session)

### Tier 1: high-leverage product gaps

4. ~~**Build EmptyState (6 variants) + ErrorState atoms.**~~ ✅ DONE 2026-05-10. `components/app/empty-state.tsx`. Used by /matches, /inbox, /settings/blocked.
5. ~~**Build the 4 states for /matches and /inbox**~~ ✅ DONE — both have happy/loading/empty/error wired via `?state=` and the new EmptyState/ErrorState atoms.
6. ~~**Migrate OnboardingShell to use PageShell + ProgressDots.**~~ ✅ DONE 2026-05-10. ProgressDots extended with `mode="bar"` (cumulative-fill); OnboardingShell drops the N-Progress map.
7. ~~**Extract Bubble / VoiceMessage / ChatHeader / ChatInput from /chat/[id].**~~ ✅ DONE — `chat-bubble.tsx`, `chat-header.tsx`, `chat-input.tsx`, `block-report-sheet.tsx` all in `components/app/`.
8. ~~**Build D2/D3/D4 verification tier flows.**~~ ✅ DONE 2026-05-10. New `VerifyTierShell` atom (`components/app/verify-tier-shell.tsx`); all three flows (`/verify/bronze`, `/verify/silver`, `/verify/gold`) refactored onto it. Shared chrome: tier-tinted hero card + numbered IconBadge steps + tinted CTA + disclosure.

### Tier 2: scope-out screens

9. ~~**B4 filters drawer**~~ ✅ DONE — `filters-sheet.tsx` with pill toggles, age RangeSlider, distance Slider, verified-only Switch.
10. ~~**C5 block/report Sheet**~~ ✅ DONE — `block-report-sheet.tsx` opened from chat-header more-button.
11. **A3/A4/A5/A10/A13–A14/A16/A20 onboarding gaps.** ALMOST DONE — A3 (`/auth/sign-up`), A4/A5 (`/onboarding/verify-{email,phone}`), A10 (`/onboarding/looking-for`), A13/A14 (`/onboarding/languages`), A20 (`/onboarding/complete`) shipped 2026-05-10. New `CodeInput` atom. Remaining: A16 personality stepper (needs RadioStepper atom), A17–A19 permission prompts (web permission model spec needed first).
12. ~~**E2–E11 settings sub-pages (10 screens).**~~ ✅ DONE 2026-05-10. E2 `/profile/edit`, E3 `/settings`, E4 `/settings/notifications`, E5 `/settings/privacy`, E6 `/settings/safety`, E7 `/settings/blocked`, E8/9/10/11 `/settings/account`.

### Tier 3: stub-able for now

13. **G1–G5 help/about/privacy** — single page each with placeholder content, real copy in Phase D.5.
14. ~~**H1–H5 edge case states**~~ ✅ DONE 2026-05-10. `/banned`, `/locked`, `/offline`, `/update-required`, `/maintenance` — all on a new shared `EdgeStateShell` atom (PageShell + centered Empty). Reuse the EmptyState/ErrorState atom shape with route-specific copy + recovery CTA where applicable.
15. **F2/F3 subscription mgmt** — needs Phase 5 entitlement plumbing first; can stub.
16. **A17–A19 permission prompts.** Web has different permission model than iOS/Android; spec out before building.
17. **B6 recently-swiped (premium).** Premium gate first.

### Tier 4: behind backend

These need `ahavah-api` / Phase 0–5 plumbing. Stubbable in `ahavah-web` with mock data:
- Real auth (replace welcome page sign-in), real photos (replace gradient placeholders in `/discover` + `/profile/[uuid]`), real chat (WebSocket to `service.chat:app`), real translation (DeepL via backend), real verification (Stripe Identity webhook), real paywall (RevenueCat).

---

## 8. Per-screen build discipline (every Phase 6 screen)

Adapted from master plan §6.1 / §6.2:

1. **Open the reference.** Either the Dateasy image (per [`dateasy-rules.md`](dateasy-rules.md)) or the per-screen Figma frame (when D.2 is done).
2. **Write a failing Playwright snapshot test.** `pnpm exec playwright test path/to/screen.spec.ts` should fail because no screenshot baseline exists yet.
3. **Build with primitives only.** Read [`PROJECT-STATUS.md`](../PROJECT-STATUS.md) §4 atom map; use existing variants. If a primitive needs extending, extend the primitive, don't add per-call className.
4. **Build ALL four states.** Happy / loading / empty / error. Per R5.
5. **Add aria-labels** on every interactive. Per R11.
6. **Verify reduce-motion.** Per R9 — should already inherit from globals.css.
7. **Run typecheck + lint + build.** All clean.
8. **Run dev server + open the route in a browser.** Per failure pattern #7. Don't claim done from typecheck output alone.
9. **Take a Playwright screenshot, commit as baseline.** Per R4.
10. **Self-check the 12-point R1–R12 rubric.** Document checks/fails in PR description.
11. **Mark screen done in PROJECT-STATUS.md §3.**
12. **Commit.**

---

## 9. Plan course-corrections from duolicious-audit

For when backend work resumes (out of scope for `ahavah-web`-only sessions, but kept here for context). 13 corrections at [`docs/specs/duolicious-audit.md`](../../docs/specs/duolicious-audit.md). Highlights:

- Q&A strip is multi-day archaeology, not folder-delete (3–4 days, not 0.5)
- Photo moderation already exists as on-device 210MB ONNX → reframe Phase 4 Task 4.0 from "build" to "extend"
- Chat is custom Python ASGI WebSocket (uvicorn, port 5443, XMPP-style XML, persisted to Postgres) — Phase 2 lazy-translate-on-read works as designed
- Bottom-tab shape locks at **Discover / Matches / Inbox / Profile** (4 tabs)
- Existing fonts to drop: Trueno + Montserrat
- Verification is GPT-powered (OpenAI vision) — needs own API key, privacy disclosure
- IAP via RevenueCat (need own keys; don't ship duolicious's)

---

## 10. What this doc does NOT cover

- **`ahavah-api/`** (backend). Plan covers it; this doc is web-scoped.
- **`ahavah-frontend/`** (Expo + RN). Abandoned 2026-05-09. Left in place but not extended.
- **Marketing site.** Plan §6.4 calls for separate `ahavah-web` (note: collision with this app's name) marketing site.
- **Admin tool.** Plan §4.3 calls for separate `ahavah-admin` Next.js repo.
- **Phase 0–5 backend work** (auth / i18n / verification tiers / monetization / safety). All deferred until web visual is solid.

---

## 11. Reading order for new sessions

1. **This doc** (`docs/BUILD-PLAN.md`) — what we're building, rules, roadmap
2. **[`PROJECT-STATUS.md`](../PROJECT-STATUS.md)** — current state, gaps, failure patterns
3. **[`docs/dateasy-rules.md`](dateasy-rules.md)** — design rules per reference image
4. Specific master-plan section only when needed for context (e.g. backend phase when starting backend)

The 5,000+ lines of plan + spec text at `d:/Antigravity/docs/` are **historical context**, not required-read for every session.

---

**Sign-off:** This plan is the active source of truth for `ahavah-web`. Update after every session. If a decision conflicts with the original master plan, this doc wins for the web scope; the master plan stays canonical for backend / Expo / monetization.

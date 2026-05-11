# Torah-Observant Matchmaker — Strategic Roadmap

> **Status:** strategic roadmap, not an executable plan. Maps a 70+ field schema across 6 sub-plans that will each be written separately in full TDD-bite-sized detail per `superpowers:writing-plans`.

**Goal:** Convert the existing Ahavah PWA chassis (38-route generic dating-app skeleton) into a Torah-observant / Hebrew Israelite community matchmaker by layering a ~70-field profile schema, faith-aware filters, prompt cards, voice intros, and a weighted compatibility scoring algorithm onto the audited foundation.

**Architecture (strategic):** Layer-on, not rewrite. The 38-route audit (PROJECT-STATUS.md §15) just locked the design rubric across every screen. The new schema attaches to existing UI scaffolding (`/onboarding/*`, `/profile/edit`, `/profile/[uuid]`, `FiltersSheet`) rather than replacing it. Hard problems (scoring algorithm, voice infra, assembly verification) become their own sub-plans so each can be reviewed and shipped independently.

**Tech Stack:** unchanged — Next.js 16 + React 19 + Tailwind v4 + shadcn (Base UI) + Kibo + motion/react + Plus Jakarta Sans + lucide-react. Adds: TypeScript-first schema in `src/lib/profile-schema.ts`, MediaRecorder API for voice, future Supabase Storage for voice file persistence (out of web-only scope until backend).

---

## 0. Product positioning shift (acknowledge before building)

The user-sent schema makes Ahavah a **Torah-observant / Hebrew Israelite community matchmaker** — not a generic dating app. Concrete shifts:

- **Polygyny support is first-class** — "First Wife" / "Additional Wife" intent options for men, "Married Man" intent for women. Currently the app's gender selector is binary (Woman / Man, per `feedback_ahavah_gender_binary.md`) and looking-for is generic. This is a positioning decision, not just a feature toggle — needs to be embraced in marketing copy + onboarding intro + filter defaults.
- **Faith fields are required, not optional** — Assembly affiliation, Torah-observance level, Shabbat practice, calendar preference. These drive the core matching signal in this audience. They should be earlier in onboarding than bio.
- **Verification has 4 axes, not 3 tiers** — Government ID + Assembly verified + Community references + Video selfie. Current `/verify/{bronze,silver,gold}` is a tier ladder; the new schema is a tag set (you can have any combination).
- **Match score has a doctrinal weight stack**, not just compat-%-from-interests — calendar alignment / polygyny compatibility / family goals / relocation openness / lifestyle / communication / observance level / feast consistency. Currently `compat` is a hardcoded number on mock profiles.

These positioning decisions are **prerequisites for the schema rollout** — the data model phase can't ship without confirming them.

---

## 1. Open product decisions (confirm before sub-plans execute)

These are decisions only the user can make; the plans branch on the answers.

| Decision | Options | Affects |
|---|---|---|
| Onboarding length | 12 steps required + faith section / 25 steps required-all / 10 steps required + everything else deferred to /profile/edit | Sub-plan 2 (profile schema rollout) |
| Polygyny intent UX for men | Gender-conditional fields shown only to men / shared fields with conditional labels / two onboarding paths | Sub-plan 2 step 3 |
| Required vs optional fields | Strict (force complete profile before discovery) / soft (allow incomplete, mark profile as % complete) | Sub-plans 1 + 2 |
| Boundary tags = hard filters or soft prefs | Hard (auto-exclude from discovery deck) / soft (down-rank, still show) | Sub-plan 4 (filters) + sub-plan 5 (scoring) |
| Voice intro storage | In-browser only (lost on refresh) / Supabase Storage / Defer voice entirely to v2 | Sub-plan 6 (voice) |
| Assembly verification flow | Admin-only manual approval / submit assembly contact info for outreach / community-vouch system | Sub-plan 7 (verification) — needs backend |
| Scoring algorithm weights | Equal / user-tunable / fixed-by-product / two presets ("strict doctrinal" vs "open") | Sub-plan 5 (scoring) |
| Existing /onboarding/gender field | Keep binary (Woman/Man) / extend to support intent variants | Sub-plan 2 step 2 |

I recommend answering these before any sub-plan is executed. They're the difference between a 1-week build and a 6-week build.

---

## 2. Schema coverage — every spec field mapped to a sub-plan

Every field/cluster in the user-sent spec, mapped to where it'll be implemented. Nothing is dropped silently.

### Basic Identity (mostly exists)
| Field | Current state | Sub-plan |
|---|---|---|
| First Name / Display Name | `/onboarding/name` ✓ | — already shipped |
| Age | `/onboarding/dob` ✓ (computed age from DOB) | — already shipped |
| Sex (Male / Female) | `/onboarding/gender` ✓ (binary per existing memory) | — already shipped |
| Location: Country | `/onboarding/country` ✓ (250 ISO) | — already shipped |
| Location: State/Parish/Province | **MISSING** | Sub-plan 1 (data model) + Sub-plan 2 (onboarding country expansion) |
| Location: City/Town | **MISSING** | Sub-plan 1 + Sub-plan 2 |
| Nationality | **MISSING** (different from country of residence) | Sub-plan 1 + Sub-plan 2 |
| Ethnicity / Heritage | **MISSING** | Sub-plan 1 + Sub-plan 2 |
| Languages Spoken | `/onboarding/languages` ✓ (14 builtin + custom additions) | — already shipped |
| Occupation | **MISSING** | Sub-plan 1 + Sub-plan 3 (profile edit) |
| Education Level | **MISSING** | Sub-plan 1 + Sub-plan 3 |
| Bio / Testimony | `/onboarding/bio` ✓ | — already shipped (may need rename to "Testimony" for this audience) |
| Profile Verification Status | `/verify/*` ✓ for ID flow | Sub-plan 7 (verification — extend to 4 axes) |

### Relationship Intent (NEW — gender-specific)
| Field | Sub-plan |
|---|---|
| Male intent: First Wife / Additional Wife / Courtship / Marriage Only / Long Distance Courtship / Local Only | Sub-plan 1 + Sub-plan 2 (new onboarding step replacing or extending `/onboarding/looking-for`) |
| Female intent: Unmarried Man / Married Man / Courtship / Marriage Only / Open to Relocation / Local Only | Sub-plan 1 + Sub-plan 2 |

### Faith & Doctrine (NEW — entire cluster)
| Cluster | Sub-plan |
|---|---|
| Assembly / Faith Background (6 options) | Sub-plan 1 + Sub-plan 2 (new onboarding step) |
| Torah Observance Level (4 options) | Sub-plan 1 + Sub-plan 2 |
| Shabbat Observance (4 options) | Sub-plan 1 + Sub-plan 2 |
| Feast Day Observance (9 multi-select) | Sub-plan 1 + Sub-plan 2 |
| Polygyny View (4 options) | Sub-plan 1 + Sub-plan 2 |
| Head Covering (4 options) | Sub-plan 1 + Sub-plan 2 |
| Fringes / Tassels (3 options) | Sub-plan 1 + Sub-plan 2 |
| Calendar Preference (6 options) | Sub-plan 1 + Sub-plan 2 |

### Lifestyle (NEW — partly addressed by existing personality field placeholder)
| Cluster | Sub-plan |
|---|---|
| Marriage & Family (6 multi-select) | Sub-plan 1 + Sub-plan 3 (profile edit) |
| Living Preference (6 multi-select) | Sub-plan 1 + Sub-plan 3 |
| Health & Lifestyle (7 multi-select) | Sub-plan 1 + Sub-plan 3 |

### Ethnicity / Nationality (NEW)
| Cluster | Sub-plan |
|---|---|
| Ethnic Heritage (17 options) | Sub-plan 1 + Sub-plan 2 |
| Nationality (20+ options) | Sub-plan 1 + Sub-plan 2 (note: distinct from /onboarding/country which is residence) |

### Cultural / Interests / Personality (NEW)
| Cluster | Sub-plan |
|---|---|
| Interests (28 multi-select) | Sub-plan 1 + Sub-plan 3 (profile edit pills) |
| Personality Traits (12 multi-select) | Sub-plan 1 + Sub-plan 3 |

### Practical Compatibility (NEW)
| Cluster | Sub-plan |
|---|---|
| Relocation (4 options) | Sub-plan 1 + Sub-plan 3 |
| Communication Preferences (5 multi-select) | Sub-plan 1 + Sub-plan 3 |

### Verification (NEW shape — 4 tags not 3 tiers)
| Tag | Sub-plan |
|---|---|
| Government ID verified | Sub-plan 7 — maps to existing `/verify/gold` (Stripe Identity) |
| Assembly verified | Sub-plan 7 — NEW, requires backend approver |
| Community references | Sub-plan 7 — NEW, requires backend reference-collection flow |
| Video selfie verified | Sub-plan 7 — maps to existing `/verify/silver` (liveness) |

### Match Preference Filters (NEW expansion)
| Filter | Sub-plan |
|---|---|
| Age range / Distance radius | `FiltersSheet` already has these — expand UX | Sub-plan 4 |
| Marital status / Children / Polygyny stance / Feast / Calendar / Ethnicity / Nationality / Language / Relocation / Torah level / Assembly / Interests / Verified only | All NEW in FiltersSheet | Sub-plan 4 |

### Prompts / Voice / Boundary Tags / Scoring (NEW)
| Cluster | Sub-plan |
|---|---|
| Prompt Cards (6 prompts + user answers) | Sub-plan 3 (profile edit) + Sub-plan 8 (display on profile detail) |
| Voice Intro | Sub-plan 6 (voice infrastructure) |
| Boundary Tags (5 tags) | Sub-plan 1 + Sub-plan 4 (filter integration) |
| Compatibility Scoring (8-weight algorithm) | Sub-plan 5 |

---

## 3. Sub-plan decomposition (6 plans, dependency-ordered)

### Sub-plan 1: Data model + types + sample data (**foundation — write first**)

**Goal:** Define every field in TypeScript, with metadata (label, kind, options, required, conditional), seed sample profiles, and ship a `useProfile` hook that reads/writes the shape. Every other sub-plan consumes this.

**Files:**
- Create: `src/lib/profile-schema.ts` (types + enums + field metadata)
- Create: `src/lib/profile-sample.ts` (8 sample profiles spanning the schema)
- Create: `src/lib/use-profile.ts` (client-side state hook; persists to localStorage until backend wiring)
- Create: `src/lib/profile-completeness.ts` (% complete calculation)
- Tests: `tests/lib/profile-schema.test.ts`, `tests/lib/profile-completeness.test.ts`

**Sample task shape (10–14 tasks each ~2-5 min):**
1. Write failing test for `ProfileSchema` type shape
2. Define `Sex` enum + test
3. Define `RelationshipIntent` union (gender-conditional) + test
4. Define `Assembly` enum (6 options) + test
5. Define `TorahLevel` enum (4 options) + test
6. ... (one task per cluster) ...
7. Define `Profile` aggregate type
8. Write seed sample profiles
9. Write `useProfile` hook with localStorage persistence
10. Write `computeCompleteness(profile)` pure function + tests
11. Commit

**Deliverable:** every type can be imported by future sub-plans. `tsc --noEmit` clean. 8 sample profiles in `localStorage` seed.

**Estimated: 1 session.**

---

### Sub-plan 2: Profile schema onboarding rollout

**Goal:** Add the missing onboarding steps for faith / doctrine / location-detail / ethnicity / nationality / intent (gender-conditional). Restructure the step indicator. **Soft-required** so users can finish minimal onboarding and complete the rest in `/profile/edit`.

**Depends on:** Sub-plan 1.

**Files (created):**
- `src/app/onboarding/intent/page.tsx` — replaces/expands `/onboarding/looking-for` with gender-conditional intent
- `src/app/onboarding/assembly/page.tsx` — assembly + Torah level (one step, both selects)
- `src/app/onboarding/observance/page.tsx` — Shabbat + Feast Days + Calendar (one step, three sub-sections)
- `src/app/onboarding/doctrine/page.tsx` — Polygyny / Head Covering / Tzitzit (one step)
- `src/app/onboarding/ethnicity/page.tsx` — Ethnicity + Nationality (one step, two pickers)
- `src/app/onboarding/location-detail/page.tsx` — State + City (drilldown from `/onboarding/country`)
- Modify: `src/components/app/onboarding-shell.tsx` — accept `step` count up to 18

**Atom needs from sub-plan 1's types:** `Assembly`, `TorahLevel`, `Shabbat`, `FeastDay[]`, `Calendar`, `Polygyny`, etc.

**Atoms to extract (reused across pages — failure-pattern-#2-correct):**
- `PillMultiSelect` — flex-wrap of `ToggleGroupItem` pills, optional "Add other..." input
- `RadioCardSelect` — vertical list of Card-shaped radio options
- `ConditionalIntent` — gender-aware intent block

**Estimated: 2 sessions.**

---

### Sub-plan 3: Profile edit + profile detail expansion

**Goal:** Mirror onboarding's new fields on `/profile/edit` (so users can complete what they skipped). Show all fields on `/profile/[uuid]` (so matches can read what users put in). Add prompt card Q&A.

**Depends on:** Sub-plan 1, Sub-plan 2 (reuses extracted atoms).

**Files:**
- Modify: `src/app/profile/edit/page.tsx` — add 6 new sections (Faith / Doctrine / Lifestyle / Ethnicity / Interests / Personality), each opens an `OnboardingShell`-style screen via `Sheet` or inline
- Modify: `src/app/profile/[uuid]/page.tsx` — render the new fields as Pill groups + IconBadge rows
- Create: `src/components/app/prompt-card.tsx` — Q&A card (prompt + user response, max ~300 chars)
- Create: `src/app/profile/edit/prompts/page.tsx` — choose up to 3 prompts from 6 + write responses

**Estimated: 2 sessions.**

---

### Sub-plan 4: Discovery filters expansion + boundary tags

**Goal:** Rebuild `FiltersSheet` to filter on every new field. Add boundary tag setting that auto-applies hard filters (e.g. "No smokers" = auto-filter health-tag = smoker out of deck).

**Depends on:** Sub-plan 1, Sub-plan 3 (profile data must exist to filter on).

**Files:**
- Modify: `src/components/app/filters-sheet.tsx` — add 15+ filter groups (collapsible sections)
- Create: `src/components/app/boundary-tags.tsx` — user-pickable hard preferences
- Modify: `src/app/settings/privacy/page.tsx` — link to boundary-tags settings
- Modify: `src/lib/discover-engine.ts` (NEW) — pure function that takes profile + filters + boundary tags and returns ranked candidate list

**Estimated: 1-2 sessions.**

---

### Sub-plan 5: Compatibility scoring algorithm

**Goal:** Replace hardcoded `compat: 94` numbers with a real weighted scoring function. Implement the 8-weight stack from the spec.

**Depends on:** Sub-plan 1 (types), Sub-plan 4 (boundary tags affect scoring as deal-breakers).

**Files:**
- Create: `src/lib/scoring/compute-compatibility.ts` — pure function `(a: Profile, b: Profile, weights?: Weights) => CompatibilityResult`
- Create: `src/lib/scoring/rules/*.ts` — one rule file per weight axis (calendar / polygyny / family / relocation / lifestyle / communication / observance / feast). 8 small files.
- Create: `src/lib/scoring/weights.ts` — default weight presets (strict-doctrinal / open / balanced)
- Tests: `tests/lib/scoring/*.test.ts` — ~30 tests covering edge cases per rule (mismatch, partial-match, perfect-match)
- Modify: `src/components/app/compat-pill.tsx` (extracted from existing inline usage) — displays computed score, breakdown on tap

**Estimated: 2 sessions.** This is the algorithmic heart of the product — needs careful test coverage.

---

### Sub-plan 6: Voice intro infrastructure

**Goal:** Record-once optional voice intro (~30s max). Browser-only MVP (lost on refresh) until backend storage exists. Playback widget on profile detail.

**Depends on:** Sub-plan 1.

**Files:**
- Create: `src/components/app/voice-recorder.tsx` — MediaRecorder wrapper, waveform feedback
- Create: `src/components/app/voice-player.tsx` — playback widget (matches existing `VoiceBubble` from chat-bubble for visual consistency)
- Create: `src/app/profile/edit/voice/page.tsx` — recording flow
- Modify: `src/app/profile/[uuid]/page.tsx` — show playback widget if user has a voice intro

**Open decision:** storage. Browser-only is the MVP; persisting requires backend. Mark this sub-plan as **deferrable to v2** if backend isn't ready.

**Estimated: 1 session for MVP browser-only, 2 sessions with persistence.**

---

### Sub-plan 7: Verification 4-tag system

**Goal:** Convert `/verify` from 3-tier ladder to 4-tag set. Government ID + Video selfie keep their existing pre-flight pages (`/verify/gold` + `/verify/silver`). Assembly verified + Community references are NEW flows.

**Depends on:** backend (assembly approval queue, reference collection).

**Files:**
- Modify: `src/app/verify/page.tsx` — render as 4 tag-cards (not 3 tier-cards). Each tag-card shows verified/unverified + CTA to start.
- Modify: `src/components/app/verify-tier-shell.tsx` — rename → `VerifyFlowShell`, decouple from "tier" semantics
- Create: `src/app/verify/assembly/page.tsx` — submit assembly contact info for outreach
- Create: `src/app/verify/references/page.tsx` — invite 2 community members to vouch
- Modify: existing `/verify/bronze`, `/verify/silver`, `/verify/gold` — rename to `/verify/profile`, `/verify/selfie`, `/verify/id` (semantic-clearer)

**Note:** Sub-plan 7 has backend dependencies (assembly approval queue, reference email workflow) — the web side is the form + state UX; the backend work is its own plan.

**Estimated: 1-2 sessions web-side. Backend is separate.**

---

## 4. Cross-cutting concerns (apply across sub-plans)

- **i18n:** the schema uses English labels but the audience includes non-English-primary Hebrew Israelite communities (Caribbean, Africa, US, etc.). String inventory should go into `i18n/locales/en.json` per Phase D.5 (BUILD-PLAN §3 D.5 currently ✗). Sub-plan 1 should establish the i18n pattern.
- **Moderation:** assembly affiliation + ethnicity + nationality are sensitive fields. Need a hate-speech / discrimination filter on free-text "Other" inputs. Defer the full moderation policy to a separate plan; sub-plans 1+2 should at minimum accept moderation flags from a future service.
- **Backward compatibility:** the existing `/onboarding/looking-for` page exists and may already have some users on staging. Sub-plan 2 should either replace it or maintain a migration path. Confirm with product before deletion.
- **Sticker rule:** all sub-plans must respect `feedback_ahavah_no_stickers.md` (4 permitted SparkleMark uses; no decorative stickers).
- **Kit-only:** every new UI component goes through the 12-axis rubric. Sub-plans should be reviewed against the rubric per-screen before merging.

---

## 5. Phasing / sequencing recommendation

```
Sub-plan 1 (data model)              ← must ship first; 1 session
       │
       ├─→ Sub-plan 2 (onboarding rollout)        ← 2 sessions
       │       │
       │       └─→ Sub-plan 3 (edit + detail)     ← 2 sessions
       │               │
       │               └─→ Sub-plan 4 (filters)   ← 1–2 sessions
       │                       │
       │                       └─→ Sub-plan 5 (scoring)   ← 2 sessions
       │
       ├─→ Sub-plan 6 (voice — optional v2)       ← 1 session MVP
       │
       └─→ Sub-plan 7 (verification — partly backend-dependent)  ← 1–2 sessions web-side
```

**Critical path: sub-plans 1 → 2 → 3 → 4 → 5.** Roughly 8 sessions to ship the core matchmaker. Voice + new-verification can run in parallel after sub-plan 1.

---

## 6. Risks / decisions to lock now

1. **Product positioning lock.** Confirm Ahavah is now a Torah-observant / Hebrew Israelite community matchmaker, not a generic dating app. This affects every screen's copy, the marketing tone, the colour story (lavender + lime read as warm/welcoming, not specifically "biblical" — may need a brand audit).
2. **Polygyny first-class is a heavy product call.** Some Hebrew Israelite assemblies practice it; others reject it. Allowing "First Wife / Additional Wife" intent makes a strong statement. Confirm explicitly.
3. **Soft vs strict completeness.** If the schema is required, users will face a 20-step onboarding. If soft, profiles will be sparse at first and the scoring algorithm has to tolerate missing fields.
4. **Free-text vs enum-only.** Ethnicity is 17 options + Other; Assembly is 6 + (implicit) Other; Calendar is 6 + Other. "Other" free-text needs moderation. Consider locking to enum-only for v1 and adding curated "Other" later.
5. **Backend cadence.** Assembly verification and references can't be tested without a backend. Either build the web mocks first (Sub-plan 7 web-only) and wire later, or defer Sub-plan 7 entirely until backend exists.

---

## Self-review

**Spec coverage:** Walked the full user-sent spec section by section above (Basic Identity through Advanced Compatibility Scoring). Every field cluster has a sub-plan assigned. No silent drops.

**Placeholder scan:** This is a strategic roadmap, not an executable plan — so it intentionally contains high-level descriptions ("write seed sample profiles" rather than the actual seed data). The per-sub-plan documents will be the executable plans with zero placeholders.

**Type consistency:** the sub-plans share type names (`Profile`, `Assembly`, `TorahLevel`, etc.) which will be defined in Sub-plan 1. All later sub-plans import from `src/lib/profile-schema.ts`.

---

## Next step

Once you confirm:
1. **Product positioning lock** (Torah-observant matchmaker, not generic dating app) — yes/no
2. **Which sub-plan to write first in full TDD detail** — recommend Sub-plan 1 (data model)
3. **Answers to the 8 open product decisions in §1** — affects all sub-plans

I'll then write the first executable sub-plan with bite-sized TDD tasks per `superpowers:writing-plans`. Estimated plan size: ~300–600 lines per sub-plan.

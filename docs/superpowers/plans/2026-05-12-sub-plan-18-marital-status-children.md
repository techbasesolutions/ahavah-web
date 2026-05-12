# Sub-plan 18 — Marital status + Children fields (mandatory onboarding)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new mandatory onboarding fields to `Profile`:
- `maritalStatus: "married" | "re-married" | "divorced" | "never-married"` (single-select)
- `children: number` (integer, 0..20)

Wired into the wizard flow, the completeness gate, the profile-view (`/profile/[uuid]`), and `/profile/edit`. SAMPLE_PROFILES gets realistic values for the 8 seeds.

**Architecture:** Add two type unions + a numeric field to the `Profile` aggregate. Two new onboarding screens use the existing SingleSelectField + Input primitives. Wizard ordering updated in `wizard-flow.ts`. Completeness gate (`MINIMUM_COMPLETE_FIELDS` + `isDiscoverEligible` + `computeCompleteness`) extended.

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + shadcn (Base UI). No new deps. Tests via vitest.

---

## Context

User direction (2026-05-12, verbatim):

> "I need to add marriage status to the onboarding mandatory field:
> Married
> Re-married
> Divorced
> Never Married
> and children:
> a user numerical input field"

Two mandatory fields. Marital status is a single-select from 4 options. Children is a numerical input (integer count of children; 0 is a valid answer for "no children").

---

## Scope decisions locked

- **Storage values are kebab-case slugs:** `"married" | "re-married" | "divorced" | "never-married"`. Labels match user's exact copy (`"Married" | "Re-married" | "Divorced" | "Never Married"`).
- **Picker order:** Never Married first (largest cohort for a dating app — standard convention), then Married, Re-married, Divorced.
- **`children` is required + integer + 0-20.** A user typing `0` is a valid + complete answer. UI: `Input type="number" min={0} max={20} step={1}` plus helper text "Enter 0 if you have no children."
- **Both fields are added to `MINIMUM_COMPLETE_FIELDS`.** Existing profiles in localStorage become incomplete on first load after this lands and get bumped to onboarding for the missing steps. Intentional MVP behavior.
- **No filter on these fields.** Profile attributes only. No FiltersSheet section. No compatibility-scoring axis (yet — that's a future sub-plan if relevant).
- **Wizard insertion point:** between the existing Identity-cluster steps. Implementer audits `wizard-flow.ts` and picks the natural slot — likely after `/onboarding/dob` (age) and before `/onboarding/country` so the cluster reads age → marital → children → location.
- **Render on `/profile/[uuid]`** in the Identity cluster (after age/country). Format: `Married, 2 children` (single-line summary) OR two separate rows (`Marital status: Married` + `Children: 2`). Implementer picks per existing pattern.
- **Edit affordance on `/profile/edit`** via existing Identity section. Use `SingleSelectField` for marital, native number input for children (or extend a new `NumberField` helper if needed — keep it inline if it's the only number field in this section).
- **SAMPLE_PROFILES enrichment:** distribute realistic values across 8 samples. Mix of never-married (the modal value for a 22-32yo cohort), married (Yosef + Ezekiel — already have "has-children" familyView), divorced (1 sample), re-married (rare; assign to Caleb maybe). Realistic children counts based on existing `familyViews` cluster.

---

## File structure

| File | Role |
|---|---|
| `src/lib/profile-schema.ts` | MODIFY. Add `MaritalStatus` type + `MARITAL_STATUSES` const + `maritalStatus?` + `children?` on Profile. Update `MINIMUM_COMPLETE_FIELDS`. |
| `src/lib/profile-completeness.ts` | MODIFY. Update `isDiscoverEligible` + `computeCompleteness` + `firstMissingStepFor` to include the new fields + routes. |
| `tests/lib/profile-completeness.test.ts` | EXTEND. ~5 cases for the new completeness checks. |
| `src/app/onboarding/marital-status/page.tsx` | CREATE. Single-select onboarding screen. ~80 lines. |
| `src/app/onboarding/children/page.tsx` | CREATE. Numerical input onboarding screen. ~80 lines. |
| `src/lib/wizard-flow.ts` | MODIFY. Insert the two new steps in the right position. Update `positionOf` if numeric ordering matters. |
| `src/lib/profile-sample.ts` | MODIFY. Assign `maritalStatus` + `children` to all 8 SAMPLE_PROFILES. |
| `src/app/profile/[uuid]/page.tsx` | MODIFY. Render marital status + children in the Identity cluster. |
| `src/components/profile-edit/section-identity.tsx` | MODIFY. Add SingleSelectField for marital status + numerical input for children. |
| `PROJECT-STATUS.md` | MODIFY. Append §25 closeout. |

No new dependencies. No new design tokens. Reuse existing `SingleSelectField`, `Input`, `OnboardingShell`, `Pill`.

---

## Existing primitives reused

- `SingleSelectField` from `@/components/app/profile-field` — radio-card pattern (clean lime selected fill via SP17 T3 consolidation).
- `Input` from `@/components/ui/input` — for the `<input type="number">` element.
- `OnboardingShell` from `@/components/app/onboarding-shell` — wizard chrome (progress bar, back arrow, CTA).
- `positionOf` + wizard step list from `@/lib/wizard-flow.ts` — navigation order.
- `useProfile` hook for read/write profile state.
- `Pill` from kibo for rendering the values on /profile/[uuid].

---

## Hard rules

1. **Pure logic first.** Completeness gate changes ship with tests in T1 before any UI consumes the new fields.
2. **Frontend-design skill invoked for the onboarding screen placement** — the two new steps must visually match the existing onboarding rhythm. SingleSelectField for marital (per existing /onboarding/assembly, /onboarding/looking-for pattern). The numerical input for children should be styled as a large prominent input — not a tiny number stepper.
3. **`children: 0` is valid + complete.** Don't require children >= 1.
4. **No new design tokens.** Children Input uses `Input size="lg" tone="elevated"` (existing variants). Number picker spinner buttons are browser-default; if visually off, the implementer can hide with `[appearance:textfield]` Tailwind class but only after confirming with a smoke walk.
5. **Routes added to BUILD ONLY** — the existing onboarding-router pattern handles `firstMissingStepFor` redirects; no new top-level navigation work needed.
6. **Existing profiles incomplete after this lands.** Document this in §25. localStorage-stored profiles without the new fields will be soft-redirected to the new onboarding steps on next /discover or /map visit.
7. **§18 sign-off rule applies.** §25 cites verification queries.

---

## Tasks

### T1 — Schema + completeness gate + tests

**Files:**
- Modify: `src/lib/profile-schema.ts`
- Modify: `src/lib/profile-completeness.ts`
- Modify: `tests/lib/profile-completeness.test.ts`

**Steps:**

- [ ] Step 1: Read existing `profile-schema.ts` to see how existing single-select types are declared (e.g. `Assembly`, `Polygyny`, `Intent`). Match the convention.

- [ ] Step 2: Add to `profile-schema.ts`:
  ```ts
  // Marital status (mandatory onboarding) ------------------------------------

  export type MaritalStatus =
    | "never-married"
    | "married"
    | "re-married"
    | "divorced";

  export const MARITAL_STATUSES: ReadonlyArray<{ value: MaritalStatus; label: string }> = [
    { value: "never-married", label: "Never Married" },
    { value: "married",       label: "Married" },
    { value: "re-married",    label: "Re-married" },
    { value: "divorced",      label: "Divorced" },
  ];

  export function isMaritalStatus(value: unknown): value is MaritalStatus {
    return typeof value === "string" && MARITAL_STATUSES.some((opt) => opt.value === value);
  }
  ```

- [ ] Step 3: Add to the `Profile` aggregate type:
  ```ts
  maritalStatus?: MaritalStatus;
  children?: number;        // 0..20, integer
  ```
  Insert near `age` / `sex` / `country` so the Identity cluster is co-located in the type definition.

- [ ] Step 4: Update `MINIMUM_COMPLETE_FIELDS`. Find the constant (likely near `computeCompleteness`). Add `"maritalStatus"` and `"children"` to the list.

- [ ] Step 5: Update `profile-completeness.ts`:
  - `isDiscoverEligible` — verify the new fields are required. The check probably iterates `MINIMUM_COMPLETE_FIELDS` against `profile[key] !== undefined && profile[key] !== null`. For `children: 0` to be considered eligible, ensure the check is `!== undefined && !== null` NOT a truthy check (0 is falsy in JS but is valid here).
  - `firstMissingStepFor` — add cases for the new fields returning `/onboarding/marital-status` and `/onboarding/children` respectively. Insertion order matters — the function returns the FIRST missing step, so order it after age but before country (or wherever the natural Identity cluster flow lives — implementer audits the existing order).

- [ ] Step 6: Tests (~5 cases in `tests/lib/profile-completeness.test.ts`):
  1. Profile with maritalStatus undefined → ineligible
  2. Profile with maritalStatus set + children undefined → ineligible
  3. Profile with maritalStatus + children: 0 → eligible (if all other required fields are set)
  4. Profile missing maritalStatus → `firstMissingStepFor` returns `/onboarding/marital-status`
  5. Profile missing children but has maritalStatus → `firstMissingStepFor` returns `/onboarding/children`

- [ ] Step 7: Verify gates — tsc / eslint / vitest 263 + 5 = 268 passing.

### T2 — Two new onboarding screens

**Files:**
- Create: `src/app/onboarding/marital-status/page.tsx`
- Create: `src/app/onboarding/children/page.tsx`

**Steps:**

- [ ] Step 1: Read an existing single-select onboarding page for reference — `/onboarding/looking-for` or `/onboarding/polygyny`. Note the imports, the OnboardingShell usage, the SingleSelectField usage, the useProfile read/write, and the "Continue" CTA wiring.

- [ ] Step 2: Build `/onboarding/marital-status/page.tsx`:
  ```tsx
  "use client";

  import { motion } from "motion/react";

  import { OnboardingShell } from "@/components/app/onboarding-shell";
  import { SingleSelectField } from "@/components/app/profile-field";
  import {
    MARITAL_STATUSES,
    type MaritalStatus,
  } from "@/lib/profile-schema";
  import { useProfile } from "@/lib/use-profile";

  const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  export default function MaritalStatusStep() {
    const { profile, setProfile } = useProfile();

    const value = profile.maritalStatus;
    const isComplete = value !== undefined;

    return (
      <OnboardingShell
        href="/onboarding/marital-status"
        ctaDisabled={!isComplete}
      >
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-display text-white">
            Your marital status<span className="text-lime">?</span>
          </h1>
          <p className="text-body text-text-secondary">
            Be upfront — others will see this on your profile.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-8"
        >
          <SingleSelectField<MaritalStatus>
            id="marital-status"
            label="Marital status"
            value={value}
            onValueChange={(next) => setProfile({ ...profile, maritalStatus: next })}
            options={MARITAL_STATUSES}
          />
        </motion.div>
      </OnboardingShell>
    );
  }
  ```

  Read `useProfile`'s API surface (it might be `{ profile, setProfile }` or `{ profile, updateProfile }`) — adjust the destructure to match.

- [ ] Step 3: Build `/onboarding/children/page.tsx`:
  ```tsx
  "use client";

  import { useState } from "react";
  import { motion } from "motion/react";

  import { OnboardingShell } from "@/components/app/onboarding-shell";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { useProfile } from "@/lib/use-profile";

  const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  export default function ChildrenStep() {
    const { profile, setProfile } = useProfile();
    const [raw, setRaw] = useState<string>(
      profile.children !== undefined ? String(profile.children) : "",
    );

    const parsed = Number.parseInt(raw, 10);
    const isValid = !Number.isNaN(parsed) && parsed >= 0 && parsed <= 20;
    const isComplete = isValid && raw.trim() !== "";

    const handleChange = (next: string) => {
      // Strip non-digits early so the on-typing UX is clean
      const sanitized = next.replace(/[^0-9]/g, "");
      setRaw(sanitized);
      const n = Number.parseInt(sanitized, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 20) {
        setProfile({ ...profile, children: n });
      }
    };

    return (
      <OnboardingShell
        href="/onboarding/children"
        ctaDisabled={!isComplete}
      >
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-display text-white">
            How many children do you have<span className="text-lime">?</span>
          </h1>
          <p className="text-body text-text-secondary">
            Enter 0 if you have no children.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-8 flex flex-col gap-2"
        >
          <Label htmlFor="children" className="text-meta text-white">
            Number of children
          </Label>
          <Input
            id="children"
            size="lg"
            tone="elevated"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="0"
            aria-describedby="children-help"
          />
          <p id="children-help" className="text-caption text-text-muted">
            Whole number from 0 to 20.
          </p>
        </motion.div>
      </OnboardingShell>
    );
  }
  ```

  Verify `Input size="lg" tone="elevated"` is the right variant — read existing onboarding inputs (e.g. `/onboarding/dob` or `/onboarding/bio`) for the canonical pattern. The repo has a memory rule against hardcoded `font-['Inter']` (use `font-sans`) — apply the existing input cva, don't override.

- [ ] Step 4: Verify gates — tsc / eslint / vitest 268 (unchanged — no new tests for these React pages; coverage via T5 smoke walk).

### T3 — Wizard flow integration

**Files:**
- Modify: `src/lib/wizard-flow.ts`

**Steps:**

- [ ] Step 1: Read `wizard-flow.ts` to see the current step order. Look for the array of step paths and the `positionOf` function.

- [ ] Step 2: Insert `/onboarding/marital-status` and `/onboarding/children` in the natural Identity-cluster position. Suggested order:
  1. ... existing pre-identity steps (welcome, intro, sign-up, etc.)
  2. `/onboarding/name`
  3. `/onboarding/dob` (age)
  4. `/onboarding/gender` (sex)
  5. **`/onboarding/marital-status`** ← NEW
  6. **`/onboarding/children`** ← NEW
  7. `/onboarding/country`
  8. ... rest of the flow

  Implementer audits the actual existing order and slots accordingly. The principle: marital + children belong in the early Identity cluster, NOT mid-flow surprises after the user has invested 8 steps.

- [ ] Step 3: Verify `firstMissingStepFor` (from T1) returns the right step for each missing field. Run the new T1 tests to confirm.

- [ ] Step 4: Verify gates.

### T4 — SAMPLE_PROFILES + profile view + profile edit

**Files:**
- Modify: `src/lib/profile-sample.ts`
- Modify: `src/app/profile/[uuid]/page.tsx`
- Modify: `src/components/profile-edit/section-identity.tsx`

**Steps:**

- [ ] Step 1: Update SAMPLE_PROFILES — assign values per character context:

  | Profile | maritalStatus | children | Rationale |
  |---|---|---|---|
  | Daniel (32, BB) | `never-married` | `0` | Single carpenter "looking to build" |
  | Esther (28, US) | `never-married` | `0` | Teacher, "looking for a man to lead a household" |
  | Yosef (41, JM) | `married` | `3` | "Father of three, ten years in the assembly" — has-children + additional-wife intent |
  | Adina (24, IL) | `never-married` | `0` | "Came back to Torah three years ago" — youngest, single |
  | Caleb (36, ZA) | `divorced` | `1` | "Looking for a partner who values land and quiet" — fits divorced narrative |
  | Rivka (31, GB) | `never-married` | `0` | "Two years into Torah, ready for a partner" |
  | Ezekiel (47, NG) | `married` | `5` | "Husband, father, polygyny-practicing 12 years" — has-children |
  | Tirzah (22, GH) | `never-married` | `0` | "Recently came into Torah observance" |

  Adjust if implementer's audit of the existing bio copy suggests different values. The goal: realistic spread across the 4 marital statuses, varied children counts.

- [ ] Step 2: Render on `/profile/[uuid]/page.tsx` — add two rows to the Identity cluster (around the name + country area):

  ```tsx
  {profile.maritalStatus !== undefined && (
    <Pill variant="lavender" size="sm" className="mt-2">
      {labelOf(profile.maritalStatus, MARITAL_STATUSES) ?? profile.maritalStatus}
    </Pill>
  )}
  {profile.children !== undefined && (
    <Pill variant="lavender" size="sm" className="mt-2">
      {profile.children === 1 ? "1 child" : `${profile.children} children`}
    </Pill>
  )}
  ```

  Place between the existing nationality Pill and the country/MapPin row. Use existing `labelOf` helper (already imported).

- [ ] Step 3: Update `/profile/edit` Identity section. Read `src/components/profile-edit/section-identity.tsx` to find the existing pattern. Add:

  - `SingleSelectField<MaritalStatus>` for marital status (matches the existing SingleSelectField usages in that section)
  - For children, use a plain `<Input type="number" min={0} max={20} step={1}>` with a Label — match the `TextField` or similar inline pattern in the file. If the section uses a higher-level field abstraction, consider adding a small `NumberField` helper to `profile-field.tsx` — but only if it'd be reused. For a single number input, inline is fine.

- [ ] Step 4: Verify gates. Smoke walk: visit `/profile/yosef` — should show "Married, 3 children". `/profile/daniel` → "Never Married, 0 children".

### T5 — Smoke walk + §25 closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: End-to-end smoke walk at 414×896:

  1. **Onboarding from scratch:**
     ```js
     localStorage.clear();
     sessionStorage.clear();
     location.assign("/");
     ```
     Walk through the wizard. After /onboarding/dob (or wherever gender lives), the next step should be **/onboarding/marital-status**. Tap "Never Married" → CTA enables → tap Continue. Next step: **/onboarding/children**. Type "0" → CTA enables → Continue. Subsequent steps continue as before.

  2. **Existing profile gets bumped:** restore an SP17-era eligible profile that's missing the new fields:
     ```js
     localStorage.setItem("ahavah.profile.v1", JSON.stringify({
       firstName: "TestViewer", age: 32, sex: "male", country: "BB",
       intent: "first-wife", assembly: "torah-observant", polygyny: "supports",
       verificationTags: ["government-id"], relocation: "wants-partner-willing",
       healthTags: ["non-smoker"],
       /* missing: maritalStatus, children */
     }));
     ```
     Visit /discover. Confirm: soft-completeness gate redirects to /onboarding/marital-status (the first missing step). Fill it. Then redirect to /onboarding/children. Fill it. Then back to /discover full deck.

  3. **/profile/[uuid] renders:** visit `/profile/yosef` → confirm "Married" Pill + "3 children" Pill visible in Identity cluster. Visit `/profile/daniel` → "Never Married" + "0 children".

  4. **/profile/edit lets you change:** open /profile/edit Identity section. Confirm marital status SingleSelectField + children number Input present. Toggle marital from "Never Married" to "Married", save, reload, confirm persisted.

  5. **No regression on /map or /discover** — both still gate on profile completeness as before. The new fields are mandatory; an incomplete profile is bumped to the right step.

- [ ] Step 2: Append PROJECT-STATUS §25. Each shipped fix anchored to a citable verification.

- [ ] Step 3: Full verification gates — tsc / eslint / vitest 268+ / build 48 routes (was 46; +2 for the new onboarding steps).

- [ ] Step 4: Commit docs. Merge to master via `git merge --no-ff sub-plan-18-marital-status-children`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 263 + 5 = 268 passing
- Browser smoke walk for T2-T5

Whole-sub-plan (after T5):
- Tests: ≥268 passing.
- TypeCheck clean.
- Lint clean.
- Production build clean — 48 routes.
- End-to-end smoke walk per T5 Step 1.
- PROJECT-STATUS §25 cites verification queries per §18 rule.
- `grep -n "MaritalStatus\|MARITAL_STATUSES" src/lib/profile-schema.ts` → returns the new exports.
- `grep -rn "maritalStatus\|children:" src/lib/profile-sample.ts` → returns 8 + 8 = 16 entries.
- `ls src/app/onboarding/marital-status src/app/onboarding/children` → both exist.

---

## Self-review notes

- **Spec coverage:** both fields specified by user covered. No additional fields invented (e.g. didn't add `marriage-date` or `child-ages` — out of scope).
- **Placeholder scan:** zero TBD. Every step has the exact TS / JSX.
- **Type consistency:** `MaritalStatus` union + `Profile.maritalStatus?` + `MINIMUM_COMPLETE_FIELDS` extension — same shape as existing single-select fields.
- **DRY:** `SingleSelectField` reused for marital. The children Input is bespoke (one-off) but that's appropriate for a single number-input field.
- **Scope fence:**
  - No filter UI for the new fields (user didn't ask).
  - No compatibility-scoring axis for them.
  - No backend.
- **Failure-pattern guard:**
  - frontend-design check: the two new screens follow the existing onboarding rhythm exactly (h1 with lime period, SingleSelectField or Input + helper, OnboardingShell CTA). No bespoke layouts.
  - SDD per task with two-stage review.
  - §25 closure cites verifications per §18 rule.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 5 tasks; T1 (pure logic) first per TDD discipline. Each fits a single implementer dispatch + spec review + code-quality review.

Branch: `sub-plan-18-marital-status-children`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP18)

- **Filter UI for marital status / children** — user didn't ask.
- **Compatibility scoring axes** for marital + children — would need product decision on weighting.
- **Co-parenting / blended-family detail** beyond a number — out of scope.
- **Children ages** — out of scope.
- **Existing-profile migration UI** ("Please update your profile") — the soft-completeness redirect handles this implicitly. A more user-friendly notification could come in a future polish pass.
- **Widened 12-axis audit + Legal pages + SP19+** still on the queue.

# Sub-plan 8: Navigation Map — single source of truth for routes

> **For agentic workers:** Required sub-skill — `superpowers:executing-plans` or
> `superpowers:subagent-driven-development`. Steps use `- [ ]` checkbox syntax
> for tracking.

**Goal:** Replace patchwork route knowledge scattered across 14+ files with a
single navigation-map module so wizard ordering, edit-page field→picker
mappings, and the /discover soft-completeness gate's missing-field router all
read from one place.

**Architecture:** New `src/lib/navigation.ts` (or `wizard-flow.ts`) exports a
typed `WIZARD_STEPS` array + helpers (`positionOf` / `nextOf` / `backOf` /
`firstMissingStepFor`). All onboarding screens consume the helpers instead of
hardcoding `step` / `totalSteps` / `back` / `next` per screen. `/profile/edit`'s
field components consult the same map for field→route lookups (the one
real-world use case today is the "languages" inline vs drill-out decision —
others may surface during the audit).

**Tech Stack:** Next.js 16 + React 19 + TypeScript 5. Pure-function module +
inline imports — no new dependencies.

---

## Why this exists

Three independent route catalogs today, each maintaining its own copy of the
wizard order:

1. **14 onboarding screens** — each hardcodes `step={N}` `totalSteps={14}`
   `back="/onboarding/X"` `next="/onboarding/Y"` props on `OnboardingShell`.
2. **`src/lib/profile-completeness.ts:78`** — `FIELD_TO_ROUTE` maps every
   `MINIMUM_COMPLETE_FIELDS` entry to its onboarding route so /discover's gate
   can redirect to the first missing field.
3. **/profile/edit field components** — Identity section had a "languages"
   row that drilled out to `/onboarding/languages` (Sub-plan 3 shortcut, fixed
   2026-05-11 to be inline). Other long-multi-select fields may still be
   suspect.

Symptoms this refactor prevents:

- Inserting a new wizard step requires editing 14+ files (every screen's
  `back`/`next`/`step`/`totalSteps` plus the gate's `FIELD_TO_ROUTE`).
- A typo in any one of those literal strings produces a dead route in the
  middle of the wizard.
- /profile/edit drills out to onboarding when it shouldn't (the bug user hit
  on 2026-05-11).

---

## Tasks

### Task 1: Create the wizard-flow module

**Files:**
- Create: `src/lib/wizard-flow.ts`
- Create: `tests/lib/wizard-flow.test.ts`

- [ ] **Step 1: Write failing tests for the wizard-flow API**

Create `tests/lib/wizard-flow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  positionOf,
  nextOf,
  backOf,
  firstMissingStepFor,
} from "@/lib/wizard-flow";
import type { Profile } from "@/lib/profile-schema";

describe("wizard-flow", () => {
  it("WIZARD_STEPS has 14 entries in the canonical order", () => {
    expect(WIZARD_STEPS).toHaveLength(14);
    expect(WIZARD_STEPS[0].href).toBe("/onboarding/verify-email");
    expect(WIZARD_STEPS[13].href).toBe("/onboarding/verification");
  });

  it("positionOf returns 1-indexed step + total for an existing href", () => {
    const pos = positionOf("/onboarding/name");
    expect(pos.step).toBe(3);
    expect(pos.totalSteps).toBe(14);
  });

  it("positionOf returns step=0 for an unknown href (does not throw)", () => {
    const pos = positionOf("/onboarding/nonexistent");
    expect(pos.step).toBe(0);
    expect(pos.totalSteps).toBe(14);
  });

  it("nextOf returns the next step's href, or null at the end", () => {
    expect(nextOf("/onboarding/name")).toBe("/onboarding/dob");
    expect(nextOf("/onboarding/verification")).toBeNull();
  });

  it("backOf returns the previous step's href, or null at the start", () => {
    expect(backOf("/onboarding/dob")).toBe("/onboarding/name");
    expect(backOf("/onboarding/verify-email")).toBeNull();
  });

  it("firstMissingStepFor walks the required-field map", () => {
    const empty: Profile = {};
    expect(firstMissingStepFor(empty)).toBe("/onboarding/name");

    const filled: Profile = {
      firstName: "Test",
      age: 30,
      sex: "male",
      country: "BB",
      intent: "first-wife",
      assembly: "torah-observant",
      relocation: "local-only",
      verificationTags: ["government-id"],
    };
    expect(firstMissingStepFor(filled)).toBeNull();
  });

  it("firstMissingStepFor honours the WIZARD_STEPS order, not the schema array order", () => {
    // verificationTags is the LAST required field in wizard order; any
    // earlier missing field wins.
    const partial: Profile = {
      firstName: "Test",
      verificationTags: ["government-id"],
      // age, sex, country, intent, assembly, relocation all missing
    };
    expect(firstMissingStepFor(partial)).toBe("/onboarding/dob"); // age step
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/lib/wizard-flow.test.ts`
Expected: FAIL — `Cannot find module '@/lib/wizard-flow'`.

- [ ] **Step 3: Implement the module**

Create `src/lib/wizard-flow.ts`:

```ts
import type { Profile } from "@/lib/profile-schema";

/**
 * Canonical wizard step order. Adding/removing a step here cascades to
 * every consumer:
 *   - OnboardingShell reads positionOf(currentHref).{step, totalSteps,
 *     back, next} for its chrome
 *   - /discover gate calls firstMissingStepFor(profile) for redirects
 *   - Future edit-page field components can look up the wizard step
 *     associated with a field via FIELD_TO_STEP
 *
 * `requiredField` (when set) is the Profile key whose absence routes the
 * /discover gate here. Steps without a requiredField are wizard-only.
 */
export type WizardStep = {
  href: string;
  label: string;
  requiredField?: keyof Profile;
};

export const WIZARD_STEPS: ReadonlyArray<WizardStep> = [
  { href: "/onboarding/verify-email",   label: "Verify email" },
  { href: "/onboarding/verify-phone",   label: "Verify phone" },
  { href: "/onboarding/name",           label: "Name",           requiredField: "firstName" },
  { href: "/onboarding/dob",            label: "Date of birth",  requiredField: "age" },
  { href: "/onboarding/gender",         label: "Gender",         requiredField: "sex" },
  { href: "/onboarding/looking-for",    label: "Looking for",    requiredField: "intent" },
  { href: "/onboarding/photos",         label: "Photos" },
  { href: "/onboarding/country",        label: "Country",        requiredField: "country" },
  { href: "/onboarding/languages",      label: "Languages" },
  { href: "/onboarding/bio",            label: "Bio" },
  { href: "/onboarding/polygyny",       label: "Polygyny" },
  { href: "/onboarding/assembly",       label: "Assembly",       requiredField: "assembly" },
  { href: "/onboarding/relocation",     label: "Relocation",     requiredField: "relocation" },
  { href: "/onboarding/verification",   label: "Verification",   requiredField: "verificationTags" },
];

const TOTAL = WIZARD_STEPS.length;

const indexOf = (href: string): number =>
  WIZARD_STEPS.findIndex((s) => s.href === href);

export type WizardPosition = {
  /** 1-indexed step number (1..totalSteps), or 0 if href is not in the wizard. */
  step: number;
  totalSteps: number;
  back: string | null;
  next: string | null;
};

export function positionOf(href: string): WizardPosition {
  const i = indexOf(href);
  if (i < 0) {
    return { step: 0, totalSteps: TOTAL, back: null, next: null };
  }
  return {
    step: i + 1,
    totalSteps: TOTAL,
    back: i > 0 ? WIZARD_STEPS[i - 1].href : null,
    next: i < TOTAL - 1 ? WIZARD_STEPS[i + 1].href : null,
  };
}

export function nextOf(href: string): string | null {
  return positionOf(href).next;
}

export function backOf(href: string): string | null {
  return positionOf(href).back;
}

/**
 * Field → wizard route lookup. Derived from the requiredField annotations
 * on WIZARD_STEPS so adding a new required field to the wizard
 * automatically wires up the gate redirect.
 */
const FIELD_TO_HREF: ReadonlyMap<keyof Profile, string> = new Map(
  WIZARD_STEPS.flatMap((s) =>
    s.requiredField ? [[s.requiredField, s.href] as const] : [],
  ),
);

const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

/**
 * Walks WIZARD_STEPS in canonical order and returns the href of the
 * first step whose requiredField is empty on the profile. Returns null
 * when every required field is filled.
 */
export function firstMissingStepFor(profile: Profile): string | null {
  for (const step of WIZARD_STEPS) {
    if (!step.requiredField) continue;
    if (!isFilled(profile[step.requiredField])) {
      return step.href;
    }
  }
  return null;
}

/** Public field→route map (read-only). Useful for /profile/edit components
 *  that may want to drill into the wizard equivalent of a field. */
export function routeForField(field: keyof Profile): string | null {
  return FIELD_TO_HREF.get(field) ?? null;
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `pnpm exec vitest run tests/lib/wizard-flow.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```
feat(navigation): central wizard-flow module + firstMissingStepFor

src/lib/wizard-flow.ts replaces the scattered route knowledge with a
single 14-step array. WizardStep entries carry an optional
requiredField annotation; positionOf / nextOf / backOf / routeForField /
firstMissingStepFor all derive from that array. Adding a wizard step
now means editing one constant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

### Task 2: Migrate the 14 onboarding screens to use `positionOf`

**Files (one edit per file):**
- Modify: `src/app/onboarding/verify-email/page.tsx`
- Modify: `src/app/onboarding/verify-phone/page.tsx`
- Modify: `src/app/onboarding/name/page.tsx`
- Modify: `src/app/onboarding/dob/page.tsx`
- Modify: `src/app/onboarding/gender/page.tsx`
- Modify: `src/app/onboarding/looking-for/page.tsx`
- Modify: `src/app/onboarding/photos/page.tsx`
- Modify: `src/app/onboarding/country/page.tsx`
- Modify: `src/app/onboarding/languages/page.tsx`
- Modify: `src/app/onboarding/bio/page.tsx`
- Modify: `src/app/onboarding/polygyny/page.tsx`
- Modify: `src/app/onboarding/assembly/page.tsx`
- Modify: `src/app/onboarding/relocation/page.tsx`
- Modify: `src/app/onboarding/verification/page.tsx`

- [ ] **Step 1: For each file, replace hardcoded chrome props with positionOf**

Pattern to apply per file (example from `name/page.tsx`):

Before:
```tsx
<OnboardingShell
  step={3}
  totalSteps={14}
  back="/onboarding/verify-phone"
  next="/onboarding/dob"
  ctaDisabled={!isValid}
>
```

After:
```tsx
import { positionOf } from "@/lib/wizard-flow";
...
const { step, totalSteps, back, next } = positionOf("/onboarding/name");
...
<OnboardingShell
  step={step}
  totalSteps={totalSteps}
  back={back ?? undefined}
  next={next ?? "/onboarding/complete"}
  ctaDisabled={!isValid}
>
```

Notes:
- Pass `back={back ?? undefined}` — OnboardingShell's `back?: string` already
  handles missing.
- `next` is required by OnboardingShell, so fall back to `/onboarding/complete`
  for the last step (`/onboarding/verification`).
- Keep route-specific overrides (`bio` already overrides `next` to
  `/onboarding/polygyny`, but with the central map that override goes away
  because /bio's natural successor IS /polygyny per WIZARD_STEPS).
- For `/onboarding/looking-for` and any screen with redirect-back-on-missing-
  upstream-field (e.g. gender check), keep the redirect logic — it's unrelated
  to the chrome map.

- [ ] **Step 2: Per file — verify build cleanly after each edit**

After each file edit, run:
```
pnpm exec eslint src/app/onboarding/<screen>/page.tsx --max-warnings=0
```

- [ ] **Step 3: Run full suite after all 14**

```
cd d:/Antigravity/ahavah-web && pnpm exec eslint src/app/onboarding --max-warnings=0
cd d:/Antigravity/ahavah-web && NODE_OPTIONS="--max-old-space-size=12288" npx tsc --noEmit --incremental false
cd d:/Antigravity/ahavah-web && pnpm exec vitest run
```

All clean.

- [ ] **Step 4: Commit (one commit for all 14)**

```
refactor(onboarding): derive wizard chrome from wizard-flow

Every onboarding screen used to hardcode step/totalSteps/back/next.
Now they import positionOf("/onboarding/<self>") and spread the
result onto OnboardingShell. Adding a wizard step is a one-line edit
to WIZARD_STEPS in src/lib/wizard-flow.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

### Task 3: Replace `profile-completeness.ts`'s field-to-route map

**Files:**
- Modify: `src/lib/profile-completeness.ts` — re-export `firstMissingStepFor`
  from wizard-flow instead of maintaining a parallel `FIELD_TO_ROUTE` map.
- Modify: `src/app/discover/page.tsx` — adjust import path if needed.

- [ ] **Step 1: Delete `FIELD_TO_ROUTE` + the local `firstMissingStepFor` from
  `profile-completeness.ts`.**

  Re-export the wizard-flow version for backward compatibility:
  ```ts
  export { firstMissingStepFor } from "@/lib/wizard-flow";
  ```
  Or update `/discover/page.tsx` to import directly from `wizard-flow`.

- [ ] **Step 2: Verify tests + build**

```
pnpm exec vitest run
NODE_OPTIONS="--max-old-space-size=12288" npx tsc --noEmit --incremental false
```

Existing profile-completeness tests for `firstMissingStepFor` should still pass
(behavior is the same; just sourced from wizard-flow now).

- [ ] **Step 3: Commit**

```
refactor(discover): firstMissingStepFor derives from wizard-flow

Was a parallel FIELD_TO_ROUTE map in profile-completeness.ts that
duplicated knowledge of which wizard step corresponds to which required
field. Now sourced from wizard-flow's WIZARD_STEPS.requiredField
annotations. Adding a new required field to the wizard automatically
wires up the gate redirect.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

### Task 4: Audit /profile/edit for remaining drill-outs

**Files to read:**
- `src/components/profile-edit/section-identity.tsx`
- `src/components/profile-edit/section-faith.tsx`
- `src/components/profile-edit/section-doctrine.tsx`
- `src/components/profile-edit/section-lifestyle.tsx`
- `src/components/profile-edit/section-interests.tsx`
- `src/components/profile-edit/section-practical.tsx`
- `src/components/profile-edit/section-verification.tsx`

- [ ] **Step 1: Grep for any remaining `Link href="/onboarding"` usage:**

```bash
grep -r 'href="/onboarding' src/components/profile-edit/
```

Each result is a candidate drill-out that should either:
- Be inlined as a proper edit field (preferred), OR
- Be explicitly documented as a deferred drill-out (e.g. languages' primary-
  star UX stays at /onboarding/languages).

- [ ] **Step 2: Identify + document each finding**

For each remaining drill-out, decide:
- **Inline it now** — extract the field's edit UI from the corresponding
  onboarding screen into a reusable component, wire to useProfile.
- **Deferral note** — add an inline comment explaining why the drill-out is
  intentional (e.g. "primary-language star UX is complex; full edit at
  /onboarding/languages; this row is a quick add").

Known suspects from the 2026-05-11 audit:
- **`country` on Identity section** is a 2-letter text input with a helper
  pointing to /onboarding/country. Should become a SelectField (dropdown of
  POPULAR_COUNTRIES + "Other" linking to the full picker) OR a Sheet-style
  combobox like the onboarding screen.

- [ ] **Step 3: Apply the inline-edit fixes**

For each "inline it now" candidate, implement the inline edit. For each
"defer" candidate, add the explanatory comment.

- [ ] **Step 4: Commit per fix, then a wrap-up**

```
refactor(profile-edit): inline country picker; drop /onboarding drill-outs

(or per-fix commit messages)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

### Task 5: Browser smoke test

- [ ] Start the dev server, walk the wizard end-to-end, verify each screen's
  step indicator, back arrow, and Continue link match WIZARD_STEPS.

- [ ] Clear localStorage, visit `/discover`, confirm the gate redirects to
  `/onboarding/name` (first required step).

- [ ] Seed a partial profile (e.g. firstName only), visit `/discover`,
  confirm the redirect lands on `/onboarding/dob` (next required step).

- [ ] On `/profile/edit`, confirm no link drills out to `/onboarding/*` unless
  explicitly documented as deferred.

---

## Verification

After all 5 tasks:

- `pnpm lint --max-warnings=0` clean.
- `pnpm exec vitest run` — all tests pass, including the 7 new wizard-flow
  tests and the existing profile-completeness tests.
- `pnpm build` — 43+ pages prerender without errors.
- Browser smoke per Task 5.

---

## Per-screen UI audit gate (MANDATORY for any UI task in this plan or beyond)

This gate is the discipline I keep failing without it. Every UI task — whether
in this sub-plan or any future plan — must clear ALL of these before its
commit can land. Lint + tsc + build green is not enough.

For each new or modified screen / component:

1. **Kit-primitive chrome audit.** Before placing anything near a kit
   primitive's edge (sheet, dialog, popover, drawer), READ the primitive
   source and note any chrome the kit auto-renders (close X, drag handle,
   backdrop, etc.). New chrome MUST coexist without visual collision.
   Failure mode this catches: `Reset all` colliding with `SheetContent`'s
   auto-close X (2026-05-11).

2. **Browser smoke at 414×896.** Walk the actual interaction in the browser
   at the mobile baseline viewport. Verify:
   - **Empty state** — what does the screen look like with no profile data?
   - **Hover / focus / active state** — for every interactive element. No
     vertical seams, no asymmetric hover bands, no leaked button-variant
     backgrounds.
   - **Selected state** — for every controllable input. Selection signal
     must be unambiguous WITHOUT a redundant ring on top of an already-
     coloured pill (2026-05-11 lime-on-lime ring issue).
   - **Scroll behaviour** — long lists should scroll WITHIN the screen, not
     push CTAs below the fold (2026-05-11 country-page CTA at y=13721).

3. **Long-list rule.** Any single- or multi-select with ≥8 options must
   use the combobox pattern (input + filtered dropdown), not a static
   pill grid. Standard practice. Failure mode this catches: 14-pill
   language list + free-text adder (2026-05-11).

4. **Drill-out rule.** /profile/edit and other edit surfaces must NEVER
   bounce the user back to /onboarding/* to edit a single field. Inline
   the edit using kit primitives. If the inline edit is genuinely too
   complex, add an explanatory comment naming WHY the drill-out stays
   (e.g. primary-language star UX). Default is inline.

5. **kit-only composition (failure pattern #2).** No raw `<button>` with
   a kit's variants reimplemented in className. No one-off className
   overrides that replicate cva variant values — extend the variant or
   use the existing variant. The 2026-05-11 SelectField `className="h-tap
   w-full rounded-xl border-white/10 bg-bg-elevated..."` was a direct
   violation; the fix was adding `size="lg" tone="elevated"` variants
   to SelectTrigger.

6. **Animation captures live state.** Any `AnimatePresence` exit
   animation that depends on dynamic state must use the `custom` prop
   pattern, not closure over the state value. Failure mode this catches:
   reject-after-likes playing the like exit (2026-05-11).

7. **Tap targets symmetric + invisible.** Photo-nav / card-nav tap zones
   must be 50/50 (not 1/3+2/3) and rendered as plain `<button>` with NO
   variant — kit Button variants add hover/active backgrounds that
   produce visible seams (2026-05-11 discover card).

If any of these fails, the commit is not ready. Fixing the lint/tsc/build
without checking these is the recurring failure pattern.

---

## Self-review notes

- **Single source of truth**: `WIZARD_STEPS` in one file. Adding a step is one
  edit. Renaming a route updates everywhere because every consumer reads from
  the same array.
- **Type safety**: `requiredField: keyof Profile` ensures only real schema
  fields can annotate a step. A typo gets caught by tsc.
- **Backward compatibility**: `firstMissingStepFor` keeps the same signature
  so existing callers don't change. The migration is structural, not API-
  breaking.
- **Out of scope** (deferred to Sub-plan 9 if needed):
  - The 7 required *VerificationTag* values vs the single "at least one"
    rule — the gate currently treats `verificationTags` as required-non-empty;
    fine as-is.
  - The wizard's first 2 steps (verify-email / verify-phone) are stubs with
    no `requiredField` — they're not in the soft-completeness gate. If we ever
    want them to gate /discover, they'd need a backend-side verified-flag.

## Plan complete

Save to `docs/superpowers/plans/2026-05-11-sub-plan-08-navigation-map.md`.

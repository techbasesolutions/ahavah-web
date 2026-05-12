# Sub-plan 22 — NumberStepper primitive (closes SP20 L1)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`.

**Goal:** Replace the flat `<Input type="number">` on `/onboarding/children` with a distinctive `<NumberStepper>` primitive that matches the SP19/SP21 sticker-and-paper aesthetic. Polaroid-style readout card (border-white-3, shadow-2xl, tabular-nums h1) between two circle tap buttons (44px each). Closes SP20 §27 Group A L1.

**Architecture:** New `<NumberStepper>` primitive composed from existing kit (`Button` size="circle", cva for readout tone). AnimatePresence key-crossfade on value change (8px slide + fade, 200ms). Keyboard support via Arrow keys. Controlled component (value + onChange).

**Tech Stack:** Existing React 19 + motion/react + cva + Tailwind tokens. No new deps. Tests via vitest.

---

## Context

User direction: "proceed as recommended." My recommendation was to fix small wins first — NaN% compat guard (shipped at `14e5693`) then NumberStepper.

SP20 §27 Group A L1 captured the finding:

> /onboarding/children axis 1 (Aesthetic POV) + axis 4 (Spatial composition) — a single numeric input is a flat shadcn-feeling treatment. For a count-style field, a stepper (-/+ buttons with tabular display) would be more Dateasy/distinctive. Currently looks like a generic form field. **Logged for SP21 or later.** Out of T3's ≤5-line fix budget.

SP22 ships the stepper. Frontend-design skill invoked BEFORE drafting (lesson reinforced through SP19 + SP21). Design direction encoded directly into this spec.

---

## Scope decisions locked

- **Reusable primitive at `src/components/ui/number-stepper.tsx`** — kit-level so future count fields (years-since-faith-decision, language-fluency-rating, etc.) can reuse.
- **Aesthetic: sticker-and-paper polaroid** continuing SP19 + SP21 family. 80×96 readout card with border-[3px] border-white + shadow-2xl. Number sits inside.
- **Color tokens:**
  - Readout text — `text-lime` when value > 0, `text-text-secondary` when value === 0
  - Minus button — `tone="elevated"` (dark fill) with `text-lavender` icon
  - Plus button — `tone="brand"` (lavender fill) with `text-black` icon (matches existing Pass/Like circle button conventions)
- **44px tap targets** via `Button size="circle"` (44×44 minimum from existing kit cva).
- **Motion:** number change uses AnimatePresence key-crossfade — old number fades + slides up 8px, new number fades in from 8px below. 200ms ease-out. Skipped under `useReducedMotion` (instant swap).
- **Tactile feedback:** `active:scale-95 transition-transform` on each button.
- **Range:** props-driven, default min=0 max=20 step=1.
- **Keyboard:** Arrow-Left/Down → decrement, Arrow-Right/Up → increment. Group wrapper has `role="group"` + aria-label.
- **a11y:** readout has `aria-live="polite" aria-atomic="true"` for SR announcements on change. Each button has aria-label "Decrease" / "Increase".
- **Disabled states:** buttons get `disabled` prop at min/max; visual is the kit's standard disabled treatment (opacity 0.4 from cva).
- **Controlled only:** parent owns the value. No internal uncontrolled mode.

---

## File structure

| File | Role |
|---|---|
| `src/components/ui/number-stepper.tsx` | CREATE. Primitive component. ~100 lines. |
| `tests/components/ui/number-stepper.test.tsx` | CREATE. ~5 vitest cases — clamping, keyboard, value/disabled props. (jsdom + React Testing Library — verify the existing test infrastructure supports component tests; if not, write pure-helper tests for the clamping math.) |
| `src/app/onboarding/children/page.tsx` | MODIFY. Replace the `<Input type="number">` block with `<NumberStepper>`. Remove the local `raw` string state (no longer needed — NumberStepper is controlled by `profile.children`). |
| `PROJECT-STATUS.md` | MODIFY. Append §29 closeout. Strike SP20 L1 in §27 — `~~L1~~ — FIXED in SP22 (commit XXX)`. |

No new dependencies. No new design tokens.

---

## Existing primitives reused

- `Button` from `@/components/ui/button` — circle size + elevated/brand tones (existing cva).
- `Minus`, `Plus` from `lucide-react`.
- `motion`, `AnimatePresence`, `useReducedMotion` from `motion/react`.
- `cva` from `class-variance-authority`.
- `cn` from `@/lib/utils`.

---

## Hard rules

1. **Kit-only via cva.** Readout uses a small cva for muted-vs-active tone. Buttons use existing Button cva variants — no inline overrides that break the kit.
2. **GPU-only motion.** Number crossfade: opacity + y only. No layout-thrashing animations.
3. **prefers-reduced-motion respected.** AnimatePresence transitions instant under reduce-motion (motion library handles natively when `initial={false}`).
4. **44px tap target on each button.** Kit's circle size enforces this.
5. **No new dependencies.** All primitives + motion + cva already in the project.
6. **§18 sign-off rule.** §29 closeout cites verification queries.
7. **Controlled-only.** Parent passes `value` + `onChange`. Component does not maintain internal state for the value itself.
8. **Clamping.** Decrement/increment clamp to [min, max]. Out-of-range external value props are accepted as-is (parent's responsibility to clamp before passing) — but the buttons disable correctly at the boundary.

---

## Tasks

### T1 — NumberStepper primitive + tests

**Files:**
- Create: `src/components/ui/number-stepper.tsx`
- Create: `tests/components/ui/number-stepper.test.tsx`

**Steps:**

- [ ] Step 1: Implement the primitive. Use this code verbatim (frontend-design output baked into the spec):

```tsx
"use client";

import { type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cva } from "class-variance-authority";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const readoutVariants = cva(
  "flex h-24 w-20 items-center justify-center rounded-2xl border-[3px] border-white bg-bg-elevated shadow-2xl overflow-hidden",
  {
    variants: {
      tone: {
        muted: "text-text-secondary",
        active: "text-lime",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface NumberStepperProps {
  /** Current value (controlled). */
  value: number;
  /** Called with the clamped next value when the user increments or decrements. */
  onChange: (next: number) => void;
  /** Lower bound (inclusive). Default 0. */
  min?: number;
  /** Upper bound (inclusive). Default 20. */
  max?: number;
  /** Increment/decrement amount. Default 1. */
  step?: number;
  /** aria-label for the group container; describes what's being counted. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Polaroid-style number picker: minus button + readout card + plus button.
 *
 * Aesthetic continues the SP19 /match + SP21 photo-slot sticker-and-paper
 * family — the readout is a paper-framed polaroid with tabular-nums big
 * type that crossfades on change. Buttons are kit-standard 44px circles
 * with active:scale-95 tactile feedback.
 *
 * Controlled component. Parent owns the value via useState / useProfile /
 * etc. and clamps externally-set values; the internal buttons clamp to
 * [min, max] before firing onChange.
 *
 * Keyboard: ArrowLeft / ArrowDown = decrement, ArrowRight / ArrowUp =
 * increment. The number readout has aria-live="polite" so SR users hear
 * each change.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  step = 1,
  ariaLabel = "Number",
  className,
}: NumberStepperProps) {
  const reduceMotion = useReducedMotion();
  const canDecrement = value > min;
  const canIncrement = value < max;

  const decrement = () => {
    if (canDecrement) onChange(Math.max(min, value - step));
  };
  const increment = () => {
    if (canIncrement) onChange(Math.min(max, value + step));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("flex items-center justify-center gap-4", className)}
    >
      <Button
        size="circle"
        tone="elevated"
        aria-label="Decrease"
        disabled={!canDecrement}
        onClick={decrement}
        className="transition-transform active:scale-95"
      >
        <Minus className="size-5 text-lavender" />
      </Button>

      <div className={readoutVariants({ tone: value > 0 ? "active" : "muted" })}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "text-h1 tabular-nums",
              value > 0 ? "font-bold" : "font-medium",
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <Button
        size="circle"
        tone="brand"
        aria-label="Increase"
        disabled={!canIncrement}
        onClick={increment}
        className="transition-transform active:scale-95"
      >
        <Plus className="size-5 text-black" />
      </Button>
    </div>
  );
}
```

- [ ] Step 2: Tests. Prefer @testing-library/react if it's already in the project (grep for it). If absent, write pure-logic helper tests on extracted clamping math — but the cleaner approach is RTL component tests. Check first via:
  ```
  grep -l "@testing-library/react" package.json tests/
  ```
  If RTL exists, write 5 cases:
  1. Renders the current value
  2. Click Plus → onChange called with value+step
  3. Click Plus at max → button disabled, onChange NOT called
  4. Click Minus at min → button disabled, onChange NOT called
  5. ArrowUp keypress on group → onChange called with value+step

  If RTL doesn't exist, fall back to pure-logic tests on extracted clamping helpers (export `clampStep(current, delta, min, max): number` and test that). Either path is acceptable.

- [ ] Step 3: Verify gates — tsc / eslint / vitest (292 + N new = ~297) / build.

### T2 — Wire `/onboarding/children` + smoke walk + §29 + merge

**Files:**
- Modify: `src/app/onboarding/children/page.tsx`
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: Replace the children page's Input block with NumberStepper:

  ```tsx
  "use client";

  import { motion } from "motion/react";

  import { OnboardingShell } from "@/components/app/onboarding-shell";
  import { Label } from "@/components/ui/label";
  import { NumberStepper } from "@/components/ui/number-stepper";
  import { useProfile } from "@/lib/use-profile";

  const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  const MIN_CHILDREN = 0;
  const MAX_CHILDREN = 20;

  export default function ChildrenStep() {
    const { profile, update } = useProfile();

    // Current value resolves from profile (defaults to undefined initially).
    // We treat undefined as "not yet answered" — CTA disabled until the user
    // interacts with the stepper at least once. Once they tap a button, the
    // value commits to profile.children (0 is a valid + complete answer).
    const value = profile.children;
    const isComplete = value !== undefined;

    const handleChange = (next: number) => {
      update({ children: next });
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
            Tap zero if you have no children.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <Label className="sr-only" htmlFor="children-stepper-readout">
            Number of children
          </Label>
          <NumberStepper
            value={value ?? 0}
            onChange={handleChange}
            min={MIN_CHILDREN}
            max={MAX_CHILDREN}
            step={1}
            ariaLabel="Number of children"
          />
          <p className="text-caption text-text-muted">
            From 0 to {MAX_CHILDREN}.
          </p>
        </motion.div>
      </OnboardingShell>
    );
  }
  ```

  Key behavior changes:
  - `isComplete` now gates on `value !== undefined` (any tap commits a value, including 0). This matches the original "0 is a valid + complete answer" semantic from SP18 T1's ZERO_ALLOWED_FIELDS fix.
  - The stepper displays `value ?? 0` so the readout shows "0" before any interaction — visually it reads as "zero is the default but you must tap to confirm."
  - Drop the `aria-invalid` + `aria-describedby` patches from SP20 T3 (those targeted the old Input element; the stepper has its own a11y wiring).
  - Drop the `raw` string state (no longer typing).

- [ ] Step 2: Browser smoke walk at 414×896:

  1. Clear storage, navigate via wizard to `/onboarding/children`. Confirm:
     - Polaroid readout shows "0" in muted text-text-secondary
     - Minus button is disabled (lower opacity per kit)
     - Plus button is enabled (lavender fill)
     - CTA "Continue" is DISABLED (value === undefined)

  2. Tap Plus once. Confirm:
     - Readout shows "1" in lime + bold
     - Number crossfade animation visible (number fades + slides)
     - localStorage.children === 1
     - CTA enables

  3. Tap Plus 19 more times. At 20, confirm Plus disables.

  4. Tap Minus. Decrements. Keep tapping → returns to 0, which now reads as lime (because value committed → still > 0 path, wait, 0 is muted). Verify: at 0 the readout is muted again, Minus button disables, but CTA stays enabled (value committed).

  5. Keyboard test: focus the group, press ArrowUp/ArrowDown — confirm value changes.

  6. Reload — value persists.

  7. Reduce-motion test: emulate prefers-reduced-motion in DevTools. Confirm crossfade animation is instant (number swaps without slide).

  Screenshot: `docs/screenshots/sub-plan-22-stepper-polaroid.png` showing the stepper at value=3 (lime + bold).

- [ ] Step 3: Append PROJECT-STATUS §29:

  ```
  ## 29. 2026-05-12 Sub-plan 22 closure — NumberStepper primitive (closes SP20 L1)
  ```

  Structure:
  - Opening (3-4 sentences): user direction, design rationale (frontend-design skill invoked upfront), what shipped.
  - Per-task commit table.
  - Citable verifications (grep for NumberStepper + new test count + smoke walk steps).
  - Cross-reference SP20 §27 L1 — strike `L1` with `~~L1~~ — FIXED in SP22 (commit XXX)`.
  - Outstanding carry-forwards: SP20 L2 (verification tier cards), L3 (axis-9 contrast sweep), L4 (motion-budget rubric).

  Target 60-90 lines.

- [ ] Step 4: Full verification gates — tsc / eslint / vitest / build (48 routes — no new routes).

- [ ] Step 5: Commit + merge `git merge --no-ff sub-plan-22-number-stepper`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean
- `npx vitest run` — 292 + new tests passing
- Browser smoke walk for T2

Whole-sub-plan:
- Tests ≥296 passing (292 + ~4-5 NumberStepper cases)
- Build clean — 48 routes
- §29 cites verification queries per §18 rule
- `grep -n "NumberStepper" src/components/ui/number-stepper.tsx src/app/onboarding/children/page.tsx` → returns the export + the consumer
- Smoke walk passes (especially the "0 is valid + complete" assertion that SP18 T1 introduced — must not regress)

---

## Self-review notes

- **Spec coverage:** SP20 L1 closed. New primitive available for future count fields.
- **Placeholder scan:** zero TBD. Exact TS code in the spec.
- **Type consistency:** NumberStepperProps signature matches controlled-component pattern (value + onChange).
- **DRY:** Reuses existing Button (kit cva), Minus/Plus icons, motion/react. No new design tokens.
- **Scope fence:**
  - No new dependencies.
  - No long-press / repeat-on-hold.
  - No "input by typing" fallback (stepper-only).
  - No /profile/edit wiring (children isn't in /profile/edit yet — that's a future task if needed).
- **Failure-pattern guard:**
  - frontend-design skill invoked upfront (lesson from SP15 T4).
  - Design direction baked into spec — implementer has no placement discretion.
  - SDD per task with two-stage review.

---

## Execution

2 tasks. T1 is the primitive + tests. T2 is the consumer + closeout + merge. Each fits a single implementer dispatch.

Branch: `sub-plan-22-number-stepper`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP22)

- /profile/edit children field wiring (children currently isn't on /profile/edit — would be a future identity-section addition if product wants it editable post-onboarding).
- Long-press / repeat-on-hold to dial fast (typical stepper enhancement; out of MVP).
- Input-by-typing fallback for stepper readout (could be a "double-tap to edit" affordance — future polish).
- Other carry-forwards from SP20 (L2 tier cards, L3 contrast sweep, L4 motion budget) remain queued for SP23+.

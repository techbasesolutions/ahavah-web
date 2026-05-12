# Sub-plan 20 — Onboarding flow QA (16 wizard steps + welcome carousel)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-audit every onboarding surface against the 12-axis rubric (§7 + §15 + §20 precedent). The wizard grew from 14 → 16 steps in SP18; SP15's IA cleanup also rewired some destinations and dropped placeholder rows. Many onboarding screens haven't been audited since the original Phase 6 sweep at §15. Surface findings, fix the small ones inline, log large ones as carry-forward.

**Architecture:** Three parallel audit agents each cover ~6 routes against R1–R12. A consolidation pass writes §27. A fix-up pass applies small inline corrections. Closeout merges to master.

**Tech Stack:** Read-only audit followed by surgical fixes. No new deps. Existing tests preserved.

---

## Context

SP15 reshaped settings IA. SP18 added 2 mandatory onboarding fields (marital-status, children). SP19 invoked frontend-design + design-system rules upfront. SP20 closes the loop by checking that every onboarding step still meets the rubric — especially since the SP15 fix-ups touched some onboarding links (e.g. `/onboarding/looking-for` had stale "Discovery preferences" copy that was already cleaned up in `35ca044`).

User direction from SP18 close: "there are 14+ onboarding steps that haven't been re-audited since SP15's IA changes touched the linked surfaces."

User direction from SP19 close: skill-invocation discipline (multiple skills before drafting) was reinforced. SP20 applies the same discipline: `accessibility`, `mobile-responsive`, `ui-design-system` already loaded as session-content skills are applied during audit; the auditor agents are given the 12-axis rubric verbatim so verdicts are anchored to citable verifications, not freestyling.

---

## The 12-axis rubric (used by §15 and §20)

For each (route, axis) cell: PASS / NEEDS WORK / FAIL / WAIVED / UNVERIFIED. Every verdict cites a re-runnable verification (grep / file:line / Playwright snapshot / smoke step).

| # | Axis | What PASS requires |
|---|---|---|
| 1 | Aesthetic POV | Distinctive Dateasy-aligned visual (lime period accents, lavender pills, dark-only chrome) — not generic shadcn |
| 2 | Brand presence | BrandMark or equivalent identity anchor visible OR justified absence |
| 3 | Color hierarchy | Primary action visually dominant, supporting actions de-emphasized, semantic tokens used |
| 4 | Spatial composition | Asymmetric/intentional layout; respects PageShell + 8px grid; not centered-blob without reason |
| 5 | Motion | (a) Interaction feedback ≤300ms (button taps, hovers, state changes). (b) Staggered entrance reveals ≤500ms total (cascaded item fade-ups). reduce-motion respected; GPU-only transforms. See `docs/motion-budget.md` for the cookbook + `scripts/audit-motion.mjs` for measurement. |
| 6 | Typography | text-display/h1/h2/h3/body/meta/caption/overline tokens used; tabular-nums on numerics; 16px min body to prevent iOS auto-zoom |
| 7 | Touch targets | All interactive elements ≥44px; tap zones explicit |
| 8 | R5 four-state | happy / loading / empty / error present OR WAIVED with reason |
| 9 | R10 contrast | WCAG AA 4.5:1 for text, 3:1 for UI boundaries |
| 10 | R11 aria | h1 anchor per page; aria-label on icon-only buttons; aria-live on dynamic regions; aria-describedby on helper text |
| 11 | Heading hierarchy | h1 once, h2+ ordered, no skips |
| 12 | Kit-only | Components composed via cva variants; no inline className overrides that break the kit |

---

## Routes to audit (17 surfaces, 3 groups for parallel dispatch)

### Group A — Identity cluster (6 routes)
- `/onboarding` (welcome carousel — the index page)
- `/onboarding/name`
- `/onboarding/dob`
- `/onboarding/gender`
- `/onboarding/marital-status` (NEW in SP18)
- `/onboarding/children` (NEW in SP18)

### Group B — Discovery + faith cluster (6 routes)
- `/onboarding/country`
- `/onboarding/languages`
- `/onboarding/looking-for`
- `/onboarding/polygyny`
- `/onboarding/assembly`
- `/onboarding/relocation`

### Group C — Media + verification + completion (5 routes)
- `/onboarding/bio`
- `/onboarding/photos`
- `/onboarding/verify-email`
- `/onboarding/verify-phone`
- `/onboarding/verification`
- `/onboarding/complete`

Total: 17 surfaces × 12 axes = 204 cells.

---

## Hard rules

1. **Audits are read-only.** Each agent reads source, runs Playwright smoke walks at 414×896, but DOES NOT modify any source.
2. **Anchor every verdict.** No "PASS" verdict without a citable verification (file:line OR Playwright snapshot result OR specific computed-style measurement).
3. **UNVERIFIED is acceptable.** Honesty over false PASS. If an axis can't be cheaply verified (e.g. R3 splash budget), mark UNVERIFIED with one-sentence justification.
4. **Don't rubber-stamp axis 1 + axis 4** (the soft "aesthetic" axes). Name a specific visual element supporting the verdict (e.g. "lime period on h1 at line 50", "asymmetric back-arrow + brandmark + skip-link pattern at lines 14-28").
5. **Fix-up scope: small only.** Inline fixes during T3 must be ≤5 lines per file. Larger findings (full screen redesigns, new primitive variants) get logged for follow-up sub-plans — NOT fixed inline.
6. **No new tests.** Audit doesn't write tests; surgical fixes don't either.
7. **§18 sign-off rule.** §27 closeout cites verifications per §18.
8. **Frontend-design skill not invoked for fixes.** Why: fixes are surgical (axis-3 contrast bumps, missing aria-labels, etc.) — not new design decisions. If a finding requires a design decision (e.g. "the welcome carousel needs a new aesthetic direction"), log it for a future sub-plan with frontend-design properly invoked.

---

## Tasks

### T1 — Parallel audit dispatch (3 agents)

**Files:**
- No source modifications.
- Each agent produces a Markdown audit report; controller aggregates.

**Steps:**

- [ ] Step 1: Dispatch 3 audit agents IN PARALLEL via a single message with 3 Agent tool uses. Each agent receives:
  - The 12-axis rubric (verbatim from the table above)
  - The list of routes they're responsible for
  - The audit protocol (read source, Playwright smoke walk at 414×896, anchor every verdict to a citable verification, return Markdown table per route)
  - The aesthetic precedent from §15 and §20 entries in PROJECT-STATUS.md (read those sections first for tonal consistency)
  - Hard rules above

- [ ] Step 2: Each agent returns a report containing:
  - 6 (or 5) Markdown tables — one per route — with 12 rows each
  - For each cell: verdict + citable verification (1-2 sentences)
  - A summary of findings classified by severity: small (fix inline in T3) vs large (carry-forward for separate sub-plan)
  - A list of suggested fix-up edits with exact file:line targets

### T2 — Consolidate findings into §27 + classify

**Files:**
- Modify: `PROJECT-STATUS.md` (append §27 stub)

**Steps:**

- [ ] Step 1: Single agent reads the 3 audit outputs and produces a consolidated `## 27. 2026-05-12 Sub-plan 20 closure — Onboarding flow audit` section in PROJECT-STATUS.md.

- [ ] Step 2: Structure:
  1. Opening paragraph (3-4 sentences): scope, parallel dispatch, total cells audited.
  2. Per-group findings table — 3 sub-sections (Group A/B/C), each with the 6 (or 5) route tables.
  3. Cross-route aggregate pass rate (X / 204 cells PASS, Y NEEDS WORK, Z FAIL, W WAIVED, U UNVERIFIED).
  4. Small findings batched for T3 fix-up (every finding flagged "small").
  5. Large findings logged as carry-forward (every finding flagged "large") with proposed future sub-plan number.
  6. Citable verification queries per the §18 rule.

- [ ] Step 3: Commit the docs addition.

### T3 — Apply small fixes inline

**Files:**
- Modify: whichever source files the small findings cover. ≤5 lines per file per finding.

**Steps:**

- [ ] Step 1: Read §27's "small findings" batch.

- [ ] Step 2: Dispatch a fix-up agent with:
  - The list of small findings (file:line + proposed edit)
  - Instruction to verify each edit doesn't regress existing tests
  - Verification gates (tsc / eslint / vitest 274 / build 48)

- [ ] Step 3: Fix-up agent commits with a single commit message listing all surface fixes.

### T4 — Smoke walk + §27 updates + merge

**Files:**
- Modify: `PROJECT-STATUS.md` (update §27 to mark fixed findings)

**Steps:**

- [ ] Step 1: Browser smoke walk: walk through the wizard from /onboarding step by step at 414×896. Confirm each fix doesn't break the page.

- [ ] Step 2: Update §27's "small findings" list — strike each one with `~~strikethrough~~ — FIXED in commit XXX`.

- [ ] Step 3: Final verification gates — tsc / eslint / vitest 274 / build 48.

- [ ] Step 4: Commit docs update. Merge to master via `git merge --no-ff sub-plan-20-onboarding-audit`.

---

## Verification

Per-task:
- T1: 3 audit reports produced; no source modified.
- T2: §27 committed; consolidated finding count quoted.
- T3: small fixes applied; tsc/eslint/vitest/build all clean.
- T4: §27 updated; smoke walk passes; merge clean.

Whole-sub-plan:
- Tests: 274 passing (unchanged).
- Build clean — 48 routes.
- 17 onboarding surfaces audited against 12 axes (204 cells).
- §27 anchored to verification queries per §18 rule.
- All "small" findings either fixed or struck through with reason.
- All "large" findings logged for follow-up sub-plan with proposed scope.

---

## Self-review notes

- **Spec coverage:** all 17 onboarding routes covered across 3 audit groups.
- **Placeholder scan:** zero TBD. Each task has exact deliverable.
- **DRY:** the 3 parallel audits use the same rubric + protocol — single source of truth in this spec.
- **Scope fence:**
  - No new design tokens.
  - No new primitives.
  - No new tests.
  - Only ≤5-line surgical fixes during T3.
  - Larger findings get their own sub-plan.
- **Failure-pattern guard:**
  - Audit reports cite verifications, not freestyling.
  - Small-vs-large classification prevents fix scope creep.
  - SDD per task — audit + consolidation + fix-up + closeout all reviewable independently.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development` with PARALLEL audit dispatch in T1 (single message, 3 Agent calls). T2 consolidates. T3 fixes. T4 closes.

Branch: `sub-plan-20-onboarding-audit`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP20)

- Full redesigns / new aesthetics for any surface (would invoke frontend-design separately).
- New onboarding steps beyond marital-status + children (those shipped in SP18).
- Tests for onboarding flow correctness (out of scope — would be a SP21+ item).
- Photo upload MVP (SP21).
- Legal pages (awaiting copy).
- Widened 12-axis audit ACROSS all 48 routes (the original "T5 from SP15" — still deferred until all pages complete).

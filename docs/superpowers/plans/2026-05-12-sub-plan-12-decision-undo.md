# Sub-plan 12 — Decision Undo (carousel left-edge pops last decision)

> **For agentic workers:** REQUIRED SUB-SKILL — superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `TODO(decision-undo)` at `src/app/discover/page.tsx:148`. Currently the carousel's left-edge tap at `photoIndex 0` no-ops. Wire it to pop the most-recent decision from `useDecisions`, which re-includes that candidate at the head of `filteredDeck` (head-only deck model from Sub-plan 10).

**Architecture:** Add one pure function to `decision-engine.ts` (`popLastDecision`), expose it via the `useDecisions` hook (`popLast`), wire it from `/discover advancePhoto("prev")` at photoIndex 0.

**Tech Stack:** TypeScript only. No new deps. Tests via vitest.

---

## Context

Sub-plan 10 introduced the head-only deck model. The carousel right-edge advance past the last photo records a Skip + advances (Sub-plan 10 commit `67aa096`). The left-edge counterpart was deferred with a TODO because it required popping a decision — a hook surface that wasn't built yet.

This sub-plan adds that surface: one pure function, one hook accessor, one consumer wiring. ~30 lines + tests.

**What this sub-plan is NOT:**
- Not a multi-step undo (only the most-recent decision is poppable).
- Not undo across reloads via a "history stack" — pop simply removes the entry; if the user wants the candidate back, they can pop, see them, decide again.
- Not a UI affordance change — the existing left-edge tap zone is reused, no new button.

---

## File structure

| File | Role |
|---|---|
| `src/lib/decision-engine.ts` | MODIFY. Add pure `popLastDecision(decisions): { popped, rest }` function. |
| `src/lib/use-decisions.ts` | MODIFY. Expose `popLast()` callback that updates state + persists via `saveDecisions`. |
| `src/app/discover/page.tsx` | MODIFY. `advancePhoto("prev")` at `photoIndex 0` calls `popLast()` + nudges exit direction. Drop the TODO(decision-undo) block. |
| `tests/lib/decision-engine.test.ts` | EXTEND. Add 3 test cases for `popLastDecision` (empty, single, multi). |

No new files.

---

## Hard rules

1. **TDD on pure logic.** `popLastDecision` tests land before the hook consumes it.
2. **Pure function.** `popLastDecision` returns a NEW array (no mutation) and a separate `popped` field for the popped entry (`null` if input was empty).
3. **Head-only deck unchanged.** No userIndex manipulation — popping causes `hasDecided` to flip false for the popped subject, which re-includes them at the head of `filteredDeck` naturally.
4. **TODO removed.** `TODO(decision-undo)` comment block at `src/app/discover/page.tsx:148-153` must be gone after this sub-plan.

---

## Tasks

### Task 1 — Pure `popLastDecision` + tests + hook accessor + /discover wire

**Files:**
- Modify: `src/lib/decision-engine.ts`
- Modify: `tests/lib/decision-engine.test.ts`
- Modify: `src/lib/use-decisions.ts`
- Modify: `src/app/discover/page.tsx`

- [ ] **Step 1: Write failing tests in `tests/lib/decision-engine.test.ts`**

Append 3 cases to the existing `describe` block:

```ts
  it("popLastDecision returns null + empty rest for an empty input", () => {
    const result = popLastDecision([]);
    expect(result.popped).toBeNull();
    expect(result.rest).toEqual([]);
  });

  it("popLastDecision removes the last entry and returns it", () => {
    const ds: Decision[] = [
      { subjectId: "yosef",  action: "like", timestamp: 1 },
      { subjectId: "esther", action: "pass", timestamp: 2 },
    ];
    const result = popLastDecision(ds);
    expect(result.popped).toEqual({
      subjectId: "esther",
      action: "pass",
      timestamp: 2,
    });
    expect(result.rest.map((d) => d.subjectId)).toEqual(["yosef"]);
  });

  it("popLastDecision does not mutate its input", () => {
    const ds: Decision[] = [
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ];
    const frozen = Object.freeze([...ds]) as ReadonlyArray<Decision>;
    const result = popLastDecision(frozen);
    expect(ds).toEqual([
      { subjectId: "yosef", action: "like", timestamp: 1 },
    ]);
    expect(result.rest).not.toBe(ds);
  });
```

Don't forget to import `popLastDecision` at the top of the test file alongside the existing imports.

Run: `cd d:/Antigravity/ahavah-web && npx vitest run tests/lib/decision-engine.test.ts` → 3 new tests FAIL ("popLastDecision is not exported").

- [ ] **Step 2: Implement `popLastDecision` in `src/lib/decision-engine.ts`**

After the existing `simulateLikesBack` function, append:

```ts
/**
 * Removes the most-recently-recorded decision from the array and returns
 * the popped entry plus the remaining list. Pure — input is not mutated.
 * Returns `popped: null` when input is empty.
 *
 * Used by the /discover left-edge "undo last decision" gesture. After
 * pop, hasDecided(popped.subjectId) flips false and the candidate
 * re-appears at the head of filteredDeck under the head-only deck model.
 */
export function popLastDecision(
  decisions: ReadonlyArray<Decision>,
): { popped: Decision | null; rest: Decision[] } {
  if (decisions.length === 0) return { popped: null, rest: [] };
  const popped = decisions[decisions.length - 1];
  const rest = decisions.slice(0, -1);
  return { popped, rest };
}
```

Run tests → all should pass (3 new + 13 existing decision-engine tests = 16 in that file; 217 total in the suite).

- [ ] **Step 3: Expose `popLast` on the `useDecisions` hook**

In `src/lib/use-decisions.ts`, add to the imports:

```ts
import {
  type Decision,
  type DecisionAction,
  recordDecision,
  getDecision as getDecisionPure,
  hasDecided as hasDecidedPure,
  popLastDecision,
} from "@/lib/decision-engine";
```

Inside the hook, after the existing `clearAll` callback, add:

```ts
const popLast = useCallback(() => {
  setDecisions((prev) => {
    const { rest } = popLastDecision(prev);
    saveDecisions(rest);
    return rest;
  });
}, []);
```

Add `popLast` to the returned object:

```ts
return {
  decisions,
  loaded,
  recordPass,
  recordLike,
  getDecision,
  hasDecided,
  clearAll,
  popLast,
};
```

- [ ] **Step 4: Wire `/discover` `advancePhoto("prev")` at photoIndex 0**

In `src/app/discover/page.tsx`:

1. Destructure `popLast` from `useDecisions()` (around line 64):

```tsx
const { recordPass, recordLike, hasDecided, popLast } = useDecisions();
```

2. Replace the `advancePhoto` boundary block. Find:

```tsx
} else if (photoIndex > 0) {
  setPhotoIndex((i) => i - 1);
}
// TODO(decision-undo): at photoIndex 0 with prev, currently no-ops.
// The previous "walk back to last candidate" path manipulated
// userIndex against a moving filter set — meaningless under the
// head-only deck model. If product wants an "undo last skip"
// affordance, implement by popping the most recent decision from
// useDecisions, not by stepping userIndex backward.
```

Replace with:

```tsx
} else if (photoIndex > 0) {
  setPhotoIndex((i) => i - 1);
} else {
  // photoIndex === 0 + prev tap → pop most recent decision so the
  // previously-decided candidate re-appears at the head of filteredDeck.
  // Head-only deck model: no userIndex manipulation needed.
  setExitDirection("right");
  popLast();
  setPhotoIndex(0);
}
```

Drop the entire `TODO(decision-undo)` comment block. The new `else` branch + its 4-line comment replaces it.

- [ ] **Step 5: Verification**

1. `cd d:/Antigravity/ahavah-web && npx tsc --noEmit` → clean.
2. `cd d:/Antigravity/ahavah-web && pnpm exec eslint --max-warnings=0 src/lib/decision-engine.ts src/lib/use-decisions.ts src/app/discover/page.tsx tests/lib/decision-engine.test.ts` → clean.
3. `cd d:/Antigravity/ahavah-web && npx vitest run` → 217/217 pass (214 + 3 new).
4. `cd d:/Antigravity/ahavah-web && grep -rn 'TODO(decision-undo)' src/` → zero matches.

- [ ] **Step 6: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/lib/decision-engine.ts src/lib/use-decisions.ts src/app/discover/page.tsx tests/lib/decision-engine.test.ts
git commit -m "feat(decisions): popLastDecision + /discover left-edge undo

Closes TODO(decision-undo) from Sub-plan 10. The /discover photo
carousel's left-edge tap at photoIndex 0 previously no-opped. Now pops
the most-recent decision via the new popLast() hook accessor, causing
filteredDeck to re-include the candidate at the head (head-only deck
model from d3f3253).

Layers:
- pure popLastDecision(decisions) -> { popped, rest } in decision-engine
- useDecisions exposes popLast() callback (persists via saveDecisions)
- /discover advancePhoto('prev') at photoIndex 0 calls popLast()

3 new tests on the pure function (empty, single+last, no-mutation).
Full suite 217/217."
```

---

## Verification

1. Tests: 214 → 217 pass.
2. TypeCheck + lint clean.
3. `TODO(decision-undo)` removed from `src/`.
4. Browser smoke walk (coordinator-run after implementer DONE):
   - Reset decisions. Open /discover. Skip Yosef. See next candidate.
   - On the new candidate at photoIndex 0, tap the left half of the photo.
   - Yosef re-appears at the head of the deck. localStorage shows only the remaining decisions (yosef:pass entry is gone).

---

## Self-review notes

- **Spec coverage:** every TODO claim addressed; one task end-to-end.
- **Placeholder scan:** no "TBD" / "appropriate" / "similar to."
- **Type consistency:** `popLastDecision`'s return type matches the consumer (`const { rest } = popLastDecision(prev); saveDecisions(rest); return rest;`).
- **Scope fence:** no multi-step undo, no UI affordance changes, no new atoms.
- **Failure pattern guard:** TDD on the pure function; verify step includes the TODO-grep so the comment can't sneak past the commit.

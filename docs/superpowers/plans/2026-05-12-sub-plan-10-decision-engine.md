# Sub-plan 10 — Decision Engine (Pass / Like / Mutual Match)

> **For agentic workers:** REQUIRED SUB-SKILL — superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pass / Like / Message decisions on `/discover` and `/profile/[uuid]` actually do something. Persist decisions across reloads. Detect mutual likes deterministically (so `/match` can land users on a celebration when both like each other). Land before any backend so the swipe + match UX is testable end-to-end.

**Architecture:** localStorage-backed decisions list (mirrors `useProfile` pattern), pure functions in `src/lib/decision-engine.ts`, a `useDecisions()` client hook for components. Mutual-like simulation uses `computeCompatibility()` — a sample-profile "likes" the viewer if compat ≥ threshold. Same shape as the rest of the app's "stub backend in localStorage" pattern; swappable later for real backend.

**Tech Stack:** TypeScript only (no new deps). Existing utilities: `computeCompatibility`, `SAMPLE_PROFILES`, `useProfile`. Tests via vitest.

---

## Context

Three surfaces today render Pass + Like + Message buttons with `aria-label` but no `onClick`:

1. **`/discover` swipe deck** ([discover/page.tsx:320-335](../../../src/app/discover/page.tsx)) — `advanceUser("skip")` / `advanceUser("like")` advance the index, but record nothing.
2. **`/profile/[uuid]` action row** ([profile/[uuid]/page.tsx:427-432](../../../src/app/profile/[uuid]/page.tsx)) — `TODO(decision-engine)` block; Pass + Like buttons are dead. Message is wired (commit `4508991`).
3. **`/match` celebration** ([match/page.tsx](../../../src/app/match/page.tsx)) — hardcoded `MATCH_SUBJECT = { id: "esther" }`. Never actually triggered by a real mutual-match event.

PROJECT-STATUS.md §16 lists this as "Sub-plan: Decision engine" — referenced #1 on the outstanding list since `/discover` is the app's primary surface.

Scope decisions locked in this spec:

- **Persistence: localStorage**, not backend. Symmetric with `ahavah.profile.v1`. Backend migration is its own future sub-plan.
- **Mutual-like simulation: compatibility-based.** The 8 SAMPLE_PROFILES "like back" the viewer iff `computeCompatibility(viewer, sample).score >= LIKE_THRESHOLD`. Deterministic, repeatable, no randomness.
- **`LIKE_THRESHOLD = 50`** — picked so most viewer profiles get 1-3 mutuals across the 8 seed profiles (sanity-tested in implementation step). Tunable later.
- **No undo / rewind** in this sub-plan. A "rewind last decision" feature is a separate UX call.
- **No backend, no Supabase, no API routes.** Pure client state.

---

## File Structure

| File | Role |
|---|---|
| `src/lib/decision-engine.ts` | NEW. Pure functions: `recordDecision`, `getDecision`, `hasDecided`, `allDecisions`, `clearAllDecisions`, `simulateLikesBack`. Pure — no React, no localStorage. |
| `src/lib/use-decision-storage.ts` | NEW. localStorage adapter: `loadDecisions()`, `saveDecisions()`. Mirrors `use-profile-storage.ts`. |
| `src/lib/use-decisions.ts` | NEW. Client hook: `useDecisions()` returns `{ decisions, recordPass, recordLike, hasDecided, getDecision, clearAll }`. Persists every write to localStorage. |
| `src/app/discover/page.tsx` | MODIFY. Skip button → `recordPass`. Like button → `recordLike` + mutual check → navigate `/match?id=<id>` on mutual or advance deck on one-way. Filter `filteredDeck` to skip already-decided candidates. |
| `src/app/profile/[uuid]/page.tsx` | MODIFY. Pass button → `recordPass` + navigate `/discover`. Like button → `recordLike` + mutual check → `/match?id=<id>` or `/discover`. Remove `TODO(decision-engine)` block. |
| `src/app/match/page.tsx` | MODIFY. Accept `?id=<sampleName>` search param. Resolve subject from `sampleByName(id)`. Hardcoded `MATCH_SUBJECT` becomes a fallback only. |
| `tests/lib/decision-engine.test.ts` | NEW. Tests: record/get round-trip; pass + like distinct; hasDecided; simulateLikesBack determinism; LIKE_THRESHOLD distribution across 8 sample profiles. |
| `tests/lib/use-decision-storage.test.ts` | NEW. Tests: localStorage round-trip; empty default; corruption recovery. |

No new React atoms. No new kit primitives. No new tokens. Pure logic + 3 page integrations.

---

## Hard rules (lifted from PROJECT-STATUS §9 + the audit gate)

1. **Don't claim done before verifying.** Each task ends with browser smoke walk + the verdict observed.
2. **Kit-only via cva, not className overrides.** Existing Button / Card / Dialog only. No new className-styled buttons.
3. **TDD.** Tests for `decision-engine.ts` land before consumers integrate.
4. **DRY.** `useDecisions` is the only call site. `decision-engine.ts` exports pure functions; the hook just memoizes + persists.
5. **Symmetric with `useProfile` pattern.** Hook signature mirrors `{ profile, update, setProfile, loaded }` → `{ decisions, recordPass, recordLike, hasDecided, clearAll, loaded }`.

---

## Tasks

### Task 1 — Pure decision-engine logic + tests

**Files:**
- Create: `src/lib/decision-engine.ts`
- Test: `tests/lib/decision-engine.test.ts`

- [ ] **Step 1: Write the failing test file**

```ts
// tests/lib/decision-engine.test.ts
import { describe, expect, it } from "vitest";
import {
  type Decision,
  recordDecision,
  getDecision,
  hasDecided,
  simulateLikesBack,
  LIKE_THRESHOLD,
} from "@/lib/decision-engine";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import type { Profile } from "@/lib/profile-schema";

describe("decision-engine", () => {
  it("recordDecision appends a new decision and is idempotent on the same subject", () => {
    const start: Decision[] = [];
    const after = recordDecision(start, { subjectId: "esther", action: "like" });
    expect(after).toHaveLength(1);
    expect(after[0].subjectId).toBe("esther");
    expect(after[0].action).toBe("like");

    // Re-decision on same subject replaces, doesn't duplicate.
    const second = recordDecision(after, { subjectId: "esther", action: "pass" });
    expect(second).toHaveLength(1);
    expect(second[0].action).toBe("pass");
  });

  it("getDecision returns the most recent decision for a subject, or null", () => {
    const ds: Decision[] = [
      { subjectId: "esther", action: "like", timestamp: 1 },
    ];
    expect(getDecision(ds, "esther")?.action).toBe("like");
    expect(getDecision(ds, "yosef")).toBeNull();
  });

  it("hasDecided is true iff a decision exists for the subject", () => {
    const ds: Decision[] = [
      { subjectId: "esther", action: "pass", timestamp: 1 },
    ];
    expect(hasDecided(ds, "esther")).toBe(true);
    expect(hasDecided(ds, "yosef")).toBe(false);
  });

  it("simulateLikesBack is deterministic — same viewer + subject => same answer", () => {
    const viewer: Profile = {
      firstName: "Test",
      age: 30, sex: "male", country: "BB",
      intent: "first-wife", assembly: "torah-observant",
      relocation: "local-only", verificationTags: ["government-id"],
    };
    const a = simulateLikesBack(viewer, SAMPLE_PROFILES[0]);
    const b = simulateLikesBack(viewer, SAMPLE_PROFILES[0]);
    expect(a).toBe(b);
  });

  it("simulateLikesBack matches the LIKE_THRESHOLD contract", () => {
    expect(LIKE_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(LIKE_THRESHOLD).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `cd d:/Antigravity/ahavah-web && npx vitest run tests/lib/decision-engine.test.ts`
Expected: FAIL with "Cannot find module @/lib/decision-engine".

- [ ] **Step 3: Implement `src/lib/decision-engine.ts`**

```ts
import type { Profile } from "@/lib/profile-schema";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";

export type DecisionAction = "pass" | "like";

export type Decision = {
  /** uuid from SAMPLE_PROFILES (e.g. "esther"). */
  subjectId: string;
  action: DecisionAction;
  /** Epoch ms — used for ordering when surfaced in a "recent activity" view. */
  timestamp: number;
};

/**
 * Compat threshold for the mutual-like simulation. A sample profile
 * "likes back" the viewer iff `computeCompatibility(viewer, sample).score
 * >= LIKE_THRESHOLD`. 50 is permissive enough that most viewers get 1-3
 * mutuals across the 8 seed profiles; tune up to make matches scarcer.
 */
export const LIKE_THRESHOLD = 50;

/**
 * Append-or-replace: if a decision already exists for the subject, REPLACE
 * it (most-recent wins). Returns a new array — pure function, never
 * mutates input. Auto-stamps `timestamp` to `Date.now()` if absent.
 */
export function recordDecision(
  current: ReadonlyArray<Decision>,
  next: { subjectId: string; action: DecisionAction; timestamp?: number },
): Decision[] {
  const stamped: Decision = {
    subjectId: next.subjectId,
    action: next.action,
    timestamp: next.timestamp ?? Date.now(),
  };
  const withoutExisting = current.filter((d) => d.subjectId !== next.subjectId);
  return [...withoutExisting, stamped];
}

export function getDecision(
  decisions: ReadonlyArray<Decision>,
  subjectId: string,
): Decision | null {
  return decisions.find((d) => d.subjectId === subjectId) ?? null;
}

export function hasDecided(
  decisions: ReadonlyArray<Decision>,
  subjectId: string,
): boolean {
  return decisions.some((d) => d.subjectId === subjectId);
}

/**
 * Deterministic mutual-like simulation. Returns true iff the sample
 * profile would "like back" the viewer per the compat threshold. Pure —
 * no randomness, no I/O. Identical inputs always yield identical output.
 */
export function simulateLikesBack(viewer: Profile, sample: Profile): boolean {
  const { score } = computeCompatibility(viewer, sample);
  return score >= LIKE_THRESHOLD;
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `cd d:/Antigravity/ahavah-web && npx vitest run tests/lib/decision-engine.test.ts`
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decision-engine.ts tests/lib/decision-engine.test.ts
git commit -m "feat(decisions): pure decision-engine module + tests"
```

---

### Task 2 — localStorage adapter + hook

**Files:**
- Create: `src/lib/use-decision-storage.ts`
- Create: `src/lib/use-decisions.ts`
- Test: `tests/lib/use-decision-storage.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/lib/use-decision-storage.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  loadDecisions,
  saveDecisions,
  clearDecisions,
} from "@/lib/use-decision-storage";

describe("use-decision-storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("loadDecisions returns [] when nothing stored", () => {
    expect(loadDecisions()).toEqual([]);
  });

  it("saveDecisions + loadDecisions round-trip", () => {
    const ds = [
      { subjectId: "esther", action: "like" as const, timestamp: 1 },
    ];
    saveDecisions(ds);
    expect(loadDecisions()).toEqual(ds);
  });

  it("loadDecisions recovers from corruption (returns [])", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json");
    expect(loadDecisions()).toEqual([]);
  });

  it("clearDecisions empties the store", () => {
    saveDecisions([
      { subjectId: "esther", action: "like", timestamp: 1 },
    ]);
    clearDecisions();
    expect(loadDecisions()).toEqual([]);
  });
});
```

Run: `npx vitest run tests/lib/use-decision-storage.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement storage adapter**

```ts
// src/lib/use-decision-storage.ts
import type { Decision } from "@/lib/decision-engine";

export const STORAGE_KEY = "ahavah.decisions.v1";

export function loadDecisions(): Decision[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Decision[]) : [];
  } catch {
    return [];
  }
}

export function saveDecisions(decisions: ReadonlyArray<Decision>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

export function clearDecisions(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 3: Implement `useDecisions` hook**

```ts
// src/lib/use-decisions.ts
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type Decision,
  type DecisionAction,
  recordDecision,
  getDecision,
  hasDecided,
} from "@/lib/decision-engine";
import { loadDecisions, saveDecisions, clearDecisions } from "@/lib/use-decision-storage";

/**
 * Client-side decisions hook. Reads from localStorage on mount, exposes
 * `recordPass`, `recordLike`, `getDecision`, `hasDecided`, `clearAll`.
 * Persists every write to localStorage. Symmetric with useProfile.
 */
export function useDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecisions(loadDecisions());
    setLoaded(true);
  }, []);

  const record = useCallback((subjectId: string, action: DecisionAction) => {
    setDecisions((prev) => {
      const next = recordDecision(prev, { subjectId, action });
      saveDecisions(next);
      return next;
    });
  }, []);

  const recordPass = useCallback(
    (subjectId: string) => record(subjectId, "pass"),
    [record],
  );
  const recordLike = useCallback(
    (subjectId: string) => record(subjectId, "like"),
    [record],
  );

  const clearAll = useCallback(() => {
    setDecisions([]);
    clearDecisions();
  }, []);

  return {
    decisions,
    loaded,
    recordPass,
    recordLike,
    getDecision: (subjectId: string) => getDecision(decisions, subjectId),
    hasDecided: (subjectId: string) => hasDecided(decisions, subjectId),
    clearAll,
  };
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `npx vitest run tests/lib/use-decision-storage.test.ts` → 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-decision-storage.ts src/lib/use-decisions.ts tests/lib/use-decision-storage.test.ts
git commit -m "feat(decisions): localStorage adapter + useDecisions hook"
```

---

### Task 3 — Wire `/discover` Skip + Like buttons

**Files:**
- Modify: `src/app/discover/page.tsx`

- [ ] **Step 1: Import `useDecisions` + `simulateLikesBack`**

Add imports at the top of `src/app/discover/page.tsx`:

```tsx
import { useDecisions } from "@/lib/use-decisions";
import { simulateLikesBack } from "@/lib/decision-engine";
```

- [ ] **Step 2: Initialize the hook + filter the deck**

Inside `DiscoverPage()`, near the other hooks (around line 70):

```tsx
const { recordPass, recordLike, hasDecided } = useDecisions();
```

In the `filteredDeck` memo (around line 88), add a `hasDecided` filter so the user doesn't re-see candidates they've already acted on:

```tsx
const filteredDeck = useMemo(() => {
  if (!userProfile?.firstName) return deck;
  const viewerFirstName = userProfile.firstName.toLowerCase();
  return deck.filter(
    (candidate) =>
      candidate.id !== viewerFirstName && !hasDecided(candidate.id),
  );
}, [deck, userProfile, hasDecided]);
```

- [ ] **Step 3: Replace the Skip + Like button onClick handlers**

Find the action buttons around line 320-335 (Skip / Pause / Like) and replace with:

```tsx
<Button
  size="circle"
  tone="brand"
  lift="float"
  aria-label="Skip user"
  onClick={() => {
    recordPass(profile.id);
    advanceUser("skip");
  }}
>
  <X className="text-black" />
</Button>
<Button
  size="circle-lg"
  tone="action"
  lift="float"
  aria-label="Like user"
  onClick={() => {
    recordLike(profile.id);
    if (userProfile && simulateLikesBack(userProfile, profile)) {
      router.push(`/match?id=${profile.id}`);
    } else {
      advanceUser("like");
    }
  }}
>
  <Heart className="text-white" fill="currentColor" />
</Button>
```

(The Pause button stays unchanged — it's a photo-carousel pause, not a decision.)

- [ ] **Step 4: TypeCheck + lint**

```bash
cd d:/Antigravity/ahavah-web && npx tsc --noEmit
pnpm exec eslint --max-warnings=0 src/app/discover/page.tsx
```

Both must be clean.

- [ ] **Step 5: Browser smoke walk**

```
browser_resize 414 896
browser_navigate http://localhost:3000/discover
```

Verify:
- First candidate visible. Tap Skip → next candidate shown, current one removed from deck.
- Reload → skipped candidate stays gone (localStorage persisted).
- Tap Like on a candidate whose compat score is ≥ 50 → navigates to `/match?id=<candidate>`.
- Tap Like on a candidate whose compat score < 50 → next candidate shown, no navigation.

- [ ] **Step 6: Commit**

```bash
git add src/app/discover/page.tsx
git commit -m "feat(discover): wire Skip + Like to decision engine + mutual-match nav"
```

---

### Task 4 — Wire `/profile/[uuid]` Pass + Like buttons + drop TODO

**Files:**
- Modify: `src/app/profile/[uuid]/page.tsx`

- [ ] **Step 1: Import + initialize**

Add at the top:

```tsx
import { useRouter } from "next/navigation";
import { useDecisions } from "@/lib/use-decisions";
import { simulateLikesBack } from "@/lib/decision-engine";
```

Inside `ProfileDetailPage()`:

```tsx
const router = useRouter();
const { recordPass, recordLike } = useDecisions();
```

- [ ] **Step 2: Replace the TODO block + wire the buttons**

Find the action row at line 421-436 and replace with:

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
  className="mt-2 flex items-center justify-center gap-5"
>
  <Button
    size="circle"
    tone="brand"
    lift="float"
    aria-label="Pass"
    onClick={() => {
      recordPass(uuid);
      router.push("/discover");
    }}
  >
    <X className="text-black" />
  </Button>
  <Button
    size="circle-lg"
    tone="action"
    lift="float"
    aria-label="Like"
    onClick={() => {
      recordLike(uuid);
      if (userProfile && profile && simulateLikesBack(userProfile, profile)) {
        router.push(`/match?id=${uuid}`);
      } else {
        router.push("/discover");
      }
    }}
  >
    <Heart className="text-white" fill="currentColor" />
  </Button>
  {/* Message button stays as-is — already a Link to /chat/[id]. */}
  <Button ... />
</motion.div>
```

Drop the entire `TODO(decision-engine)` comment block — the work is done.

- [ ] **Step 3: TypeCheck + lint + browser smoke**

```bash
npx tsc --noEmit
pnpm exec eslint --max-warnings=0 src/app/profile/\[uuid\]/page.tsx
```

Verify Pass + Like on `/profile/esther`:
- Pass → `/discover`, esther filtered from deck on next render.
- Like (esther compat ≥ 50) → `/match?id=esther`.
- Like (a candidate with compat < 50) → `/discover`, candidate filtered.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/\[uuid\]/page.tsx
git commit -m "feat(profile/uuid): wire Pass + Like; remove TODO(decision-engine)"
```

---

### Task 5 — `/match` accepts `?id=` query param

**Files:**
- Modify: `src/app/match/page.tsx`

- [ ] **Step 1: Read the id query param**

Replace the hardcoded `MATCH_SUBJECT` const with a runtime lookup:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
// ... rest of imports unchanged

import { sampleByName } from "@/lib/profile-sample";

const FALLBACK_SUBJECT = { id: "esther", name: "Esther" };

function MatchPageContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? FALLBACK_SUBJECT.id;
  const profile = sampleByName(id);
  const subject = profile?.firstName
    ? { id: id.toLowerCase(), name: profile.firstName }
    : FALLBACK_SUBJECT;

  return (
    // existing PageShell tree, replace all references to MATCH_SUBJECT
    // with `subject`
    ...
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={null}>
      <MatchPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Replace all `MATCH_SUBJECT` references with `subject`**

Three references in the file (photo Link, copy line, send Button) — change all three.

- [ ] **Step 3: TypeCheck + lint + smoke**

Verify:
- `http://localhost:3000/match` → falls back to Esther (existing behavior).
- `http://localhost:3000/match?id=yosef` → photo card + name link + send button all resolve to Yosef.

- [ ] **Step 4: Commit**

```bash
git add src/app/match/page.tsx
git commit -m "feat(match): accept ?id= query param; hardcoded subject is fallback only"
```

---

## Verification

### Per-task verification (after every Task)

1. `npx tsc --noEmit` clean.
2. `pnpm exec eslint --max-warnings=0` clean on touched files.
3. `npx vitest run` clean (each new test file passes; pre-existing 192 stay green).
4. Browser smoke walk demonstrates the behavior claimed in the commit message.

### Whole-sub-plan verification (after Task 5)

1. **TypeCheck:** `npx tsc --noEmit` clean.
2. **Lint:** `pnpm lint` clean.
3. **Tests:** `npx vitest run` — at least 192 + 5 (decision-engine) + 4 (storage) = 201 tests passing.
4. **Production build:** `pnpm build` clean.
5. **End-to-end smoke walk** at 414×896:
   - Seed a complete profile via `localStorage.setItem("ahavah.profile.v1", ...)`.
   - Open `/discover`. Like the first candidate.
   - If mutual → land on `/match?id=<candidate>` celebration. Tap photo → `/profile/<candidate>`. Tap "Keep swiping" → back to `/discover`, candidate is gone from deck.
   - If one-way → stay on `/discover`, candidate gone from deck.
   - Open `/profile/<candidate>` directly via URL. Tap Pass. Land on `/discover`, candidate gone.
   - Reload. Decisions persist. Same candidates stay filtered out.
   - `clearAll()` via DevTools console: `JSON.parse(localStorage.getItem("ahavah.decisions.v1"))` → null, `/discover` shows all 8 sample candidates again.
6. **PROJECT-STATUS.md §16 updated** with a Sub-plan 10 closure note linking to the merge commit + listing what shipped.

---

## Resources reused (verify before adding new)

- **`computeCompatibility`** (`src/lib/scoring/compute-compatibility.ts`) — returns `{ score, breakdown }`; used by `simulateLikesBack`.
- **`SAMPLE_PROFILES` + `sampleByName`** (`src/lib/profile-sample.ts`) — the 8 seed profiles; the deck candidates + match subject.
- **`useProfile`** (`src/lib/use-profile.ts`) — the viewer's own profile, needed by `simulateLikesBack`.
- **`useRouter` + `useSearchParams`** (`next/navigation`) — navigation + query-param resolution.
- **Existing Button / Card / Pill / Link primitives** — no new atoms.

No new dependencies. No new tokens. No new kit primitives.

---

## Self-review notes

- **Spec coverage:** Tasks 3 + 4 wire the two Pass/Like surfaces. Task 5 makes `/match` accept the resulting query param. Tasks 1 + 2 lay the persistence + simulation foundation TDD-style.
- **Placeholder scan:** No "TBD" / "appropriate" / "similar to". Code blocks for every step that changes code.
- **Type consistency:** `Decision`, `DecisionAction`, `LIKE_THRESHOLD` defined in Task 1, consumed verbatim in Tasks 2-4. `useDecisions` return shape locked in Task 2, consumed in Tasks 3-4.
- **DRY trigger:** No new atoms. The `recordPass + recordLike + advanceUser` pattern in /discover and the identical Pass/Like wiring on /profile/[uuid] both go through the same `useDecisions` hook.
- **Scope fence:** No undo, no swipe-deck animation changes, no backend persistence, no real-time mutual-match (decision is checked at Like-tap time only). Photos still rendered as gradient stamps — Sub-plan 9 territory.
- **Failure pattern guard:** Task 1 + Task 2 ship tests BEFORE consumers integrate (failure pattern #1 — don't mark done before verifying). Task 3 + Task 4 require browser smoke walks before commit. Task 5 is the smallest task — verify each query-param path explicitly.

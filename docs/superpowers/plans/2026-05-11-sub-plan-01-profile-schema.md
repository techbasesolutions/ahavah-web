# Sub-plan 1: Profile Schema + Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Torah-observant matchmaker schema as a typed, testable foundation: every field from the spec defined as a TypeScript enum/union, a `Profile` aggregate type, 8 seed sample profiles, a `useProfile` localStorage hook, and a `computeCompleteness()` pure function so the rest of the app can build on a stable contract.

**Architecture:** Pure TypeScript modules under `src/lib/` consumed by future sub-plans. No React components in this sub-plan — only types, data, pure functions, and one hook. Tests are Vitest pure-function tests (no DOM rendering in this sub-plan; React Testing Library deferred to sub-plans 2+). Soft-completeness model per user decision (2026-05-11): every field optional except a "minimum complete" set.

**Tech Stack:** TypeScript 5 + Vitest (new dep) + Plus Jakarta Sans (no change) + localStorage for client-side persistence (no backend in this sub-plan).

---

## File map

| File | Purpose |
|---|---|
| `src/lib/profile-schema.ts` | All enums, unions, the `Profile` aggregate type, and field metadata |
| `src/lib/profile-completeness.ts` | Pure function `computeCompleteness(profile)` → `{ percent, requiredFilled, requiredTotal }` |
| `src/lib/profile-sample.ts` | 8 seed sample profiles (4 male, 4 female) spanning the schema variety |
| `src/lib/use-profile.ts` | `useProfile()` React hook with localStorage persistence |
| `src/lib/use-profile-storage.ts` | Pure adapter `loadProfile() / saveProfile()` — separated so it's testable without DOM |
| `tests/lib/profile-schema.test.ts` | Type-guard runtime tests + sample-data validation |
| `tests/lib/profile-completeness.test.ts` | All edge cases of `computeCompleteness` |
| `tests/lib/use-profile-storage.test.ts` | localStorage round-trip tests |
| `vitest.config.ts` | Vitest config (jsdom + path alias) |
| `package.json` | Add Vitest deps + `test` script |

---

## Task 0: Install Vitest + Jest-DOM test runner

**Files:**
- Modify: `package.json` (add deps + `test` script)
- Create: `vitest.config.ts`
- Create: `tests/setup.ts` (empty for now; we don't need DOM matchers in this sub-plan but it's the standard slot)

- [ ] **Step 1: Install Vitest + companions**

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @vitejs/plugin-react
```

Expected: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@vitejs/plugin-react` appear in `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Create empty `tests/setup.ts`**

```ts
// Vitest setup — extended in later sub-plans (RTL matchers, MSW handlers, etc.).
```

- [ ] **Step 4: Add `test` script to `package.json`**

Modify `scripts` in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "prepare": "husky",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Verify Vitest runs (with zero tests)**

Run: `pnpm test`
Expected: Vitest reports "No test files found" and exits cleanly with code 0. (Vitest 1.x prints `No test files found, exiting with code 1` — that's fine; the runtime works.)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts
git commit -m "chore: add Vitest test runner + jsdom + path alias"
```

---

## Task 1: Basic identity enums (Sex, name, age) + tests

**Files:**
- Create: `src/lib/profile-schema.ts`
- Create: `tests/lib/profile-schema.test.ts`

- [ ] **Step 1: Write the failing test for `Sex` enum + type guard**

Create `tests/lib/profile-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type Sex, isSex } from "@/lib/profile-schema";

describe("Sex", () => {
  it("accepts 'male' and 'female' as valid values", () => {
    const male: Sex = "male";
    const female: Sex = "female";
    expect(isSex(male)).toBe(true);
    expect(isSex(female)).toBe(true);
  });

  it("rejects any other value at runtime", () => {
    expect(isSex("other")).toBe(false);
    expect(isSex("")).toBe(false);
    expect(isSex(null)).toBe(false);
    expect(isSex(undefined)).toBe(false);
    expect(isSex(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL with `Cannot find module '@/lib/profile-schema'`.

- [ ] **Step 3: Implement `Sex` in `src/lib/profile-schema.ts`**

```ts
/**
 * Ahavah profile schema — Torah-observant / Hebrew Israelite matchmaker.
 *
 * Every field below is OPTIONAL on the Profile aggregate (soft-completeness
 * model per 2026-05-11 product decision). The minimum-complete set is
 * defined by `MINIMUM_COMPLETE_FIELDS` so users can finish minimal
 * onboarding and complete the rest in /profile/edit.
 */

// Basic Identity ------------------------------------------------------------

export type Sex = "male" | "female";

export function isSex(value: unknown): value is Sex {
  return value === "male" || value === "female";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 2 tests in `tests/lib/profile-schema.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add Sex enum + type guard"
```

---

## Task 2: Relationship intent (gender-conditional unions)

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing test for gender-conditional intent**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type MaleIntent,
  type FemaleIntent,
  type Intent,
  isMaleIntent,
  isFemaleIntent,
  intentOptionsForSex,
} from "@/lib/profile-schema";

describe("RelationshipIntent", () => {
  it("MaleIntent accepts the 6 documented values", () => {
    const cases: MaleIntent[] = [
      "first-wife", "additional-wife", "courtship",
      "marriage-only", "long-distance-courtship", "local-only",
    ];
    for (const c of cases) {
      expect(isMaleIntent(c)).toBe(true);
    }
  });

  it("FemaleIntent accepts the 6 documented values", () => {
    const cases: FemaleIntent[] = [
      "unmarried-man", "married-man", "courtship",
      "marriage-only", "open-to-relocation", "local-only",
    ];
    for (const c of cases) {
      expect(isFemaleIntent(c)).toBe(true);
    }
  });

  it("intentOptionsForSex returns 6 options for each sex", () => {
    expect(intentOptionsForSex("male")).toHaveLength(6);
    expect(intentOptionsForSex("female")).toHaveLength(6);
  });

  it("intentOptionsForSex includes 'first-wife' for male only", () => {
    expect(intentOptionsForSex("male").map((o) => o.value)).toContain("first-wife");
    expect(intentOptionsForSex("female").map((o) => o.value)).not.toContain("first-wife");
  });

  it("Intent union accepts values from either sex (for storage)", () => {
    const malePick: Intent = "additional-wife";
    const femalePick: Intent = "married-man";
    expect(malePick).toBeDefined();
    expect(femalePick).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `MaleIntent`, `FemaleIntent`, etc. not exported.

- [ ] **Step 3: Implement gender-conditional intent in `src/lib/profile-schema.ts`**

Append:

```ts
// Relationship Intent ------------------------------------------------------
// Gender-conditional intent: men and women see different options. We store
// both unions in the same field `Profile.intent` as a discriminated whole;
// the UI uses `intentOptionsForSex(sex)` to render the correct picker.

export type MaleIntent =
  | "first-wife"
  | "additional-wife"
  | "courtship"
  | "marriage-only"
  | "long-distance-courtship"
  | "local-only";

export type FemaleIntent =
  | "unmarried-man"
  | "married-man"
  | "courtship"
  | "marriage-only"
  | "open-to-relocation"
  | "local-only";

export type Intent = MaleIntent | FemaleIntent;

const MALE_INTENTS: ReadonlyArray<MaleIntent> = [
  "first-wife",
  "additional-wife",
  "courtship",
  "marriage-only",
  "long-distance-courtship",
  "local-only",
];

const FEMALE_INTENTS: ReadonlyArray<FemaleIntent> = [
  "unmarried-man",
  "married-man",
  "courtship",
  "marriage-only",
  "open-to-relocation",
  "local-only",
];

export function isMaleIntent(value: unknown): value is MaleIntent {
  return typeof value === "string" && (MALE_INTENTS as readonly string[]).includes(value);
}

export function isFemaleIntent(value: unknown): value is FemaleIntent {
  return typeof value === "string" && (FEMALE_INTENTS as readonly string[]).includes(value);
}

export type IntentOption = { value: Intent; label: string };

const MALE_INTENT_LABELS: ReadonlyArray<IntentOption> = [
  { value: "first-wife",              label: "First wife" },
  { value: "additional-wife",         label: "Additional wife" },
  { value: "courtship",               label: "Courtship" },
  { value: "marriage-only",           label: "Marriage only" },
  { value: "long-distance-courtship", label: "Long-distance courtship" },
  { value: "local-only",              label: "Local only" },
];

const FEMALE_INTENT_LABELS: ReadonlyArray<IntentOption> = [
  { value: "unmarried-man",      label: "Unmarried man" },
  { value: "married-man",        label: "Married man" },
  { value: "courtship",          label: "Courtship" },
  { value: "marriage-only",      label: "Marriage only" },
  { value: "open-to-relocation", label: "Open to relocation" },
  { value: "local-only",         label: "Local only" },
];

export function intentOptionsForSex(sex: Sex): ReadonlyArray<IntentOption> {
  return sex === "male" ? MALE_INTENT_LABELS : FEMALE_INTENT_LABELS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 7 tests total in `profile-schema.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add gender-conditional RelationshipIntent unions"
```

---

## Task 3: Faith cluster (Assembly, TorahLevel, Shabbat, FeastDay, Calendar)

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type Assembly,
  type TorahLevel,
  type Shabbat,
  type FeastDay,
  type Calendar,
  ASSEMBLIES,
  TORAH_LEVELS,
  SHABBATS,
  FEAST_DAYS,
  CALENDARS,
} from "@/lib/profile-schema";

describe("Faith cluster", () => {
  it("ASSEMBLIES has 6 documented values", () => {
    expect(ASSEMBLIES.map((a) => a.value)).toEqual([
      "messianic",
      "torah-observant",
      "hebrew-israelite",
      "independent",
      "christian-transitioning",
      "non-denom-torah",
    ]);
  });

  it("TORAH_LEVELS has 4 documented values in escalation order", () => {
    expect(TORAH_LEVELS.map((t) => t.value)).toEqual([
      "learning",
      "beginner",
      "intermediate",
      "experienced",
    ]);
  });

  it("SHABBATS has 4 options including 'other'", () => {
    expect(SHABBATS).toHaveLength(4);
    expect(SHABBATS.map((s) => s.value)).toContain("other");
  });

  it("FEAST_DAYS has all 9 biblical feasts", () => {
    expect(FEAST_DAYS.map((f) => f.value)).toEqual([
      "passover",
      "unleavened-bread",
      "first-fruits",
      "shavuot",
      "trumpets",
      "yom-kippur",
      "sukkot",
      "hanukkah",
      "purim",
    ]);
  });

  it("CALENDARS has 6 options including 'other'", () => {
    expect(CALENDARS).toHaveLength(6);
    expect(CALENDARS.map((c) => c.value)).toContain("rabbinic");
    expect(CALENDARS.map((c) => c.value)).toContain("aviv-barley");
    expect(CALENDARS.map((c) => c.value)).toContain("other");
  });

  it("Type guards narrow correctly", () => {
    const a: Assembly = "messianic";
    const t: TorahLevel = "experienced";
    const s: Shabbat = "friday-sunset-saturday-sunset";
    const f: FeastDay = "passover";
    const c: Calendar = "aviv-barley";
    expect(a).toBe("messianic");
    expect(t).toBe("experienced");
    expect(s).toBe("friday-sunset-saturday-sunset");
    expect(f).toBe("passover");
    expect(c).toBe("aviv-barley");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `ASSEMBLIES`, `TORAH_LEVELS`, etc. not exported.

- [ ] **Step 3: Implement faith cluster**

Append to `src/lib/profile-schema.ts`:

```ts
// Faith cluster -----------------------------------------------------------

export type Assembly =
  | "messianic"
  | "torah-observant"
  | "hebrew-israelite"
  | "independent"
  | "christian-transitioning"
  | "non-denom-torah";

export type AssemblyOption = { value: Assembly; label: string };

export const ASSEMBLIES: ReadonlyArray<AssemblyOption> = [
  { value: "messianic",               label: "Messianic" },
  { value: "torah-observant",         label: "Torah observant" },
  { value: "hebrew-israelite",        label: "Hebrew Israelite" },
  { value: "independent",             label: "Independent fellowship" },
  { value: "christian-transitioning", label: "Christian transitioning into Torah observance" },
  { value: "non-denom-torah",         label: "Non-denominational Torah believer" },
];

export type TorahLevel = "learning" | "beginner" | "intermediate" | "experienced";

export const TORAH_LEVELS: ReadonlyArray<{ value: TorahLevel; label: string }> = [
  { value: "learning",     label: "Learning" },
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced",  label: "Experienced" },
];

export type Shabbat =
  | "friday-sunset-saturday-sunset"
  | "luni-solar"
  | "saturday-only"
  | "other";

export const SHABBATS: ReadonlyArray<{ value: Shabbat; label: string }> = [
  { value: "friday-sunset-saturday-sunset", label: "Friday sunset to Saturday sunset" },
  { value: "luni-solar",                    label: "Luni-solar calendar" },
  { value: "saturday-only",                 label: "Saturday only" },
  { value: "other",                         label: "Other" },
];

export type FeastDay =
  | "passover"
  | "unleavened-bread"
  | "first-fruits"
  | "shavuot"
  | "trumpets"
  | "yom-kippur"
  | "sukkot"
  | "hanukkah"
  | "purim";

export const FEAST_DAYS: ReadonlyArray<{ value: FeastDay; label: string }> = [
  { value: "passover",         label: "Passover" },
  { value: "unleavened-bread", label: "Unleavened Bread" },
  { value: "first-fruits",     label: "First Fruits" },
  { value: "shavuot",          label: "Shavuot" },
  { value: "trumpets",         label: "Trumpets" },
  { value: "yom-kippur",       label: "Yom Kippur" },
  { value: "sukkot",           label: "Sukkot" },
  { value: "hanukkah",         label: "Hanukkah" },
  { value: "purim",            label: "Purim" },
];

export type Calendar =
  | "rabbinic"
  | "aviv-barley"
  | "enoch"
  | "luni-solar"
  | "observational-new-moon"
  | "other";

export const CALENDARS: ReadonlyArray<{ value: Calendar; label: string }> = [
  { value: "rabbinic",               label: "Rabbinic" },
  { value: "aviv-barley",            label: "Aviv barley" },
  { value: "enoch",                  label: "Enoch" },
  { value: "luni-solar",             label: "Luni-solar" },
  { value: "observational-new-moon", label: "Observational new moon" },
  { value: "other",                  label: "Other" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 13 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add faith cluster — Assembly, TorahLevel, Shabbat, FeastDay, Calendar"
```

---

## Task 4: Doctrine cluster (Polygyny, HeadCovering, Tzitzit)

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type Polygyny,
  type HeadCovering,
  type Tzitzit,
  POLYGYNY_VIEWS,
  HEAD_COVERINGS,
  TZITZIT_OPTIONS,
} from "@/lib/profile-schema";

describe("Doctrine cluster", () => {
  it("POLYGYNY_VIEWS has 4 options", () => {
    expect(POLYGYNY_VIEWS.map((p) => p.value)).toEqual([
      "supports",
      "open",
      "monogamy-only",
      "undecided",
    ]);
  });

  it("HEAD_COVERINGS has 4 options", () => {
    expect(HEAD_COVERINGS.map((h) => h.value)).toEqual([
      "required",
      "encouraged",
      "optional",
      "not-practiced",
    ]);
  });

  it("TZITZIT_OPTIONS has 3 options", () => {
    expect(TZITZIT_OPTIONS.map((t) => t.value)).toEqual([
      "regularly",
      "occasionally",
      "not-currently",
    ]);
  });

  it("Doctrine types are narrowed correctly", () => {
    const p: Polygyny = "supports";
    const h: HeadCovering = "required";
    const t: Tzitzit = "regularly";
    expect(p).toBe("supports");
    expect(h).toBe("required");
    expect(t).toBe("regularly");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement doctrine cluster**

Append to `src/lib/profile-schema.ts`:

```ts
// Doctrine cluster --------------------------------------------------------

export type Polygyny = "supports" | "open" | "monogamy-only" | "undecided";

export const POLYGYNY_VIEWS: ReadonlyArray<{ value: Polygyny; label: string }> = [
  { value: "supports",       label: "Supports biblical polygyny" },
  { value: "open",           label: "Open to it" },
  { value: "monogamy-only",  label: "Monogamy only" },
  { value: "undecided",      label: "Undecided" },
];

export type HeadCovering = "required" | "encouraged" | "optional" | "not-practiced";

export const HEAD_COVERINGS: ReadonlyArray<{ value: HeadCovering; label: string }> = [
  { value: "required",      label: "Required" },
  { value: "encouraged",    label: "Encouraged" },
  { value: "optional",      label: "Optional" },
  { value: "not-practiced", label: "Not practiced" },
];

export type Tzitzit = "regularly" | "occasionally" | "not-currently";

export const TZITZIT_OPTIONS: ReadonlyArray<{ value: Tzitzit; label: string }> = [
  { value: "regularly",     label: "Wears tzitzit regularly" },
  { value: "occasionally",  label: "Occasionally" },
  { value: "not-currently", label: "Not currently" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 17 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add doctrine cluster — Polygyny, HeadCovering, Tzitzit"
```

---

## Task 5: Lifestyle cluster (Family, Living, Health)

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type FamilyView,
  type LivingPreference,
  type HealthTag,
  FAMILY_VIEWS,
  LIVING_PREFERENCES,
  HEALTH_TAGS,
} from "@/lib/profile-schema";

describe("Lifestyle cluster", () => {
  it("FAMILY_VIEWS has the 6 documented options", () => {
    expect(FAMILY_VIEWS.map((f) => f.value)).toEqual([
      "wants-children",
      "has-children",
      "open-to-more",
      "does-not-want",
      "open-blended",
      "interested-large-family",
    ]);
  });

  it("LIVING_PREFERENCES has 6 options including 'open-to-relocation'", () => {
    expect(LIVING_PREFERENCES.map((l) => l.value)).toContain("open-to-relocation");
    expect(LIVING_PREFERENCES).toHaveLength(6);
  });

  it("HEALTH_TAGS has 7 options including 'prepper'", () => {
    expect(HEALTH_TAGS.map((h) => h.value)).toContain("prepper");
    expect(HEALTH_TAGS).toHaveLength(7);
  });

  it("Lifestyle types are usable as multi-select arrays", () => {
    const family: FamilyView[] = ["wants-children", "open-to-more"];
    const living: LivingPreference[] = ["rural", "homestead"];
    const health: HealthTag[] = ["non-smoker", "fitness"];
    expect(family).toHaveLength(2);
    expect(living).toHaveLength(2);
    expect(health).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement lifestyle cluster**

Append to `src/lib/profile-schema.ts`:

```ts
// Lifestyle cluster (all multi-select) ------------------------------------

export type FamilyView =
  | "wants-children"
  | "has-children"
  | "open-to-more"
  | "does-not-want"
  | "open-blended"
  | "interested-large-family";

export const FAMILY_VIEWS: ReadonlyArray<{ value: FamilyView; label: string }> = [
  { value: "wants-children",          label: "Wants children" },
  { value: "has-children",            label: "Has children" },
  { value: "open-to-more",            label: "Open to more children" },
  { value: "does-not-want",           label: "Does not want children" },
  { value: "open-blended",            label: "Open to blended family" },
  { value: "interested-large-family", label: "Interested in large family" },
];

export type LivingPreference =
  | "urban"
  | "rural"
  | "homestead"
  | "off-grid"
  | "community-living"
  | "open-to-relocation";

export const LIVING_PREFERENCES: ReadonlyArray<{ value: LivingPreference; label: string }> = [
  { value: "urban",              label: "Urban" },
  { value: "rural",              label: "Rural" },
  { value: "homestead",          label: "Homestead lifestyle" },
  { value: "off-grid",           label: "Off-grid interest" },
  { value: "community-living",   label: "Community living" },
  { value: "open-to-relocation", label: "Open to relocation" },
];

export type HealthTag =
  | "non-smoker"
  | "no-alcohol"
  | "moderate-alcohol"
  | "fitness"
  | "natural-health"
  | "herbalist"
  | "prepper";

export const HEALTH_TAGS: ReadonlyArray<{ value: HealthTag; label: string }> = [
  { value: "non-smoker",       label: "Non-smoker" },
  { value: "no-alcohol",       label: "No alcohol" },
  { value: "moderate-alcohol", label: "Moderate alcohol" },
  { value: "fitness",          label: "Fitness focused" },
  { value: "natural-health",   label: "Natural health focused" },
  { value: "herbalist",        label: "Herbalist interest" },
  { value: "prepper",          label: "Prepper / survival minded" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 21 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add lifestyle cluster — FamilyView, LivingPreference, HealthTag"
```

---

## Task 6: Ethnicity, Nationality, Interests, Personality, Communication

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type Ethnicity,
  type Nationality,
  type Interest,
  type PersonalityTrait,
  type Relocation,
  type CommunicationPref,
  ETHNICITIES,
  NATIONALITIES,
  INTERESTS,
  PERSONALITY_TRAITS,
  RELOCATIONS,
  COMMUNICATION_PREFS,
} from "@/lib/profile-schema";

describe("Ethnicity/Nationality/Interests/Personality cluster", () => {
  it("ETHNICITIES has 17 options including 'other'", () => {
    expect(ETHNICITIES).toHaveLength(17);
    expect(ETHNICITIES.map((e) => e.value)).toContain("other");
  });

  it("NATIONALITIES has at least 20 options (curated, not exhaustive)", () => {
    expect(NATIONALITIES.length).toBeGreaterThanOrEqual(20);
    expect(NATIONALITIES.map((n) => n.value)).toContain("barbadian");
    expect(NATIONALITIES.map((n) => n.value)).toContain("israeli");
    expect(NATIONALITIES.map((n) => n.value)).toContain("other");
  });

  it("INTERESTS has 28 options spanning faith + lifestyle", () => {
    expect(INTERESTS).toHaveLength(28);
    expect(INTERESTS.map((i) => i.value)).toContain("scripture-study");
    expect(INTERESTS.map((i) => i.value)).toContain("paleo-hebrew");
    expect(INTERESTS.map((i) => i.value)).toContain("homesteading");
  });

  it("PERSONALITY_TRAITS has 12 options", () => {
    expect(PERSONALITY_TRAITS).toHaveLength(12);
    expect(PERSONALITY_TRAITS.map((p) => p.value)).toContain("introverted");
    expect(PERSONALITY_TRAITS.map((p) => p.value)).toContain("nurturing");
  });

  it("RELOCATIONS has 4 options", () => {
    expect(RELOCATIONS).toHaveLength(4);
  });

  it("COMMUNICATION_PREFS has 5 options", () => {
    expect(COMMUNICATION_PREFS).toHaveLength(5);
  });

  it("Types compose correctly", () => {
    const e: Ethnicity[] = ["afro-caribbean", "mixed-heritage"];
    const n: Nationality = "barbadian";
    const i: Interest[] = ["scripture-study", "hebrew-language"];
    const p: PersonalityTrait[] = ["introverted", "intellectual"];
    const r: Relocation = "will-relocate";
    const c: CommunicationPref[] = ["video-calls", "in-person"];
    expect(e).toHaveLength(2);
    expect(n).toBe("barbadian");
    expect(i).toHaveLength(2);
    expect(p).toHaveLength(2);
    expect(r).toBe("will-relocate");
    expect(c).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement Ethnicity, Nationality, Interests, Personality, Relocation, Communication**

Append to `src/lib/profile-schema.ts`:

```ts
// Ethnicity ---------------------------------------------------------------

export type Ethnicity =
  | "afro-caribbean"
  | "afro-american"
  | "afro-latino"
  | "native-american"
  | "native-african"
  | "east-african"
  | "west-african"
  | "southern-african"
  | "european"
  | "mediterranean"
  | "eurasian"
  | "hispanic-latino"
  | "middle-eastern"
  | "south-asian"
  | "southeast-asian"
  | "mixed-heritage"
  | "other";

export const ETHNICITIES: ReadonlyArray<{ value: Ethnicity; label: string }> = [
  { value: "afro-caribbean",   label: "Afro-Caribbean" },
  { value: "afro-american",    label: "Afro-American" },
  { value: "afro-latino",      label: "Afro-Latino" },
  { value: "native-american",  label: "Native American" },
  { value: "native-african",   label: "Native African" },
  { value: "east-african",     label: "East African" },
  { value: "west-african",     label: "West African" },
  { value: "southern-african", label: "Southern African" },
  { value: "european",         label: "European" },
  { value: "mediterranean",    label: "Mediterranean" },
  { value: "eurasian",         label: "Eurasian" },
  { value: "hispanic-latino",  label: "Hispanic / Latino" },
  { value: "middle-eastern",   label: "Middle Eastern" },
  { value: "south-asian",      label: "South Asian" },
  { value: "southeast-asian",  label: "Southeast Asian" },
  { value: "mixed-heritage",   label: "Mixed Heritage" },
  { value: "other",            label: "Other" },
];

// Nationality (curated — not exhaustive; allows free-text "other") ---------

export type Nationality =
  | "barbadian"
  | "jamaican"
  | "trinidadian"
  | "guyanese"
  | "american"
  | "canadian"
  | "nigerian"
  | "ghanaian"
  | "kenyan"
  | "ethiopian"
  | "british"
  | "french"
  | "brazilian"
  | "dominican"
  | "haitian"
  | "mexican"
  | "colombian"
  | "south-african"
  | "israeli"
  | "other";

export const NATIONALITIES: ReadonlyArray<{ value: Nationality; label: string }> = [
  { value: "barbadian",     label: "Barbadian" },
  { value: "jamaican",      label: "Jamaican" },
  { value: "trinidadian",   label: "Trinidadian" },
  { value: "guyanese",      label: "Guyanese" },
  { value: "american",      label: "American" },
  { value: "canadian",      label: "Canadian" },
  { value: "nigerian",      label: "Nigerian" },
  { value: "ghanaian",      label: "Ghanaian" },
  { value: "kenyan",        label: "Kenyan" },
  { value: "ethiopian",     label: "Ethiopian" },
  { value: "british",       label: "British" },
  { value: "french",        label: "French" },
  { value: "brazilian",     label: "Brazilian" },
  { value: "dominican",     label: "Dominican" },
  { value: "haitian",       label: "Haitian" },
  { value: "mexican",       label: "Mexican" },
  { value: "colombian",     label: "Colombian" },
  { value: "south-african", label: "South African" },
  { value: "israeli",       label: "Israeli" },
  { value: "other",         label: "Other" },
];

// Interests (multi-select) ------------------------------------------------

export type Interest =
  | "scripture-study"
  | "hebrew-language"
  | "paleo-hebrew"
  | "homesteading"
  | "farming"
  | "gardening"
  | "health-wellness"
  | "fitness"
  | "business-entrepreneurship"
  | "modest-fashion"
  | "natural-hair"
  | "music-ministry"
  | "feast-gatherings"
  | "camping"
  | "hiking"
  | "travel"
  | "cooking"
  | "family-life"
  | "community-building"
  | "youth-mentorship"
  | "street-teaching"
  | "content-creation"
  | "apologetics"
  | "debate"
  | "history-research"
  | "ancient-cultures"
  | "prophecy-studies"
  | "survival-skills";

export const INTERESTS: ReadonlyArray<{ value: Interest; label: string }> = [
  { value: "scripture-study",          label: "Scripture Study" },
  { value: "hebrew-language",          label: "Hebrew Language" },
  { value: "paleo-hebrew",             label: "Paleo Hebrew" },
  { value: "homesteading",             label: "Homesteading" },
  { value: "farming",                  label: "Farming" },
  { value: "gardening",                label: "Gardening" },
  { value: "health-wellness",          label: "Health & Wellness" },
  { value: "fitness",                  label: "Fitness" },
  { value: "business-entrepreneurship", label: "Business / Entrepreneurship" },
  { value: "modest-fashion",           label: "Modest Fashion" },
  { value: "natural-hair",             label: "Natural Hair" },
  { value: "music-ministry",           label: "Music Ministry" },
  { value: "feast-gatherings",         label: "Feast Gatherings" },
  { value: "camping",                  label: "Camping" },
  { value: "hiking",                   label: "Hiking" },
  { value: "travel",                   label: "Travel" },
  { value: "cooking",                  label: "Cooking" },
  { value: "family-life",              label: "Family Life" },
  { value: "community-building",       label: "Community Building" },
  { value: "youth-mentorship",         label: "Youth Mentorship" },
  { value: "street-teaching",          label: "Street Teaching" },
  { value: "content-creation",         label: "Content Creation" },
  { value: "apologetics",              label: "Apologetics" },
  { value: "debate",                   label: "Debate" },
  { value: "history-research",         label: "History Research" },
  { value: "ancient-cultures",         label: "Ancient Cultures" },
  { value: "prophecy-studies",         label: "Prophecy Studies" },
  { value: "survival-skills",          label: "Survival Skills" },
];

// Personality traits (multi-select) ---------------------------------------

export type PersonalityTrait =
  | "introverted"
  | "extroverted"
  | "reserved"
  | "intellectual"
  | "traditional"
  | "humorous"
  | "adventurous"
  | "calm"
  | "assertive"
  | "leadership-oriented"
  | "nurturing"
  | "disciplined";

export const PERSONALITY_TRAITS: ReadonlyArray<{ value: PersonalityTrait; label: string }> = [
  { value: "introverted",          label: "Introverted" },
  { value: "extroverted",          label: "Extroverted" },
  { value: "reserved",             label: "Reserved" },
  { value: "intellectual",         label: "Intellectual" },
  { value: "traditional",          label: "Traditional" },
  { value: "humorous",             label: "Humorous" },
  { value: "adventurous",          label: "Adventurous" },
  { value: "calm",                 label: "Calm" },
  { value: "assertive",            label: "Assertive" },
  { value: "leadership-oriented",  label: "Leadership oriented" },
  { value: "nurturing",            label: "Nurturing" },
  { value: "disciplined",          label: "Disciplined" },
];

// Relocation + Communication ----------------------------------------------

export type Relocation =
  | "will-relocate"
  | "wants-partner-willing"
  | "local-only"
  | "international-open";

export const RELOCATIONS: ReadonlyArray<{ value: Relocation; label: string }> = [
  { value: "will-relocate",         label: "Will relocate" },
  { value: "wants-partner-willing", label: "Wants partner willing to relocate" },
  { value: "local-only",            label: "Local only" },
  { value: "international-open",    label: "International open" },
];

export type CommunicationPref =
  | "frequent"
  | "slow-paced-courtship"
  | "video-calls"
  | "texting"
  | "in-person";

export const COMMUNICATION_PREFS: ReadonlyArray<{ value: CommunicationPref; label: string }> = [
  { value: "frequent",             label: "Frequent communication" },
  { value: "slow-paced-courtship", label: "Slow paced courtship" },
  { value: "video-calls",          label: "Video calls preferred" },
  { value: "texting",              label: "Texting preferred" },
  { value: "in-person",            label: "In-person preferred" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 28 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add ethnicity, nationality, interests, personality, relocation, communication"
```

---

## Task 7: Verification tags + Boundary tags

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type VerificationTag,
  type BoundaryTag,
  VERIFICATION_TAGS,
  BOUNDARY_TAGS,
} from "@/lib/profile-schema";

describe("Verification + Boundary tags", () => {
  it("VERIFICATION_TAGS has 4 options", () => {
    expect(VERIFICATION_TAGS.map((v) => v.value)).toEqual([
      "government-id",
      "assembly",
      "community-references",
      "video-selfie",
    ]);
  });

  it("BOUNDARY_TAGS has 5 options", () => {
    expect(BOUNDARY_TAGS.map((b) => b.value)).toEqual([
      "monogamy-only",
      "no-long-distance",
      "no-additional-spouses",
      "no-smokers",
      "serious-courtship-only",
    ]);
  });

  it("Types are arrays in profile shape", () => {
    const v: VerificationTag[] = ["government-id", "video-selfie"];
    const b: BoundaryTag[] = ["no-smokers", "monogamy-only"];
    expect(v).toHaveLength(2);
    expect(b).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement verification + boundary tags**

Append to `src/lib/profile-schema.ts`:

```ts
// Verification tags (set, not tier — combinable) --------------------------

export type VerificationTag =
  | "government-id"
  | "assembly"
  | "community-references"
  | "video-selfie";

export const VERIFICATION_TAGS: ReadonlyArray<{ value: VerificationTag; label: string }> = [
  { value: "government-id",        label: "Government ID verified" },
  { value: "assembly",             label: "Assembly verified" },
  { value: "community-references", label: "Community references" },
  { value: "video-selfie",         label: "Video selfie verified" },
];

// Boundary tags (auto-apply hard filters in discovery) --------------------

export type BoundaryTag =
  | "monogamy-only"
  | "no-long-distance"
  | "no-additional-spouses"
  | "no-smokers"
  | "serious-courtship-only";

export const BOUNDARY_TAGS: ReadonlyArray<{ value: BoundaryTag; label: string }> = [
  { value: "monogamy-only",          label: "Monogamy only" },
  { value: "no-long-distance",       label: "No long distance" },
  { value: "no-additional-spouses",  label: "No additional spouses" },
  { value: "no-smokers",             label: "No smokers" },
  { value: "serious-courtship-only", label: "Serious courtship only" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 31 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add verification + boundary tags"
```

---

## Task 8: Profile aggregate type + MINIMUM_COMPLETE_FIELDS

**Files:**
- Modify: `src/lib/profile-schema.ts` (append)
- Modify: `tests/lib/profile-schema.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  type Profile,
  MINIMUM_COMPLETE_FIELDS,
  emptyProfile,
} from "@/lib/profile-schema";

describe("Profile aggregate", () => {
  it("emptyProfile() returns a Profile with all optional fields undefined", () => {
    const p = emptyProfile();
    expect(p.firstName).toBeUndefined();
    expect(p.age).toBeUndefined();
    expect(p.sex).toBeUndefined();
    expect(p.assembly).toBeUndefined();
    expect(p.feastDays).toBeUndefined();
    expect(p.interests).toBeUndefined();
  });

  it("MINIMUM_COMPLETE_FIELDS lists the soft-required fields", () => {
    // Per 2026-05-11 soft-completeness decision: only these are required to
    // browse /discover. Everything else can be filled in /profile/edit.
    expect(MINIMUM_COMPLETE_FIELDS).toEqual([
      "firstName",
      "age",
      "sex",
      "country",
      "assembly",
      "torahLevel",
    ]);
  });

  it("Profile accepts both shapes (male intent / female intent)", () => {
    const male: Profile = {
      firstName: "Daniel",
      age: 32,
      sex: "male",
      intent: "first-wife",
    };
    const female: Profile = {
      firstName: "Esther",
      age: 28,
      sex: "female",
      intent: "unmarried-man",
    };
    expect(male.intent).toBe("first-wife");
    expect(female.intent).toBe("unmarried-man");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Profile`, `MINIMUM_COMPLETE_FIELDS`, `emptyProfile` not exported.

- [ ] **Step 3: Implement Profile aggregate**

Append to `src/lib/profile-schema.ts`:

```ts
// Profile aggregate -------------------------------------------------------
// Every field optional per 2026-05-11 soft-completeness model.
// `MINIMUM_COMPLETE_FIELDS` is the soft-required set users must fill before
// /discover access (enforced by `computeCompleteness`).

export type Profile = {
  // Basic identity
  firstName?: string;
  displayName?: string;
  age?: number;
  sex?: Sex;
  country?: string;        // 2-letter ISO from src/lib/countries.ts
  stateOrProvince?: string;
  city?: string;
  nationality?: Nationality;
  ethnicities?: Ethnicity[];
  languages?: string[];    // language codes from /onboarding/languages
  occupation?: string;
  education?: string;
  bio?: string;            // also called "Testimony" in copy for this audience
  // Relationship intent (gender-conditional)
  intent?: Intent;
  // Faith cluster
  assembly?: Assembly;
  torahLevel?: TorahLevel;
  shabbat?: Shabbat;
  feastDays?: FeastDay[];
  calendar?: Calendar;
  // Doctrine cluster
  polygyny?: Polygyny;
  headCovering?: HeadCovering;
  tzitzit?: Tzitzit;
  // Lifestyle cluster
  familyViews?: FamilyView[];
  livingPreferences?: LivingPreference[];
  healthTags?: HealthTag[];
  // Interests + personality
  interests?: Interest[];
  personalityTraits?: PersonalityTrait[];
  // Practical compatibility
  relocation?: Relocation;
  communicationPrefs?: CommunicationPref[];
  // Verification + boundaries
  verificationTags?: VerificationTag[];
  boundaryTags?: BoundaryTag[];
  // Voice intro + prompt cards (placeholders — sub-plans 3 + 6)
  voiceIntroUrl?: string;
  promptCards?: Array<{ promptId: string; answer: string }>;
};

/**
 * Soft-required field names. Users can finish minimal onboarding by filling
 * these, then complete the rest in /profile/edit. `computeCompleteness`
 * checks profile completion against this list for the "discover-eligible"
 * gate; the full ~30-field completion drives the visual "X% complete" badge.
 */
export const MINIMUM_COMPLETE_FIELDS: ReadonlyArray<keyof Profile> = [
  "firstName",
  "age",
  "sex",
  "country",
  "assembly",
  "torahLevel",
];

export function emptyProfile(): Profile {
  return {};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 34 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-schema.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add Profile aggregate + MINIMUM_COMPLETE_FIELDS + emptyProfile"
```

---

## Task 9: `computeCompleteness` pure function

**Files:**
- Create: `src/lib/profile-completeness.ts`
- Create: `tests/lib/profile-completeness.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/profile-completeness.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyProfile } from "@/lib/profile-schema";
import {
  computeCompleteness,
  isDiscoverEligible,
} from "@/lib/profile-completeness";

describe("computeCompleteness", () => {
  it("returns 0% for an empty profile", () => {
    const r = computeCompleteness(emptyProfile());
    expect(r.percent).toBe(0);
    expect(r.requiredFilled).toBe(0);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(false);
  });

  it("counts every required field once it's set", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(3);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(false);
  });

  it("flips discoverEligible to true once all 6 required fields are filled", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      country: "BB",
      assembly: "torah-observant",
      torahLevel: "intermediate",
    });
    expect(r.requiredFilled).toBe(6);
    expect(r.requiredTotal).toBe(6);
    expect(r.discoverEligible).toBe(true);
  });

  it("treats empty string and 0 as not-filled", () => {
    const r = computeCompleteness({
      firstName: "",
      age: 0,
      sex: "male",
    });
    expect(r.requiredFilled).toBe(1); // sex only
  });

  it("treats empty array as not-filled", () => {
    const r = computeCompleteness({
      firstName: "Daniel",
      age: 32,
      sex: "male",
      country: "BB",
      assembly: "torah-observant",
      torahLevel: "intermediate",
      feastDays: [],
      interests: [],
    });
    expect(r.requiredFilled).toBe(6);
    // empty arrays do NOT contribute to the optional percent
    expect(r.percent).toBeLessThan(100);
  });

  it("percent reaches 100 only when all schema fields are populated", () => {
    const full = {
      firstName: "Daniel",
      displayName: "Daniel B.",
      age: 32,
      sex: "male" as const,
      country: "BB",
      stateOrProvince: "St. Michael",
      city: "Bridgetown",
      nationality: "barbadian" as const,
      ethnicities: ["afro-caribbean"] as const,
      languages: ["en"],
      occupation: "Carpenter",
      education: "Trade school",
      bio: "Testimony…",
      intent: "first-wife" as const,
      assembly: "torah-observant" as const,
      torahLevel: "intermediate" as const,
      shabbat: "friday-sunset-saturday-sunset" as const,
      feastDays: ["passover"] as const,
      calendar: "aviv-barley" as const,
      polygyny: "supports" as const,
      headCovering: "encouraged" as const,
      tzitzit: "regularly" as const,
      familyViews: ["wants-children"] as const,
      livingPreferences: ["rural"] as const,
      healthTags: ["non-smoker"] as const,
      interests: ["scripture-study"] as const,
      personalityTraits: ["nurturing"] as const,
      relocation: "international-open" as const,
      communicationPrefs: ["video-calls"] as const,
      verificationTags: ["government-id"] as const,
      boundaryTags: ["no-smokers"] as const,
      voiceIntroUrl: "stub://voice.webm",
      promptCards: [{ promptId: "p1", answer: "…" }],
    };
    const r = computeCompleteness(full);
    expect(r.percent).toBe(100);
    expect(r.discoverEligible).toBe(true);
  });
});

describe("isDiscoverEligible", () => {
  it("is true when all 6 minimum-required fields are filled", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        country: "BB",
        assembly: "torah-observant",
        torahLevel: "intermediate",
      }),
    ).toBe(true);
  });

  it("is false when any single minimum-required field is missing", () => {
    expect(
      isDiscoverEligible({
        firstName: "Daniel",
        age: 32,
        sex: "male",
        country: "BB",
        assembly: "torah-observant",
        // torahLevel missing
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '@/lib/profile-completeness'`.

- [ ] **Step 3: Implement `computeCompleteness` + `isDiscoverEligible`**

Create `src/lib/profile-completeness.ts`:

```ts
import {
  type Profile,
  MINIMUM_COMPLETE_FIELDS,
} from "@/lib/profile-schema";

export type CompletenessResult = {
  /** 0-100 — fraction of ALL schema fields populated. */
  percent: number;
  /** How many of the 6 minimum-required fields are filled. */
  requiredFilled: number;
  /** Total minimum-required fields (always 6 in v1). */
  requiredTotal: number;
  /** True iff every minimum-required field is filled. */
  discoverEligible: boolean;
};

/**
 * Field-level "filled" check.
 *   - undefined / null → not filled
 *   - empty string     → not filled
 *   - 0                → not filled (age=0 is invalid)
 *   - empty array      → not filled
 *   - everything else  → filled
 */
function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

// All Profile keys, hard-coded for deterministic %-complete. If the schema
// adds a field, add it here. (Could be derived via `keyof Profile` but
// TypeScript can't iterate type keys at runtime.)
const ALL_FIELDS: ReadonlyArray<keyof Profile> = [
  "firstName", "displayName", "age", "sex",
  "country", "stateOrProvince", "city",
  "nationality", "ethnicities", "languages",
  "occupation", "education", "bio",
  "intent",
  "assembly", "torahLevel", "shabbat", "feastDays", "calendar",
  "polygyny", "headCovering", "tzitzit",
  "familyViews", "livingPreferences", "healthTags",
  "interests", "personalityTraits",
  "relocation", "communicationPrefs",
  "verificationTags", "boundaryTags",
  "voiceIntroUrl", "promptCards",
];

export function computeCompleteness(profile: Profile): CompletenessResult {
  const requiredFilled = MINIMUM_COMPLETE_FIELDS.filter((k) =>
    isFilled(profile[k]),
  ).length;

  const allFilled = ALL_FIELDS.filter((k) => isFilled(profile[k])).length;
  const percent = Math.round((allFilled / ALL_FIELDS.length) * 100);

  return {
    percent,
    requiredFilled,
    requiredTotal: MINIMUM_COMPLETE_FIELDS.length,
    discoverEligible: requiredFilled === MINIMUM_COMPLETE_FIELDS.length,
  };
}

export function isDiscoverEligible(profile: Profile): boolean {
  return computeCompleteness(profile).discoverEligible;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 7 new tests in `profile-completeness.test.ts`. Total 41.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-completeness.ts tests/lib/profile-completeness.test.ts
git commit -m "feat(schema): add computeCompleteness + isDiscoverEligible pure functions"
```

---

## Task 10: localStorage adapter `use-profile-storage`

**Files:**
- Create: `src/lib/use-profile-storage.ts`
- Create: `tests/lib/use-profile-storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/use-profile-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  STORAGE_KEY,
} from "@/lib/use-profile-storage";
import { emptyProfile } from "@/lib/profile-schema";

describe("profile storage adapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("STORAGE_KEY is namespaced for Ahavah", () => {
    expect(STORAGE_KEY).toBe("ahavah.profile.v1");
  });

  it("loadProfile returns emptyProfile when storage is empty", () => {
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("saveProfile + loadProfile round-trips a Profile", () => {
    const p = {
      firstName: "Daniel",
      age: 32,
      sex: "male" as const,
      assembly: "torah-observant" as const,
      feastDays: ["passover", "shavuot"] as const,
    };
    saveProfile(p);
    const loaded = loadProfile();
    expect(loaded.firstName).toBe("Daniel");
    expect(loaded.feastDays).toEqual(["passover", "shavuot"]);
  });

  it("loadProfile recovers gracefully from malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("clearProfile removes the stored value", () => {
    saveProfile({ firstName: "Daniel" });
    clearProfile();
    expect(loadProfile()).toEqual(emptyProfile());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '@/lib/use-profile-storage'`.

- [ ] **Step 3: Implement storage adapter**

Create `src/lib/use-profile-storage.ts`:

```ts
import { emptyProfile, type Profile } from "@/lib/profile-schema";

export const STORAGE_KEY = "ahavah.profile.v1";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return emptyProfile();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProfile();
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    // Malformed JSON — reset to empty rather than crash the app.
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 5 new tests. Total 46.

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-profile-storage.ts tests/lib/use-profile-storage.test.ts
git commit -m "feat(schema): add localStorage adapter for Profile (load/save/clear)"
```

---

## Task 11: `useProfile()` React hook

**Files:**
- Create: `src/lib/use-profile.ts`

No test for the hook in this sub-plan — React Testing Library setup belongs in sub-plan 2 when it's needed for component tests. The hook is thin glue over the already-tested storage adapter, so its behavior is covered by `use-profile-storage.test.ts` plus React's own rules.

- [ ] **Step 1: Write the hook**

Create `src/lib/use-profile.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type Profile,
  emptyProfile,
} from "@/lib/profile-schema";
import {
  loadProfile,
  saveProfile,
} from "@/lib/use-profile-storage";

/**
 * Client-side profile hook. Reads from localStorage on mount, exposes
 * `profile` + `setProfile` + an `update(patch)` helper. Persists every
 * change to localStorage automatically.
 *
 * SSR-safe: returns emptyProfile() on first render server-side and
 * rehydrates from localStorage on mount.
 */
export function useProfile(): {
  profile: Profile;
  setProfile: (p: Profile) => void;
  update: (patch: Partial<Profile>) => void;
  loaded: boolean;
} {
  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfileState(loadProfile());
    setLoaded(true);
  }, []);

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    saveProfile(next);
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);

  return { profile, setProfile, update, loaded };
}
```

- [ ] **Step 2: Verify tsc clean**

Run: `cd /d/Antigravity/ahavah-web && NODE_OPTIONS="--max-old-space-size=12288" npx tsc --noEmit --incremental false`
Expected: silent (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/lib/use-profile.ts
git commit -m "feat(schema): add useProfile React hook with localStorage persistence"
```

---

## Task 12: 8 seed sample profiles

**Files:**
- Create: `src/lib/profile-sample.ts`
- Modify: `tests/lib/profile-schema.test.ts` (append sample-validity test)

- [ ] **Step 1: Write the failing test (samples validate)**

Append to `tests/lib/profile-schema.test.ts`:

```ts
import {
  SAMPLE_PROFILES,
  sampleByName,
} from "@/lib/profile-sample";
import { computeCompleteness } from "@/lib/profile-completeness";

describe("Sample profiles", () => {
  it("SAMPLE_PROFILES has exactly 8 entries", () => {
    expect(SAMPLE_PROFILES).toHaveLength(8);
  });

  it("all 8 samples are discoverEligible (minimum 6 fields filled)", () => {
    for (const p of SAMPLE_PROFILES) {
      expect(computeCompleteness(p).discoverEligible).toBe(true);
    }
  });

  it("samples cover both sexes (4 male, 4 female)", () => {
    const males = SAMPLE_PROFILES.filter((p) => p.sex === "male");
    const females = SAMPLE_PROFILES.filter((p) => p.sex === "female");
    expect(males).toHaveLength(4);
    expect(females).toHaveLength(4);
  });

  it("samples cover all 4 Torah levels at least once", () => {
    const levels = new Set(SAMPLE_PROFILES.map((p) => p.torahLevel));
    expect(levels.size).toBe(4);
  });

  it("samples cover both polygyny stances (supports + monogamy-only)", () => {
    const polygyny = new Set(
      SAMPLE_PROFILES.map((p) => p.polygyny).filter(Boolean),
    );
    expect(polygyny.has("supports")).toBe(true);
    expect(polygyny.has("monogamy-only")).toBe(true);
  });

  it("sampleByName looks up by firstName (case-insensitive)", () => {
    expect(sampleByName("Daniel")).toBeDefined();
    expect(sampleByName("daniel")).toBeDefined();
    expect(sampleByName("Nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '@/lib/profile-sample'`.

- [ ] **Step 3: Implement sample profiles**

Create `src/lib/profile-sample.ts`:

```ts
import type { Profile } from "@/lib/profile-schema";

/**
 * 8 seed sample profiles for development + sub-plan testing.
 * 4 male + 4 female; covers all 4 Torah levels; covers both polygyny
 * stances; varies country/ethnicity. Each profile passes
 * `computeCompleteness().discoverEligible` (all 6 minimum fields).
 */
export const SAMPLE_PROFILES: ReadonlyArray<Profile> = [
  {
    firstName: "Daniel",
    age: 32,
    sex: "male",
    country: "BB",
    nationality: "barbadian",
    ethnicities: ["afro-caribbean"],
    languages: ["en"],
    assembly: "torah-observant",
    torahLevel: "experienced",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "shavuot", "sukkot", "yom-kippur"],
    calendar: "aviv-barley",
    intent: "first-wife",
    polygyny: "supports",
    headCovering: "encouraged",
    tzitzit: "regularly",
    familyViews: ["wants-children", "interested-large-family"],
    livingPreferences: ["rural", "homestead"],
    healthTags: ["non-smoker", "no-alcohol", "natural-health"],
    interests: ["scripture-study", "hebrew-language", "homesteading"],
    personalityTraits: ["leadership-oriented", "disciplined", "calm"],
    relocation: "wants-partner-willing",
    communicationPrefs: ["video-calls", "in-person"],
    verificationTags: ["government-id", "video-selfie"],
    boundaryTags: [],
    bio: "Carpenter, homesteader, learning to live by Torah day-by-day. Looking to build a Torah-keeping household together.",
  },
  {
    firstName: "Esther",
    age: 28,
    sex: "female",
    country: "US",
    nationality: "american",
    ethnicities: ["afro-american"],
    languages: ["en"],
    assembly: "hebrew-israelite",
    torahLevel: "intermediate",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "trumpets", "yom-kippur", "sukkot"],
    calendar: "observational-new-moon",
    intent: "unmarried-man",
    polygyny: "monogamy-only",
    headCovering: "required",
    familyViews: ["wants-children"],
    livingPreferences: ["urban", "community-living"],
    healthTags: ["non-smoker", "fitness"],
    interests: ["modest-fashion", "music-ministry", "feast-gatherings"],
    personalityTraits: ["nurturing", "intellectual"],
    relocation: "local-only",
    communicationPrefs: ["texting", "in-person"],
    verificationTags: ["government-id"],
    boundaryTags: ["monogamy-only", "no-smokers"],
    bio: "Teacher and worshipper. Looking for a man of Torah who will lead a household.",
  },
  {
    firstName: "Yosef",
    age: 41,
    sex: "male",
    country: "JM",
    nationality: "jamaican",
    ethnicities: ["afro-caribbean"],
    languages: ["en"],
    assembly: "hebrew-israelite",
    torahLevel: "intermediate",
    shabbat: "luni-solar",
    feastDays: ["passover", "shavuot", "trumpets", "yom-kippur", "sukkot"],
    calendar: "luni-solar",
    intent: "additional-wife",
    polygyny: "supports",
    headCovering: "encouraged",
    tzitzit: "occasionally",
    familyViews: ["has-children", "open-to-more"],
    livingPreferences: ["rural"],
    healthTags: ["non-smoker", "moderate-alcohol", "prepper"],
    interests: ["history-research", "prophecy-studies", "ancient-cultures"],
    personalityTraits: ["traditional", "assertive"],
    relocation: "international-open",
    communicationPrefs: ["video-calls", "frequent"],
    verificationTags: ["government-id", "video-selfie", "community-references"],
    boundaryTags: [],
    bio: "Father of three, ten years in the assembly, building toward a Torah-led house.",
  },
  {
    firstName: "Adina",
    age: 24,
    sex: "female",
    country: "IL",
    nationality: "israeli",
    ethnicities: ["middle-eastern"],
    languages: ["en", "he"],
    assembly: "messianic",
    torahLevel: "experienced",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "shavuot", "trumpets", "yom-kippur", "sukkot", "hanukkah", "purim"],
    calendar: "rabbinic",
    intent: "courtship",
    polygyny: "monogamy-only",
    headCovering: "encouraged",
    familyViews: ["wants-children"],
    livingPreferences: ["urban"],
    healthTags: ["non-smoker", "no-alcohol", "fitness"],
    interests: ["hebrew-language", "paleo-hebrew", "music-ministry", "scripture-study"],
    personalityTraits: ["intellectual", "calm", "humorous"],
    relocation: "international-open",
    communicationPrefs: ["video-calls"],
    verificationTags: ["government-id"],
    boundaryTags: ["monogamy-only", "serious-courtship-only"],
    bio: "Born here, came back to Torah three years ago. Music ministry and scripture study fill my week.",
  },
  {
    firstName: "Caleb",
    age: 36,
    sex: "male",
    country: "ZA",
    nationality: "south-african",
    ethnicities: ["southern-african"],
    languages: ["en"],
    assembly: "independent",
    torahLevel: "intermediate",
    shabbat: "saturday-only",
    feastDays: ["passover", "yom-kippur", "sukkot"],
    calendar: "rabbinic",
    intent: "marriage-only",
    polygyny: "open",
    headCovering: "optional",
    tzitzit: "occasionally",
    familyViews: ["wants-children", "open-blended"],
    livingPreferences: ["rural", "off-grid"],
    healthTags: ["non-smoker", "prepper", "natural-health"],
    interests: ["survival-skills", "farming", "apologetics"],
    personalityTraits: ["reserved", "disciplined"],
    relocation: "wants-partner-willing",
    communicationPrefs: ["slow-paced-courtship"],
    verificationTags: ["government-id"],
    boundaryTags: ["no-long-distance"],
    bio: "Smallholding farmer. Steady. Looking for a partner who values land and quiet.",
  },
  {
    firstName: "Rivka",
    age: 31,
    sex: "female",
    country: "GB",
    nationality: "british",
    ethnicities: ["afro-caribbean", "european", "mixed-heritage"],
    languages: ["en", "fr"],
    assembly: "christian-transitioning",
    torahLevel: "learning",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "sukkot"],
    calendar: "aviv-barley",
    intent: "open-to-relocation",
    polygyny: "undecided",
    headCovering: "encouraged",
    familyViews: ["wants-children"],
    livingPreferences: ["urban", "open-to-relocation"],
    healthTags: ["non-smoker", "fitness", "herbalist"],
    interests: ["scripture-study", "natural-hair", "modest-fashion", "cooking"],
    personalityTraits: ["adventurous", "extroverted", "nurturing"],
    relocation: "international-open",
    communicationPrefs: ["video-calls", "frequent"],
    verificationTags: ["government-id", "video-selfie"],
    boundaryTags: [],
    bio: "Two years out of the church, two years into Torah. Curious, learning, ready for a partner who's a few steps ahead.",
  },
  {
    firstName: "Ezekiel",
    age: 47,
    sex: "male",
    country: "NG",
    nationality: "nigerian",
    ethnicities: ["west-african"],
    languages: ["en"],
    assembly: "non-denom-torah",
    torahLevel: "experienced",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "shavuot", "trumpets", "yom-kippur", "sukkot", "hanukkah"],
    calendar: "aviv-barley",
    intent: "additional-wife",
    polygyny: "supports",
    headCovering: "required",
    tzitzit: "regularly",
    familyViews: ["has-children", "interested-large-family"],
    livingPreferences: ["rural", "homestead", "community-living"],
    healthTags: ["non-smoker", "no-alcohol", "natural-health", "herbalist"],
    interests: ["scripture-study", "youth-mentorship", "community-building", "prophecy-studies"],
    personalityTraits: ["leadership-oriented", "traditional", "disciplined", "calm"],
    relocation: "international-open",
    communicationPrefs: ["video-calls", "slow-paced-courtship"],
    verificationTags: ["government-id", "video-selfie", "assembly", "community-references"],
    boundaryTags: [],
    bio: "Husband, father, teacher. Polygyny-practicing 12 years. Open to a sincere co-wife who values family + community.",
  },
  {
    firstName: "Tirzah",
    age: 22,
    sex: "female",
    country: "GH",
    nationality: "ghanaian",
    ethnicities: ["west-african"],
    languages: ["en"],
    assembly: "torah-observant",
    torahLevel: "beginner",
    shabbat: "friday-sunset-saturday-sunset",
    feastDays: ["passover", "sukkot"],
    calendar: "aviv-barley",
    intent: "courtship",
    polygyny: "open",
    headCovering: "encouraged",
    familyViews: ["wants-children"],
    livingPreferences: ["urban", "open-to-relocation"],
    healthTags: ["non-smoker", "no-alcohol"],
    interests: ["music-ministry", "cooking", "youth-mentorship"],
    personalityTraits: ["humorous", "nurturing", "adventurous"],
    relocation: "international-open",
    communicationPrefs: ["video-calls", "frequent"],
    verificationTags: ["government-id"],
    boundaryTags: ["serious-courtship-only"],
    bio: "Recently came into Torah observance. Joyful, growing, looking for a man rooted in his walk.",
  },
];

/** Case-insensitive lookup by firstName. */
export function sampleByName(name: string): Profile | undefined {
  const target = name.toLowerCase();
  return SAMPLE_PROFILES.find(
    (p) => p.firstName?.toLowerCase() === target,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS — 6 new tests. Total 52.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-sample.ts tests/lib/profile-schema.test.ts
git commit -m "feat(schema): add 8 seed sample profiles (4 male, 4 female; full schema variety)"
```

---

## Task 13: Final verification — lint, tsc, build, full test suite

- [ ] **Step 1: Run lint**

Run: `cd /d/Antigravity/ahavah-web && NODE_OPTIONS="--max-old-space-size=12288" pnpm lint --max-warnings=0`
Expected: silent (no output, exit 0).

- [ ] **Step 2: Run tsc**

Run: `cd /d/Antigravity/ahavah-web && NODE_OPTIONS="--max-old-space-size=12288" npx tsc --noEmit --incremental false`
Expected: silent (exit 0).

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: all 52 tests pass.

- [ ] **Step 4: Run production build**

Run: `cd /d/Antigravity/ahavah-web && NODE_OPTIONS="--max-old-space-size=12288" pnpm build`
Expected: "Generating static pages using 5 workers (38/38) ✓" + zero new errors compared to the post-Task-39 audit baseline.

- [ ] **Step 5: Final commit (if any uncommitted lint/style fixes accrued)**

```bash
git status
# If clean: nothing to commit
# If lint/format adjustments: git add -A && git commit -m "chore: post-sub-plan-1 housekeeping"
```

---

## Self-review

**Spec coverage** — every cluster from `2026-05-11-torah-observant-matchmaker-roadmap.md` §2 is implemented or assigned to its sub-plan:

- Basic Identity: firstName / age / sex / country / nationality / ethnicities / languages / occupation / education / bio ✓ (Tasks 1, 5, 8); stateOrProvince / city deferred to Sub-plan 2 (UI; the field is already on the Profile type)
- Relationship Intent: Intent + intentOptionsForSex ✓ (Task 2)
- Faith: Assembly / TorahLevel / Shabbat / FeastDay / Calendar ✓ (Task 3)
- Doctrine: Polygyny / HeadCovering / Tzitzit ✓ (Task 4)
- Lifestyle: FamilyView / LivingPreference / HealthTag ✓ (Task 5)
- Ethnicity / Nationality / Interests / PersonalityTrait / Relocation / CommunicationPref ✓ (Task 6)
- Verification + Boundary tags ✓ (Task 7)
- Profile aggregate ✓ (Task 8)
- Completeness calc ✓ (Task 9)
- Persistence ✓ (Tasks 10, 11)
- Seed data ✓ (Task 12)
- Prompt cards: type sketched in Profile (`promptCards?: Array<{ promptId; answer }>`) but content widget deferred to Sub-plan 3
- Voice intro: `voiceIntroUrl?: string` deferred to Sub-plan 6
- Match preference filters: deferred to Sub-plan 4
- Compatibility scoring: deferred to Sub-plan 5

**Placeholder scan:** every step contains real code; every command has expected output; every commit message is concrete. No "TBD" / "similar to" / "add appropriate error handling" anywhere.

**Type consistency:** Function names (`isFilled`, `computeCompleteness`, `isDiscoverEligible`, `intentOptionsForSex`, `loadProfile`, `saveProfile`, `clearProfile`, `useProfile`, `sampleByName`) are used identically across tasks. Type names (`Sex`, `MaleIntent`, `FemaleIntent`, `Intent`, `Assembly`, `TorahLevel`, `Shabbat`, `FeastDay`, `Calendar`, `Polygyny`, `HeadCovering`, `Tzitzit`, `FamilyView`, `LivingPreference`, `HealthTag`, `Ethnicity`, `Nationality`, `Interest`, `PersonalityTrait`, `Relocation`, `CommunicationPref`, `VerificationTag`, `BoundaryTag`, `Profile`) are consistent.

**Estimated total: ~1 session.** 14 tasks, ~3 minutes each = ~45 minutes of execution plus review/intermissions.

---

## Plan complete — saved to `docs/superpowers/plans/2026-05-11-sub-plan-01-profile-schema.md`

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Each task is small enough to run + verify in 1 subagent call.

2. **Inline Execution** — execute tasks in this session using superpowers:executing-plans, batch with checkpoints at every 3-4 tasks for review.

Which approach?

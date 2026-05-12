# Sub-plan 13 — Worldwide Search Integration (Bumpy filter-first model)

> **For agentic workers:** REQUIRED SUB-SKILL — superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign Ahavah's discovery surface with Bumpy's core product premise — **filter-first international discovery** — by restoring country filtering, adding language filtering, surfacing collected-but-hidden international metadata on profile views, and adding a language-match axis to compatibility scoring.

**Architecture:** Pure logic in `src/lib/discover-engine.ts` extended with `country` (multi-select) + `languages` (multi-select intersect) filters. FiltersSheet UI gains two new collapsible groups consuming the existing canonical lists (`countries.ts` 250 entries, `languages.ts` 71 entries). `computeCompatibility` gains a 9th axis (language overlap). `/profile/[uuid]` view surfaces languages + nationality (currently hidden despite being collected). `/onboarding/languages` switches from 14 hardcoded to 71 canonical. All free-tier (premium gating deferred to monetization sub-plan).

**Tech Stack:** Pure web. No new deps. No backend. Tests via vitest.

---

## Context

Bumpy's product spec (`d:/Antigravity/docs/specs/bumpy_dating_app_product_feature_breakdown.md`) is unambiguous:

> Line 47: *"Local dating apps constrain users to nearby pools, while international dating introduces language, trust, and distance barriers. Bumpy tries to solve those barriers through global discovery, verification, and translation."*
>
> Line 130: *"Instead of focusing primarily on nearby matches, the app promotes finding people across countries, cultures, and languages."*
>
> Lines 134-144: Discovery controls are filter-first — country, region, age, gender, dating intention, language, verification, activity, distance/local toggle.

**Current Ahavah state contradicts this premise:**

1. `src/lib/discover-engine.ts:26-30` has a comment that *removed* country filtering pending a "map-zoom-driven (Bumpy-style)" UI. **This is a misread of Bumpy.** Bumpy is explicitly filter-first, not map-based. Spec line 518 contrasts Bumpy with Tinder ("mostly local and swipe-first"); Bumpy "differentiates through **global discovery and translation**." There's no map view in Bumpy's spec; the comment defers to a feature that was never planned.
2. `DiscoverFilters` interface in `discover-engine.ts:36-47` contains no `country`, no `languages`, no `nationality`.
3. `FiltersSheet` (`src/components/app/filters-sheet.tsx`) has no country picker or language picker.
4. `computeCompatibility` has 8 axes — none language-aware, none country-aware. Languages are *collected* in onboarding but never *scored* in ranking.
5. `/profile/[uuid]` page renders `country` (with MapPin icon) but **does not render `languages` or `nationality`** — both fields exist in the schema and are collected, but are invisible to viewers.
6. `/onboarding/languages` hardcodes 14 language options despite `src/lib/languages.ts` exporting 71.

This sub-plan corrects the directional miss. It implements Bumpy's filter-first international model in pure web scope — no lat/lng, no map, no auto-translate (all Tier-4 backend per `docs/BUILD-PLAN.md:226-229`).

---

## Scope decisions locked in this spec

- **Multi-select country** filter (not single). Default "Anywhere" = empty selection, no filter applied.
- **Multi-select language** filter, intersection semantics (candidate matches if at least one selected language is in `candidate.languages`).
- **Language-match axis** added to `computeCompatibility`. Score = `intersectionSize / max(viewer.languages.length, 1)`. Weight: equal to existing axes (treated as one of the 9, equal weight by default).
- **All filters free for now.** Premium gating deferred to the monetization sub-plan.
- **No `country` axis added to scoring.** Country is a filter, not a compatibility signal — putting it in scoring would penalize candidates from different countries even when the user explicitly opened the deck up worldwide. The filter is the lever; scoring stays opinion-neutral on geography.
- **Distance / lat-lng / map view stays out.** Tier 4 backend-blocked (`discover-engine.ts:26-30` comment will be REWRITTEN to reflect this is post-MVP, not "Bumpy-style").
- **Auto-translate stays out.** Tier 4 (`BUILD-PLAN.md:226-229`).

---

## File structure

| File | Role |
|---|---|
| `src/lib/discover-engine.ts` | MODIFY. Add `country?: string[]` + `languages?: string[]` to `DiscoverFilters`. Apply intersection in `applyHardFilters`. Rewrite the misleading lines-26-30 comment. |
| `src/components/app/filters-sheet.tsx` | MODIFY. Two new collapsible groups (Country, Languages). Reuse the existing collapsible `FilterGroup` pattern. Country uses `ALL_COUNTRIES` + `POPULAR_COUNTRIES` from `src/lib/countries.ts`; Languages uses `LANGUAGES` from `src/lib/languages.ts`. Both as multi-select Pill grids matching the existing assemblies / torahLevels groups. |
| `src/lib/scoring/compute-compatibility.ts` | MODIFY. Add `language: number` to `CompatibilityBreakdown`. Implement axis: `intersectionSize / max(viewer.languages?.length, 1)`. Include in the 0..100 normalized total. |
| `src/app/profile/[uuid]/page.tsx` | MODIFY. New "Languages" subsection inside the existing Identity cluster (between country and bio). Render nationality as a Pill next to country if present. Use `labelForLanguage` from `src/lib/languages.ts` for human labels. |
| `src/app/onboarding/languages/page.tsx` | MODIFY. Replace the hardcoded 14-entry LANGUAGES array with import from `src/lib/languages.ts`. Existing primary-language + custom-add interaction preserved. |
| `src/lib/profile-sample.ts` | MODIFY. Enrich the 8 SAMPLE_PROFILES with multi-language values where realistic (e.g., Daniel: en + bjs Bajan creole; Esther: en + es; Adina: en + he + ar; Rivka: en + fr; Yosef: en + jam; Ezekiel: en + yo; Tirzah: en + tw). Stable seeds so existing snapshot expectations don't drift. |
| `tests/lib/discover-engine.test.ts` | EXTEND (or create). ~4 cases for country + language filter intersection (no filter, one match, no match, multi-select). |
| `tests/lib/scoring/compute-compatibility.test.ts` | NEW or EXTEND. ~3 cases for the language axis (perfect overlap, partial overlap, no overlap, empty viewer.languages). |

No new files (only new tests). No new atoms. No new tokens.

---

## Existing primitives reused (verify before adding new)

- **`ALL_COUNTRIES`, `POPULAR_COUNTRIES`, `flagFromCC`** — `src/lib/countries.ts:267-283`. Country source-of-truth.
- **`LANGUAGES`, `labelForLanguage`, `CUSTOM_LANGUAGE_PREFIX`** — `src/lib/languages.ts:19-123`. Language source-of-truth.
- **`computeCompatibility`** — `src/lib/scoring/compute-compatibility.ts`. Existing 8-axis scoring; extend not replace.
- **`Pill` + `Badge`** — kit primitives, already cva-driven (Sub-plan 10 commit `044f033`).
- **FiltersSheet existing collapsible groups** — `src/components/app/filters-sheet.tsx` already has the "I identify as" / "Torah observance stage" / "Polygyny stance" / "Intent" / "Calendar" / "Education" / "Health & lifestyle" pattern. Country + Languages should mirror it exactly.
- **`positionOf`** — `src/lib/wizard-flow.ts`. Onboarding navigation; languages page already uses it.

No new dependencies, no new design tokens, no new motion variants.

---

## Hard rules

1. **Kit-only via cva.** No className overrides on Pill / Button / Sheet. New filter groups must reuse the existing FiltersSheet group composition pattern (collapsible details/summary + multi-select Pills). If anything needs new visual treatment, extend the primitive via cva — don't inline className.
2. **TDD on pure logic.** Discover engine + compatibility scoring changes get failing tests before consumers integrate.
3. **No backend dependencies.** No lat/lng, no fetch, no auto-translate. All filters operate on the in-memory `Profile` shape.
4. **No premium gating in this sub-plan.** Filters are free. The monetization sub-plan will retrofit gating against a single capability check.
5. **Profile-view surfaces are additive.** Don't reflow existing clusters or change their semantics. Languages goes inside the Identity cluster (top of profile), nationality renders as a Pill alongside country.
6. **The misleading discover-engine comment gets rewritten**, not deleted. Future readers need to understand WHY we're filter-first and not map-first. The new comment cites Bumpy spec line 47 + line 130 + line 518 explicitly.
7. **Section 18 sign-off rule.** Every "X is closed/complete" claim in the closure §19 must include a specific verification query (grep, test command, smoke-walk step).

---

## Tasks

### Task 1 — Pure: country filter in discover-engine + tests

**Files:**
- Modify: `src/lib/discover-engine.ts`
- Extend: `tests/lib/discover-engine.test.ts` (create if absent)

**Steps:**

1. Rewrite the comment at `discover-engine.ts:26-30`. New text (paraphrased — agent writes the final wording):
   - Cite Bumpy spec lines 47 + 130 + 518 for the filter-first international model.
   - Note country filter is multi-select; empty = "Anywhere".
   - Distance/lat-lng remain Tier-4 backend per BUILD-PLAN.md:226-229.
2. Add `country?: string[]` to `DiscoverFilters`.
3. In `applyHardFilters`, when `filters.country` is non-empty, retain only candidates whose `country` is in the selected set.
4. Tests: empty, single-country match, no-country-matches → empty deck, multi-country OR semantics.
5. Verify: `npx vitest run`, `npx tsc --noEmit`, lint.

### Task 2 — Pure: languages filter in discover-engine + tests

**Files:**
- Modify: `src/lib/discover-engine.ts`
- Extend: `tests/lib/discover-engine.test.ts`

**Steps:**

1. Add `languages?: string[]` to `DiscoverFilters`.
2. In `applyHardFilters`, when `filters.languages` is non-empty, retain only candidates whose `candidate.languages` array intersects with the selected set (at least one shared language).
3. Tests: empty, one language match, no match, multi-language intersection.
4. Verify.

### Task 3 — Pure: language-match scoring axis

**Files:**
- Modify: `src/lib/scoring/compute-compatibility.ts`
- Extend or create: `tests/lib/scoring/compute-compatibility.test.ts`

**Steps:**

1. Add `language: number` to `CompatibilityBreakdown` type.
2. Implement axis: `language = intersection.size / max(viewer.languages?.length ?? 0, 1)`. Returns 0..1.
3. Include in the weighted-average total (equal weight to existing axes).
4. Tests: viewer en+es vs candidate en+fr → 0.5; viewer en vs candidate ja → 0; viewer empty languages → 0; perfect overlap → 1.
5. Verify; existing scoring tests must continue to pass (no regression on the 8 prior axes).

### Task 4 — FiltersSheet UI: Country group + Languages group

**Files:**
- Modify: `src/components/app/filters-sheet.tsx`

**Steps:**

1. Read existing collapsible group pattern in filters-sheet.tsx (the "I identify as" group is the template).
2. Add `country: string[]` and `languages: string[]` to the local `DiscoverFiltersState` shape.
3. Add two new collapsible groups after the existing "Intent" group:
   - **Country:** multi-select Pill grid. POPULAR_COUNTRIES (19) first, then alphabetized rest. Pills display `${flag} ${name}`.
   - **Languages:** multi-select Pill grid over LANGUAGES (71 entries). Pills display `${flag} ${label}`.
4. `handleApply` includes the new fields (preserving the existing empty-array-pruning logic).
5. `handleReset` clears both new fields.
6. Verify: typecheck, lint, browser smoke walk (open /discover Globe button → both new groups render and selection persists into Apply).

### Task 5 — Profile view surfaces: languages + nationality on `/profile/[uuid]`

**Files:**
- Modify: `src/app/profile/[uuid]/page.tsx`

**Steps:**

1. Inside the Identity cluster (around the country + bio area), add a Languages subsection:
   - Heading: "Languages"
   - Pills (kit `Pill size="sm"`) one per `profile.languages` entry; label resolved via `labelForLanguage`.
   - Hidden when languages is undefined or empty.
2. Render nationality as a Pill next to country (or below name) using NATIONALITY_OPTIONS labels from `profile-schema.ts`.
3. Verify visually at 414×896.

### Task 6 — Onboarding `/onboarding/languages` uses canonical list

**Files:**
- Modify: `src/app/onboarding/languages/page.tsx`

**Steps:**

1. Remove the hardcoded 14-entry LANGUAGES array.
2. Import the canonical LANGUAGES from `src/lib/languages.ts` (71 entries).
3. Preserve existing primary-language + custom-add affordances.
4. Verify the existing ToggleGroup and isComplete logic still works with the larger list.

### Task 7 — Enrich SAMPLE_PROFILES

**Files:**
- Modify: `src/lib/profile-sample.ts`

**Steps:**

1. Update the 8 profiles' `languages` to realistic multi-language sets.
2. Verify all language codes resolve via `labelForLanguage` (no orphans).
3. Run `npx vitest run`; sample-profile tests (if any) pass.
4. Smoke walk on `/profile/esther` → languages section shows the new values.

### Task 8 — Smoke walk + PROJECT-STATUS §19 + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

1. End-to-end smoke walk:
   - `/discover` filters: open Sheet, select country (BB + JM) + language (en) → deck shows only Daniel + Yosef.
   - Clear country filter → deck restores worldwide.
   - Select language only (he) → deck filters to Adina (after Task 7 enrichment).
   - `/profile/esther`: confirm languages Pills render.
   - `/onboarding/languages` (clear localStorage, walk wizard step): confirm 71 languages browseable, primary-tap still works.
2. Append PROJECT-STATUS §19. Strike "Worldwide search" from outstanding sub-plans list. Cite specific verification queries per the §18 rule.
3. `npx tsc --noEmit`, `pnpm exec eslint --max-warnings=0`, `npx vitest run`, `pnpm build`. All must pass.
4. Commit docs. Merge to master via `--no-ff`.

---

## Verification

Per-task (Tasks 1-7):
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 214 (master) + new-task tests pass
- Browser smoke walk for UI tasks (4, 5, 6, 8)

Whole-sub-plan (after Task 8):
- Tests: ≥225 passing.
- TypeCheck clean.
- Lint clean.
- Production build (`pnpm build`) clean — 39 routes resolve.
- End-to-end smoke walk above.
- PROJECT-STATUS §19 cites specific verification queries per the §18 rule.
- `grep -rn "map-zoom-driven" src/` → zero matches (misleading comment is gone).
- `grep -rn "Bumpy" src/lib/discover-engine.ts` → returns the new comment (with spec citations).

---

## Self-review notes

- **Spec coverage:** every Bumpy spec line cited has a corresponding task or scope-fence acknowledgment. Country filter (line 136), language filter (line 141), distance/locality (line 144 → scoped out as Tier-4), verification filter (already present), translation (line 218-228 → Tier-4 deferred).
- **Placeholder scan:** zero TBD / appropriate / similar-to.
- **Type consistency:** new `country?: string[]` and `languages?: string[]` fields use the same array-of-codes shape as existing multi-select fields (assemblies, torahLevels, polygynyStances, intents, calendars, educations, healthTags).
- **DRY:** new FiltersSheet groups mirror the existing collapsible-pattern verbatim (Task 4 reads the existing template before writing).
- **Scope fence:**
  - No backend.
  - No lat/lng, no map view, no auto-translate.
  - No premium gating.
  - No country added to scoring (filter only; compatibility stays geography-neutral).
  - No new design tokens, no new atoms, no new motion variants.
- **Failure-pattern guard:**
  - SDD enforced per task (implementer + spec review + code-quality review).
  - The misleading discover-engine comment that drove the original miss is REPLACED, not just deleted — the new comment grounds future reviewers in the Bumpy spec citations.
  - §19 closure must cite verification queries per §18 sign-off rule.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 8 tasks, mostly bite-sized (Tasks 1-3 are pure-logic TDD; Tasks 4-6 are integration; Task 7 is data; Task 8 is verification + docs). Each task fits a single implementer dispatch + spec review + code-quality review. The pure-logic tasks ship tests first; the UI tasks gate on browser smoke walks.

Estimated subagent invocations: ~24 (8 implementers + 8 spec reviewers + 8 quality reviewers, plus fix-ups as needed).

Branch: `sub-plan-13-worldwide-search`. Merge to master via `--no-ff`.

---

## Note on Sub-plan 12 (Decision-undo)

When this plan was drafted, Sub-plan 12 (Decision-undo) was mid-execution on branch `sub-plan-12-decision-undo` with the spec committed at `a6075ce`. That work is independent and can complete + merge in parallel to (or before) this sub-plan. Sub-plan 13 does not depend on it.

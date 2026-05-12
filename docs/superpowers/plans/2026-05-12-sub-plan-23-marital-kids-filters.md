# Sub-plan 23 — Marital-status + has-kids filters

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`.

**Goal:** Add two new filter sections to `FiltersSheet`: marital status (multi-select Pill grid over the 5 statuses) and has-kids (multi-select with 2 options — "Has children" / "No children"). Both wired through `DiscoverFilters` + `passesAllFilters` so /discover deck and /map markers narrow accordingly.

**Architecture:** Extend `DiscoverFilters` type with `maritalStatuses?: MaritalStatus[]` + `hasChildrenBuckets?: ("has" | "none")[]`. Update `passesAllFilters` with two new predicate branches. FiltersSheet gains 2 new `FilterSection` blocks following the existing assemblies / intents / health-tags pattern. No new dependencies, no new design tokens.

**Tech Stack:** Existing TypeScript + cva + Tailwind v4 + ToggleGroup pill variant (consolidated in SP17 T3). Tests via vitest.

---

## Context

User direction (2026-05-12, post-SP22): "Add widowed to Marital status and allow filters to filter marriage status and whether or not potential match has kids."

Widowed already shipped in the hotfix at `dd44e2c`. SP23 ships the filter UI + engine wiring.

These two filters fit naturally into the existing FiltersSheet (post-SP17 IA, which removed Country + Languages and added the helper "Filter by location on the Map tab"). The IA pattern is: structural attributes get manual multi-select filters; geography is map-driven.

Marital status + child status are structural, not geographic — they belong as manual filters in the sheet.

---

## Scope decisions locked

- **Marital status:** multi-select over the 5 MARITAL_STATUSES (Never Married / Married / Re-married / Divorced / Widowed). Empty selection = no filter. Selecting any subset = candidate.maritalStatus must be in the subset.
- **Has kids:** multi-select with 2 named buckets: `"has"` (candidate.children ≥ 1) and `"none"` (candidate.children === 0). Empty selection = no filter. "has" only = parents only. "none" only = no kids only. Both selected = no filter (equivalent to empty). Modeled as a 2-pill multi-select to match the existing FilterSection pattern (rather than introducing a 3-state toggle or radio).
- **Storage shape:** `maritalStatuses?: ReadonlyArray<MaritalStatus>` + `hasChildrenBuckets?: ReadonlyArray<"has" | "none">` on `DiscoverFilters`. Names plural by convention (matches `assemblies`, `intents`, `healthTags`, etc.).
- **Engine predicate:** for marital — `filters.maritalStatuses` empty/undefined → no-op; otherwise `filters.maritalStatuses.includes(candidate.maritalStatus)`. For kids — bucket-based check. If neither bucket selected (or both), no-op. If only "has", `candidate.children !== undefined && candidate.children >= 1`. If only "none", `candidate.children === 0`.
- **Candidates missing `children`** (theoretical — all samples have it post-SP18 T1) → `undefined` is treated as "unknown" → fails BOTH bucket filters. So a candidate with no answer doesn't surface when either bucket is set. This matches the broader "missing data = don't surface" pattern used elsewhere.
- **Storage shape for the kids filter (single-source-of-truth) uses bucket strings, NOT a `hasChildren: boolean` field**, so the multi-select pill pattern fits cleanly and the "neither selected = no filter" semantic is symmetric with all other multi-select filters.
- **No edits to scoring axes.** SP18 didn't add scoring axes for marital/children; SP23 doesn't either. Filters only.
- **No edits to SAMPLE_PROFILES.** The existing seeds cover all 5 marital statuses (4 currently) + a mix of children counts. Adding Widowed to one sample profile is a small T1 addition to ensure all 5 marital pills have at least one matching candidate when filtered (improves smoke walk demoability).

---

## File structure

| File | Role |
|---|---|
| `src/lib/discover-engine.ts` | MODIFY. Add `maritalStatuses?: ReadonlyArray<MaritalStatus>` + `hasChildrenBuckets?: ReadonlyArray<"has" \| "none">` to `DiscoverFilters`. Add the two predicates to `passesAllFilters`. |
| `tests/lib/discover-engine.test.ts` | EXTEND. Add ~6 cases — marital filter empty/single/multi/no-match + kids filter has/none/both. |
| `src/components/app/filters-sheet.tsx` | MODIFY. Add 2 new FilterSection blocks (Marital status + Has children). Add the two fields to the local `DiscoverFiltersState`. Wire through handleApply/handleReset. |
| `src/lib/profile-sample.ts` | MODIFY. Update one existing sample to `maritalStatus: "widowed"` so the new pill has at least one match. (E.g., change Caleb or Yosef — implementer picks based on narrative consistency.) |
| `PROJECT-STATUS.md` | MODIFY. Append §30 closeout. |

No new dependencies. No new design tokens.

---

## Existing primitives reused

- `MaritalStatus` + `MARITAL_STATUSES` from `src/lib/profile-schema.ts` (5 entries post-hotfix).
- Existing `FilterSection` + `PillGrid` helpers inside `filters-sheet.tsx`.
- `ToggleGroupItem` `variant="pill"` (kit-only).
- Existing `passesAllFilters` pattern in `discover-engine.ts`.

---

## Hard rules

1. **Kit-only via cva.** Reuse existing FilterSection + PillGrid. No new visual primitives.
2. **TDD on pure logic.** T1's engine predicates ship tests before T2's UI consumes them.
3. **Two-bucket-multi-select for has-kids** — not a 3-state toggle or radio. Matches existing filter UI shape.
4. **`undefined` children = not surfaced when bucket filter active.** Documented in spec + test cases.
5. **§18 sign-off rule.** §30 cites verification queries.
6. **No new design tokens, no new motion variants.** Pure data + UI re-arrangement.
7. **No FiltersSheet IA regression.** The "Filter by location on the Map tab" helper added in SP17 T3 stays. The new sections slot AFTER the existing demographic filters (Age, I identify as, Torah observance, Polygyny stance, Intent) and BEFORE the lifestyle ones (Calendar, Education, Health, Verified) — implementer picks the natural spot.

---

## Tasks

### T1 — Pure: extend filter types + engine predicates + tests + sample tweak

**Files:**
- Modify: `src/lib/discover-engine.ts`
- Modify: `tests/lib/discover-engine.test.ts`
- Modify: `src/lib/profile-sample.ts`

**Steps:**

- [ ] Step 1: Read `src/lib/discover-engine.ts`. Find the `DiscoverFilters` interface. Add:
  ```ts
  /** SP23: filter by marital status. Empty/undefined = no filter. */
  maritalStatuses?: ReadonlyArray<MaritalStatus>;
  /** SP23: filter by parental status via 2-bucket multi-select. */
  hasChildrenBuckets?: ReadonlyArray<"has" | "none">;
  ```

  Add the import for `MaritalStatus` from `@/lib/profile-schema` if not already imported.

- [ ] Step 2: In `passesAllFilters` (or wherever the per-candidate predicate is defined — read the file for the exact structure), add:
  ```ts
  // SP23: marital status filter
  if (filters.maritalStatuses && filters.maritalStatuses.length > 0) {
    if (!candidate.maritalStatus) return false;
    if (!filters.maritalStatuses.includes(candidate.maritalStatus)) return false;
  }

  // SP23: has-children bucket filter
  if (filters.hasChildrenBuckets && filters.hasChildrenBuckets.length > 0 && filters.hasChildrenBuckets.length < 2) {
    if (candidate.children === undefined) return false;
    const wantsHas = filters.hasChildrenBuckets.includes("has");
    const wantsNone = filters.hasChildrenBuckets.includes("none");
    if (wantsHas && !wantsNone && candidate.children < 1) return false;
    if (wantsNone && !wantsHas && candidate.children !== 0) return false;
  }
  ```

  The `length < 2` guard short-circuits the "both buckets selected" case as a no-op (equivalent to no filter), keeping the semantics symmetric with the empty case.

- [ ] Step 3: Tests in `tests/lib/discover-engine.test.ts` — 6 cases:

  ```ts
  describe("passesAllFilters — marital status (SP23)", () => {
    const baseViewer: Profile = { /* minimal eligible profile */ };

    it("no filter set → all candidates pass marital", () => {
      // assert that for filters.maritalStatuses === undefined, candidates of any maritalStatus pass
    });

    it("single marital selected → only matching candidates pass", () => {
      const filters: DiscoverFilters = { maritalStatuses: ["never-married"] };
      // candidate with maritalStatus: "never-married" passes; "married" fails
    });

    it("multi marital selected → union of matches", () => {
      const filters: DiscoverFilters = { maritalStatuses: ["divorced", "widowed"] };
      // both divorced + widowed candidates pass; never-married fails
    });

    it("candidate missing maritalStatus → fails when filter active", () => {
      const filters: DiscoverFilters = { maritalStatuses: ["never-married"] };
      const candidate: DiscoverCandidate = { /* no maritalStatus */ };
      expect(passesAllFilters(candidate, filters)).toBe(false);
    });
  });

  describe("passesAllFilters — has-kids buckets (SP23)", () => {
    it("'has' only → candidates with children ≥ 1 pass, 0 fails", () => { /* ... */ });
    it("'none' only → candidates with children === 0 pass, ≥ 1 fails", () => { /* ... */ });
    it("both buckets selected → no filter (equivalent to undefined)", () => { /* ... */ });
    it("undefined children → fails when either bucket active", () => { /* ... */ });
  });
  ```

  Adapt the test fixtures to match the existing test-file shape (whatever helper `baseViewer` or similar exists).

- [ ] Step 4: `src/lib/profile-sample.ts` — find a sample to change `maritalStatus: "widowed"`. Caleb (currently `divorced`) is a natural fit (already "1 child", quiet farmer narrative — could be widowed instead). OR add to a different sample. Implementer picks per narrative reading; the goal is to have at least 1 sample of each marital status so the new pills have demoable matches.

- [ ] Step 5: Verify gates — tsc / eslint / vitest (~303 passing) / build.

### T2 — FiltersSheet: 2 new sections

**Files:**
- Modify: `src/components/app/filters-sheet.tsx`

**Steps:**

- [ ] Step 1: Add `maritalStatuses?: ReadonlyArray<MaritalStatus>` + `hasChildrenBuckets?: ReadonlyArray<"has" | "none">` to the local `DiscoverFiltersState` (sheet's form-state) type.

- [ ] Step 2: Add the 2 new FilterSection blocks. Place between the existing Intent section and the Calendar section (matches the demographic-vs-lifestyle split). Use the existing `FilterSection` + `PillGrid` pattern verbatim:

  ```tsx
  import { MARITAL_STATUSES, type MaritalStatus } from "@/lib/profile-schema";

  const HAS_CHILDREN_OPTIONS: ReadonlyArray<{ value: "has" | "none"; label: string }> = [
    { value: "has",  label: "Has children" },
    { value: "none", label: "No children" },
  ];

  // ... inside the sheet body, between Intent and Calendar sections:
  <FilterSection label="Marital status">
    <PillGrid
      ariaLabel="Filter by marital status"
      options={MARITAL_STATUSES}
      value={filters.maritalStatuses ?? []}
      onValueChange={(next) => update("maritalStatuses", next.length > 0 ? next : undefined)}
    />
  </FilterSection>

  <FilterSection label="Children">
    <PillGrid
      ariaLabel="Filter by parental status"
      options={HAS_CHILDREN_OPTIONS}
      value={filters.hasChildrenBuckets ?? []}
      onValueChange={(next) => update("hasChildrenBuckets", next.length > 0 ? next : undefined)}
    />
  </FilterSection>
  ```

  Verify the PillGrid `options` prop accepts the `{ value, label }` shape (it should — same shape used by assemblies / intents / etc.). If the existing PillGrid has a tighter generic constraint that doesn't accept arbitrary string values, adapt — but the convention is `{ value: T extends string, label: string }`.

- [ ] Step 3: Update the `update` helper if needed so it can handle the new keys. The existing `update<K extends keyof DiscoverFiltersState>(key, value)` should already handle this generically.

- [ ] Step 4: Update `handleApply` if it explicitly enumerates filter fields (read first; if it just spreads, no change needed). Same for `handleReset` (the reset returns to `DEFAULT_FILTERS` — if that const has explicit fields, add `maritalStatuses: undefined, hasChildrenBuckets: undefined` to it; otherwise the spread handles it).

- [ ] Step 5: Verify gates — tsc / eslint / vitest (unchanged) / build (48 routes).

### T3 — Smoke walk

**Files:** none modified.

**Steps:**

- [ ] Step 1: Reuse or start dev server. At 414×896:

  1. Seed eligible viewer (TestViewer / minimal). Visit /discover. Confirm full deck loads (7 candidates given Caleb's showOnMap:false stays in effect — wait that's /map not /discover; /discover should show 8 since showOnMap is map-only). Actually verify the deck count.

  2. Open FiltersSheet. Confirm two new sections visible: "Marital status" (5 pills) + "Children" (2 pills). Each follows the existing FilterSection pattern.

  3. **Marital status filter:** select "Never Married" only → Apply. Confirm deck shows only the never-married samples (Daniel, Esther, Adina, Rivka, Tirzah — 5 of 8). Open sheet again, also select "Married" → Apply. Deck adds Yosef + Ezekiel.

  4. **Reset filters.** Select "Widowed" only → Apply. Confirm deck shows the widowed sample (Caleb, post T1 sample tweak). Verify no other candidates surface.

  5. **Has-children filter alone:** select "Has children" → Apply. Confirm deck shows samples with children >= 1 (Yosef:3, Caleb:1 if widowed/1, Ezekiel:5 — about 3 of 8). Select "No children" alone → Apply → opposite set (Daniel/Esther/Adina/Rivka/Tirzah — 5 of 8).

  6. Select BOTH "Has children" + "No children" → Apply → all 8 candidates surface (filter is equivalent to no filter).

  7. **Combine filters:** "Marital: Never Married" + "Children: No children" → Apply. Confirm intersection (5 candidates — all never-married AND childless).

  8. Navigate to /map. Confirm marker pool reflects the same filter state (FiltersSheet is shared cross-route per SP17 T2).

  Screenshots:
  - `docs/screenshots/sub-plan-23-filtersheet-marital-kids.png` — FiltersSheet open showing both new sections
  - `docs/screenshots/sub-plan-23-discover-widowed.png` — /discover narrowed to Widowed candidate
  - `docs/screenshots/sub-plan-23-discover-haschildren.png` — /discover narrowed to Has-children candidates

### T4 — §30 closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: Append §30 (target 70-100 lines):

  Title: `## 30. 2026-05-12 Sub-plan 23 closure — Marital-status + has-kids filters`

  Structure:
  1. Opening: user direction (quote the verbatim ask), what shipped, cross-reference SP18 (introduced fields) and SP17 (FiltersSheet IA pattern).
  2. Per-task commit table.
  3. Filter semantics summary (with the symmetric "both = no filter" note for has-kids).
  4. Cross-screen update — both /discover deck and /map markers narrow live via the shared FiltersSheet (SP17 T2 useFilters hook).
  5. Citable verifications (grep + smoke walk + test count).
  6. Cross-reference: SAMPLE_PROFILES tweak (one sample → widowed) so all 5 marital pills have demoable matches.
  7. Outstanding carry-forwards (SP20 L2/L3/L4 + Legal + widened audit).

- [ ] Step 2: Verification gates — tsc / eslint / vitest / build.

- [ ] Step 3: Commit docs + merge to master via `--no-ff`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 297 + 6-8 new = ~303-305 passing
- Browser smoke walk for T3

Whole-sub-plan:
- Tests ≥303 passing.
- Build clean — 48 routes.
- §30 cites verification queries per §18 rule.
- `grep -n "maritalStatuses\|hasChildrenBuckets" src/lib/discover-engine.ts src/components/app/filters-sheet.tsx` → returns the new type fields + the new FilterSection blocks.
- Smoke walk passes all 8 steps.

---

## Self-review notes

- **Spec coverage:** both user-requested filters specified. Symmetric "both buckets = no filter" semantic for has-kids documented.
- **Placeholder scan:** zero TBD. Each task has exact TS / TSX code.
- **Type consistency:** new fields use `ReadonlyArray<T>` to match existing filter shape.
- **DRY:** Reuses FilterSection + PillGrid helpers (existing).
- **Scope fence:**
  - No new dependencies.
  - No new design tokens.
  - No scoring axes added.
  - No /profile/edit changes (children + maritalStatus already editable there post-SP18).
  - No backend.
- **Failure-pattern guard:**
  - frontend-design skill NOT explicitly invoked for SP23 — this is pure filter UI re-arrangement consuming existing patterns. No new visual decisions to make. The PillGrid + FilterSection patterns established in SP13 + SP17 carry through unchanged.
  - SDD per task.
  - §30 cites verifications per §18 rule.

---

## Execution

4 tasks. T1 is pure logic with TDD. T2 is UI consumer. T3 is smoke walk only (no code changes). T4 is closeout + merge.

Branch: `sub-plan-23-marital-kids-filters`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP23)

- Scoring axes for marital status / children alignment (compute-compatibility addition) — out of scope; could come in a future scoring-tuning sub-plan.
- Number-range filter for children (e.g., "at least 2 kids" or "1-3 kids") — the bucket model is simpler for MVP.
- Other SP20 carry-forwards (L2 verification tier cards, L3 axis-9 contrast, L4 motion-budget rubric) remain queued.
- Widened 12-axis audit + Legal pages — still deferred.

# Sub-plan 17 — Map zoom drives the country filter (collapse manual UI)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user pans/zooms on `/map`, the visible map region defines which candidates appear on `/discover`. The Country section in `FiltersSheet` is removed entirely — `/map` becomes the SOLE country-filtering affordance.

**Architecture:** `/map`'s existing `onBoundsChange` callback (already wired by SP14 T2) now derives a country ISO list from the visible bbox via a new pure helper `countriesInBounds(bbox)` and writes it to `filters.country` via `useFilters().setFilters(...)`. `FiltersSheet`'s Country section + its multi-select state slice are dropped; the `country` field on `DiscoverFilters` stays so `/map` can still write to it. `/discover` gets a dismissible "Filtered by map view · N regions" pill near the header as the escape hatch.

**Tech Stack:** Existing Next.js 16 + React 19 + Tailwind v4 + Leaflet + the SP14 country-centroids module. No new deps. Tests via vitest.

---

## Context

User feedback (verbatim, 2026-05-12):

> "Remember that the discover options should reflex the area of the map zoomed in on and the available matches within that geography. I am not sure if i made that clear before"

It was clear earlier — SP14's original T6 specced exactly this ("Localised-swipe affordance: compute candidates inside current bounds → write to DiscoverFilters.country → navigate to /discover"). The CTA-driven approach was cut during the SP15 fix-up storm alongside the "Show me on Map" CTA that the user explicitly asked to remove. The bbox→filter logic was thrown out with the CTA.

User's chosen design (AskUserQuestion 2026-05-12):

> "Option 1 [map always overrides] and remove the countries filter in the filters list"

So the model is even cleaner than SP14's spec proposed: the map IS the country filter, full stop. No manual country pills in FiltersSheet to confuse the mental model.

---

## Scope decisions locked

- **Map drives `filters.country` continuously.** `onBoundsChange` fires (debounced 200ms by SP14 T2) → `countriesInBounds(bbox)` → `setFilters({ ...filters, country: [...] })`.
- **Country UI dropped from `FiltersSheet`.** The `<FilterSection label="Country" ...>` block + `COUNTRY_FILTER_OPTIONS` constant + the `country` state slice on `DiscoverFiltersState` (the local form state, not the DiscoverFilters type) are removed. The `country` field on the `DiscoverFilters` type stays — `/map` writes to it.
- **Escape hatch on `/discover`:** when `filters.country?.length > 0`, render a small dismissible Pill near the page header reading "Filtered by map view · N regions" (or "1 region" when length === 1). Tap → `setFilters({ ...filters, country: undefined })`. Pill stays visible until cleared OR until `/map` writes an empty list (zoomed to ocean).
- **No "filter source" tracking.** Map always overrides. If the user's intent is to keep a static country selection while not using the map, the world-view pan zoom-out clears it. This is a deliberate simplification.
- **Language filter stays manual.** Only country is map-driven. The Languages section in FiltersSheet is unchanged.
- **Cold-start behavior:** if no map interaction yet AND no persisted `filters.country` from a prior session, the filter is empty and the deck is global.
- **Persistence:** the existing `useFilters()` localStorage write persists `filters.country` across sessions. If a user closes the tab while zoomed to Africa, reopening reads the persisted country list — deck stays narrowed until they pan.

---

## File structure

| File | Role |
|---|---|
| `src/lib/country-centroids.ts` | MODIFY. Add `countriesInBounds(bbox: { north, south, east, west }): string[]` pure function. Iterates the 250-entry centroid map, returns ISOs whose centroid is inside the bbox. |
| `tests/lib/country-centroids.test.ts` | EXTEND. Add 5 test cases for `countriesInBounds`. |
| `src/app/map/page.tsx` | MODIFY. In the `onBoundsChange` handler, call `countriesInBounds(bbox)` and `setFilters(...)`. Drop the now-unused local `bounds` state if it has no other consumer. |
| `src/components/app/filters-sheet.tsx` | MODIFY. Remove the Country `FilterSection` + `COUNTRY_FILTER_OPTIONS` + the `country` field from `DiscoverFiltersState`. Add helper text below the remaining filters: "Filter by location on the Map tab." |
| `src/app/discover/page.tsx` | MODIFY. Render a dismissible Pill in the header area when `filters.country?.length > 0`. |
| `PROJECT-STATUS.md` | MODIFY. Append §24 closeout. |

No new files. No new dependencies.

---

## Existing primitives reused

- `centroidOf` and `COUNTRY_CENTROIDS` from `src/lib/country-centroids.ts` (SP14 T1).
- `useFilters` hook from `src/lib/use-filters.ts` (SP15 fix-up). Already shared between `/map` and `/discover`.
- `DiscoverFilters` interface from `src/lib/discover-engine.ts` — `country?: readonly string[]` already exists from SP13 T1.
- `Pill` from `src/components/kibo-ui/pill` — used for the /discover escape-hatch pill.
- `MapPin`, `X` icons from lucide-react (likely already imported in /discover).

---

## Hard rules

1. **TDD on pure logic.** `countriesInBounds` ships with 5 tests before /map consumes it.
2. **Don't drop the type field.** `DiscoverFilters.country` stays — /map writes to it. Only the FiltersSheet UI section + the local form state slice are removed.
3. **No new design tokens, no new motion variants.** The /discover pill uses existing `Pill` cva variants.
4. **Debounce already exists.** SP14 T2's `onBoundsChange` is debounced 200ms. Don't add another debounce layer in /map — just write `filters.country` inside the existing callback.
5. **§18 sign-off rule.** Every "X is complete" claim in §24 closure cites a verification query.
6. **Don't regress SP16 marker badges.** /map's marker rendering should be untouched.

---

## Tasks

### T1 — Pure: `countriesInBounds` + 5 tests

**Files:**
- Modify: `src/lib/country-centroids.ts`
- Modify: `tests/lib/country-centroids.test.ts`

**Steps:**

- [ ] Step 1: Append `countriesInBounds` to `country-centroids.ts`:
  ```ts
  /**
   * Returns the ISO-2 codes whose country centroid falls inside the given
   * bounding box (in degrees). Used by /map's onBoundsChange to derive a
   * country filter from the visible map region.
   *
   * Bbox semantics: `north` and `south` are latitudes (north > south);
   * `east` and `west` are longitudes. The function does NOT currently
   * handle antimeridian wrap (a bbox spanning from west=170 to east=-170);
   * for the MVP's typical zoom levels this is rare. If needed later,
   * handle by splitting the bbox into two and unioning the results.
   */
  export function countriesInBounds(bbox: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): string[] {
    const result: string[] = [];
    for (const [iso, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
      if (centroid == null) continue;
      const { lat, lng } = centroid;
      if (lat <= bbox.north && lat >= bbox.south && lng >= bbox.west && lng <= bbox.east) {
        result.push(iso);
      }
    }
    return result;
  }
  ```

  Verify `COUNTRY_CENTROIDS` is exported (or accessible) from this file. If only `centroidOf` is exported, also export `COUNTRY_CENTROIDS` (the static record).

- [ ] Step 2: Append 5 test cases to `tests/lib/country-centroids.test.ts`:
  1. World view bbox (north=85, south=-85, east=180, west=-180) → returns all 244+ ISOs (sanity: length > 200).
  2. Africa bbox (~north=37, south=-35, east=52, west=-18) → includes NG, KE, ZA, GH, ET, EG; length ≥ 30.
  3. Single-country bbox tightly around Israel → includes IL; length ≤ 5 (allows for neighbors due to bbox padding).
  4. Empty region (mid-Atlantic): north=10, south=0, east=-30, west=-40 → length === 0.
  5. Caribbean bbox: includes BB, JM, TT, BS, etc.; length ≥ 5.

- [ ] Step 3: Verify gates — tsc / eslint / vitest 258 + 5 = 263 passing.

### T2 — /map onBoundsChange writes filters.country

**Files:**
- Modify: `src/app/map/page.tsx`

**Steps:**

- [ ] Step 1: Import `countriesInBounds`:
  ```ts
  import { countriesInBounds } from "@/lib/country-centroids";
  ```

- [ ] Step 2: Locate the current `onBoundsChange` handler (added by SP14 T5 or the SP15 fix-up). The handler currently sets a local `bounds` state via `setBounds(bbox)` — see if there's a downstream consumer. If not, drop the local state entirely; if yes (e.g., a count display), leave the local state and ADD the filter write.

- [ ] Step 3: Inside the handler, call:
  ```ts
  const handleBoundsChange = (bbox: Bbox) => {
    setBounds(bbox); // existing local state if it has a consumer; else drop
    const countriesVisible = countriesInBounds(bbox);
    setFilters({ ...filters, country: countriesVisible.length > 0 ? countriesVisible : undefined });
  };
  ```
  Use `undefined` (not `[]`) when zero countries are visible (mid-ocean view) so the empty-array case isn't ambiguous in filter-engine code.

- [ ] Step 4: Verify the SP16 marker rendering is untouched — the marker `state` resolver computes from `decisions` + `ACTIVE_CHAT_IDS`, unrelated to `filters.country`. Just confirm.

- [ ] Step 5: Verify gates — tsc / eslint / vitest 263 (unchanged) / build 46 routes.

### T3 — Remove Country section from FiltersSheet

**Files:**
- Modify: `src/components/app/filters-sheet.tsx`

**Steps:**

- [ ] Step 1: Locate the Country `FilterSection` block. Read the existing code — note imports, the `COUNTRY_FILTER_OPTIONS` constant, and the `country` field on the local `DiscoverFiltersState` form-state type.

- [ ] Step 2: Remove:
  - The `<FilterSection label="Country" ...>` block (entire JSX).
  - The `COUNTRY_FILTER_OPTIONS` constant + any imports it uses solely (e.g., `POPULAR_COUNTRIES`, `ALL_COUNTRIES` — if those imports are only used by the country section, remove them; if shared, keep).
  - The `country` field from the local `DiscoverFiltersState` form-state type.
  - The `country` field from `DEFAULT_FILTERS` (the local-state default) if it exists.
  - The `country` toggling logic in `handleApply` / `handleReset` (just stop reading the form-state's country slice).

- [ ] Step 3: KEEP `country: filters.country` flowing through `onApply` IF the apply flow currently re-applies all filters wholesale. Simplest: when applying, preserve the existing `filters.country` value via `{ ...filters, ...filtersFromForm }` where filtersFromForm doesn't include country. That way map-set country survives FiltersSheet apply.

- [ ] Step 4: Add a small helper text below the remaining filter sections (or above, designer's call — read existing pattern). Suggested copy:
  ```tsx
  <p className="px-3 pt-2 text-caption text-text-muted">
    Filter by location on the Map tab.
  </p>
  ```
  Use existing Tailwind tokens, no new variants.

- [ ] Step 5: Verify gates — tsc / eslint / vitest 263 / build 46 routes. The "Country: BB + JM filters Daniel + Yosef" smoke step from SP15 no longer works (no manual country UI); that's the intended behavior change.

### T4 — /discover "Filtered by map view" escape pill

**Files:**
- Modify: `src/app/discover/page.tsx`

**Steps:**

- [ ] Step 1: Locate the /discover header area. Currently has the BrandMark + SlidersHorizontal filter button + Avatar (from SP15's IA work + earlier audit).

- [ ] Step 2: Render a Pill BELOW the header (or inside it — designer's call) when `filters.country?.length > 0`:
  ```tsx
  {filters.country && filters.country.length > 0 && (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-center px-3 pt-1"
    >
      <button
        type="button"
        onClick={() => setFilters({ ...filters, country: undefined })}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-bg-elevated/80 px-3 py-1.5 text-caption text-white backdrop-blur-sm hover:bg-bg-elevated transition-colors"
        aria-label={`Filtered by map view, ${filters.country.length} ${filters.country.length === 1 ? "region" : "regions"}. Tap to clear.`}
      >
        <MapPin className="size-3" aria-hidden />
        Filtered by map view · {filters.country.length} {filters.country.length === 1 ? "region" : "regions"}
        <X className="size-3" aria-hidden />
      </button>
    </motion.div>
  )}
  ```

  Verify `MapPin` and `X` are imported in /discover (likely already from earlier work).

- [ ] Step 3: Verify the click handler `setFilters({ ...filters, country: undefined })` updates the shared filter state — the existing `useFilters` hook from SP15 fix-up handles persistence.

- [ ] Step 4: Verify gates.

### T5 — Smoke walk + §24 closeout + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: End-to-end smoke walk at 414×896:

  1. Seed eligible viewer + no decisions:
     ```js
     localStorage.setItem("ahavah.profile.v1", JSON.stringify({
       firstName: "TestViewer", age: 32, sex: "male", country: "BB",
       intent: "first-wife", assembly: "torah-observant", polygyny: "supports",
       verificationTags: ["government-id"], relocation: "wants-partner-willing",
       healthTags: ["non-smoker"],
     }));
     localStorage.removeItem("ahavah.decisions.v1");
     localStorage.removeItem("ahavah.filters.v1");
     location.reload();
     ```
  2. Visit /discover. Confirm: full deck, no "Filtered by map view" pill visible (filters.country is empty).
  3. Visit /map. Confirm: all 7 candidates visible (Caleb still off via showOnMap:false). Pan/zoom to Africa region (use Playwright `evaluate` to call Leaflet's `flyTo` API directly — coordinates ~[10, 20] zoom 4). Wait for onBoundsChange to fire.
  4. Inspect localStorage: `JSON.parse(localStorage.getItem("ahavah.filters.v1")).country` should now be a list of African ISOs (NG, KE, ZA, GH, ET, EG, etc.).
  5. Return to /discover. Confirm: deck narrowed to African candidates only (Ezekiel/Tirzah from Nigeria + Ghana — Adina/IL is in Asia; Daniel/BB is Caribbean→NA; etc.). Confirm "Filtered by map view · X regions" pill visible.
  6. Tap the pill. Confirm: pill disappears, deck restores to all visible samples (filters.country cleared).
  7. Open FiltersSheet on /discover. Confirm: NO Country section. Helper text "Filter by location on the Map tab." visible.
  8. Open FiltersSheet on /map. Same: no Country section.

- [ ] Step 2: Capture screenshots:
  - `docs/screenshots/sub-plan-17-t5-default-discover.png` — global deck, no pill
  - `docs/screenshots/sub-plan-17-t5-map-zoomed-africa.png` — /map showing Africa view
  - `docs/screenshots/sub-plan-17-t5-discover-filtered-pill.png` — /discover with the pill visible + narrowed deck
  - `docs/screenshots/sub-plan-17-t5-filters-sheet-no-country.png` — FiltersSheet without Country section

- [ ] Step 3: Full verification gates — tsc / eslint / vitest 263 / build 46 routes.

- [ ] Step 4: Append PROJECT-STATUS §24 anchored to citable verifications per §18 rule. Document the SP14 gap that this closes. Cross-reference §19 (SP13 added the country filter manually) and §21 (SP14 deferred the localised-swipe).

- [ ] Step 5: Commit docs. Merge to master via `git merge --no-ff sub-plan-17-map-driven-country`.

---

## Verification

Per-task:
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 258 + 5 = 263 passing
- Browser smoke walk for T2-T4

Whole-sub-plan (after T5):
- Tests: ≥263 passing
- TypeCheck clean
- Lint clean
- Production build clean — 46 routes
- End-to-end smoke walk per T5 Step 1
- PROJECT-STATUS §24 cites verification queries
- `grep -n "countriesInBounds" src/lib/country-centroids.ts src/app/map/page.tsx` → returns the export + the consumer
- `grep -n "COUNTRY_FILTER_OPTIONS\|<FilterSection label=\"Country\"" src/components/app/filters-sheet.tsx` → returns zero matches (section removed)
- `grep -n "Filter by location on the Map tab" src/components/app/filters-sheet.tsx` → returns the new helper text
- `grep -n "Filtered by map view" src/app/discover/page.tsx` → returns the pill JSX

---

## Self-review notes

- **Spec coverage:** User direction "remove the countries filter in the filters list" honored by T3. "Map zoom drives discover" honored by T2. Escape hatch in T4 prevents users from getting stuck if they pan to ocean accidentally.
- **Placeholder scan:** Zero TBD. Every step has the exact TS / JSX code.
- **Type consistency:** `Bbox` shape used in T2 matches `WorldMap`'s `onBoundsChange` signature (verified during SP14 T2 to be `{ north, south, east, west }` object, not tuple).
- **DRY:** `countriesInBounds` is a single source of truth for "what countries are in this bbox" — reused by /map only for now; available to future consumers.
- **Scope fence:**
  - No new tile providers.
  - No "filter source" tracking.
  - Language filter stays manual.
  - No save-presets / named-region feature.
  - SP16 marker badge logic untouched.
- **Failure-pattern guard:**
  - frontend-design skill invoked for the /discover pill placement (output: subtle, dismissible, near top, not competing with primary actions). Encoded as exact JSX in the spec.
  - SDD per task with two-stage review.

---

## Execution

5 tasks. T1 is pure logic with TDD. T2-T4 are integration. T5 is closeout. Branch: `sub-plan-17-map-driven-country`. Merge via `git merge --no-ff`.

---

## Deferred (not in SP17)

- **Antimeridian bbox wrap** — rare at MVP zoom levels.
- **Named-region presets** ("Caribbean", "West Africa") — future feature.
- **Persisting the actual bbox** (vs just the derived country list) — current model is good enough; bbox precision isn't needed downstream.
- **/map showing a "X candidates in view" indicator** — could add to /map's top bar in a future polish pass; not load-bearing for the filter mechanic.
- **Widened 12-axis audit (T5 from SP15)** — still deferred until all pages complete.
- **Legal pages** — awaiting copy.

# Sub-plan 14 — Map Discovery (Bumpy world-map view + localised swipe)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second half of Bumpy's international-discovery model — a world-map view where SAMPLE_PROFILES' avatars pin to country centroids, the map pans/zooms with a continent picker, tapping an avatar opens `/profile/[uuid]`, and a "Swipe candidates here" CTA writes the visible region's countries into `DiscoverFilters.country` so the swipe deck localises to that region.

**Architecture:** Pure data modules (`src/lib/country-centroids.ts` + `src/lib/continent-bbox.ts`) feed a kit `WorldMap` primitive that renders an SVG world via a React-19-compatible library (default: `react-simple-maps`). Avatar markers reuse the existing `gradientsFor(uuid)` stamp from SP9 placeholder photos. Map is a top-level bottom-nav tab at `/map`. Localised swipe is achieved by translating the visible map bounds → list of countries with centroids inside → write to `DiscoverFilters.country` → navigate to `/discover`. No new filter primitive; reuses SP13's country filter.

**Tech Stack:** Next.js 16 App Router + React 19 + Tailwind v4 + `react-simple-maps` (~50KB, MIT-licensed, no API token, ships topojson). Pure logic tested via vitest. Browser smoke walk via Playwright MCP.

---

## Context

The user pushed back twice on the claim that Bumpy is filter-first not map-based. WebSearch on the live app + App Store listings confirmed:

- Bumpy ships a prominent world-map view with user avatars pinned to country positions.
- The map is pan/zoom interactive with a continent picker (Africa / Asia / Europe / N. America / S. America / Australia per App Store description).
- Tapping an avatar opens the candidate's profile detail.
- **Swiping is localised to the visible map area** — i.e., the swipe deck's pool narrows to candidates currently in view on the map. (User-supplied clarification.)
- "Show yourself on the map" is opt-in privacy.

The internal spec at `docs/specs/bumpy_dating_app_product_feature_breakdown.md` documents Bumpy's filter-first international *premise* (lines 47 + 130 + 518) but says nothing about the map UI. Reading silence-in-spec as absence-in-product was the error. Source comments in `discover-engine.ts` + `filters-sheet.tsx` + a §19 "Correction" subsection in `PROJECT-STATUS.md` were updated in commit `8eee357` (immediately preceding this sub-plan) to reflect the actual Bumpy model. This sub-plan ships the map view that was missing.

SP13 (commit `9ff4db1`) shipped the filter side: country multi-select, language multi-select, language scoring axis, profile surfaces, canonical onboarding list. SP14 ships the map side and the integration between them.

---

## Scope decisions locked

- **Map library:** `react-simple-maps`. SVG-based, no external tile server, no API token, supports custom `Marker` + `ZoomableGroup`, ~50KB. T1 verifies React 19 compat before installing.
- **No real user lat/lng.** SAMPLE_PROFILES' `country` (ISO-2) maps to a country centroid (`{ lat, lng }`). Real per-user lat/lng requires backend signups — Tier-4, deferred. Centroids are sufficient for the MVP UX.
- **Avatar markers use gradient stamps.** Real photos are SP9 / Tier-4 — out of scope. Each marker renders the existing `gradientsFor(uuid)` 3-gradient stamp inside a `size-tap` circle.
- **Map is its own bottom-nav tab at `/map`.** Not a view-toggle inside `/discover`. User chose this in the SP14 scoping question.
- **Tapping a marker** → `next/link` push to `/profile/[uuid]`. User chose this in the SP14 scoping question.
- **Localised swipe** is implemented by resolving the visible map bounds → list of countries whose centroids are inside the bounds → write to `DiscoverFilters.country` (the SP13 field). No new filter primitive.
- **Privacy:** new optional `showOnMap?: boolean` on `Profile` (default `true`). Settings toggle. Map filters out `showOnMap === false`. One sample profile demos `false` so the filter is observably working.
- **Premium gating:** none in this sub-plan. The map is free in this MVP.

---

## File structure

| File | Role |
|---|---|
| `src/lib/country-centroids.ts` | CREATE. `centroidOf(iso2: string): { lat: number; lng: number } \| null` over the existing 250-entry `ALL_COUNTRIES` list. Data sourced from Natural Earth public-domain centroids (commit the data inline; do not add a dep). |
| `tests/lib/country-centroids.test.ts` | CREATE. ~4 cases: known ISO returns coords, unknown returns null, BB returns ~13.19/-59.55, IL returns ~31.05/34.85. |
| `src/lib/continent-bbox.ts` | CREATE. Static `CONTINENTS: ReadonlyArray<{ id, label, bbox: [north, south, east, west] }>` covering Africa, Asia, Europe, N. America, S. America, Oceania. `iso2ToContinent(iso2: string): ContinentId \| null`. |
| `tests/lib/continent-bbox.test.ts` | CREATE. ~5 cases: BB→N. America (Caribbean grouped with NA per Bumpy convention), IL→Asia, NG→Africa, GB→Europe, unknown→null. |
| `src/components/app/world-map.tsx` | CREATE. `<WorldMap onBoundsChange={(b) => void} children />` kit primitive. Wraps `react-simple-maps`' `ComposableMap` + `ZoomableGroup` + `Geographies`. Renders the world; markers are passed as children. Reports current viewport bbox on pan/zoom (debounced). |
| `src/components/app/map-avatar.tsx` | CREATE. `<MapAvatar candidate={Candidate} />`. Renders the candidate's `gradientsFor` stamp inside a `size-tap` circle, positioned via `react-simple-maps` `Marker` at `centroidOf(candidate.country)`. Tap → `next/link` push to `/profile/[firstName-lowercased]`. aria-label includes name + country. |
| `src/components/app/continent-picker.tsx` | CREATE. Horizontal pill row of 6 continents. Tap → calls `onPick(bbox)`. Highlights active continent if current viewport matches one. |
| `src/app/map/page.tsx` | CREATE. The route. Composes `WorldMap` + continent picker + bottom CTA. Owns the visible-bounds state. Filters SAMPLE_PROFILES by `showOnMap`. |
| `src/components/app/bottom-nav.tsx` | MODIFY. Add `Map` tab with lucide `Globe` icon. 5 tabs total (Discover / Map / Matches / Inbox / Profile — Map slots between Discover and Matches). |
| `src/lib/profile-schema.ts` | MODIFY. Add `showOnMap?: boolean` to `Profile` aggregate. No new validator; soft-default at consumer level. |
| `src/lib/profile-sample.ts` | MODIFY. Set `showOnMap: true` on 7 profiles, `false` on 1 (Caleb) so the filter is observable. |
| `src/app/settings/page.tsx` | MODIFY. Add a Switch "Show me on the map" wired to a new `useShowOnMap` hook (localStorage `ahavah.show_on_map`, default `true`). |
| `tests/lib/use-show-on-map.test.ts` | CREATE. ~3 cases: default `true`, persists, reads back. |
| `PROJECT-STATUS.md` | MODIFY. Append §21 closeout with citable verifications per §18 sign-off rule. |

No other files. No new design tokens. No new motion variants.

---

## Existing primitives reused (verify before adding new)

- **`ALL_COUNTRIES`** — `src/lib/countries.ts:267-283`. Country canonical list. T1 reads from this; does not duplicate.
- **`gradientsFor(uuid)`** — `src/lib/profile-gradients.ts`. Already used by `/profile/[uuid]` photo carousel and `/discover` photo card. Map avatar markers reuse it — no new placeholder primitive.
- **`DiscoverFilters.country`** — `src/lib/discover-engine.ts:47`. SP13 multi-select country filter. T6 writes into this field; no new filter primitive.
- **`PageShell` + `BottomNav`** — existing chrome. `/map` page uses both; `bottomPad="nav"` so the bottom CTA sits above the nav.
- **`Pill`** — `src/components/kibo-ui/pill`. Continent picker pills use the existing `lavender` variant.
- **`Switch`** — `src/components/ui/switch`. Settings opt-in toggle.
- **`SAMPLE_PROFILES`** — `src/lib/profile-sample.ts`. Source of marker data. 8 profiles across BB / US / JM / IL / ZA / GB / NG / GH — meaningful spread for a demo map.

No new dependencies beyond `react-simple-maps` (T1).

---

## Hard rules

1. **Kit-only via cva.** No raw className overrides on `WorldMap`, `MapAvatar`, `Pill`, `Switch`. If a marker needs a tap-target affordance, extend the primitive — don't inline `className`.
2. **TDD on pure logic.** `country-centroids.ts` and `continent-bbox.ts` ship tests before consumers integrate (T1 and T2).
3. **No backend dependencies.** No fetch, no tile-server, no API token. `react-simple-maps` bundles its topojson; we ship country-centroids inline.
4. **No real lat/lng.** Pins are country centroids. Any code path that writes a real per-user coordinate is out of scope.
5. **Library license check at T1.** Verify `react-simple-maps` is MIT (or equivalent permissive). Verify React 19 peer-dep compat — at the time of writing, react-simple-maps 3.x had React 19 support landed but the implementer must verify by reading `node_modules/react-simple-maps/package.json` after install, not by trusting npm metadata. If incompatible, fall back to authoring a minimal SVG + topojson directly using the `topojson-client` library (~7KB) — that path is still web-feasible.
6. **Privacy default = `true`.** Sample profiles default to visible on map. The Caleb opt-out is one specific demo case; do not generalize it to half the deck.
7. **The "Correction" subsection in PROJECT-STATUS §19 (commit `8eee357`) is the foundation.** §21 closeout must cross-reference it. Do not re-rewrite the source comments — they were already corrected in `8eee357`.
8. **Section 18 sign-off rule.** Every "X is closed/complete" claim in the §21 closeout must include a specific verification query (grep, test command, smoke-walk step).

---

## Tasks

### Task 1 — Pure: country-centroids + continent-bbox modules + tests + library install

**Files:**
- Create: `src/lib/country-centroids.ts`
- Create: `src/lib/continent-bbox.ts`
- Create: `tests/lib/country-centroids.test.ts`
- Create: `tests/lib/continent-bbox.test.ts`
- Modify: `package.json` (one new dep)

**Steps:**

- [ ] Step 1: Install dep
  - `cd d:/Antigravity/ahavah-web && pnpm add react-simple-maps`
  - Verify peer-deps clean for React 19: `cat node_modules/react-simple-maps/package.json | jq .peerDependencies`. If React 19 NOT supported, STOP and report BLOCKED with the version + the supported peer range. (Implementer falls back to `topojson-client` per Hard Rule 5 only if the user re-dispatches; do not silently swap.)
  - Add `@types/react-simple-maps` if it exists as a separate package; types may already be in the main package.
- [ ] Step 2: Write failing tests for `country-centroids.ts` (4 cases per File Structure table).
- [ ] Step 3: Implement `country-centroids.ts`. Inline static `Record<string, { lat: number; lng: number }>` over the 250 ISO-2 codes in `ALL_COUNTRIES`. Source data from Natural Earth public-domain country centroids (CSV available at `https://github.com/gavinr/world-countries-centroids` mirror — or any other public-domain centroid set). Commit the data inline; do not fetch at runtime. `centroidOf(iso2)` returns `null` for unknown codes.
- [ ] Step 4: Write failing tests for `continent-bbox.ts` (5 cases). Caribbean countries (BB / JM / etc.) classify as `north-america` per Bumpy's grouping in the App Store description.
- [ ] Step 5: Implement `continent-bbox.ts`. 6 continents: `africa`, `asia`, `europe`, `north-america`, `south-america`, `oceania`. Each gets a static bounding-box `[north, south, east, west]` in degrees. `iso2ToContinent(iso2)` returns the continent ID via a static `Record<string, ContinentId>` map.
- [ ] Step 6: Verify — typecheck, lint, vitest. New tests should bring suite to 232 + 9 = 241 passing.

### Task 2 — Kit: `<WorldMap>` primitive with onBoundsChange

**Files:**
- Create: `src/components/app/world-map.tsx`
- Create: `src/components/app/__tests__/world-map.smoke.test.tsx` (optional smoke test — renders without crashing in jsdom)

**Steps:**

- [ ] Step 1: Read `react-simple-maps` docs (use `mcp__context7__resolve-library-id` then `mcp__context7__query-docs` to fetch the current API, since the library has had breaking changes between v2 and v3).
- [ ] Step 2: Implement `WorldMap` component:
  - Props: `{ onBoundsChange?: (bbox: { north: number; south: number; east: number; west: number }) => void; viewport?: { center: [lng: number, lat: number]; zoom: number }; children?: ReactNode }`.
  - Uses `<ComposableMap projection="geoMercator">` + `<ZoomableGroup>` + `<Geographies>` to render country outlines.
  - Fires `onBoundsChange` debounced 200ms on `onMoveEnd` of `ZoomableGroup`. Bounds derived from current center + zoom + viewport dimensions (use the projection inverse).
  - `children` (markers) rendered inside `<ZoomableGroup>` so they transform with pan/zoom.
  - Country geographies styled flat — dark fill (`fill-bg-elevated`), white/10 stroke. No hover effect on countries (interactivity is at the marker layer).
- [ ] Step 3: Smoke test (renders without crashing in jsdom; bounds callback fires at least once on mount).
- [ ] Step 4: Verify gates.

### Task 3 — Kit: `<MapAvatar>` marker — tappable gradient stamp at country centroid

**Files:**
- Create: `src/components/app/map-avatar.tsx`

**Steps:**

- [ ] Step 1: Implement `MapAvatar`:
  - Props: `{ candidate: Profile & { id?: string } }`.
  - Looks up `centroidOf(candidate.country)`. If null, renders nothing (defensive — never throws on bad ISO).
  - Wraps the marker in `react-simple-maps` `<Marker coordinates={[lng, lat]}>`.
  - Renders the `gradientsFor(candidate.firstName?.toLowerCase() ?? "x")[0]` (first photo) as a `size-tap` circle (44×44) with a 2px white/10 ring + lavender accent.
  - The whole marker is a `<Link href={\`/profile/${candidate.firstName?.toLowerCase()}\`}>` — Next.js navigation.
  - aria-label: `${candidate.firstName}, ${candidate.age}, ${countryLabelFor(candidate.country)}`.
- [ ] Step 2: Verify gates. No new tests for this component (TDD applies to pure logic, not React render shells — covered by /map page integration).

### Task 4 — Kit: continent picker

**Files:**
- Create: `src/components/app/continent-picker.tsx`

**Steps:**

- [ ] Step 1: Implement `ContinentPicker`:
  - Props: `{ active?: ContinentId; onPick: (continent: ContinentId, bbox: [n,s,e,w]) => void }`.
  - Horizontal flex-wrap row of 6 lavender `Pill`s, labels = continent names.
  - Tap → calls `onPick(id, bbox)` where `bbox` comes from `CONTINENTS` static.
  - Active pill gets `data-active` for selected styling (extend cva on Pill if needed, but DO NOT inline className — if the existing Pill doesn't have an active state, add one as a cva variant before using here).
- [ ] Step 2: Verify gates.

### Task 5 — Route: `/map` + BottomNav update

**Files:**
- Create: `src/app/map/page.tsx`
- Modify: `src/components/app/bottom-nav.tsx`

**Steps:**

- [ ] Step 1: Implement `/map` page:
  - `"use client"`. `useProfile()` for the viewer. Soft-redirect to `/onboarding` if viewer is not discover-eligible (mirrors `/discover`'s gate).
  - Compose: `<PageHeader>` ("Map") + `<ContinentPicker>` + `<WorldMap onBoundsChange>` + bottom CTA card.
  - State: `const [bounds, setBounds] = useState<Bbox | null>(null);`
  - State: `const [activeContinent, setActiveContinent] = useState<ContinentId | undefined>();`
  - Filter SAMPLE_PROFILES → `showOnMap !== false` → render `<MapAvatar>` per profile.
  - The bottom-CTA wiring happens in Task 6.
- [ ] Step 2: Update BottomNav `TABS` array to insert Map between Discover and Matches:
  - `{ key: "map", href: "/map", label: "Map", Icon: Globe }`
  - 5 tabs total. Visual fits within `max-w-95` container at 414px (5 × ~76px slots — verified in T8 smoke walk).
- [ ] Step 3: Verify gates + smoke walk: navigate `/map` → confirm map renders, 7 avatar markers visible (Caleb opted out), Map tab highlighted in BottomNav with lime circle.

### Task 6 — Localised-swipe CTA

**Files:**
- Modify: `src/app/map/page.tsx` (add the bottom CTA)
- Read-only reference: `src/lib/discover-engine.ts` (the `country` filter), the discover page's filter-consumption flow.

**Steps:**

- [ ] Step 1: Compute "candidates inside current bounds" — for each visible SAMPLE_PROFILE, check `centroidOf(p.country)` is inside `bounds`. Store as `visibleCandidates`.
- [ ] Step 2: Render a bottom CTA Card (sticky above the BottomNav) with label `Swipe candidates here (${visibleCandidates.length})`. Disabled when count is 0.
- [ ] Step 3: On tap: derive the unique set of country ISOs from `visibleCandidates`. Persist them as the country filter (write to the same filter state /discover reads — likely localStorage `ahavah.filters.v1` if that's the current persistence, or via the existing useFilters hook if it exists; the implementer audits the SP13 FiltersSheet to find the canonical filter-persist path and uses the same one). Then `router.push("/discover")`.
- [ ] Step 4: Confirm on `/discover`: country pills reflect the map-resolved selection (open FiltersSheet → Country group shows the selected ISOs with active state). Deck shows only those candidates.
- [ ] Step 5: Verify gates + smoke walk per Step 4.

### Task 7 — Privacy: `showOnMap` field + Settings toggle

**Files:**
- Modify: `src/lib/profile-schema.ts`
- Modify: `src/lib/profile-sample.ts`
- Modify: `src/app/settings/page.tsx`
- Create: `src/lib/use-show-on-map.ts` (small hook over localStorage `ahavah.show_on_map`)
- Create: `tests/lib/use-show-on-map.test.ts`

**Steps:**

- [ ] Step 1: Add `showOnMap?: boolean` to `Profile` aggregate. No new validator.
- [ ] Step 2: Set `showOnMap: true` on 7 SAMPLE_PROFILES, `false` on Caleb.
- [ ] Step 3: Implement `useShowOnMap()` hook — localStorage `ahavah.show_on_map` (default `true`), exposes `{ value, setValue, loaded }`.
- [ ] Step 4: Add the Switch row to `/settings`:
  - Label: "Show me on the map"
  - Helper: "Others see your avatar pinned to your country on the discovery map. Turn off to stay hidden."
  - Bound to `useShowOnMap`.
- [ ] Step 5: Verify gates — tests for the hook (3 cases), smoke walk: toggle off → reload → toggle remembers off. (The viewer's own avatar doesn't render on the map in the MVP since the viewer isn't in SAMPLE_PROFILES, so this is a self-respecting opt-in but doesn't visibly remove markers in the MVP. Document this limitation in the §21 closeout — backend signups are needed to test the full flow against real other-user maps.)

### Task 8 — Smoke walk + PROJECT-STATUS §21 + merge

**Files:**
- Modify: `PROJECT-STATUS.md`

**Steps:**

- [ ] Step 1: End-to-end smoke walk:
  1. Visit `/map` → confirm 7 avatar markers visible (Caleb opted out at sample level).
  2. Pan/zoom on the map → confirm `onBoundsChange` updates the bottom CTA count.
  3. Tap continent picker → "Africa" → map pans/zooms to Africa bbox → CTA shows count of visible African candidates (Ezekiel + Tirzah = 2).
  4. Tap a marker → navigates to `/profile/[name]`.
  5. Back to `/map` → tap "Swipe candidates here" → navigates to `/discover` with country filter = the visible ISOs → swipe deck shows only those candidates.
  6. Open FiltersSheet on `/discover` → Country group reflects the map-resolved selection.
  7. Settings → toggle "Show me on the map" → reload → toggle remembers state.
- [ ] Step 2: Append PROJECT-STATUS §21. Each claim cites a specific verification (grep / test / smoke step). Cross-reference the §19 "Correction" subsection added in commit `8eee357`.
- [ ] Step 3: Full verification gates — `npx tsc --noEmit`, `pnpm exec eslint --max-warnings=0 .`, `npx vitest run` (expect 232 + 9 + 3 = 244 passing), `pnpm build` (expect 43 + 1 = 44 routes).
- [ ] Step 4: Commit docs. Merge to master via `git merge --no-ff sub-plan-14-map-discovery`.

---

## Verification

Per-task (Tasks 1–7):
- `npx tsc --noEmit` clean
- `pnpm exec eslint --max-warnings=0` clean on touched files
- `npx vitest run` — 232 (master) + new-task tests pass
- Browser smoke walk for UI tasks (5, 6, 7)

Whole-sub-plan (after Task 8):
- Tests: ≥244 passing.
- TypeCheck clean.
- Lint clean.
- Production build clean — 44 routes resolve.
- End-to-end smoke walk above.
- PROJECT-STATUS §21 cites specific verification queries per the §18 rule.
- `grep -rn "react-simple-maps" src/` → returns the WorldMap component + map page.
- `grep -n "showOnMap" src/lib/profile-schema.ts` → returns the new field.
- `grep -n "map" src/components/app/bottom-nav.tsx` → returns the new tab entry.

---

## Self-review notes

- **Spec coverage:** every Bumpy map feature cited in the WebSearch results has a corresponding task. World map (T2 + T5), avatars pinned (T3), pan/zoom (T2), continent picker (T4), tap-to-profile (T3), localised swipe (T6), "Show yourself on map" (T7).
- **Placeholder scan:** zero TBD / appropriate / similar-to. Every "implement X" step has the type signature + props in this spec.
- **Type consistency:** new `mapBounds` / `Bbox` / `ContinentId` types are introduced once in T1's continent-bbox module and referenced consistently across T2, T5, T6.
- **DRY:** new components mirror existing kit patterns. ContinentPicker uses the same Pill pattern as FilterSection pills. WorldMap follows the PageShell composition.
- **Scope fence:**
  - No backend.
  - No real lat/lng.
  - No mapbox / tile servers / API tokens.
  - No premium gating.
  - No new design tokens.
  - No new motion variants (the map's own pan/zoom is the motion; existing fade-up entrance reused for chrome).
  - No SP9 photo dependency — gradient stamps stay.
- **Failure-pattern guard:**
  - SDD enforced per task (implementer + spec review + code-quality review).
  - The map-misframing failure pattern that triggered this sub-plan is documented in `feedback_ahavah_verify_external_products.md` (memory). T1 verifies React 19 compat against `node_modules/react-simple-maps/package.json` — not against npm metadata — to avoid a similar spec-vs-reality miss.
  - §21 closure must cite verification queries per §18 sign-off rule.
  - Bottom-nav goes from 4 to 5 tabs — verify visual fit at 414px in T5 smoke walk before claiming PASS.

---

## Execution

This plan is structured for `superpowers:subagent-driven-development`. 8 tasks: Tasks 1 + 7 are pure-logic TDD; Tasks 2-6 are component / integration; Task 8 is closeout + docs + merge. Each task fits a single implementer dispatch + spec review + code-quality review. The pure-logic tasks ship tests first; the UI tasks gate on browser smoke walks (Playwright MCP, viewport 414×896).

Estimated subagent invocations: ~24 (8 implementers + 8 spec reviewers + 8 quality reviewers, plus fix-ups as needed).

Branch: `sub-plan-14-map-discovery`. Merge to master via `git merge --no-ff`.

# Map Location Precision + Functional Relocation — Implementation Plan

**Goal:** Show people on the map at their real city-level location instead of all stacking on a country centroid; collect a precise city during onboarding; make `local-only` / `open-to-relocation` actually gate Discover by distance.

**Root cause (verified 2026-06-16):** The map is country-level by construction. `Q_CACHED_SEARCH` (service/search/sql) returns `country` but no lat/lng, and the FE `map-avatar.tsx` positions every marker via `centroidOf(country)` (`src/lib/country-centroids.ts`). So `person.coordinates` (the re-pins + the claim region fix) is data the map never reads. Fixing the map requires wiring real coordinates through both layers, plus collecting them precisely.

**Decisions (user, 2026-06-16):** distance-gate Discover for local-only/open-to-relocation; add the city step AFTER the existing country step.

**Privacy:** markers use a CITY-level point (city centroid), not an exact address — coarse enough to be safe, precise enough to separate states/cities. The free `showOnMap` opt-out stays. The gold-gated `show_my_location` (precise city STRING on the profile) is unchanged.

---

## Task 1 — Backend: expose lat/lng in the map/search result

**Files:**
- Modify: `service/search/sql/__init__.py` — `Q_CACHED_SEARCH` SELECT
- Check: `service/search/__init__.py` — row→dict mapping, add the two fields to the wire shape
- Check: `service/api/__init__.py` — the /search (map) response passthrough

- [ ] Confirm the `person.coordinates` column type and the lat/lng extraction (duolicious uses earthdistance `earth`/`cube` → `longitude(coordinates)` / `latitude(coordinates)`; verify against an existing distance query before writing).
- [ ] Add `latitude(p.coordinates) AS latitude, longitude(p.coordinates) AS longitude` (NULL-safe) to `Q_CACHED_SEARCH`.
- [ ] Thread the two fields through the search row mapping + the API JSON so the FE receives `latitude`/`longitude` (nullable).
- [ ] Verify: curl the map/search endpoint as the admin session; the response includes real lat/lng for Christopher (NY) + Sophia (MO), distinct from the Abbeville pair.

## Task 2 — FE: map markers use precise coords, fall back to country centroid

**Files:**
- Modify: `src/components/app/map-avatar.tsx` (position source)
- Modify: the map data type/adapter feeding map-avatar (add `latitude`/`longitude`)
- Modify: `src/app/map/page.tsx` if it computes positions

- [ ] Extend the prospect/map type with `latitude?: number | null; longitude?: number | null`.
- [ ] In map-avatar positioning: use `{lat, lng}` when both are numbers; else `centroidOf(country)` (unchanged fallback). Keep `country-centroids.ts` — it's the fallback, not dead.
- [ ] Verify (RENDERED PIXELS, not DB): headless Chrome, admin session, load /map, screenshot. Confirm NY, MO, and the Abbeville pair are at visibly distinct points; zoom shows them separate. This is the verification my earlier work skipped.

## Task 3 — City onboarding step (new surface → design flow)

**Files:**
- Create: `src/app/onboarding/city/page.tsx`
- Modify: onboarding step order/stepper (insert after country)
- Modify: `src/lib/profile-completeness.ts` (decide: city optional vs required — default OPTIONAL so it never blocks Discover; country stays the required gate)
- Modify: profile edit (add a city/location row so existing users can set it)
- Backend: reuse the existing location-resolution path (the profile location PATCH already resolves a `long_friendly` → coords); confirm the city typeahead/autocomplete endpoint exists, else add a thin one over the `location` table.

- [ ] Run the city step through /frontend-design + /ui-implementer; it mirrors the existing country step's pattern (typeahead Card list + Continue), kit primitives only.
- [ ] Selecting a city sets `person.coordinates` (city centroid) + `country` in one step.
- [ ] Verify: complete onboarding picking a city; the person row gets that city's coords; the map (Task 2) places them there.

## Task 4 — Distance-gate Discover (functional local-only / open-to-relocation)

**Files:**
- Modify: `service/search/sql/__init__.py` (prospect_pool / distance predicate)
- Check: interplay with the existing distance search preference + `open_to_long_distance`

- [ ] In the prospect filter: when the searcher's `intent` includes `local-only`, cap prospects to within a radius of the searcher's coords; when it includes `open-to-relocation`, do not distance-cap. Define precedence vs the existing distance pref (open-to-relocation wins over a tight distance pref; local-only tightens it).
- [ ] Requires precise coords (Task 1/3); falls back gracefully to country-level when a side has no coords.
- [ ] Verify: a local-only searcher with coords stops seeing far prospects; an open-to-relocation searcher sees them regardless of distance.

## Task 5 — Final rendered verification + backfill note

- [ ] The existing NY/MO re-pins + the claim region coord fix become visible the moment Tasks 1+2 land (no new backfill needed for them). Region-less users (Brandon, Emily) gain precision only after they set a city (Task 3).
- [ ] Final: rendered map screenshot, actually viewed, confirming the spread. No "DB says so" verification.

---

## Sequencing
Tasks 1 → 2 are the minimum to make the *current* coords (re-pins) visible — ship them first and the map stops "looking the same". Task 3 (city) gives everyone precision going forward. Task 4 (distance-gate) depends on 1/3. Each task is independently testable.

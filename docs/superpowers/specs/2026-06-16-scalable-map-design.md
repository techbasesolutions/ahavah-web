# Scalable Map — Design

> **REVISED 2026-06-16 (post-launch feedback).** The server-side grid clustering this doc describes was built and shipped, then **reverted** after live testing. At this scale it regressed UX: same-coordinate users (e.g. two profiles in Abbeville) collapsed into a count bubble that no zoom or spiderfy could fan apart; it refetched over the network on every pan (slow); and it showed no pins until the first pan set a viewport. **Shipped instead:** the endpoints (`/map/markers`, `/admin/map`) return **individual points** — the viewer's full match set (up to 1000), or all activated users for admin — and the frontend clusters + **spiderfies** them with Leaflet's `MarkerClusterGroup`, fetched **once** per filter set (not per pan). This restores same-coord fan-out, instant panning, and pins on first load, and still removes the top-10 cap. Server-grid is deferred until the client approach actually strains (tens of thousands of markers); the rest of this doc is the design for that future.

**Problem:** `/map` consumed the discover deck (`/search`, `n` capped at 10) and rendered only the first page, so every user past the top 10 of the `verification_level DESC, last_online DESC` sort silently vanished. At launch this hid 4 of 14 users (Anthony, the lone Australia pin, was the visible symptom). It does not scale.

**Approved decisions (brainstorming 2026-06-16):**
- Map shows each viewer's **compatible matches** (respects their dating filters), not the whole community.
- **Server-side clustering** at scale (count bubbles when zoomed out, pins when zoomed in).
- **Normal and admin maps are strictly separate** surfaces: different endpoints, hooks, and state. They must never share filter logic or get conflated.

## Architecture

The **viewport drives the data**. `onBoundsChange` (already wired) emits `bbox + zoom` on every pan/zoom settle; a debounced fetch returns a bounded set of clusters/pins for exactly what is in view. The payload is bounded by *viewport area / cell size* (a few hundred cells max), never by user count.

| | Normal `/map` | Admin "Show everyone" |
|---|---|---|
| Endpoint | `GET /map/markers` | `GET /admin/map` |
| Hook | `useMapMarkers` | `useMapMarkers({admin:true})` |
| Source | viewer's `search_cache` (already filtered) | `person` (all activated) |
| Filters | viewer's dating filters (via the cache) | none |
| Privacy | `show_my_location` + `showOnMap` + skip/self | shows opt-outs; `require_admin` |
| State | `everyoneMode === false` | `everyoneMode === true` |

**Why read from `search_cache` (refinement of pure Approach A):** `Q_BUILD` already inserts the viewer's full filtered match set (`LIMIT 1000`) into `search_cache`; only `Q_CACHED_SEARCH` caps the read at 10. Reading the cache reuses the exact filter logic with **zero changes to the live search query**. Tradeoff: a soft 1000-match cap per viewer (vs uncapped) — well above any real map need, raisable by bumping `Q_BUILD`'s `LIMIT`.

## Backend

**`Q_MAP_MARKERS`** (read-only; does NOT rebuild the cache — the deck's `/search` on mount/filter-change owns the build):

```sql
WITH filtered AS (
  SELECT p.id, p.uuid::text AS uuid, p.name, p.country,
         p.coordinates::geometry AS geom,
         (SELECT ph.uuid FROM photo ph WHERE ph.person_id = p.id
           ORDER BY ph.position LIMIT 1) AS photo_uuid
  FROM search_cache sc
  JOIN person p ON p.id = sc.prospect_person_id
  WHERE sc.searcher_person_id = %(viewer)s
    AND p.coordinates && ST_MakeEnvelope(%(west)s,%(south)s,%(east)s,%(north)s,4326)
    AND p.show_my_location
    AND COALESCE((p.ahavah_extra->>'showOnMap')::boolean, TRUE)
),
grid AS (
  SELECT ST_SnapToGrid(geom, %(cell)s, %(cell)s) AS cell,
         count(*) AS cnt,
         ST_Y(ST_Centroid(ST_Collect(geom))) AS lat,
         ST_X(ST_Centroid(ST_Collect(geom))) AS lng,
         (array_agg(id ORDER BY id))[1] AS rep_id
  FROM filtered GROUP BY ST_SnapToGrid(geom, %(cell)s, %(cell)s)
)
SELECT g.lat, g.lng, g.cnt,
       CASE WHEN g.cnt = 1 THEN f.uuid END       AS uuid,
       CASE WHEN g.cnt = 1 THEN f.name END       AS name,
       CASE WHEN g.cnt = 1 THEN f.photo_uuid END AS photo_uuid,
       CASE WHEN g.cnt = 1 THEN f.country END    AS country
FROM grid g LEFT JOIN filtered f ON f.id = g.rep_id;
```

- **Cell size from zoom**, server-side: `cell_deg = 90.0 / (2 ** zoom)` (~64px cells). Clamp zoom to [1, 18].
- **Singleton detail:** a cell with `cnt = 1` carries the user's `uuid/name/photo/country` so the frontend draws a real avatar; `cnt > 1` is a count bubble at the centroid.
- `SET LOCAL statement_timeout = 10000` (mirror `/search`).
- Uses the existing GiST index `idx__person__activated__coordinates__gender_id`.

**`Q_ADMIN_MAP_MARKERS`** — identical grid/singleton logic, but `FROM person p WHERE p.activated AND p.coordinates && ST_MakeEnvelope(...)` (no cache, no filters, no privacy predicate). Replaces the current all-rows `Q_ADMIN_MAP_USERS`.

**Routes:**
- `GET /map/markers?bbox=s,w,n,e&zoom=Z` (new, session-gated) → `{ markers: [...] }`.
- `GET /admin/map?bbox=s,w,n,e&zoom=Z` (upgrade existing; `require_admin`).

Response item: `{ lat, lng, count, uuid?, name?, photo_uuid?, country? }`.

## Frontend

- **`useMapMarkers(bbox, zoom, { admin })`** — fetches `/map/markers` (or `/admin/map` when `admin`), debounced ~300ms, with a request-sequence guard (drop stale responses, like the deck hook). Returns `markers`. Normal mode is gated on the deck having loaded once (so the cache exists).
- **`map/page.tsx`** — re-enable `onBoundsChange → setBbox/setZoom`; markers come from `useMapMarkers`, not the deck. Render: `count === 1` → existing `MapAvatar`; `count > 1` → a **cluster bubble** (count label) at `(lat,lng)`; tapping a cluster zooms in (`fitBounds`/zoom+2). `everyoneMode` flips the hook to admin. Remove the client-side `MarkerClusterGroup` (server clusters replace it) and the deck-as-marker-source.
- Keep the persisted viewport + `fitBounds` plumbing.

## Data flow

1. Map mounts at restored viewport → deck `/search` builds the cache → `useMapMarkers` fetches `/map/markers` for the viewport → render clusters/pins.
2. Pan/zoom → debounced `onBoundsChange` → re-fetch for new bbox+zoom (read-only; no rebuild).
3. Filter change → deck re-`/search` rebuilds the cache → markers re-fetch.
4. Admin toggles "Show everyone" → same flow via `/admin/map`.

## Edge cases / errors

- Debounce + stale-response guard for rapid panning.
- Empty viewport → `[]` → no markers.
- Antimeridian-crossing bbox (rare): clamp longitudes; acceptable to under-fetch at the ±180 seam for v1.
- Degree-based grid distorts near the poles; irrelevant for populated latitudes.
- Cache not yet built on first paint → markers gated on deck-loaded; empty until then.
- Coordinate precision unchanged (city-level); further fuzzing is a separate privacy task, out of scope.

## Testing

- **SQL:** N users in one cell → one cluster `cnt=N`; a lone user → `cnt=1` with detail; users outside bbox excluded; `show_my_location=false` / `showOnMap=false` excluded (normal) but included (admin); cell size shrinks with zoom.
- **Filter correctness:** normal markers = the viewer's cached matches only; admin = all activated.
- **Regression:** at world zoom Anthony is inside a cluster; zooming into Australia resolves his avatar (no cap drops him).
- **Frontend:** cluster renders count, singleton renders avatar, pan refetches, debounce/stale-guard hold, admin toggle switches endpoint.

## Out of scope

Raising the 1000 match-set cap; location fuzzing; the "whole community" (unfiltered) map variant.

# Verification + Settings + Notifications Soft-Launch Readiness Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the open verification, settings, and notifications gaps so the app is ready for soft launch: (a) verified-only filter actually reaches the backend, (b) "require verified matches" UI exists, (c) inbox no longer flashes "Person" before names load, (d) back buttons across legal/help/settings stop hardcoding `/` and respect the user's history, (e) duplicate settings entry points are consolidated, (f) `/settings/safety` is simplified and the dead "Local emergency numbers" tile is removed, (g) `/settings/notifications` becomes a real per-event preference surface (matches / messages / likes / weekly digest) backed by a new Postgres table + PATCH endpoint.

**Architecture:** Five slices:

1. **Verification end-to-end** — plumb `verified_only` query param through `useDiscoverDeck` → `/search` → SQL; add a `requireVerifiedMatches` toggle on `/settings/privacy` that PATCHes a new `verification_required` field.
2. **Inbox UX** — replace the `"Person"` placeholder with a skeleton + `sessionStorage` cache.
3. **Back-button fixes** — new shared `BackButton` client component that prefers `router.back()` and falls back to an explicit `fallback` when history is empty (PWA cold-start / direct link). Replace 8+ hardcoded back targets across legal, help, settings, verify.
4. **Settings consolidation** — strip duplicate Blocked-users / Privacy doors from `/settings/safety` and `/settings/privacy`, demote `/settings/safety` to a tips + legal-links page, remove the `/safety/emergency` route + its `/settings/safety` link, add the missing `/legal/terms` link to settings.
5. **Notifications buildout** — new `notification_preference` table (migration 0013), GET/PATCH `/notifications/preferences` routes, `send_to_user_safe()` accepts an `event_kind` parameter and short-circuits per the row, `/settings/notifications` page rebuilt with 4 real toggles bound to the new endpoints.

**Tech Stack:** Next.js 16 + React 19 frontend (`d:/Antigravity/ahavah-web`); Python ASGI + Postgres backend (`d:/Antigravity/ahavah-api`). Backend `verification_required` BOOLEAN column already exists on `person`; only the PATCH handler + UI surface are missing. `useFilters()` already tracks `verifiedOnly` — needs the wire down to the API call. No existing notification-preference state — new table + handlers required.

---

## File Structure

**Backend (`d:/Antigravity/ahavah-api`):**
- `duotypes/__init__.py:506` — add `verification_required: Optional[str]` field to `PatchProfileInfo`
- `service/person/__init__.py:1505` — add `elif field_name == 'verification_required':` handler branch
- `service/search/__init__.py:98-138` — add `verified_only: bool` parameter to `get_search()` + plumb to `_uncached_search_results`
- `service/search/sql/__init__.py:66-151` — extend `Q_UNCACHED_SEARCH_2` `prospect_pool` CTE with verified-only filter
- `service/api/__init__.py:262` — parse `verified_only` query string + pass to `search.get_search`
- `migrations/0013_notification_preferences.sql` *(new)* — `notification_preference` table (push_matches / push_messages / push_likes / push_weekly_digest booleans, all default ON except likes + weekly)
- `duotypes/__init__.py` — add `PatchNotificationPreferences` model (4 optional booleans)
- `service/notifications/__init__.py` — refactor `send_to_user_safe()` to accept `event_kind: Literal["match", "message", "like", "weekly"]`; short-circuit when the per-event flag is OFF
- `service/notifications/__init__.py` — add `get_notification_preferences(s)` + `patch_notification_preferences(s, req)` handlers
- `service/api/notifications_routes.py` — wire GET `/notifications/preferences` + PATCH `/notifications/preferences` routes
- `service/decisions/__init__.py:236` — call `send_to_user_safe(..., event_kind="match")`
- `service/chat/messagestorage/__init__.py:129` — call `send_to_user_safe(..., event_kind="message")`

**Frontend (`d:/Antigravity/ahavah-web`):**
- `src/lib/use-discover-deck.ts:22-61` — add `verifiedOnly?: boolean` to `DiscoverFilters` + serialize as `verified_only=1`
- `src/app/discover/page.tsx` + `src/app/map/page.tsx` — pass `verifiedOnly` from `filters` into `useDiscoverDeck`
- `src/app/settings/privacy/page.tsx:39-114` — add 4th toggle "Require verified matches" wired to `verification_required` PATCH; **remove** the "Related" shortcuts block (lines 47-54, 220-245)
- `src/app/inbox/page.tsx:120-166` — replace `"Person"` fallback with skeleton row + sessionStorage cache (`ahavah:inbox-names`)
- `src/components/app/back-button.tsx` *(new)* — shared client component: `router.back()` with `fallback` prop when history is empty
- `src/app/legal/community-guidelines/page.tsx:23` + `src/app/legal/privacy/page.tsx:23` + `src/app/legal/terms/page.tsx:23` — swap hardcoded `<Link href="/">` back arrow for `<BackButton fallback="/" />`
- `src/app/help/page.tsx:89` + `src/app/settings/page.tsx:100` + `src/app/settings/blocked/page.tsx:184` + `src/app/verify/page.tsx:95` — same `BackButton` swap with appropriate fallbacks
- `src/app/settings/safety/page.tsx` — drop the entire Quick Actions block + the `/safety/emergency` resource row; demote the page to tips + legal-links only
- `src/app/safety/emergency/page.tsx` *(delete)* — remove the file; no other route links to it after the safety-page cleanup
- `src/app/settings/page.tsx` — restructure groups: `Account / App / Safety & Legal / Support`; add the missing `/legal/terms` entry
- `src/lib/use-notification-preferences.ts` *(new)* — hook that GETs `/notifications/preferences` on mount and PATCHes single-field updates
- `src/app/settings/notifications/page.tsx` — rebuild as a 4-toggle surface bound to `useNotificationPreferences`

---

## Scope Check

Five sub-systems but all blocking the same milestone (soft-launch UX cleanup). Each task below is self-contained and can be reviewed independently. If executing in parallel agents, slice 5 (notifications) has the most dependencies (DB migration → handlers → routes → UI) and should run sequentially within itself.

---

## Task 1: Backend — Add `verification_required` PATCH field + handler

**Files:**
- Modify: `d:/Antigravity/ahavah-api/duotypes/__init__.py:506-516`
- Modify: `d:/Antigravity/ahavah-api/service/person/__init__.py` (insert after the `country` handler block around line 1505)

- [ ] **Step 1: Add field to PatchProfileInfo**

In `d:/Antigravity/ahavah-api/duotypes/__init__.py`, after the `country` field (around line 506), add:

```python
    # Phase W cutover (2026-05-15) — "Require my matches to be verified".
    # Boolean stored as "Yes"/"No" string to match the rest of
    # PatchProfileInfo (show_my_age, hide_me_from_strangers, etc. follow
    # the same Yes/No convention). When set to "Yes" the discover query
    # excludes any candidate whose ahavah_verification_tier = 'none' AND
    # verification_level_id <= 1.
    verification_required: Optional[str] = None
```

- [ ] **Step 2: Add handler branch in `service/person/__init__.py`**

In `d:/Antigravity/ahavah-api/service/person/__init__.py`, after the `country` field handler (look for `elif field_name == 'country':` around line 1475-1489), insert:

```python
    elif field_name == 'verification_required':
        # Phase W cutover: drives the discover/search filter that excludes
        # unverified prospects from this user's feed. Value is "Yes"/"No"
        # (matching show_my_age + sibling toggles); stored as BOOLEAN on
        # the column. Free for any user — verification gating is opt-in
        # and doesn't require a paid tier.
        q1 = """
        UPDATE person
           SET verification_required = (
               CASE WHEN %(field_value)s = 'Yes' THEN TRUE ELSE FALSE END)
         WHERE id = %(person_id)s
        """
```

- [ ] **Step 3: Smoke-test PATCH via curl from local shell**

Run (against the dev droplet, replacing `$TOKEN` with a real session token):

```bash
curl -sS -X PATCH https://api.ahavah.app/profile-info \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verification_required":"Yes"}' \
  -i | head -10
```

Expected: `HTTP/2 200`, empty body.

Verify the row updated:

```bash
ssh -6 root@2604:a880:800:14:0:2:f28f:5000 \
  "docker exec ahavah-api-postgres-1 psql -U postgres -t -c \
   \"SELECT verification_required FROM person WHERE email='ehud@ahavah.app';\""
```

Expected: `t` (TRUE).

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add duotypes/__init__.py service/person/__init__.py
git commit -m "feat(profile): accept verification_required PATCH

Backend column person.verification_required (BOOLEAN, mig 0001) already
exists and is enforced in the visitors-list filter (sql/__init__.py:3399)
+ the discover SQL extension landing in Task 2. Until this PATCH path
existed, the frontend had no way to flip it — the column stayed at its
default (FALSE) for every user.

Pydantic field accepts 'Yes'/'No' string to match show_my_age + sibling
toggles; handler converts to BOOLEAN before UPDATE."
```

---

## Task 2: Backend — Extend search SQL to honor `verified_only`

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py` (around `get_search` at line 260-293)
- Modify: `d:/Antigravity/ahavah-api/service/search/__init__.py` (`get_search` signature + `_uncached_search_results` plumbing)
- Modify: `d:/Antigravity/ahavah-api/service/search/sql/__init__.py` (Q_UNCACHED_SEARCH_2)

- [ ] **Step 1: Parse `verified_only` in the HTTP route**

In `d:/Antigravity/ahavah-api/service/api/__init__.py`, replace the `get_search` body (lines 260-293) with:

```python
@aget('/search')
def get_search(s: t.SessionInfo):
    n = request.args.get('n')
    o = request.args.get('o')

    rawClub = request.args.get('club')
    lowerClub = None if rawClub is None else rawClub.lower().strip()

    club = (
        search.ClubHttpArg(lowerClub if lowerClub != '\0' else None)
        if 'club' in request.args
        else None
    )

    # Phase W: client-side "Verified only" filter (discover sheet +
    # "Require my matches to be verified" privacy toggle). Either path
    # flips this param; backend just needs the boolean.
    verified_only = request.args.get('verified_only') in ('1', 'true', 'yes')

    search_type, _ = search.get_search_type(n, o)

    limit = "15 per 2 minutes"
    scope = json.dumps([search_type, lowerClub, verified_only])

    if search_type == 'uncached-search':
        with (
            limiter.limit(
                limit,
                scope=scope,
                exempt_when=disable_ip_rate_limit),
            limiter.limit(
                limit,
                scope=scope,
                key_func=limiter_account,
                exempt_when=disable_account_rate_limit)
        ):
            return search.get_search(
                s=s, n=n, o=o, club=club, verified_only=verified_only)
    else:
        return search.get_search(
            s=s, n=n, o=o, club=club, verified_only=verified_only)
```

- [ ] **Step 2: Plumb `verified_only` through `service/search/__init__.py`**

In `d:/Antigravity/ahavah-api/service/search/__init__.py`, modify the signatures + params dict.

Change `get_search` (around line 98):

```python
def get_search(
    s: t.SessionInfo,
    n: str | None,
    o: str | None,
    club: ClubHttpArg | None,
    verified_only: bool = False,
):
    search_type, no = get_search_type(n, o)

    if no is not None and no[0] > 10:
        return 'n must be less than or equal to 10', 400

    if s.person_id is None:
        return '', 500

    params = dict(
        person_id=s.person_id,
        club_name=club.club if club else None,
        do_modify=club is not None,
    )

    with api_tx('READ COMMITTED') as tx:
        tx.execute('SET LOCAL statement_timeout = 10000') # 10 seconds

        rows = tx.execute(Q_SEARCH_PREFERENCE, params).fetchall()

        gender_preference = [row['gender_id'] for row in rows]

        if search_type == 'uncached-search':
            return _uncached_search_results(
                tx=tx,
                searcher_person_id=s.person_id,
                no=no,
                gender_preference=gender_preference,
                verified_only=verified_only)

        elif search_type == 'cached-search':
            return _cached_search_results(
                tx=tx,
                searcher_person_id=s.person_id, no=no)

        else:
            raise Exception(f'Unexpected search type: {search_type}')
```

Change `_uncached_search_results` (find it just above `get_search` in the same file — currently takes `tx`, `searcher_person_id`, `no`, `gender_preference`). Add `verified_only` param + thread into the params dict:

```python
def _uncached_search_results(
    tx,
    searcher_person_id: int,
    no: Tuple[int, int],
    gender_preference: list[int],
    verified_only: bool = False,
):
    n, o = no
    params = dict(
        searcher_person_id=searcher_person_id,
        n=n,
        o=o,
        gender_preference=gender_preference,
        verified_only=verified_only,
    )

    try:
        tx.execute(Q_UNCACHED_SEARCH_1, params)
        tx.execute(Q_UNCACHED_SEARCH_2, params)
        tx.execute(Q_CACHED_SEARCH, params)
        return tx.fetchall()
    except psycopg.errors.QueryCanceled:
        return []
```

- [ ] **Step 3: Extend Q_UNCACHED_SEARCH_2 with the verified-only WHERE clause**

In `d:/Antigravity/ahavah-api/service/search/sql/__init__.py`, find `Q_UNCACHED_SEARCH_2` (starts around line 66). In the `prospect_pool` CTE's `WHERE` block (after the blocked-exclusion clause around line 130), add:

```sql
      -- Phase W: "Verified only" filter. Triggered either by the
      -- discover sheet's verifiedOnly toggle OR the privacy setting
      -- "Require my matches to be verified". Either way the backend
      -- excludes prospects who are at 'none' on the new tier ENUM AND
      -- below 'Photos' on the legacy lookup. Verified = Bronze or
      -- better (any tier ladder entry that proves identity).
      AND (
          NOT %(verified_only)s::boolean
          OR p.ahavah_verification_tier <> 'none'::ahavah_verification_tier
          OR p.verification_level_id > 1
      )
```

Place it immediately after the existing `AND NOT EXISTS (SELECT 1 FROM skipped sk WHERE ...)` clause, before the `)` that closes `prospect_pool`. Exact placement: line ~130, between the skipped-exclusion and the closing paren of the CTE.

- [ ] **Step 4: Smoke-test the SQL change**

```bash
# As a user with verification_required=TRUE, fetch /search; expect only
# verified candidates in the results.
ssh -6 root@2604:a880:800:14:0:2:f28f:5000 \
  "docker exec ahavah-api-postgres-1 psql -U postgres -t -c \
   \"SELECT id, name, ahavah_verification_tier, verification_level_id \
     FROM person \
     WHERE ahavah_verification_tier = 'none' AND verification_level_id <= 1 \
     LIMIT 3;\""
```

Note 3 unverified UUIDs from the output. Then:

```bash
curl -sS "https://api.ahavah.app/search?n=10&o=0&verified_only=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.[].prospect_uuid' | head -10
```

Expected: none of the noted unverified UUIDs appear.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/api/__init__.py service/search/__init__.py service/search/sql/__init__.py
git commit -m "feat(search): honor verified_only query param

Plumbs verified_only through /search route -> get_search ->
_uncached_search_results -> Q_UNCACHED_SEARCH_2. New CTE clause
excludes any prospect at tier='none' AND verification_level_id<=1
when the flag is set.

The flag is set from two places (next commits):
  - Discover filter sheet's existing 'Verified only' toggle.
  - 'Require my matches to be verified' privacy setting (Task 4):
    a useDiscoverDeck wrapper reads requireVerifiedMatches off the
    user's own profile and OR's it into verifiedOnly before the
    fetch fires."
```

---

## Task 3: Frontend — Plumb `verifiedOnly` to `useDiscoverDeck`

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/lib/use-discover-deck.ts:22-61` (add to type + serialize)
- Modify: `d:/Antigravity/ahavah-web/src/app/discover/page.tsx` (find the `useDiscoverDeck` call + add `verifiedOnly: filters.verifiedOnly`)
- Modify: `d:/Antigravity/ahavah-web/src/app/map/page.tsx` (same)

- [ ] **Step 1: Add `verifiedOnly` to the DiscoverFilters type + query builder**

In `d:/Antigravity/ahavah-web/src/lib/use-discover-deck.ts`, replace lines 22-27 (the `DiscoverFilters` type) with:

```ts
export type DiscoverFilters = {
  ageMin?: number;
  ageMax?: number;
  countries?: ReadonlyArray<string>;
  languages?: ReadonlyArray<string>;
  // Phase W: filter discover pool to verified prospects only. Driven by
  // either the discover-sheet toggle or the privacy setting "Require my
  // matches to be verified" (the wrapper OR's both at the call site).
  // Backend treats undefined and false identically.
  verifiedOnly?: boolean;
};
```

Then replace `buildSearchPath` (lines 40-61) with:

```ts
export function buildSearchPath(
  cursor: string | null,
  filters: DiscoverFilters,
): string {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filters.ageMin !== undefined) {
    params.set("age_min", String(filters.ageMin));
  }
  if (filters.ageMax !== undefined) {
    params.set("age_max", String(filters.ageMax));
  }
  if (filters.countries && filters.countries.length > 0) {
    params.set("countries", filters.countries.join(","));
  }
  if (filters.languages && filters.languages.length > 0) {
    params.set("languages", filters.languages.join(","));
  }
  if (filters.verifiedOnly) {
    params.set("verified_only", "1");
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
```

- [ ] **Step 2: Pass `verifiedOnly` from `/discover` page**

In `d:/Antigravity/ahavah-web/src/app/discover/page.tsx`, find the `useDiscoverDeck` call (search for `useDiscoverDeck(`). The current call looks roughly like:

```ts
const { items, loadMore, ... } = useDiscoverDeck({
  ageMin: filters.ageMin,
  ageMax: filters.ageMax,
  countries: filters.country,
  languages: filters.languages,
});
```

Replace with:

```ts
// Phase W: feed forwards `verifiedOnly` so the backend can drop
// unverified prospects. Two sources OR together:
//   1. The discover sheet's per-session toggle (`filters.verifiedOnly`).
//   2. The user's profile-level "Require verified matches" setting
//      (`profile.requireVerifiedMatches`) which the privacy page
//      controls and which acts as a sticky default.
const { items, loadMore, ... } = useDiscoverDeck({
  ageMin: filters.ageMin,
  ageMax: filters.ageMax,
  countries: filters.country,
  languages: filters.languages,
  verifiedOnly: Boolean(filters.verifiedOnly || profile?.requireVerifiedMatches),
});
```

(Where `profile` comes from `useProfile()`; if the existing file doesn't already destructure it, add `const { profile } = useProfile();` at the top of the component.)

- [ ] **Step 3: Same change in `/map` page**

In `d:/Antigravity/ahavah-web/src/app/map/page.tsx`, find the `httpFilters` memo (around line 214-222) and update it:

```ts
const httpFilters = useMemo(
  () => ({
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    countries: filters.country,
    languages: filters.languages,
    verifiedOnly: Boolean(
      filters.verifiedOnly || viewer?.requireVerifiedMatches,
    ),
  }),
  [
    filters.ageMin,
    filters.ageMax,
    filters.country,
    filters.languages,
    filters.verifiedOnly,
    viewer?.requireVerifiedMatches,
  ],
);
```

(`viewer` is already in scope from the existing `useProfile()` call on this page.)

- [ ] **Step 4: Run typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/lib/use-discover-deck.ts src/app/discover/page.tsx src/app/map/page.tsx
git commit -m "feat(discover): plumb verifiedOnly to /search

Adds verifiedOnly to DiscoverFilters, serialized as ?verified_only=1.
Discover + map pages OR the discover-sheet toggle with the user's
profile-level requireVerifiedMatches setting so either source flips
the filter.

Was previously a UI-only mock (the toggle wrote to localStorage but
never reached the backend); audit flagged it as a paywall lie since
'Verified-only filter' was advertised as a Premium benefit while
free users got the (broken) filter anyway."
```

---

## Task 4: Frontend — "Require verified matches" privacy toggle

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/lib/profile-schema.ts` (find the `Profile` type — add `requireVerifiedMatches?: boolean`)
- Modify: `d:/Antigravity/ahavah-web/src/lib/use-profile.ts` (TRANSFORMS map — add `requireVerifiedMatches` → Yes/No PATCH)
- Modify: `d:/Antigravity/ahavah-web/src/lib/use-profile.ts` (SERVER_TO_CLIENT_KEY + inbound translator — read `verification_required` back as boolean)
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx` (add 4th toggle)

- [ ] **Step 1: Add field to Profile type**

In `d:/Antigravity/ahavah-web/src/lib/profile-schema.ts`, find the `Profile` interface (search for `interface Profile {`). After the `showOnMap?: boolean;` line (~879), add:

```ts
  // Phase W cutover (2026-05-15) — "Require my matches to be verified".
  // Drives the /search verified_only filter as a sticky setting (lives
  // on /settings/privacy, persists per-account). Free for any user.
  requireVerifiedMatches?: boolean;
```

- [ ] **Step 2: Add outbound TRANSFORM**

In `d:/Antigravity/ahavah-web/src/lib/use-profile.ts`, find the `TRANSFORMS` map (search for `const TRANSFORMS:`). After the `showOnMap` entry (line ~218), add:

```ts
  // Phase W cutover (2026-05-15) — "Require my matches to be verified".
  // Backend column person.verification_required (BOOLEAN). Frontend
  // sends "Yes"/"No" to match the show_my_age + sibling toggles'
  // convention; backend handler converts to BOOLEAN before UPDATE.
  requireVerifiedMatches: (v) =>
    typeof v === "boolean"
      ? { verification_required: v ? "Yes" : "No" }
      : null,
```

- [ ] **Step 3: Add SERVER_TO_CLIENT_KEY entry**

In the same file, find `SERVER_TO_CLIENT_KEY` (search for `SERVER_TO_CLIENT_KEY`). Add:

```ts
  "verification required": "requireVerifiedMatches",
  "verification_required": "requireVerifiedMatches",
```

(both space-form and snake_case, matching the existing pattern for other Yes/No backend fields).

- [ ] **Step 4: Add inbound reverseTranslateValue case**

In `d:/Antigravity/ahavah-web/src/lib/use-profile.ts`, find `reverseTranslateValue` (search for `function reverseTranslateValue`). Add a case before the default return:

```ts
    case "requireVerifiedMatches":
      // Backend ships "Yes" / "No" (mirrors the show_my_age convention).
      // Translate to a plain boolean so the toggle in /settings/privacy
      // can bind to it directly without re-parsing.
      if (typeof serverValue === "string") {
        return serverValue.toLowerCase() === "yes";
      }
      if (typeof serverValue === "boolean") return serverValue;
      return undefined;
```

- [ ] **Step 5: Add the toggle to `/settings/privacy/page.tsx`**

In `d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx`, find the `BackedKey` type (line ~39) and replace with:

```ts
type BackedKey =
  | "showAge"
  | "showLocation"
  | "hideFromStrangers"
  | "requireVerifiedMatches";

const SERVER_FIELD: Record<BackedKey, string> = {
  showAge: "show_my_age",
  showLocation: "show_my_location",
  hideFromStrangers: "hide_me_from_strangers",
  requireVerifiedMatches: "verification_required",
};
```

In the `useState` defaults block (line ~61-65), replace with:

```tsx
  const [toggles, setToggles] = useState<Record<BackedKey, boolean>>({
    showAge: true,
    showLocation: true,
    hideFromStrangers: false,
    requireVerifiedMatches: false,
  });
```

In the GET `/profile-info` `.then((p) => { ... setToggles({...}) ... })` block (line ~82-92), replace with:

```tsx
        setToggles({
          showAge: yesNoToBool(p["show my age"] ?? p.show_my_age),
          showLocation:
            "show my location" in p || "show_my_location" in p
              ? yesNoToBool(p["show my location"] ?? p.show_my_location)
              : true,
          hideFromStrangers: yesNoToBool(
            p["hide me from strangers"] ?? p.hide_me_from_strangers,
          ),
          requireVerifiedMatches: yesNoToBool(
            p["verification required"] ?? p.verification_required,
          ),
        });
```

Then, in the section that renders the toggle list (look for `<Item variant="muted">` blocks; the "Hide me from strangers" toggle is the last one currently — line ~171-189), add a fourth toggle AFTER it:

```tsx
            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-white">
                  Require verified matches
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  Only show profiles that have completed Bronze, Silver,
                  or Gold verification in your discover feed.
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={toggles.requireVerifiedMatches}
                disabled={savingKey === "requireVerifiedMatches"}
                onCheckedChange={(checked) =>
                  void setBacked("requireVerifiedMatches", checked)
                }
                aria-label="Require verified matches"
              />
            </Item>
```

- [ ] **Step 6: Run typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 7: Manual smoke test**

After Vercel deploys:
1. Sign in as Ehud, navigate to `/settings/privacy`.
2. Verify the new "Require verified matches" row renders BELOW "Hide me from strangers".
3. Toggle ON. Wait 1s. Refresh the page. Toggle should still be ON (round-trip works).
4. Open `/discover` — feed should now exclude unverified profiles. Quick check: count cards before + after toggling.
5. Toggle OFF. Refresh. Discover feed grows back to include unverified profiles.

- [ ] **Step 8: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/lib/profile-schema.ts src/lib/use-profile.ts src/app/settings/privacy/page.tsx
git commit -m "feat(privacy): 'Require verified matches' toggle

New /settings/privacy row PATCHes verification_required (BOOLEAN on
person, Yes/No string at the wire — matches show_my_age et al). With
Task 3's frontend wiring, the discover + map feeds OR this with the
sheet-level verifiedOnly toggle and pass through to /search.

Audit gap: the BE column existed and was enforced (visitors-list +
new search SQL clause), but no FE writer existed — the column stayed
at default FALSE for every user."
```

---

## Task 5: Fix inbox "Person" flash

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/inbox/page.tsx:120-166`

- [ ] **Step 1: Replace `"Person"` fallback with a `loading` boolean flag**

In `d:/Antigravity/ahavah-web/src/app/inbox/page.tsx`, around line 119-122, the current state is:

```tsx
  const [profiles, setProfiles] = useState<Record<string, Partial<Profile>>>({});
```

Replace with (keeping the existing variable name + extending the value shape):

```tsx
  // Cache profile data in sessionStorage so subsequent /inbox visits
  // within the same session don't re-flash the skeleton — the prospect
  // names are stable enough that a per-session cache is safe.
  // Initial state seeds from sessionStorage if present.
  const [profiles, setProfiles] = useState<Record<string, Partial<Profile>>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const cached = sessionStorage.getItem("ahavah:inbox-names");
        return cached ? (JSON.parse(cached) as Record<string, Partial<Profile>>) : {};
      } catch {
        return {};
      }
    },
  );
```

- [ ] **Step 2: Write sessionStorage on each profile fetch**

Find the `setProfiles((prev) => { ... })` block (around line 147-151). Replace:

```tsx
    ).then((results) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uuid, p] of results) next[uuid] = p;
        return next;
      });
    });
```

with:

```tsx
    ).then((results) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uuid, p] of results) next[uuid] = p;
        // Persist for subsequent /inbox mounts in the same session.
        // sessionStorage is fine here — names are short, count is small,
        // and we WANT a fresh fetch on next cold launch in case the user
        // updates their profile name.
        try {
          sessionStorage.setItem("ahavah:inbox-names", JSON.stringify(next));
        } catch {
          // Quota exceeded — skip the cache write; profiles still works
          // from in-memory state for the current session.
        }
        return next;
      });
    });
```

- [ ] **Step 3: Replace `"Person"` placeholder with explicit pending flag**

Find the `display` memo around lines 158-166:

```tsx
  const display: DisplayThread[] = useMemo(
    () =>
      threads.map((t) => ({
        ...t,
        name: profiles[t.id]?.firstName ?? "Person",
        age: profiles[t.id]?.age ?? 0,
      })),
    [threads, profiles],
  );
```

Replace with:

```tsx
  const display: DisplayThread[] = useMemo(
    () =>
      threads.map((t) => {
        const peer = profiles[t.id];
        const hasName = typeof peer?.firstName === "string" && peer.firstName.length > 0;
        return {
          ...t,
          // `name` carries the real value when loaded; rendering layer
          // checks `nameLoaded` (next field) to decide skeleton vs text
          // so "Person" never flashes — we'd rather show a 3-char
          // shimmer than a placeholder that reads like a person.
          name: hasName ? peer!.firstName! : "",
          age: peer?.age ?? 0,
          nameLoaded: hasName,
        };
      }),
    [threads, profiles],
  );
```

- [ ] **Step 4: Extend the DisplayThread type**

Find the `type DisplayThread = ...` declaration (search for `type DisplayThread`). It's likely at the top of the file or imported. Add the `nameLoaded` field:

```tsx
type DisplayThread = ChatThread & {
  name: string;
  age: number;
  nameLoaded: boolean;
};
```

If the type is imported from elsewhere (e.g. `@/lib/chat-types`), instead extend the local mapping:

```tsx
// Find where the type is used in the .map() above. Cast at the boundary:
type DisplayThread = ChatThread & {
  name: string;
  age: number;
  nameLoaded: boolean;
};
```

- [ ] **Step 5: Render skeleton instead of placeholder text**

In the row-rendering block (search for `{filtered.map(` or the JSX that renders each thread), find where `t.name` is rendered as the title. It will look something like:

```tsx
<ItemTitle>{t.name}</ItemTitle>
```

Replace with:

```tsx
<ItemTitle>
  {t.nameLoaded ? (
    t.name
  ) : (
    <span
      aria-hidden
      className="inline-block h-4 w-20 animate-pulse rounded bg-white/10 align-middle"
    />
  )}
</ItemTitle>
```

The `inline-block` + matching height keep the row geometry stable so the title doesn't jump when the name resolves.

If the row also renders `age` in the same heading line (e.g. `{t.name}, {t.age}`), wrap both:

```tsx
<ItemTitle>
  {t.nameLoaded ? (
    <>{t.name}{t.age > 0 ? `, ${t.age}` : ""}</>
  ) : (
    <span
      aria-hidden
      className="inline-block h-4 w-24 animate-pulse rounded bg-white/10 align-middle"
    />
  )}
</ItemTitle>
```

- [ ] **Step 6: Run typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 7: Manual smoke test**

After Vercel deploys:
1. Sign in as Ehud (or Jada).
2. Open browser DevTools → Network → throttle to "Slow 3G" so the prospect-profile fetches take 1-2s.
3. Hard-refresh `/inbox` (Ctrl+Shift+R / Cmd+Shift+R).
4. **Expected:** thread rows render with a shimmering rectangle where the name would be, NOT the word "Person".
5. After the fetch lands, rows seamlessly fill in with the real names — no layout shift.
6. Navigate to `/discover`, then back to `/inbox`. Names render immediately (no skeleton at all) — sessionStorage cache hit.

- [ ] **Step 8: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/inbox/page.tsx
git commit -m "fix(inbox): skeleton placeholder while names load

Previously every thread row flashed 'Person, 0' for ~50-500ms while
the prospect-profile fetch was in flight. Replaced with a shimmer
skeleton + a sessionStorage cache so:
  - First inbox open per session: ~brief skeleton, then names land.
  - Subsequent /inbox mounts in the same session: names render
    instantly (cache hit, no flash).

User feedback: 'flash Person before displaying the actual user's
name is poor UX'. Now no placeholder text ever shows."
```

---

## Task 6: Shared `BackButton` component (`router.back()` with fallback)

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/components/app/back-button.tsx`

**Why this task first in slice 3:** every back-button fix that follows depends on this component. Build it once, reuse it everywhere.

- [ ] **Step 1: Create the component**

Write `d:/Antigravity/ahavah-web/src/components/app/back-button.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * BackButton — restores the user's actual previous screen instead of
 * navigating to a hardcoded destination.
 *
 * Previous pattern was `<Link href="/somewhere">` which dropped the
 * user wherever the page author guessed they came from. Multi-referrer
 * pages (legal, help, verify, settings root) routinely got this wrong:
 * tapping Back on "Community Guidelines" from /settings/safety landed
 * the user on `/` instead of /settings/safety.
 *
 * Why we still need a `fallback`:
 *   - PWA cold start / direct link: window.history.length === 1, so
 *     `router.back()` either no-ops or escapes the app.
 *   - Iframes / embeds: the parent history isn't ours.
 *
 * We check `window.history.length > 1` BEFORE calling router.back(),
 * and fall back to a sensible push when history is empty.
 */
export function BackButton({
  fallback,
  label = "Back",
  className,
}: {
  /** Where to push when history.length <= 1 (cold start / direct link). */
  fallback: string;
  /** Accessible label for screen readers. */
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const onClick = React.useCallback(() => {
    // window check needed because Next 16 client components still
    // render once on the server during streaming hydration.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router, fallback]);

  return (
    <Button
      size="circle"
      tone="elevated"
      aria-label={label}
      onClick={onClick}
      className={className}
    >
      <ArrowLeft className="text-white" />
    </Button>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/components/app/back-button.tsx
git commit -m "feat(nav): shared BackButton component with router.back() + fallback

Previous pattern was <Link href='/somewhere'> on every page's back
arrow, which dropped the user wherever the author guessed they came
from. Multi-referrer pages (legal, help, verify, settings root) got
this wrong constantly — user feedback called out Community Guidelines
+ Privacy Policy specifically.

BackButton checks window.history.length > 1 before router.back();
falls back to an explicit push when history is empty (PWA cold start,
direct link). Used by the legal/help/settings/verify fixes that
follow."
```

---

## Task 7: Wire `BackButton` into legal pages

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/legal/community-guidelines/page.tsx:23`
- Modify: `d:/Antigravity/ahavah-web/src/app/legal/privacy/page.tsx:23`
- Modify: `d:/Antigravity/ahavah-web/src/app/legal/terms/page.tsx:23`

- [ ] **Step 1: Edit Community Guidelines back arrow**

In `d:/Antigravity/ahavah-web/src/app/legal/community-guidelines/page.tsx`, find the back-button block (search for `ArrowLeft` — should be around lines 14-26). It currently looks like:

```tsx
<Button
  nativeButton={false}
  size="circle"
  tone="elevated"
  aria-label="Back"
  render={<Link href="/" prefetch={false} />}
>
  <ArrowLeft className="text-white" />
</Button>
```

Replace with:

```tsx
<BackButton fallback="/" label="Back" />
```

Then update the imports at the top of the file:

- Remove: `import { ArrowLeft, Mail } from "lucide-react";` if `ArrowLeft` is no longer used on the page; otherwise keep `Mail` and any other lucide imports the page still uses
- Remove the `Link` import if it's only used by the back button
- Remove the `Button` import if it's only used by the back button
- Add: `import { BackButton } from "@/components/app/back-button";`

- [ ] **Step 2: Same change in `src/app/legal/privacy/page.tsx:23`**

Replace the entire back-button `<Button>` block with `<BackButton fallback="/" label="Back" />` and clean up unused imports.

- [ ] **Step 3: Same change in `src/app/legal/terms/page.tsx:23`**

Replace the entire back-button `<Button>` block with `<BackButton fallback="/" label="Back" />` and clean up unused imports.

- [ ] **Step 4: Run typecheck + lint on the three files**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/legal/community-guidelines/page.tsx src/app/legal/privacy/page.tsx src/app/legal/terms/page.tsx
```

Expected: no output.

- [ ] **Step 5: Manual smoke test (after deploy)**

1. Sign in, open `/settings/safety`, tap "Community guidelines".
2. Tap the back button — should return to `/settings/safety` (NOT `/`).
3. From `/settings/safety` tap "Privacy policy" → Back → should return to `/settings/safety`.
4. Open `https://ahavah.app/legal/terms` directly (e.g. paste URL in a new tab) → Back → should land on `/` (the fallback) because there is no prior history.

- [ ] **Step 6: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/legal/community-guidelines/page.tsx src/app/legal/privacy/page.tsx src/app/legal/terms/page.tsx
git commit -m "fix(legal): back button respects history instead of hardcoded /

User feedback: 'pressed Back on Community Guidelines / Privacy Policy
and it took me to Discover instead of the previous screen'. Both
pages had <Link href='/'> on the back arrow regardless of referrer.

Now uses the shared BackButton component (Task 6) which calls
router.back() with / as a fallback for direct-link / PWA cold-start."
```

---

## Task 8: Wire `BackButton` into remaining multi-referrer pages

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/help/page.tsx:89`
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/page.tsx:100`
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/blocked/page.tsx:184`
- Modify: `d:/Antigravity/ahavah-web/src/app/verify/page.tsx:95`

Each of these has multiple real referrers today. Single-referrer pages (`/settings/account`, `/settings/notifications`, `/settings/privacy`, `/settings/safety`, `/settings/translate`, `/verify/bronze`, `/verify/silver`, `/profile/edit`, `/admin/reports`) are intentionally left as hardcoded — they have one referrer today and the hardcoded path matches it; switching them is optional polish.

- [ ] **Step 1: Edit `/help` back arrow**

In `d:/Antigravity/ahavah-web/src/app/help/page.tsx`, find the back-button block and replace with:

```tsx
<BackButton fallback="/settings" label="Back to settings" />
```

Add `import { BackButton } from "@/components/app/back-button";`, remove unused `ArrowLeft` / `Link` / `Button` imports if no other code uses them.

- [ ] **Step 2: Edit `/settings` back arrow**

In `d:/Antigravity/ahavah-web/src/app/settings/page.tsx`, find the back-button block (around line 100) and replace with:

```tsx
<BackButton fallback="/profile" label="Back to profile" />
```

Add the BackButton import; clean up unused imports.

- [ ] **Step 3: Edit `/settings/blocked` back arrow**

In `d:/Antigravity/ahavah-web/src/app/settings/blocked/page.tsx`, find the back-button block (around line 184) and replace with:

```tsx
<BackButton fallback="/settings" label="Back to settings" />
```

- [ ] **Step 4: Edit `/verify` back arrow**

In `d:/Antigravity/ahavah-web/src/app/verify/page.tsx`, find the back-button block (around line 95) and replace with:

```tsx
<BackButton fallback="/profile" label="Back to profile" />
```

- [ ] **Step 5: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/help/page.tsx src/app/settings/page.tsx src/app/settings/blocked/page.tsx src/app/verify/page.tsx
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/help/page.tsx src/app/settings/page.tsx src/app/settings/blocked/page.tsx src/app/verify/page.tsx
git commit -m "fix(nav): back button honors history on multi-referrer pages

/help, /settings, /settings/blocked, /verify all have multiple
real referrers today (paywall sheets, profile gear, /discover
header, /profile, /settings/privacy). Each used a hardcoded
<Link href> for back which sent the user to the wrong place
from non-default referrers.

Single-referrer pages left as hardcoded for now (settings/account,
settings/notifications, settings/privacy, settings/safety,
verify/bronze, verify/silver, profile/edit, admin/reports). They
have one real referrer today + the hardcoded path matches it."
```

---

## Task 9: Remove `/safety/emergency` route + the dead link

**Files:**
- Delete: `d:/Antigravity/ahavah-web/src/app/safety/emergency/page.tsx`
- Delete (if directory becomes empty): `d:/Antigravity/ahavah-web/src/app/safety/`
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx` (drop the Local emergency numbers row)

User feedback: "Local emergency numbers menu can come off".

- [ ] **Step 1: Delete the emergency page**

```bash
cd d:/Antigravity/ahavah-web
rm src/app/safety/emergency/page.tsx
# Remove the now-empty parent directories
rmdir src/app/safety/emergency
rmdir src/app/safety
```

- [ ] **Step 2: Drop the link from `/settings/safety`**

In `d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx`, find the `RESOURCES` array (search for `RESOURCES`). The entry to remove looks like:

```tsx
{ Icon: PhoneCall,   title: "Local emergency numbers", href: "/safety/emergency" },
```

Remove that line entirely. The `RESOURCES` array now contains only Community Guidelines + Privacy Policy.

Also remove the `PhoneCall` import from the lucide-react import statement if it's no longer used elsewhere on the page (it might be used in the safety tips list — keep it if so; remove it if not).

- [ ] **Step 3: Confirm no other references**

```bash
cd d:/Antigravity/ahavah-web
grep -rn "/safety/emergency" src/ 2>&1
```

Expected: no output. If any references remain (other than in comments), remove them.

- [ ] **Step 4: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/settings/safety/page.tsx
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add -A
git commit -m "chore(safety): remove /safety/emergency

User feedback: 'Local emergency numbers menu can come off'. Page was
a static list of country-by-country tel: links — useful in theory
but the maintenance burden + UI clutter wasn't earning its keep.

Removed the page, the parent /safety directory, and the row from
/settings/safety. The Safety Center is now just safety tips +
community guidelines + privacy policy."
```

---

## Task 10: Consolidate duplicate Blocked-users + Privacy entry points

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx` (drop the entire Quick Actions block)
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx` (drop the Related shortcuts block)

User feedback: "I see Blocked users at least 3 places: is that really necessary?". Today: `/settings`, `/settings/privacy` Related shortcut, `/settings/safety` Quick Actions. Strip the two duplicate doors; keep the single canonical entry on `/settings`.

- [ ] **Step 1: Strip Quick Actions block from `/settings/safety`**

In `d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx`:

1. Remove the `QUICK_ACTIONS` constant (search for `const QUICK_ACTIONS` — currently lines 43-54 after the Task 9 cleanup).
2. Remove the entire `<motion.section>` that renders Quick Actions (look for `<h2 className="px-3 text-overline text-text-muted">Quick actions</h2>` and remove the surrounding `<motion.section>` block).
3. Remove unused lucide-react imports left behind (`UserX`, `EyeOff`, `Flag` if it was still imported). Run lint to confirm.

The page now shows: Hero card → Safety tips → Resources (legal links only).

- [ ] **Step 2: Strip Related shortcuts block from `/settings/privacy`**

In `d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx`:

1. Remove the `SHORTCUT_LINKS` constant (search for `SHORTCUT_LINKS` — currently around lines 46-53).
2. Remove the entire `<motion.section>` that renders the Related shortcuts list (look for `<h2 className="px-3 text-overline text-text-muted">Related</h2>` and remove the surrounding `<motion.section>` block).
3. Remove the unused `ChevronRight` lucide import + the unused `Item / ItemActions / ItemContent / ItemDescription / ItemGroup / ItemTitle` imports if they're no longer used elsewhere on the page (the toggles themselves use the same components, so most imports stay).

- [ ] **Step 3: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/settings/safety/page.tsx src/app/settings/privacy/page.tsx
```

Expected: no output.

- [ ] **Step 4: Manual smoke test**

After deploy: open `/settings`. Count routes to Blocked Users:
- Tap "Blocked users" tile → opens `/settings/blocked` ✓
- Open "Privacy" → no Blocked Users shortcut visible ✓
- Open "Safety center" → no Blocked Users shortcut visible ✓

Total entry points: 1 (canonical) + the in-chat / in-profile kebab → BlockReportSheet (which CREATES blocks, doesn't manage them). That's the right count.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/settings/safety/page.tsx src/app/settings/privacy/page.tsx
git commit -m "refactor(settings): consolidate duplicate Blocked users + Privacy doors

User feedback: 'I see Blocked users at least 3 places: is that really
necessary?'. iOS / Android Settings convention is one canonical home
per topic; ours had three (settings, settings/privacy Related,
settings/safety Quick Actions).

Stripped the Related shortcuts block from /settings/privacy and the
Quick Actions block from /settings/safety. Blocked users now lives
in one place (the /settings App group). Same for the duplicate
Privacy doors."
```

---

## Task 11: Restructure `/settings` index + add missing Terms link

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/page.tsx` (regroup into `Account / App / Safety & Legal / Support`; add Terms entry)

Today's groups: Account / App / Support. After the cleanups in tasks 9 + 10, the Safety center is a pure read-only surface (tips + legal links). The settings index should mirror that by moving Safety + the three legal pages into a single `Safety & Legal` group so the user has one obvious place to find policy + safety content.

`/legal/terms` is also currently unreachable from settings (audit found it's only linked from the landing-page footer + sign-up consent). Add it.

- [ ] **Step 1: Refactor the groups array**

In `d:/Antigravity/ahavah-web/src/app/settings/page.tsx`, find the `SETTINGS_GROUPS` array (search for `SETTINGS_GROUPS` — currently around lines 55-89). Replace it with:

```tsx
const SETTINGS_GROUPS: ReadonlyArray<{
  label: string;
  accent: string;
  items: ReadonlyArray<{
    Icon: typeof UserCog;
    title: string;
    subtitle: string;
    href: string;
    tone: "muted";
  }>;
}> = [
  {
    label: "Account",
    accent: "bg-lavender",
    items: [
      { Icon: UserCog, title: "Account", subtitle: "Email & sign out", href: "/settings/account", tone: "muted" },
    ],
  },
  {
    label: "App",
    accent: "bg-lavender/60",
    items: [
      { Icon: BellRing,    title: "Notifications", subtitle: "Push notifications",        href: "/settings/notifications", tone: "muted" },
      { Icon: ShieldAlert, title: "Privacy",       subtitle: "What others see about you", href: "/settings/privacy",       tone: "muted" },
      { Icon: UserX,       title: "Blocked users", subtitle: "People you've blocked",     href: "/settings/blocked",       tone: "muted" },
    ],
  },
  {
    label: "Safety & Legal",
    accent: "bg-lavender/60",
    items: [
      { Icon: ShieldCheck, title: "Safety tips",          subtitle: "Stay safe on Ahavah",   href: "/settings/safety",              tone: "muted" },
      { Icon: BookOpen,    title: "Community guidelines", subtitle: "How we keep it kind",   href: "/legal/community-guidelines",   tone: "muted" },
      { Icon: ShieldCheck, title: "Privacy policy",       subtitle: "How we handle your data", href: "/legal/privacy",              tone: "muted" },
      { Icon: FileText,    title: "Terms of service",     subtitle: "What you agree to",     href: "/legal/terms",                  tone: "muted" },
    ],
  },
  {
    label: "Support",
    accent: "bg-lavender/60",
    items: [
      { Icon: HelpCircle, title: "Help center", subtitle: "FAQ, contact, bug report", href: "/help", tone: "muted" },
    ],
  },
];
```

- [ ] **Step 2: Update lucide-react imports**

Find the lucide-react import block at the top of `/settings/page.tsx` and ensure these icons are imported (add missing ones):

```tsx
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  ChevronRight,
  FileText,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserX,
} from "lucide-react";
```

(`BookOpen` and `FileText` may be new; the rest existed already.)

- [ ] **Step 3: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/settings/page.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/settings/page.tsx
git commit -m "refactor(settings): regroup into Account/App/Safety+Legal/Support

Adds Safety + the three legal pages into a unified 'Safety & Legal'
group. Terms of service was previously only reachable from the
landing footer + sign-up consent — now lives in settings alongside
the other two legal pages.

Group structure matches iOS / Android Settings conventions: one
canonical home per topic, semantically grouped."
```

---

## Task 12: Backend migration — `notification_preference` table

**Files:**
- Create: `d:/Antigravity/ahavah-api/migrations/0013_notification_preferences.sql`

- [ ] **Step 1: Write the migration**

Create `d:/Antigravity/ahavah-api/migrations/0013_notification_preferences.sql`:

```sql
-- Phase W: per-event notification preferences.
--
-- Today push goes out unconditionally (service/decisions sends on every
-- mutual like, service/chat/messagestorage sends on every incoming
-- message). The /settings/notifications page surfaced fake toggles
-- with no backend. This migration adds the persistent state that
-- backs four real toggles:
--
--   push_matches       — fire push on mutual like (default ON)
--   push_messages      — fire push on new chat message (default ON)
--   push_likes         — fire push on incoming like (default OFF;
--                        premium-gated read surface, so the trigger
--                        is gated to premium users separately)
--   push_weekly_digest — weekly summary email/push (default OFF;
--                        feature not yet built, column reserves
--                        the toggle for when it ships)
--
-- One row per person, lazily inserted on first PATCH. Send path
-- treats missing row as "all defaults" so legacy users get matches +
-- messages by default without a backfill.

BEGIN;

CREATE TABLE IF NOT EXISTS notification_preference (
  person_id          INTEGER PRIMARY KEY REFERENCES person(id) ON DELETE CASCADE,
  push_matches       BOOLEAN NOT NULL DEFAULT TRUE,
  push_messages      BOOLEAN NOT NULL DEFAULT TRUE,
  push_likes         BOOLEAN NOT NULL DEFAULT FALSE,
  push_weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
```

- [ ] **Step 2: Smoke-test the migration locally + on droplet**

Apply against the droplet:

```bash
ssh -6 root@2604:a880:800:14:0:2:f28f:5000 \
  "docker exec -i ahavah-api-postgres-1 psql -U postgres" < d:/Antigravity/ahavah-api/migrations/0013_notification_preferences.sql
```

Verify:

```bash
ssh -6 root@2604:a880:800:14:0:2:f28f:5000 \
  "docker exec ahavah-api-postgres-1 psql -U postgres -t -c \
   \"\\d notification_preference\""
```

Expected: table description shows the 5 columns + the primary-key constraint on `person_id`.

- [ ] **Step 3: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add migrations/0013_notification_preferences.sql
git commit -m "feat(notifications): add notification_preference table

One row per person, lazily inserted on first PATCH. Send paths
(service/decisions, service/chat/messagestorage) treat a missing
row as all-defaults so legacy users get matches + messages by
default without a backfill.

Lands the persistent state behind /settings/notifications. Tasks
13-16 wire the routes + UI."
```

---

## Task 13: Backend duotypes + GET/PATCH `/notifications/preferences`

**Files:**
- Modify: `d:/Antigravity/ahavah-api/duotypes/__init__.py` — add `PatchNotificationPreferences` model
- Modify: `d:/Antigravity/ahavah-api/service/notifications/__init__.py` — add `get_notification_preferences` + `patch_notification_preferences`
- Modify: `d:/Antigravity/ahavah-api/service/api/notifications_routes.py` — wire GET + PATCH routes

- [ ] **Step 1: Add the duotype**

In `d:/Antigravity/ahavah-api/duotypes/__init__.py`, find `PostNotificationsSubscribe` and add immediately AFTER it:

```python
class PatchNotificationPreferences(BaseModel):
    """Per-event push notification preferences. Mig 0013 adds the
    notification_preference table. Each field is optional so the
    client can PATCH a single toggle without resetting the others.
    The "exactly one field" constraint that applies to
    PatchProfileInfo intentionally doesn't apply here — the
    /settings/notifications page may flip several toggles in one
    request when the user mass-disables push.
    """
    push_matches: Optional[bool] = None
    push_messages: Optional[bool] = None
    push_likes: Optional[bool] = None
    push_weekly_digest: Optional[bool] = None
```

- [ ] **Step 2: Add the GET handler**

In `d:/Antigravity/ahavah-api/service/notifications/__init__.py`, add at the end of the file (after the existing `post_subscribe` / `delete_subscribe` / `send_to_user_safe` helpers):

```python
def get_notification_preferences(s):
    """Return the user's per-event push preferences. If the row doesn't
    exist yet (legacy user, never PATCHed), return the documented
    defaults — matches + messages ON, likes + weekly OFF — so the UI
    can render the toggles without an extra mount-time write.
    """
    with api_tx('READ COMMITTED') as tx:
        row = tx.execute(
            """
            SELECT push_matches, push_messages, push_likes, push_weekly_digest
              FROM notification_preference
             WHERE person_id = %(person_id)s
            """,
            dict(person_id=s.person_id),
        ).fetchone()
    if row is None:
        return dict(
            push_matches=True,
            push_messages=True,
            push_likes=False,
            push_weekly_digest=False,
        )
    return dict(
        push_matches=row['push_matches'],
        push_messages=row['push_messages'],
        push_likes=row['push_likes'],
        push_weekly_digest=row['push_weekly_digest'],
    )


def patch_notification_preferences(req, s):
    """Upsert any subset of the four toggles. Uses INSERT … ON CONFLICT
    so the row is created on first write with whatever defaults the
    client didn't override. Subsequent writes only touch the columns
    the client explicitly included.
    """
    # Build the SET clause from non-None fields only. Pydantic gives us
    # `__pydantic_fields_set__` listing what the client actually sent.
    updates = {
        k: getattr(req, k)
        for k in req.__pydantic_fields_set__
        if getattr(req, k) is not None
    }
    if not updates:
        return '', 204

    # COALESCE-on-NULL idiom: for an INSERT we have to fill in defaults
    # for unset columns; for an UPDATE we want to leave them untouched.
    # Split into two queries to keep both paths simple.
    cols = list(updates.keys())
    params = dict(person_id=s.person_id, **updates)
    set_clause = ', '.join(f'{c} = %({c})s' for c in cols)
    insert_cols = ', '.join(['person_id'] + cols)
    insert_vals = ', '.join(['%(person_id)s'] + [f'%({c})s' for c in cols])
    q = f"""
    INSERT INTO notification_preference ({insert_cols}, updated_at)
    VALUES ({insert_vals}, NOW())
    ON CONFLICT (person_id) DO UPDATE
       SET {set_clause}, updated_at = NOW()
    """
    with api_tx() as tx:
        tx.execute(q, params)
    return '', 204
```

- [ ] **Step 3: Wire the routes**

In `d:/Antigravity/ahavah-api/service/api/notifications_routes.py`, add at the end of the file (after `delete_notifications_subscribe`):

```python
from service.api.decorators import aget


@aget('/notifications/preferences')
def get_notifications_preferences(s: t.SessionInfo):
    """Return the signed-in user's per-event push preferences (mig 0013).
    Lazy default if the row doesn't exist yet."""
    from service import notifications
    return notifications.get_notification_preferences(s)


@apost('/notifications/preferences')
@validate(t.PatchNotificationPreferences)
def patch_notifications_preferences(req: t.PatchNotificationPreferences, s: t.SessionInfo):
    """Upsert any subset of the four event toggles. Body fields are all
    optional so the client can flip one without resetting the others."""
    from service import notifications
    return notifications.patch_notification_preferences(req, s)
```

(We use `@apost` for PATCH-semantics because the existing decorators file declares `apost`/`adelete` but not `apatch`. PATCH semantics over POST is fine here since this is an internal route — adjust if a real `apatch` decorator already exists; check `service/api/decorators.py` first.)

- [ ] **Step 4: Smoke-test**

```bash
# After deploy:
TOKEN="<a real session token>"
curl -sS "https://api.ahavah.app/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"push_matches":true,"push_messages":true,"push_likes":false,"push_weekly_digest":false}

curl -sS -X POST "https://api.ahavah.app/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push_likes":true}' -i | head -5
# Expected: HTTP/2 204

curl -sS "https://api.ahavah.app/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"push_matches":true,"push_messages":true,"push_likes":true,"push_weekly_digest":false}
```

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add duotypes/__init__.py service/notifications/__init__.py service/api/notifications_routes.py
git commit -m "feat(notifications): GET + PATCH /notifications/preferences

Reads from the notification_preference table (mig 0013); returns
documented defaults when no row exists. PATCH upserts any subset of
the four toggles in a single statement.

Task 14 wires send_to_user_safe to honor these flags; task 16 builds
the /settings/notifications UI on top."
```

---

## Task 14: Gate `send_to_user_safe()` on event preferences

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/notifications/__init__.py` — add `event_kind` parameter, query the preference row, short-circuit when OFF

- [ ] **Step 1: Refactor the send helper**

In `d:/Antigravity/ahavah-api/service/notifications/__init__.py`, find the existing `send_to_user_safe` function. Replace its signature + body with:

```python
from typing import Literal

EventKind = Literal["match", "message", "like", "weekly"]

# Map each event kind to the column on notification_preference that
# gates it. Keeping the mapping in one place means the cron + handlers
# don't have to know column names.
_EVENT_COLUMN: dict[EventKind, str] = {
    "match":   "push_matches",
    "message": "push_messages",
    "like":    "push_likes",
    "weekly":  "push_weekly_digest",
}


def send_to_user_safe(
    person_id: int,
    title: str,
    body: str,
    url: str,
    *,
    event_kind: EventKind,
):
    """Best-effort push to every active subscription for the given
    person. Short-circuits when the user's notification_preference row
    has the corresponding column = FALSE. Legacy users with no row get
    the documented defaults (matches + messages ON, others OFF).
    """
    column = _EVENT_COLUMN[event_kind]
    with api_tx('READ COMMITTED') as tx:
        row = tx.execute(
            f"""
            SELECT {column} AS allowed
              FROM notification_preference
             WHERE person_id = %(person_id)s
            """,
            dict(person_id=person_id),
        ).fetchone()
    allowed = (
        row['allowed']
        if row is not None
        else (event_kind in ('match', 'message'))
    )
    if not allowed:
        return

    # ... existing fetch-subscriptions + pywebpush loop unchanged ...
```

Preserve the rest of the function body (the subscription-fetch loop, the pywebpush send, the error handling) — only the signature + the early-return gate are new.

- [ ] **Step 2: Update existing callers**

In `d:/Antigravity/ahavah-api/service/decisions/__init__.py` (around line 236), find the `send_to_user_safe(...)` call. Add `event_kind="match"`:

```python
send_to_user_safe(
    person_id=peer_id,
    title=f"{name} matched with you",
    body="Open Ahavah to say hi",
    url="/matches",
    event_kind="match",
)
```

In `d:/Antigravity/ahavah-api/service/chat/messagestorage/__init__.py` (around line 129), find the `send_to_user_safe(...)` call. Add `event_kind="message"`:

```python
send_to_user_safe(
    person_id=recipient_id,
    title=f"{sender_name} sent you a message",
    body=preview,
    url=f"/chat/{sender_uuid}",
    event_kind="message",
)
```

- [ ] **Step 3: Smoke-test**

```bash
# As user Ehud, turn OFF push_matches:
curl -sS -X POST "https://api.ahavah.app/notifications/preferences" \
  -H "Authorization: Bearer $EHUD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push_matches":false}' -i | head -5
# Expected: HTTP/2 204

# As Jada, like Ehud (mutual). Watch droplet logs for the push attempt:
ssh -6 root@2604:a880:800:14:0:2:f28f:5000 \
  "docker logs -f --tail 0 ahavah-api-api-1" &

# Expected: no "Sending push to person_id=<Ehud>" line in the logs —
# the short-circuit fires before pywebpush is called.

# Re-enable matches:
curl -sS -X POST "https://api.ahavah.app/notifications/preferences" \
  -H "Authorization: Bearer $EHUD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"push_matches":true}' -i | head -5

# Another mutual like → push fires.
```

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/notifications/__init__.py service/decisions/__init__.py service/chat/messagestorage/__init__.py
git commit -m "feat(notifications): send_to_user_safe honors per-event preferences

Adds event_kind: Literal['match','message','like','weekly'] parameter.
Each push attempt now queries notification_preference and short-
circuits when the corresponding column is FALSE. Legacy users with
no row get documented defaults (matches + messages ON, others OFF).

Match + message call sites updated to pass event_kind. Like + weekly
call sites land later when the read surface + digest ship."
```

---

## Task 15: Frontend hook `useNotificationPreferences`

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/lib/use-notification-preferences.ts`

- [ ] **Step 1: Write the hook**

Create `d:/Antigravity/ahavah-web/src/lib/use-notification-preferences.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";

export type NotificationPreferences = {
  push_matches: boolean;
  push_messages: boolean;
  push_likes: boolean;
  push_weekly_digest: boolean;
};

const DEFAULTS: NotificationPreferences = {
  push_matches: true,
  push_messages: true,
  push_likes: false,
  push_weekly_digest: false,
};

/**
 * useNotificationPreferences — backs the four-toggle /settings/
 * notifications page (Phase W, mig 0013).
 *
 * State machine:
 *   loading -> happy (after GET resolves)
 *           -> error (GET threw)
 *
 * setOne(key, value) optimistically updates state, fires PATCH; on
 * failure rolls back + sets error. Single-field PATCH so the user
 * doesn't lose other toggles if one save races with another.
 */
export type NotificationPreferencesState =
  | { kind: "loading" }
  | { kind: "happy"; prefs: NotificationPreferences; savingKey: keyof NotificationPreferences | null }
  | { kind: "error"; message: string };

export function useNotificationPreferences(): {
  state: NotificationPreferencesState;
  setOne: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
} {
  const [state, setState] = useState<NotificationPreferencesState>({
    kind: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<NotificationPreferences>("/notifications/preferences")
      .then((prefs) => {
        if (cancelled) return;
        // Defensive: server may not return every key if a field was
        // added after the user's row was created. Merge with defaults.
        setState({
          kind: "happy",
          prefs: { ...DEFAULTS, ...prefs },
          savingKey: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't load notification preferences.";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setOne = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      let snapshot: NotificationPreferences | null = null;
      setState((curr) => {
        if (curr.kind !== "happy") return curr;
        snapshot = curr.prefs;
        return {
          kind: "happy",
          prefs: { ...curr.prefs, [key]: value },
          savingKey: key,
        };
      });
      try {
        await apiClient.post("/notifications/preferences", { [key]: value });
        setState((curr) =>
          curr.kind === "happy" ? { ...curr, savingKey: null } : curr,
        );
      } catch (err) {
        // Rollback optimistic state.
        setState((curr) => {
          if (curr.kind !== "happy" || snapshot == null) return curr;
          return { kind: "happy", prefs: snapshot, savingKey: null };
        });
        // Surface the failure to the user via a transient log; the
        // page can re-render an error banner if needed.
        console.warn("useNotificationPreferences.setOne failed", err);
      }
    },
    [],
  );

  return { state, setOne };
}
```

- [ ] **Step 2: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/lib/use-notification-preferences.ts
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/lib/use-notification-preferences.ts
git commit -m "feat(notifications): useNotificationPreferences hook

Loads /notifications/preferences on mount, exposes setOne(key, value)
that optimistically updates state + fires a single-field POST. On
failure rolls back to the snapshot so racing saves don't trample
each other.

Task 16 builds the /settings/notifications UI on top."
```

---

## Task 16: Rebuild `/settings/notifications` page with 4 real toggles

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/settings/notifications/page.tsx`

- [ ] **Step 1: Replace the page**

Overwrite `d:/Antigravity/ahavah-web/src/app/settings/notifications/page.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { BottomNav } from "@/components/app/bottom-nav";
import { BackButton } from "@/components/app/back-button";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import {
  type NotificationPreferences,
  useNotificationPreferences,
} from "@/lib/use-notification-preferences";
import { usePushSubscription } from "@/lib/use-push-subscription";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

/**
 * /settings/notifications — master push subscription + four per-event
 * preferences backed by mig 0013's notification_preference table.
 *
 *   Master push (subscribe / unsubscribe)
 *     - usePushSubscription owns the SW + VAPID + permission flow.
 *     - When OFF, the per-event toggles below disable (no subscription
 *       = nothing to gate).
 *
 *   Per-event toggles (4)
 *     - push_matches (default ON)
 *     - push_messages (default ON)
 *     - push_likes (default OFF — gated read surface)
 *     - push_weekly_digest (default OFF — feature not yet built)
 */

type ToggleKey = keyof NotificationPreferences;

const TOGGLES: ReadonlyArray<{
  key: ToggleKey;
  title: string;
  description: string;
}> = [
  { key: "push_matches",       title: "Matches",       description: "Someone you liked liked you back" },
  { key: "push_messages",      title: "Messages",      description: "Someone sent you a chat message" },
  { key: "push_likes",         title: "Likes",         description: "Someone liked your profile (premium read surface)" },
  { key: "push_weekly_digest", title: "Weekly digest", description: "A weekly summary of new matches + activity (coming soon)" },
];

export default function NotificationsSettingsPage() {
  const push = usePushSubscription();
  const prefs = useNotificationPreferences();

  const masterSupported = push.state !== "unsupported";
  const masterOn = push.state === "subscribed";
  const masterBusy = push.state === "subscribing";
  const masterDenied = push.state === "denied";

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {/* Master push toggle */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Push</h2>
          <ItemGroup className="gap-1">
            <Item variant="muted">
              <ItemContent>
                <ItemTitle className="text-meta text-white">
                  Enable push notifications
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  {masterDenied
                    ? "Blocked at the browser / OS level. Re-enable in Site Settings, then come back."
                    : !masterSupported
                      ? "This browser doesn't support push (iOS Safari needs Add to Home Screen first)."
                      : "Get a ping when something happens in Ahavah."}
                </ItemDescription>
              </ItemContent>
              <Switch
                checked={masterOn}
                disabled={!masterSupported || masterDenied || masterBusy}
                onCheckedChange={(next) => {
                  if (next) void push.subscribe();
                  else void push.unsubscribe();
                }}
                aria-label="Enable push notifications"
              />
            </Item>
          </ItemGroup>
        </motion.section>

        {/* Per-event preferences */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">
            What to notify me about
          </h2>
          <ItemGroup className="gap-1">
            {TOGGLES.map((t) => {
              const isHappy = prefs.state.kind === "happy";
              const value = isHappy ? prefs.state.prefs[t.key] : false;
              const savingThis =
                isHappy && prefs.state.savingKey === t.key;
              return (
                <Item key={t.key} variant="muted">
                  <ItemContent>
                    <ItemTitle className="text-meta text-white">
                      {t.title}
                    </ItemTitle>
                    <ItemDescription className="text-caption text-text-muted">
                      {t.description}
                    </ItemDescription>
                  </ItemContent>
                  <Switch
                    checked={value}
                    disabled={
                      !isHappy ||
                      savingThis ||
                      !masterOn /* per-event toggles are inert until master is ON */
                    }
                    onCheckedChange={(next) => void prefs.setOne(t.key, next)}
                    aria-label={t.title}
                  />
                </Item>
              );
            })}
          </ItemGroup>

          {/* Helper text when push is OFF — explain why the per-event
              toggles are disabled. */}
          {!masterOn ? (
            <p
              className="mx-3 mt-1 flex items-start gap-2 text-caption leading-relaxed text-text-muted"
              role="status"
            >
              <BellOff
                className="mt-0.5 size-3.5 shrink-0 text-text-muted"
                aria-hidden
              />
              <span>
                Turn on push above to enable per-event preferences. Until
                then nothing pushes at all.
              </span>
            </p>
          ) : null}

          {prefs.state.kind === "error" ? (
            <p
              role="alert"
              className="mx-3 mt-1 text-caption text-pink"
            >
              {prefs.state.message}
            </p>
          ) : null}
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}
```

- [ ] **Step 2: Run typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
npx eslint src/app/settings/notifications/page.tsx
```

Expected: no output.

- [ ] **Step 3: Manual smoke test**

After deploy:
1. Open `/settings/notifications`. Master push toggle reflects current subscription state.
2. With push OFF, the 4 per-event toggles are visibly disabled + the helper text explains why.
3. Turn push ON, grant permission. Per-event toggles become live.
4. Flip `push_matches` OFF. As Jada, like Ehud (mutual). Ehud should NOT get a push. Droplet logs should show no `Sending push to person_id=<Ehud>` line.
5. Flip `push_matches` back ON. Another mutual like → push fires.
6. Hard refresh. Toggle states persist (GET on mount returns saved values).

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/app/settings/notifications/page.tsx
git commit -m "feat(notifications): real per-event toggles bound to backend

Master push (sub/unsub via usePushSubscription) plus 4 per-event
toggles bound to useNotificationPreferences (mig 0013). Per-event
toggles are inert when master push is OFF; clear helper text
explains why.

Replaces the previous 'coming soon' info card. The four events:
matches (default ON), messages (default ON), likes (default OFF),
weekly digest (default OFF, feature not yet built — column
reserves the toggle for when it ships)."
```

---

## Critical Files

**Verification slice (Tasks 1-4):**

- `d:/Antigravity/ahavah-api/duotypes/__init__.py` — `PatchProfileInfo` (Task 1), `PatchNotificationPreferences` (Task 13)
- `d:/Antigravity/ahavah-api/service/person/__init__.py` — patch_profile_info handler (Task 1)
- `d:/Antigravity/ahavah-api/service/search/__init__.py` — get_search signature (Task 2)
- `d:/Antigravity/ahavah-api/service/search/sql/__init__.py` — Q_UNCACHED_SEARCH_2 (Task 2)
- `d:/Antigravity/ahavah-api/service/api/__init__.py` — `/search` route (Task 2)
- `d:/Antigravity/ahavah-web/src/lib/use-discover-deck.ts` — DiscoverFilters + buildSearchPath (Task 3)
- `d:/Antigravity/ahavah-web/src/app/discover/page.tsx` + `src/app/map/page.tsx` — useDiscoverDeck call sites (Task 3)
- `d:/Antigravity/ahavah-web/src/lib/profile-schema.ts` — Profile type (Task 4)
- `d:/Antigravity/ahavah-web/src/lib/use-profile.ts` — TRANSFORMS, SERVER_TO_CLIENT_KEY, reverseTranslateValue (Task 4)
- `d:/Antigravity/ahavah-web/src/app/settings/privacy/page.tsx` — 4th toggle (Task 4) + Related-shortcuts strip (Task 10)

**Inbox slice (Task 5):**

- `d:/Antigravity/ahavah-web/src/app/inbox/page.tsx` — skeleton + cache

**Back-button slice (Tasks 6-8):**

- `d:/Antigravity/ahavah-web/src/components/app/back-button.tsx` *(new)* — shared component (Task 6)
- `d:/Antigravity/ahavah-web/src/app/legal/{community-guidelines,privacy,terms}/page.tsx` (Task 7)
- `d:/Antigravity/ahavah-web/src/app/help/page.tsx` + `settings/page.tsx` + `settings/blocked/page.tsx` + `verify/page.tsx` (Task 8)

**Settings consolidation slice (Tasks 9-11):**

- `d:/Antigravity/ahavah-web/src/app/safety/emergency/page.tsx` *(delete)* — Task 9
- `d:/Antigravity/ahavah-web/src/app/settings/safety/page.tsx` — drop Quick Actions + emergency link (Tasks 9-10)
- `d:/Antigravity/ahavah-web/src/app/settings/page.tsx` — regroup + add Terms link (Task 11)

**Notifications slice (Tasks 12-16):**

- `d:/Antigravity/ahavah-api/migrations/0013_notification_preferences.sql` *(new)* — Task 12
- `d:/Antigravity/ahavah-api/service/notifications/__init__.py` — `event_kind` gate + GET/PATCH handlers (Tasks 13-14)
- `d:/Antigravity/ahavah-api/service/api/notifications_routes.py` — GET/PATCH routes (Task 13)
- `d:/Antigravity/ahavah-api/service/decisions/__init__.py` + `service/chat/messagestorage/__init__.py` — pass `event_kind` (Task 14)
- `d:/Antigravity/ahavah-web/src/lib/use-notification-preferences.ts` *(new)* — Task 15
- `d:/Antigravity/ahavah-web/src/app/settings/notifications/page.tsx` — rebuild (Task 16)

---

## Verification (end-to-end after all tasks land)

After all 16 tasks ship + Vercel/CI deploys complete:

**Verification slice:**

1. **Verified-only filter (sheet)**: open `/discover`, tap filters, flip "Verified only" → ON. Feed shrinks to verified prospects only.
2. **Require verified matches (sticky)**: `/settings/privacy` → toggle "Require verified matches" → ON. Refresh `/discover` without touching the sheet. Feed stays restricted to verified prospects. Toggle OFF in settings → feed includes unverified prospects again.

**Inbox slice:**

3. **No flash**: hard-refresh `/inbox` under Slow 3G throttling. NO `"Person"` ever visible. Shimmer skeleton resolves to the real name once the prospect-profile fetch completes.
4. **Cache hit**: navigate /discover → /inbox repeatedly within the same browser session. No flash, no skeleton, names appear instantly on every subsequent /inbox mount.

**Back-button slice:**

5. **Legal pages respect history**: from `/settings/safety` tap "Community guidelines", then Back — lands on `/settings/safety` (not `/`). Same for `/legal/privacy` and `/legal/terms` from any referrer.
6. **PWA cold-start fallback**: open `https://ahavah.app/legal/terms` directly in a fresh tab, tap Back — lands on `/` (the explicit fallback, because `window.history.length === 1`).

**Settings consolidation slice:**

7. **One Blocked-users entry**: open `/settings` — tap "Blocked users" → opens `/settings/blocked`. Open "Privacy" → no Blocked Users shortcut visible. Open "Safety tips" → no Blocked Users shortcut visible. Total entry points: 1 (canonical) + the in-chat / in-profile kebab → BlockReportSheet which creates a block.
8. **Emergency tile gone**: `/settings/safety` no longer renders a "Local emergency numbers" row. `https://ahavah.app/safety/emergency` returns a 404 (route deleted).
9. **Terms reachable from settings**: `/settings` → "Safety & Legal" group → "Terms of service" → opens `/legal/terms`. Was previously only reachable from landing footer + sign-up consent.

**Notifications slice:**

10. **Master toggle**: `/settings/notifications` master switch reflects `usePushSubscription` state. Flipping it triggers subscribe/unsubscribe + clears the SW subscription.
11. **Per-event toggles persist**: turn `push_matches` OFF, hard refresh, the toggle is still OFF (GET on mount restores state).
12. **Send gate works**: with `push_matches` OFF on Ehud, Jada likes Ehud (mutual). Watch droplet logs — no `Sending push to person_id=<Ehud>` entry. Flip ON, repeat — push fires.

---

## Out of scope (deferred)

- Stripe LIVE keys cutover — operator action, not code.
- Surfacing the verified-only filter in `/map` as a visible toggle — `/map` reuses the same FiltersSheet, so it inherits the discover toggle automatically. No separate map UI needed.
- "How many of my prospects are verified" telemetry — useful for tuning the gate copy on `/paywall`, but not required for the verification loop to work.
- Per-tier filter ("only Silver+", "only Gold") — bronze-or-better covers the soft-launch trust signal. Add later if data shows users want finer control.
- Quiet-hours support on `notification_preference` (start/end window) — column reservations exist but no UI ships in this wave.
- Backfilling `notification_preference` rows for every existing user — defaults-on-missing-row covers it; lazy-insert is simpler than a backfill.
- Per-event email digests (separate from push) — current scope is push only. The `push_weekly_digest` column is a placeholder until a digest generator ships.
- Real `apatch` decorator for PATCH-shaped routes — we use `apost` for the preferences endpoint (`POST /notifications/preferences` semantically PATCHes). Acceptable for the internal API; promote to a proper `apatch` decorator later if other routes need the same shape.

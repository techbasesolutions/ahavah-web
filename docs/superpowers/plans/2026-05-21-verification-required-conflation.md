# Fix verification_required Conflation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stop the "Require verified matches" privacy preference from writing the anti-abuse `verification_required` column (which blocks the user's own messaging + hides them); back it with a new `require_verified_prospects` column instead.

**Architecture:** Backend-only (`ahavah-api`). New column for the searcher preference; PATCH setter + GET serialization for the `verification_required` *wire field* target the new column; the `verification_required` *DB column* stays the anti-abuse/location flag (chat gate, global search hide, location rule, anti-abuse — all unchanged). No frontend change, no search-feed SQL change.

**Tech Stack:** Flask + psycopg + Postgres; pytest in the docker harness.

**Spec:** `ahavah-web/docs/superpowers/specs/2026-05-21-verification-required-conflation-design.md`

Repo: api `ahavah/main`. Stage by name; trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Verify in harness (`reference_ahavah_windows_test_harness`); deploy via push + watch + smoke.

---

## File Structure
- Create `migrations/0018_require_verified_prospects.sql` — add the column.
- Modify `service/person/__init__.py` (~1512) — setter writes the new column.
- Modify `service/person/sql/__init__.py` — GET /profile-info serializes the new column under the existing `verification_required` key (fixes the missing read).
- Create `tests/test_verification_pref.py`.

---

### Task 1: Migration + setter

**Files:**
- Create: `migrations/0018_require_verified_prospects.sql`
- Modify: `service/person/__init__.py` (the `field_name == 'verification_required'` branch, ~1512)

- [ ] **Step 1: Migration** (idempotent)

```sql
-- 0018_require_verified_prospects.sql
-- Separate the "Require verified matches" SEARCHER preference from the
-- anti-abuse/location flag person.verification_required (which the chat
-- send-gate + global search hide read). Conflating them blocked users who
-- enabled the preference from messaging. Idempotent.
BEGIN;
ALTER TABLE person
  ADD COLUMN IF NOT EXISTS require_verified_prospects BOOLEAN NOT NULL DEFAULT FALSE;
COMMIT;
```

- [ ] **Step 2: Repoint the setter.** In `service/person/__init__.py`, the
  `elif field_name == 'verification_required':` branch (~1512) currently does
  `SET verification_required = (...)`. Replace its `q1` with:

```python
    elif field_name == 'verification_required':
        # "Require my matches to be verified" — a SEARCHER preference that
        # drives the discover verified_only filter (frontend reads it and
        # passes ?verified_only). It is backed by require_verified_prospects,
        # NOT person.verification_required: the latter is the anti-abuse /
        # location flag read by the chat send-gate + the global search hide,
        # so writing it here blocked the user's own messaging + hid them
        # (conflation bug, fixed 2026-05-21).
        q1 = """
        UPDATE person
           SET require_verified_prospects = (
               CASE WHEN %(field_value)s = 'Yes' THEN TRUE ELSE FALSE END)
         WHERE id = %(person_id)s
        """
```

- [ ] **Step 3: Commit** (migration + setter)
```bash
git add migrations/0018_require_verified_prospects.sql service/person/__init__.py
git commit -m "fix(verification): privacy 'require verified matches' writes require_verified_prospects, not the anti-abuse flag"
```

### Task 2: GET /profile-info serialization (fix the missing read)

**Files:** Modify `service/person/sql/__init__.py` (the `Q_GET_PROFILE_INFO` CTE chain ~1855 + the `json_build_object` ~1944).

- [ ] **Step 1: Add the CTE.** After the `show_my_age AS (...)` CTE (~line 1857), add a sibling CTE:

```sql
), require_verified_prospects AS (
    SELECT
        CASE WHEN require_verified_prospects THEN 'Yes' ELSE 'No' END AS j
    FROM person
    WHERE id = %(person_id)s
```

(Insert it as a chained CTE — match the surrounding `), name AS ( ... ` comma style so it slots into the WITH list without breaking the chain.)

- [ ] **Step 2: Add the key.** In the `json_build_object(...)` privacy block (~line 1944, beside `'hide me from strangers'`), add:

```sql
        'verification_required',  (SELECT j FROM require_verified_prospects),
```

(Key name stays `verification_required` so the existing frontend mapping
`use-profile.ts` `verification_required -> requireVerifiedMatches` hydrates
unchanged — now it actually returns a value, which it didn't before.)

- [ ] **Step 3: Commit**
```bash
git add service/person/sql/__init__.py
git commit -m "fix(verification): GET /profile-info surfaces require_verified_prospects so the toggle hydrates"
```

### Task 3: Tests

**Files:** Create `tests/test_verification_pref.py`

- [ ] **Step 1: Write the test** (canonical `_make_person`; passes in CI — local person-seed has the documented NOT-NULL gap, validate logic via the harness ad-hoc method if needed)

```python
"""verification_required conflation fix (2026-05-21).

The 'require verified matches' privacy preference must write
require_verified_prospects, NOT the anti-abuse person.verification_required
(which the chat send-gate reads). These tests pin that separation.
"""
from __future__ import annotations
from uuid import uuid4
import pytest


def _make_person(tx):
    return tx.execute(
        """
        INSERT INTO person (
            email, normalized_email, name, date_of_birth,
            coordinates, gender_id, about, location_short_friendly
        ) VALUES (
            %(e)s, %(e)s, 'T', '1990-01-01',
            ST_SetSRID(ST_MakePoint(0,0),4326)::geography,
            (SELECT id FROM gender LIMIT 1), 'a', 's'
        ) RETURNING uuid::text AS uuid, id
        """,
        dict(e=f'vp-{uuid4()}@example.com'),
    ).fetchone()


@pytest.fixture
def person_row():
    from database import api_tx
    with api_tx() as tx:
        p = _make_person(tx)
    yield p
    with api_tx() as tx:
        tx.execute("DELETE FROM person WHERE id = %s", (p['id'],))


def test_preference_writes_new_column_not_antiabuse_flag(person_row):
    from database import api_tx
    import duotypes as t
    from service.person import patch_profile_info
    s = t.SessionInfo(person_id=person_row['id'], person_uuid=person_row['uuid'])
    patch_profile_info(t.PatchProfileInfo(verification_required="Yes"), s)
    with api_tx() as tx:
        row = tx.execute(
            "SELECT require_verified_prospects, verification_required "
            "FROM person WHERE id = %s",
            (person_row['id'],),
        ).fetchone()
    assert row['require_verified_prospects'] is True   # preference set
    assert row['verification_required'] is False        # anti-abuse flag untouched -> chat gate not triggered
```

- [ ] **Step 2: Run in harness** — apply migration 0018, then
  `pytest tests/test_verification_pref.py -v`. If the canonical person-seed
  fails locally (NOT-NULL `location_long_friendly`/`unit_id` — pre-existing,
  passes in CI), validate the same assertions with an ad-hoc script that
  seeds those extra columns (per `reference_ahavah_windows_test_harness`).
  Also `python -c "import service.api"` -> OK.

- [ ] **Step 3: Commit**
```bash
git add tests/test_verification_pref.py
git commit -m "test(verification): preference writes require_verified_prospects, leaves anti-abuse flag"
```

### Task 4: Verify + deploy

- [ ] **Step 1:** Harness: migration 0018 applies (idempotent); test green (or ad-hoc validated); `import service.api` OK.
- [ ] **Step 2: Deploy** — push `ahavah/main`, watch the "Deploy ahavah/main → droplet" run to success.
- [ ] **Step 3: Smoke** on the droplet: confirm the column exists
  (`psql ... "SELECT require_verified_prospects FROM person LIMIT 1"`), and
  `GET /profile-info` / `PATCH /profile-info` round-trip the
  `verification_required` field (authed; expect non-404).
- [ ] **Step 4:** Tell the user: an unverified account can now enable "Require
  verified matches" and still send messages (the bug), and the setting now
  persists + filters the feed.

---

## Self-Review

**Spec coverage:** new column -> Task 1.1; setter repoint -> Task 1.2;
GET serialization (the missing read) -> Task 2; `verification_required` column
left for anti-abuse/location/chat/hide -> untouched (no task modifies those);
no frontend change -> none needed (wire field name preserved); no search-feed
SQL change -> none; tests -> Task 3; verify+deploy -> Task 4. Covered.

**Placeholder scan:** the Task 3.2 "ad-hoc if local seed fails" is a
documented harness workaround (a known pre-existing limitation), not a TODO.
All code blocks complete.

**Type consistency:** the `require_verified_prospects` column name is
identical across the migration (Task 1.1), the setter UPDATE (Task 1.2), the
GET CTE (Task 2.1), and the test assertion (Task 3.1). The wire field +
GET key `verification_required` is unchanged, matching the existing frontend
mapping. `patch_profile_info(PatchProfileInfo(verification_required=...),
SessionInfo(...))` matches the real signatures.

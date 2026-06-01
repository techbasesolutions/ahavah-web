# Discover Rewind (Back button) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the token-gated "Rewind" Back button to the /discover action row — undo the last *pass* (skip) for a token, re-showing that profile.

**Architecture:** Mirror the existing token-spend actions (boost / super-like / day-pass). A new `service/tokens/actions/rewind.py` `perform()` debits tokens and deletes the `skipped` + `swipe` rows for the target prospect inside one `api_tx()`. A migration extends the `token_ledger` reason CHECK to allow `'rewind'`. The frontend adds a leading Back circle to both action rows, gated behind a `TokenSpendSheet`, that calls `POST /tokens/rewind` then refetches the deck so the restored profile reappears.

**Tech Stack:** Flask + sync psycopg (`database.api_tx`), PostgreSQL; Next.js 16 + React 19; existing `useTokenBalance` + `TokenSpendSheet` + `apiClient`.

**Scope decisions baked in (from source-of-truth review):**
- Rewind undoes the **last PASS only** — the `/profile/tokens` copy says "Undo your last pass and reconsider." Likes (which may have created an `ahavah_match` + sent a push) are **out of scope**.
- The frontend passes the `profile_uuid` to rewind (it already tracks the last-passed candidate). The backend validates a `skipped` row exists for `(me, prospect)` before debiting — no debit if there's nothing to undo.
- **Cost = 1 token** (proposed — cheapest tier, matches reveal=1; existing: reveal 1, super-like 2, day-pass 3, boost 5). **CONFIRM before building.**

---

### Task 1: Migration — allow `'rewind'` in the token_ledger reason CHECK

**Files:**
- Create: `ahavah-api/migrations/0015_rewind_reason.sql`

The deploy re-runs every migration every time and swallows errors, so this MUST be idempotent. The 0014 CHECK is an unnamed/`token_ledger_reason_check` constraint listing 7 reasons; we drop + re-add it with `'rewind'` appended, guarded so re-runs are no-ops.

- [ ] **Step 1: Write the migration**

```sql
-- 0015_rewind_reason.sql
-- Discover Rewind (2026-05-19): the token_ledger.reason CHECK from 0014
-- does not include 'rewind'. Extend it so the rewind spend can append a
-- debit row. Idempotent: drop the existing CHECK (by its conventional
-- name) if present, then add the superset CHECK guarded by a
-- pg_constraint existence check.

BEGIN;

ALTER TABLE token_ledger DROP CONSTRAINT IF EXISTS token_ledger_reason_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'token_ledger_reason_check'
  ) THEN
    ALTER TABLE token_ledger
      ADD CONSTRAINT token_ledger_reason_check CHECK (reason IN (
        'purchase',
        'subscription_stipend',
        'reveal_liker',
        'super_like',
        'day_pass',
        'boost',
        'refund',
        'rewind'
      ));
  END IF;
END $$;

COMMIT;
```

- [ ] **Step 2: Verify the constraint name first**

Run against the droplet DB before relying on the drop: confirm 0014's CHECK is actually named `token_ledger_reason_check` (Postgres' default `<table>_<col>_check`). If it has a different name, the `DROP CONSTRAINT IF EXISTS` is a silent no-op and the ADD will fail because a conflicting CHECK still exists.

Run: `ssh -i C:/Users/Ehud/.ssh/id_ed25519_ahavah root@167.71.93.27 "docker exec ahavah-api-postgres-1 psql -U postgres -d duo_api -c \"SELECT conname FROM pg_constraint WHERE conrelid = 'token_ledger'::regclass AND contype='c';\""`
Expected: a row `token_ledger_reason_check` (or note the real name and update the SQL).

---

### Task 2: Backend rewind action module

**Files:**
- Create: `ahavah-api/service/tokens/actions/rewind.py`

Mirror `boost.py`: caller owns the `api_tx`; `perform` debits then deletes. Reuse the existing skip-delete query shape (`service/person` already has `Q_DELETE_SKIPPED_BY_UUID`). Also clear the upstream `swipe` row so `/search`'s `Q_UNCACHED_SEARCH_2` stops excluding the prospect (the `/decisions/reset` path deletes both `skipped` and `swipe` for exactly this reason).

- [ ] **Step 1: Write the module**

```python
"""Spend 1 token to undo the last pass (skip) and re-show a profile.

Scope: passes only. Likes are not rewindable (a like may have created a
match + sent a push). Caller owns the transaction so the debit + the
skipped/swipe deletes commit atomically.
"""

from __future__ import annotations

COST = 1  # CONFIRM with product before shipping.


class NothingToRewind(Exception):
    """Raised when there is no skip to undo for (me, prospect)."""


_Q_SKIP_EXISTS = """
  SELECT 1
    FROM skipped s
    JOIN person obj ON obj.uuid = uuid_or_null(%(prospect_uuid)s)
   WHERE s.subject_person_id = %(me_id)s
     AND s.object_person_id  = obj.id
   LIMIT 1
"""

_Q_DELETE_SKIP = """
  DELETE FROM skipped
   WHERE subject_person_id = %(me_id)s
     AND object_person_id = (
       SELECT id FROM person WHERE uuid = uuid_or_null(%(prospect_uuid)s)
     )
"""

_Q_DELETE_SWIPE = """
  DELETE FROM swipe
   WHERE swiper_person_id = %(me_id)s
     AND swiped_person_id = (
       SELECT id FROM person WHERE uuid = uuid_or_null(%(prospect_uuid)s)
     )
"""


def perform(tx, person_uuid: str, person_id: int, prospect_uuid: str) -> dict:
    """Debit COST tokens and delete the skip (+ swipe) for the prospect.

    Raises:
        NothingToRewind  if no skip exists for (me, prospect) — caller
                         maps to 409/422 and does NOT debit.
        service.tokens.InsufficientTokens if balance < COST.
    """
    from service.tokens import debit

    if not tx.execute(
        _Q_SKIP_EXISTS, dict(me_id=person_id, prospect_uuid=prospect_uuid)
    ).fetchone():
        raise NothingToRewind()

    debit(tx, person_uuid, COST, reason='rewind',
          metadata={'prospect': prospect_uuid})
    tx.execute(_Q_DELETE_SKIP, dict(me_id=person_id, prospect_uuid=prospect_uuid))
    tx.execute(_Q_DELETE_SWIPE, dict(me_id=person_id, prospect_uuid=prospect_uuid))
    return {'rewound': True, 'profile_uuid': prospect_uuid}
```

- [ ] **Step 2: Confirm the `swipe` column names**

`_Q_DELETE_SWIPE` assumes `swipe(swiper_person_id, swiped_person_id)`. The reset path only references `swiper_person_id`. Verify the swiped column name before relying on it:
Run: `ssh ... "docker exec ahavah-api-postgres-1 psql -U postgres -d duo_api -c \"\\d swipe\""`
Expected: confirm both column names; fix the query if the partner column differs.

---

### Task 3: Backend endpoint `POST /tokens/rewind`

**Files:**
- Modify: `ahavah-api/service/api/__init__.py` (alongside the other `/tokens/*` posts, ~line 919)

- [ ] **Step 1: Add the route**

```python
from service.tokens.actions.rewind import (
    perform as _perform_rewind,
    NothingToRewind as _NothingToRewind,
)

@apost('/tokens/rewind')
def post_tokens_rewind(s: t.SessionInfo):
    assert s.person_uuid is not None
    payload = request.get_json(silent=True) or {}
    prospect_uuid = payload.get('profile_uuid')
    if not prospect_uuid:
        return {'error': 'missing_profile_uuid'}, 400
    try:
        with api_tx() as tx:
            return _perform_rewind(tx, s.person_uuid, s.person_id, prospect_uuid)
    except _NothingToRewind:
        return {'error': 'nothing_to_rewind'}, 409
    except _InsufficientTokens:
        return {'error': 'insufficient_tokens'}, 402
```

---

### Task 4: Frontend — track last pass + Back button + spend sheet

**Files:**
- Modify: `ahavah-web/src/app/discover/page.tsx`
- Modify: `ahavah-web/src/lib/icon-map.ts` (Rewind icon already = `RotateCcw`, reuse it)

- [ ] **Step 1: Track the last-passed candidate**

In `advance`, when `decision === "nope"` and the decide call resolves cleanly, record the passed id: add `const [lastPassedId, setLastPassedId] = useState<string | null>(null);` and set it to `candidateId` on a successful nope (clear it on a successful rewind / when it gets restored).

- [ ] **Step 2: Add rewind handler + sheet state**

```tsx
const RewindIcon = TokenActionIcon.Rewind;
const [rewindSheetOpen, setRewindSheetOpen] = useState(false);
const [rewindBusy, setRewindBusy] = useState(false);

const handleRewind = useCallback(async () => {
  if (!lastPassedId) return;
  setRewindBusy(true);
  try {
    await apiClient.post("/tokens/rewind", { profile_uuid: lastPassedId });
    await refreshTokens();
    setRewindSheetOpen(false);
    // Re-show: drop from decidedIds and refetch the deck so the
    // restored profile re-enters visibleItems at/near the front.
    setDecidedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastPassedId);
      return next;
    });
    setLastPassedId(null);
    setFilters({ ...filters }); // triggers useDiscoverDeck refetch
    toast.success("Brought that profile back.");
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      await refreshTokens(); // sheet stays open, shows insufficient state
    } else {
      setRewindSheetOpen(false);
      const status = e instanceof ApiError ? e.status : null;
      const msg =
        status === 409 ? "Nothing to rewind." :
        status === 404 ? "Rewind isn't available yet." :
        status === 401 ? "Sign in to rewind." :
        "Couldn't rewind. Try again.";
      toast.error(msg);
    }
  } finally {
    setRewindBusy(false);
  }
}, [lastPassedId, refreshTokens, filters, setFilters]);
```

- [ ] **Step 3: Add the Back circle as the LEADING button in both action rows**

Order becomes `Back / Pass / Like / Super`. Disabled (not rendered, or `disabled`) when `!lastPassedId`. Use `tone="elevated"` so it reads as a lower-emphasis chrome action distinct from Pass(brand)/Like(action)/Super(brand):

```tsx
<Button
  size="circle-2xl"
  tone="elevated"
  lift="float"
  aria-label="Rewind last pass, costs 1 token"
  disabled={!lastPassedId}
  onClick={() => setRewindSheetOpen(true)}
>
  <RewindIcon className="size-7" />
</Button>
```

- [ ] **Step 4: Add the TokenSpendSheet at the file bottom (next to the super-like sheet)**

```tsx
<TokenSpendSheet
  open={rewindSheetOpen}
  onOpenChange={setRewindSheetOpen}
  title="Rewind your last pass?"
  description="Bring the last profile you passed back into your deck."
  cost={1}
  currentBalance={tokenBalanceForSheet}
  onConfirm={handleRewind}
  busy={rewindBusy}
/>
```

- [ ] **Step 5: Verify typecheck + lint**

Run: `npx tsc --noEmit` then `npx eslint src/app/discover/page.tsx`
Expected: clean (0 errors).

- [ ] **Step 6: Browser verification**

On localhost:3000/discover: pass a profile → Back enables → tap Back → sheet shows cost 1 + balance → confirm → toast + profile reappears + balance drops by 1. With 0 balance, sheet shows the insufficient state. Confirm Back is disabled before any pass.

---

### Task 5: Backend test

**Files:**
- Create/extend: a test under `ahavah-api/test/` covering rewind (follow the existing token-action test layout).

- [ ] **Step 1: Test happy path + guards**

Cases: (a) skip then rewind → skipped row gone, ledger has a -COST `rewind` row; (b) rewind with no skip → 409, no debit; (c) rewind with balance < COST → 402, skip row still present (transaction rolled back).

---

## Deploy note

Pushing to `ahavah/main` triggers the GHA → droplet deploy, which **re-runs all migrations and rebuilds the api+chat containers (brief downtime)**. Migration 0015 + the new endpoint ship together. Do this when the user is not mid-testing. The frontend (Vercel-on-push) can ship independently but the Back button will 404 until the backend deploy lands — `handleRewind` already toasts "Rewind isn't available yet." on 404.

## Open decision for the user
- **Rewind cost** — proposed **1 token**. Confirm or override before Task 1.

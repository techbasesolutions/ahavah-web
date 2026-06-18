# Feed Refill Implementation Plan

> **For agentic workers:** execute inline per the karpathy-guidelines (surgical, simple, verify each step). No local Python on this box, so verification is deploy-to-prod + DB/endpoint check (the session's established pattern), not local pytest.

**Goal:** Stop the discover feed from dying once a user exhausts the pool — passed profiles return automatically after a cooldown, and a token action brings them all back on demand.

**Architecture:** Two independent, pass-only, self-only mechanisms. (1) Add a time gate to the search's `skipped` exclusion so passes older than the cooldown stop excluding (reports/blocks stay permanent). (2) A token-gated `/tokens/see-passes` action that clears the caller's own passes + pass-swipes + cache, wired to a button in the discover empty-state.

**Tech Stack:** Flask + sync psycopg (ahavah-api), Next 16 + React 19 (ahavah-web), existing token-ledger debit machinery.

## Global Constraints
- Pass-only: never touch likes, matches, or `reported=true` blocks.
- Self-only: a user action only ever mutates that user's own rows.
- No em dashes in user-facing copy.
- Token debit reuses `reason='rewind'` (already allowed by migration 0015) to avoid a new migration; it's semantically a bulk pass-undo.

---

### Task 1: Passes expire after a cooldown (BE)

**Files:**
- Modify: `service/search/sql/__init__.py` — the `skipped` exclusion in `Q_UNCACHED_SEARCH_2`.

**Change:** the exclusion currently hides a candidate if ANY skip row exists in either direction. Add a gate so only **reports** (permanent) or **recent passes** (within 7 days) exclude:

```sql
      -- Blocked exclusion (the upstream Duolicious fork's existing skipped table — both directions).
      -- 2026-06-18: passes expire after 7 days so the feed refills naturally
      -- on a small pool; reports (reported=true) stay permanent.
      AND NOT EXISTS (
          SELECT 1 FROM skipped sk
          WHERE ((sk.subject_person_id = %(searcher_person_id)s AND sk.object_person_id = p.id)
              OR (sk.subject_person_id = p.id AND sk.object_person_id = %(searcher_person_id)s))
            AND (sk.reported OR sk.created_at > NOW() - INTERVAL '7 days')
      )
```

- [ ] Edit the exclusion as above.
- [ ] Verify (prod, after deploy): a skip row older than 7 days no longer excludes — `SELECT` a candidate with only an old, unreported skip and confirm it returns in `_uncached_search_results` for the searcher.
- [ ] Commit.

### Task 2: `/tokens/see-passes` action + endpoint (BE)

**Files:**
- Create: `service/tokens/actions/see_passes.py`
- Modify: `service/api/__init__.py` — add `@apost('/tokens/see-passes')` next to `/tokens/super-like`.

**Interfaces — Produces:** `perform(tx, person_uuid: str, person_id: int) -> dict` (returns `{'ok': True, 'cleared': <int>}`); raises `service.tokens.InsufficientTokens`.

`service/tokens/actions/see_passes.py` (model on `rewind.py`):
```python
"""Spend tokens to clear ALL of the caller's own passes at once, bringing
every passed profile back into the deck. Pass-only + self-only: never
touches likes, matches, reports/blocks, or any peer's rows. Caller owns the
tx so the debit + deletes commit atomically."""
from __future__ import annotations

from service.tokens import debit

COST = 3

_Q_CLEAR_SKIPS = """
  DELETE FROM skipped
   WHERE subject_person_id = %(p)s AND NOT reported
"""
_Q_CLEAR_PASS_SWIPES = """
  DELETE FROM swipe
   WHERE swiper_person_id = %(p)s AND direction = 'pass'
"""
_Q_CLEAR_CACHE = "DELETE FROM search_cache WHERE searcher_person_id = %(p)s"


def perform(tx, person_uuid: str, person_id: int) -> dict:
    debit(tx, person_uuid, COST, reason='rewind',
          metadata={'kind': 'see_passes'})
    n = tx.execute(_Q_CLEAR_SKIPS, dict(p=person_id)).rowcount
    tx.execute(_Q_CLEAR_PASS_SWIPES, dict(p=person_id))
    tx.execute(_Q_CLEAR_CACHE, dict(p=person_id))
    return {'ok': True, 'cleared': n}
```

Endpoint in `service/api/__init__.py` (model on `/tokens/super-like`):
```python
@apost('/tokens/see-passes')
def post_tokens_see_passes(s: t.SessionInfo):
    assert s.person_uuid is not None
    from service.tokens.actions.see_passes import perform as _perform_see_passes
    try:
        with api_tx() as tx:
            return _perform_see_passes(tx, str(s.person_uuid), s.person_id)
    except _InsufficientTokens:
        return {'error': 'insufficient_tokens'}, 402
```

- [ ] Create `see_passes.py`; confirm `debit(...)` signature matches `rewind.py`'s call.
- [ ] Add the endpoint.
- [ ] Verify (prod): as a token-holding test account with passes, `POST /tokens/see-passes` → 200 `{ok, cleared>0}`, balance drops by 3, `skipped` (NOT reported) for that user is empty, reports remain. As a 0-token account → 402.
- [ ] Commit + deploy (GHA).

### Task 3: "See passes again" button in the discover empty-state (FE)

**Files:**
- Modify: `src/app/discover/page.tsx` — add a handler + a Button in the empty-state (where the removed reset button was).

**Consumes:** `POST /tokens/see-passes` → `{ ok, cleared }` | 402.

Handler (model on `handleSuperLike` — token spend + 402 toast + reload deck):
```tsx
  const [seePassesBusy, setSeePassesBusy] = useState(false);
  const handleSeePasses = useCallback(async () => {
    setSeePassesBusy(true);
    try {
      await apiClient.post("/tokens/see-passes", {});
      await refreshTokens();
      setDecidedIds(new Set());
      setFilters({ ...filters });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        toast.error("Not enough tokens to see passes again.");
      } else {
        toast.error("Couldn't bring back passed profiles. Try again.");
      }
    } finally {
      setSeePassesBusy(false);
    }
  }, [refreshTokens, filters]);
```

Button in the empty-state `<motion.div key="empty">`, under `<EmptyState />`:
```tsx
          <Button
            variant="link"
            size="tap"
            className="self-center text-(--ink-3) underline"
            onClick={() => void handleSeePasses()}
            disabled={seePassesBusy}
          >
            {seePassesBusy ? "Bringing them back..." : "See passes again · 3 tokens"}
          </Button>
```

- [ ] Add the state, handler, and button.
- [ ] Verify: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, `next build` compiles.
- [ ] Commit + push (Vercel).

---

## Self-Review
- **Spec coverage:** #1 (natural reappearance) = Task 1; #2 (token action) = Tasks 2+3. ✓
- **Pass-only / self-only:** Task 1 keeps `reported` permanent; Task 2 deletes only `subject_person_id = caller AND NOT reported` + own pass-swipes + own cache. No likes/matches/peer rows. ✓
- **Type consistency:** `perform(tx, person_uuid, person_id)` produced in Task 2, consumed by the Task 2 endpoint; FE consumes `{ok, cleared}` | 402. ✓
- **Verification adapted** to deploy+DB checks (no local Python). ✓

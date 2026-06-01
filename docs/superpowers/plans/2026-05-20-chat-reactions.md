# Chat Reactions (heart) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user heart a message from the other person in a chat thread (double-tap / long-press on touch, hover-button on desktop), persisted and delivered in real time.

**Architecture:** Option B from the design spec — reactions persist in a new `message_reactions` table via a Flask toggle endpoint; real-time delivery reuses the chat server's existing Redis username-channel fan-out (the API publishes a `<reaction/>` frame to the peer's channel; the chat server forwards it untouched). No chat-server code changes; no MAM/inbox/batcher changes.

**Tech Stack:** Backend `ahavah-api` (Flask + sync psycopg + PostgreSQL + redis), tests via pytest in the test harness. Frontend `ahavah-web` (Next.js 16 + React 19 + Tailwind v4, vitest).

**Spec:** `ahavah-web/docs/superpowers/specs/2026-05-20-chat-reactions-design.md`

**Two repos.** Each task notes its repo. Backend commits go on `ahavah/main` (ahavah-api); frontend on `master` (ahavah-web). Author email `admin@techbaseltd.com`; trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Stage files BY NAME (both repos have untracked noise — never `git add -A`/`.`).

---

## File Structure

**Backend (`ahavah-api`):**
- Create `migrations/0016_message_reactions.sql` — idempotent table + index.
- Create `service/reactions/__init__.py` — pure DB logic (`toggle`, `list_for_conversation`).
- Create `service/api/reactions_routes.py` — HTTP routes + Redis publish (sibling-module pattern).
- Modify `service/api/__init__.py` — one import line at the bottom (next to the other sibling imports).
- Create `tests/test_message_reactions.py` — toggle/list/validation tests.

**Frontend (`ahavah-web`):**
- Modify `src/lib/chat-types.ts` — add `reaction-in` event.
- Modify `src/lib/chat-stanza.ts` — decode `<reaction>`.
- Modify `tests/lib/chat-stanza.test.ts` — decode test.
- Modify `src/lib/use-chat-thread.ts` — reactions state, hydrate, live merge, `react()`.
- Modify `src/components/app/chat-bubble.tsx` — chip + hover button + `useReactGesture`.
- Modify `src/components/app/chat-thread-view.tsx` — wire reactions into bubbles.

---

# BACKEND (ahavah-api)

### Task 1: Migration — `message_reactions` table

**Files:**
- Create: `migrations/0016_message_reactions.sql`

- [ ] **Step 1: Write the idempotent migration**

```sql
-- 0016_message_reactions.sql
-- Per-message reactions (v1: heart only). The deploy re-runs every
-- migration every time and swallows errors, so every statement here is
-- guarded (IF NOT EXISTS) and safe to run repeatedly.
--
-- message_stanza_id is the client-generated UUID stamped on the message
-- stanza (also the MAM row id on history fetch); both participants
-- reference the same logical message by it. No FK to MAM (MAM exposes no
-- single-row PK). PK (message_stanza_id, reactor_id) = one reaction per
-- person per message (toggle model). peer_id makes the per-conversation
-- hydrate query cheap.

CREATE TABLE IF NOT EXISTS message_reactions (
    message_stanza_id  TEXT        NOT NULL,
    reactor_id         INT         NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    peer_id            INT         NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    kind               TEXT        NOT NULL DEFAULT 'heart',
    created_at         TIMESTAMP   NOT NULL DEFAULT now(),
    PRIMARY KEY (message_stanza_id, reactor_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_peer
    ON message_reactions (reactor_id, peer_id);
```

- [ ] **Step 2: Apply locally to confirm it parses and is idempotent**

Run (against the local/test postgres — adapt host to your env; in the test harness it runs automatically on container build):
```bash
psql -U postgres -d duo_api -f migrations/0016_message_reactions.sql
psql -U postgres -d duo_api -f migrations/0016_message_reactions.sql
```
Expected: first run creates; second run is a no-op (no error). `\d message_reactions` shows the table.

- [ ] **Step 3: Commit**

```bash
git add migrations/0016_message_reactions.sql
git commit -m "feat(reactions): 0016 message_reactions table"
```

---

### Task 2: Service logic — `service/reactions`

**Files:**
- Create: `service/reactions/__init__.py`
- Test: `tests/test_message_reactions.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_message_reactions.py
"""Chat reactions (2026-05-20) — service.reactions toggle + list tests.

Mirrors tests/test_token_rewind.py: real person rows in a fixture,
cleanup via explicit DELETE.
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
        )
        VALUES (
            %(email)s, %(email)s, 'Test', '1990-01-01',
            ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography,
            (SELECT id FROM gender LIMIT 1),
            'about', 'somewhere'
        )
        RETURNING uuid::text AS uuid, id
        """,
        dict(email=f'reaction-{uuid4()}@example.com'),
    ).fetchone()


@pytest.fixture
def pair():
    from database import api_tx
    with api_tx() as tx:
        me = _make_person(tx)
        peer = _make_person(tx)
    yield {'me': me, 'peer': peer}
    with api_tx() as tx:
        tx.execute(
            "DELETE FROM person WHERE id = ANY(%s)",
            ([me['id'], peer['id']],),
        )


def test_toggle_adds_then_removes(pair):
    from database import api_tx
    from service.reactions import toggle
    me, peer = pair['me'], pair['peer']
    sid = f'stanza-{uuid4()}'
    with api_tx() as tx:
        a = toggle(tx, me['uuid'], me['id'], peer['uuid'], 'heart', stanza_id=sid)
        assert a['action'] == 'add'
        assert a['kind'] == 'heart'
        assert a['message_stanza_id'] == sid
        # Re-toggle on the same stanza_id flips back to remove.
        b = toggle(tx, me['uuid'], me['id'], peer['uuid'], 'heart', stanza_id=sid)
        assert b['action'] == 'remove'


def test_list_returns_both_directions(pair):
    from database import api_tx
    from service.reactions import toggle, list_for_conversation
    me, peer = pair['me'], pair['peer']
    sid_a = f'stanza-{uuid4()}'  # me reacts to a peer message
    sid_b = f'stanza-{uuid4()}'  # peer reacts to my message
    with api_tx() as tx:
        toggle(tx, me['uuid'], me['id'], peer['uuid'], 'heart', stanza_id=sid_a)
        toggle(tx, peer['uuid'], peer['id'], me['uuid'], 'heart', stanza_id=sid_b)
        rows = list_for_conversation(tx, me['id'], peer['uuid'])
    sids = {r['message_stanza_id'] for r in rows}
    assert sid_a in sids and sid_b in sids
    by_sid = {r['message_stanza_id']: r for r in rows}
    assert by_sid[sid_a]['reactor_uuid'] == me['uuid']
    assert by_sid[sid_b]['reactor_uuid'] == peer['uuid']


def test_unknown_peer_raises(pair):
    from database import api_tx
    from service.reactions import toggle, UnknownPeer
    me = pair['me']
    with api_tx() as tx:
        with pytest.raises(UnknownPeer):
            toggle(tx, me['uuid'], me['id'], str(uuid4()), 'heart',
                   stanza_id=f'stanza-{uuid4()}')
```

> Note: `toggle` takes an optional `stanza_id` kwarg so tests can pin it. The route passes the real path param. The first test's `first` call (no stanza_id) just exercises the default-id path; the assertions that matter use the pinned `sid`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_message_reactions.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'service.reactions'`.

- [ ] **Step 3: Write the service module**

```python
# service/reactions/__init__.py
"""Chat reactions (v1: heart only).

Pure DB logic. The caller owns the transaction (api_tx) so a toggle is a
single atomic upsert-or-delete. The HTTP layer (service/api/reactions_routes)
adds the Redis real-time publish after the tx commits.

A reaction is "reactor X reacted <kind> to the message with stanza id S, in
the conversation with peer P". PK (message_stanza_id, reactor_id) means one
reaction per person per message — re-toggling removes it.
"""

from __future__ import annotations

from uuid import uuid4


class UnknownPeer(Exception):
    """Raised when peer_uuid does not resolve to a person row."""


_Q_PEER_ID = """
  SELECT id FROM person WHERE uuid = uuid_or_null(%(peer_uuid)s)
"""

_Q_EXISTS = """
  SELECT 1 FROM message_reactions
   WHERE message_stanza_id = %(sid)s AND reactor_id = %(reactor_id)s
   LIMIT 1
"""

_Q_DELETE = """
  DELETE FROM message_reactions
   WHERE message_stanza_id = %(sid)s AND reactor_id = %(reactor_id)s
"""

_Q_INSERT = """
  INSERT INTO message_reactions (message_stanza_id, reactor_id, peer_id, kind)
  VALUES (%(sid)s, %(reactor_id)s, %(peer_id)s, %(kind)s)
  ON CONFLICT (message_stanza_id, reactor_id) DO NOTHING
"""

_Q_LIST = """
  SELECT
      mr.message_stanza_id           AS message_stanza_id,
      reactor.uuid::text             AS reactor_uuid,
      mr.kind                        AS kind
    FROM message_reactions mr
    JOIN person reactor ON reactor.id = mr.reactor_id
   WHERE (mr.reactor_id = %(me_id)s AND mr.peer_id = %(peer_id)s)
      OR (mr.reactor_id = %(peer_id)s AND mr.peer_id = %(me_id)s)
"""


def _resolve_peer_id(tx, peer_uuid: str) -> int:
    row = tx.execute(_Q_PEER_ID, dict(peer_uuid=peer_uuid)).fetchone()
    if not row:
        raise UnknownPeer()
    return row['id']


def toggle(
    tx,
    reactor_uuid: str,
    reactor_id: int,
    peer_uuid: str,
    kind: str = 'heart',
    stanza_id: str | None = None,
) -> dict:
    """Add the reaction if absent, else remove it. Returns
    {action: 'add'|'remove', kind, message_stanza_id, peer_id}.

    Raises UnknownPeer if peer_uuid is unknown.
    """
    sid = stanza_id or str(uuid4())
    peer_id = _resolve_peer_id(tx, peer_uuid)

    exists = tx.execute(
        _Q_EXISTS, dict(sid=sid, reactor_id=reactor_id)
    ).fetchone()

    if exists:
        tx.execute(_Q_DELETE, dict(sid=sid, reactor_id=reactor_id))
        action = 'remove'
    else:
        tx.execute(_Q_INSERT, dict(
            sid=sid, reactor_id=reactor_id, peer_id=peer_id, kind=kind,
        ))
        action = 'add'

    return {
        'action': action,
        'kind': kind,
        'message_stanza_id': sid,
        'peer_id': peer_id,
    }


def list_for_conversation(tx, me_id: int, peer_uuid: str) -> list[dict]:
    """All reactions in the conversation between me and peer (both
    directions). Returns [{message_stanza_id, reactor_uuid, kind}]."""
    peer_id = _resolve_peer_id(tx, peer_uuid)
    cursor = tx.execute(_Q_LIST, dict(me_id=me_id, peer_id=peer_id))
    return list(cursor.fetchall())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_message_reactions.py -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add service/reactions/__init__.py tests/test_message_reactions.py
git commit -m "feat(reactions): toggle + list_for_conversation service logic"
```

---

### Task 3: HTTP routes + Redis publish

**Files:**
- Create: `service/api/reactions_routes.py`
- Modify: `service/api/__init__.py` (add one import at the bottom, beside the existing sibling imports)

- [ ] **Step 1: Write the routes module**

```python
# service/api/reactions_routes.py
"""service.api.reactions_routes - HTTP routes for chat reactions.

Imported AT THE BOTTOM of service/api/__init__.py (sibling-module pattern,
same as notifications_routes / moderation_routes) to avoid touching the
brittle top-level multi-import.

Persistence is in service.reactions (owns the api_tx). After the toggle
commits, we publish a <reaction/> frame to the PEER's bare-uuid Redis
channel. The chat server's redis_forward_to_websocket forwards anything on
that channel straight to the peer's socket (identity middleware for the
xmpp subprotocol), so no chat-server change is needed. The publish is
best-effort: a Redis hiccup must never fail the request (the DB write
already succeeded).
"""

from __future__ import annotations

import os

from flask import request
import redis as _redis

import duotypes as t
from service.api.decorators import aget, apost
from database import api_tx
from service.reactions import toggle, list_for_conversation, UnknownPeer

XMPP_DOMAIN = 'ahavah.app'

_REDIS_HOST = os.environ.get('DUO_REDIS_HOST', 'redis')
_REDIS_PORT = int(os.environ.get('DUO_REDIS_PORT', 6379))
# Module-level sync client; decode_responses matches the chat server.
_REDIS = _redis.Redis(host=_REDIS_HOST, port=_REDIS_PORT, decode_responses=True)


def _xml_attr(value: str) -> str:
    return (
        value.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def _publish_reaction(
    reactor_uuid: str, peer_uuid: str, stanza_id: str, kind: str, action: str,
) -> None:
    frame = (
        f'<reaction xmlns="ahavah:reactions:0"'
        f' from="{_xml_attr(reactor_uuid)}@{XMPP_DOMAIN}"'
        f' to="{_xml_attr(peer_uuid)}@{XMPP_DOMAIN}"'
        f' message-id="{_xml_attr(stanza_id)}"'
        f' kind="{_xml_attr(kind)}"'
        f' action="{_xml_attr(action)}"/>'
    )
    try:
        _REDIS.publish(peer_uuid, frame)
    except Exception:
        import traceback
        print('reactions: redis publish failed:')
        print(traceback.format_exc())


@apost('/messages/<stanza_id>/reactions')
def post_message_reaction(s: t.SessionInfo, stanza_id: str):
    """Toggle the signed-in user's reaction to message <stanza_id> in the
    conversation with peer_uuid. Body: {peer_uuid, kind?}. v1 accepts only
    kind='heart'. Returns {action, kind}."""
    assert s.person_uuid is not None
    assert s.person_id is not None
    payload = request.get_json(silent=True) or {}
    peer_uuid = payload.get('peer_uuid')
    kind = payload.get('kind', 'heart')
    if not peer_uuid:
        return {'error': 'missing_peer_uuid'}, 400
    if kind != 'heart':
        return {'error': 'unsupported_kind'}, 400
    try:
        with api_tx() as tx:
            result = toggle(
                tx, s.person_uuid, s.person_id, peer_uuid, kind,
                stanza_id=stanza_id,
            )
    except UnknownPeer:
        return {'error': 'unknown_peer'}, 400

    _publish_reaction(
        reactor_uuid=s.person_uuid,
        peer_uuid=peer_uuid,
        stanza_id=stanza_id,
        kind=kind,
        action=result['action'],
    )
    return {'action': result['action'], 'kind': kind}, 200


@aget('/reactions')
def get_reactions(s: t.SessionInfo):
    """All reactions in the conversation with ?with=<peer_uuid> (both
    directions). Returns {reactions: [{message_stanza_id, reactor_uuid,
    kind}]}."""
    assert s.person_id is not None
    peer_uuid = request.args.get('with')
    if not peer_uuid:
        return {'error': 'missing_with'}, 400
    try:
        with api_tx() as tx:
            rows = list_for_conversation(tx, s.person_id, peer_uuid)
    except UnknownPeer:
        return {'error': 'unknown_peer'}, 400
    return {'reactions': rows}, 200
```

- [ ] **Step 2: Register the module at the bottom of `service/api/__init__.py`**

Add immediately after the existing `import service.api.moderation_routes` line (currently `service/api/__init__.py:967`):

```python
# Chat reactions (2026-05-20) — sibling-routes pattern. Toggle endpoint
# persists via service.reactions then publishes a <reaction/> frame to the
# peer's Redis channel for real-time delivery.
import service.api.reactions_routes  # noqa: E402,F401
```

- [ ] **Step 3: Verify import chain loads (no syntax/import error)**

Run: `python -c "import service.api"`
Expected: exits 0, no traceback. (Run inside the api test harness env where deps are installed.)

- [ ] **Step 4: Commit**

```bash
git add service/api/reactions_routes.py service/api/__init__.py
git commit -m "feat(reactions): POST /messages/<id>/reactions toggle + GET /reactions + redis publish"
```

---

# FRONTEND (ahavah-web)

### Task 4: `reaction-in` event type

**Files:**
- Modify: `src/lib/chat-types.ts` (the `ChatEvent` union, currently ends at line 87 with the `error` variant)

- [ ] **Step 1: Add the variant to the `ChatEvent` union**

Insert before the closing `| { type: "error"; message: string };` line:

```ts
  // A reaction toggle relayed from the peer (the server only publishes to
  // the OTHER party's channel). `action` mirrors the toggle: add | remove.
  | { type: "reaction-in"; threadId: string; messageId: string; kind: string; action: "add" | "remove" }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (the new variant is unused so far — no error).

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat-types.ts
git commit -m "feat(reactions): reaction-in chat event type"
```

---

### Task 5: Decode `<reaction>` stanza

**Files:**
- Modify: `src/lib/chat-stanza.ts` (the `decodeStanza` switch, currently ends with `default: return null;` near line 456)
- Test: `tests/lib/chat-stanza.test.ts`

- [ ] **Step 1: Write the failing decode test**

Append to `tests/lib/chat-stanza.test.ts`:

```ts
describe("decodeStanza — reaction", () => {
  it("decodes an incoming heart add", () => {
    const xml =
      `<reaction xmlns="ahavah:reactions:0" ` +
      `from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" ` +
      `message-id="msg-123" kind="heart" action="add"/>`;
    expect(decodeStanza(xml, OWN_UUID)).toEqual({
      type: "reaction-in",
      threadId: PEER_UUID,
      messageId: "msg-123",
      kind: "heart",
      action: "add",
    });
  });

  it("decodes a remove and resolves threadId as the peer", () => {
    const xml =
      `<reaction xmlns="ahavah:reactions:0" ` +
      `from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" ` +
      `message-id="msg-9" kind="heart" action="remove"/>`;
    expect(decodeStanza(xml, OWN_UUID)).toEqual({
      type: "reaction-in",
      threadId: PEER_UUID,
      messageId: "msg-9",
      kind: "heart",
      action: "remove",
    });
  });

  it("defaults a bad action to add and missing kind to heart", () => {
    const xml =
      `<reaction xmlns="ahavah:reactions:0" ` +
      `from="${PEER_UUID}@ahavah.app" to="${OWN_UUID}@ahavah.app" ` +
      `message-id="m"/>`;
    expect(decodeStanza(xml, OWN_UUID)).toEqual({
      type: "reaction-in",
      threadId: PEER_UUID,
      messageId: "m",
      kind: "heart",
      action: "add",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/chat-stanza.test.ts -t reaction`
Expected: FAIL — `decodeStanza` returns `null` (no `reaction` case yet).

- [ ] **Step 3: Add the `reaction` case to `decodeStanza`**

In `src/lib/chat-stanza.ts`, inside the `switch (tag)` block, add a case before `default:`:

```ts
    case "reaction": {
      const messageId = root.getAttribute("message-id") ?? "";
      if (!messageId) return null;
      const fromUserId = bareJid(root.getAttribute("from"));
      const toUserId = bareJid(root.getAttribute("to"));
      // threadId is the peer relative to the viewer.
      const threadId = fromUserId === ownUuid ? toUserId : fromUserId;
      if (!threadId) return null;
      const kind = root.getAttribute("kind") || "heart";
      const action = root.getAttribute("action") === "remove" ? "remove" : "add";
      return { type: "reaction-in", threadId, messageId, kind, action };
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/chat-stanza.test.ts -t reaction`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (expected clean), then:
```bash
git add src/lib/chat-stanza.ts tests/lib/chat-stanza.test.ts
git commit -m "feat(reactions): decode <reaction> stanza into reaction-in event"
```

---

### Task 6: Hook — reactions state, hydrate, live merge, `react()`

**Files:**
- Modify: `src/lib/use-chat-thread.ts`
- Modify: `src/lib/api-client.ts` is NOT changed (use the existing `apiClient.get/post`).

- [ ] **Step 1: Extend the result type**

In `UseChatThreadResult` (around line 34), add:

```ts
  /** messageId -> {kind, mine}. `mine` true = the viewer's own reaction. */
  reactions: Map<string, { kind: string; mine: boolean }>;
  /** Toggle the viewer's reaction to a message (optimistic + POST). */
  react: (messageId: string) => void;
```

- [ ] **Step 2: Add the import for apiClient**

At the top of `src/lib/use-chat-thread.ts`, add to the existing imports:

```ts
import { apiClient } from "@/lib/api-client";
```

- [ ] **Step 3: Add reactions state + hydrate + live merge + react()**

Inside `useChatThread`, after the `theyAreTyping` state declaration (around line 60), add:

```ts
  const [reactions, setReactions] = useState<Map<string, { kind: string; mine: boolean }>>(
    new Map(),
  );
```

Add a hydrate effect (place near the MAM fetch effect):

```ts
  // Hydrate existing reactions for this thread once we know both ids.
  useEffect(() => {
    if (!threadId || !myUuid) return;
    let cancelled = false;
    void apiClient
      .get<{ reactions: Array<{ message_stanza_id: string; reactor_uuid: string; kind: string }> }>(
        `/reactions?with=${encodeURIComponent(threadId)}`,
      )
      .then((res) => {
        if (cancelled) return;
        const next = new Map<string, { kind: string; mine: boolean }>();
        for (const r of res.reactions ?? []) {
          next.set(r.message_stanza_id, { kind: r.kind, mine: r.reactor_uuid === myUuid });
        }
        setReactions(next);
      })
      .catch(() => {
        // Best-effort hydrate; live events still work.
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, myUuid]);
```

In the event-subscription `handle` switch (the one with `message-in` / `typing-in`), add a case:

```ts
        case "reaction-in": {
          if (e.threadId !== threadId) return;
          // Server only publishes the PEER's reactions to us → mine=false.
          setReactions((prev) => {
            const next = new Map(prev);
            if (e.action === "remove") next.delete(e.messageId);
            else next.set(e.messageId, { kind: e.kind, mine: false });
            return next;
          });
          return;
        }
```

Add the `react` callback (near `setMyTyping`):

```ts
  const react = useCallback(
    (messageId: string) => {
      if (!threadId || !myUuid) return;
      // Optimistic toggle of MY reaction.
      let willAdd = false;
      setReactions((prev) => {
        const next = new Map(prev);
        const existing = next.get(messageId);
        if (existing?.mine) {
          next.delete(messageId);
          willAdd = false;
        } else {
          next.set(messageId, { kind: "heart", mine: true });
          willAdd = true;
        }
        return next;
      });
      void apiClient
        .post(`/messages/${encodeURIComponent(messageId)}/reactions`, {
          peer_uuid: threadId,
          kind: "heart",
        })
        .catch(() => {
          // Roll back the optimistic change on failure.
          setReactions((prev) => {
            const next = new Map(prev);
            if (willAdd) next.delete(messageId);
            else next.set(messageId, { kind: "heart", mine: true });
            return next;
          });
        });
    },
    [threadId, myUuid],
  );
```

- [ ] **Step 4: Return the new fields**

Update the final `useMemo` return (around line 280):

```ts
  return useMemo(
    () => ({ messages, isHydrated, theyAreTyping, send, setMyTyping, reactions, react }),
    [messages, isHydrated, theyAreTyping, send, setMyTyping, reactions, react],
  );
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/use-chat-thread.ts
git commit -m "feat(reactions): thread hook reactions state, hydrate, live merge, react()"
```

---

### Task 7: Bubble — chip, hover button, gesture hook

**Files:**
- Modify: `src/components/app/chat-bubble.tsx`

- [ ] **Step 1: Add the gesture hook**

At the top of `src/components/app/chat-bubble.tsx` (after imports), add:

```ts
const LONG_PRESS_MS = 500;

/**
 * Touch reaction gesture: double-tap OR 500ms long-press fires onReact.
 * Returns pointer handlers to spread onto the bubble surface. Only mount
 * when reacting is allowed (them bubbles).
 */
function useReactGesture(onReact?: () => void) {
  const lastTapRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !onReact) return;
      clear();
      timerRef.current = setTimeout(() => onReact(), LONG_PRESS_MS);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !onReact) return;
      clear();
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        onReact();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    },
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
```

- [ ] **Step 2: Extend `TextBubbleProps` and render chip + hover button**

Add to `TextBubbleProps` (around line 59):

```ts
  /** True when the viewer has reacted to this message (renders the chip). */
  reacted?: boolean;
  /** True when reacting is allowed (them bubbles only). Mounts affordances. */
  canReact?: boolean;
  /** Toggle the viewer's reaction. */
  onReact?: () => void;
```

Update the `TextBubble` function signature + body:

```tsx
export function TextBubble({
  side,
  avatar,
  delay = 0,
  reacted = false,
  canReact = false,
  onReact,
  children,
}: TextBubbleProps) {
  const resolvedSide = side ?? "them";
  const gesture = useReactGesture(canReact ? onReact : undefined);
  return (
    <motion.div
      className={bubbleRowVariants({ side })}
      {...bubbleEnter(resolvedSide)}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
    >
      {resolvedSide === "them" && avatar && (
        <Avatar size="xs">
          <AvatarFallback variant="brand">{avatar}</AvatarFallback>
        </Avatar>
      )}
      <div className="group relative">
        <div className={bubbleSurfaceVariants({ side })} {...(canReact ? gesture : {})}>
          {children}
        </div>

        {/* Desktop hover affordance — heart button, hover-capable pointers only. */}
        {canReact && (
          <button
            type="button"
            aria-label={reacted ? "Remove like" : "Like message"}
            onClick={onReact}
            className="absolute -right-2 -top-2 hidden size-6 items-center justify-center rounded-full bg-(--app) text-(--ink-3) opacity-0 shadow-sm transition-opacity [@media(hover:hover)]:flex group-hover:opacity-100"
          >
            <HeartGlyph filled={reacted} />
          </button>
        )}

        {/* Reaction chip — floats bottom-right, partially overlapping. */}
        {reacted && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            aria-hidden
            className="absolute -bottom-2 right-1 flex size-5 items-center justify-center rounded-full bg-(--app) shadow-sm"
          >
            <HeartGlyph filled />
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function HeartGlyph({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5"
      fill={filled ? "var(--color-pink, #ec4899)" : "none"}
      stroke={filled ? "var(--color-pink, #ec4899)" : "currentColor"} strokeWidth={2}>
      <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" />
    </svg>
  );
}
```

> The pink heart uses the existing `--color-pink` token (the CompatPill pink tier already uses it); fallback hex provided. Confirm the token name during implementation against `globals.css` and adjust if it differs — do NOT invent a new color.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` (expected clean) and `npx eslint src/components/app/chat-bubble.tsx` (expected clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/app/chat-bubble.tsx
git commit -m "feat(reactions): TextBubble heart chip, hover button, touch gesture"
```

---

### Task 8: Wire reactions into the thread view

**Files:**
- Modify: `src/components/app/chat-thread-view.tsx`

- [ ] **Step 1: Pull reactions + react from the hook**

Update the `useChatThread` destructure (line 126):

```ts
  const { messages, isHydrated, theyAreTyping, send, setMyTyping, reactions, react } =
    useChatThread(id, myUuid);
```

- [ ] **Step 2: Pass props into each `TextBubble`**

Update the `messages.map(...)` `TextBubble` (around line 229):

```tsx
          messages.map((m) => (
            <TextBubble
              key={m.id}
              side={m.fromUserId === myUuid ? "me" : "them"}
              avatar={m.fromUserId === myUuid ? undefined : subject.name[0]}
              delay={0}
              reacted={reactions.has(m.id)}
              canReact={m.fromUserId !== myUuid}
              onReact={() => react(m.id)}
            >
```

(Leave the inner `<span>` body and closing `</TextBubble>` unchanged.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` (expected clean) and `npx eslint src/components/app/chat-thread-view.tsx` (expected clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/app/chat-thread-view.tsx
git commit -m "feat(reactions): wire reactions + react into chat thread bubbles"
```

---

### Task 9: Full verification + deploy

- [ ] **Step 1: Frontend full typecheck + lint + unit tests**

Run (in `ahavah-web`):
```bash
npx tsc --noEmit
npx eslint src/lib/chat-stanza.ts src/lib/chat-types.ts src/lib/use-chat-thread.ts src/components/app/chat-bubble.tsx src/components/app/chat-thread-view.tsx
npx vitest run tests/lib/chat-stanza.test.ts
```
Expected: tsc clean, eslint clean, vitest green.

- [ ] **Step 2: Backend tests (test harness)**

Run (in `ahavah-api` test harness): `pytest tests/test_message_reactions.py -v`
Expected: PASS (4 tests).

- [ ] **Step 3: Deploy backend (push to ahavah/main) and watch the deploy**

```bash
git push origin ahavah/main
gh run list   # find the "Deploy ahavah/main → droplet" run id
gh run watch <run-id> --exit-status
```
(The separate `publish.yml` Docker job may fail harmlessly — the job that matters is "Deploy ahavah/main → droplet".)

- [ ] **Step 4: Post-deploy backend smoke**

SSH to the droplet and curl the route (expect a non-404; without a real session it should 401/400 like other authed routes):
```bash
ssh -i C:/Users/Ehud/.ssh/id_ed25519_ahavah root@167.71.93.27
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:5000/messages/x/reactions
```
Expected: `401` or `400` (NOT `404`).

- [ ] **Step 5: Deploy frontend (push to master)**

```bash
git push origin master   # Vercel auto-deploys on push to master
```

- [ ] **Step 6: Flag visual verification to the user**

State explicitly: the reaction chip, desktop hover button, and touch gestures pass tsc/lint/unit tests but are auth-gated chat UI that **cannot be visually verified without a browser/credentials**. Ask the user to eyeball: chip placement (bottom-right overlap), hover button fade-in on desktop, double-tap/long-press on touch, and that the heart syncs to the other party.

---

## Self-Review

**Spec coverage:**
- §3 data model → Task 1. ✔
- §4 endpoints (POST toggle, GET hydrate) → Tasks 2 (logic) + 3 (HTTP). ✔
- §4 Redis client in API → Task 3 (`_REDIS` + `_publish_reaction`). ✔
- §5 wire shape → Task 3 (`_publish_reaction` frame) + Task 5 (decode). ✔
- §6 chat-types → Task 4; chat-stanza → Task 5; use-chat-thread → Task 6; chat-bubble → Task 7; chat-thread-view → Task 8. ✔
- §7 edge cases: them-only (Task 8 `canReact`); offline → hydrate (Task 6); free (no token code anywhere). ✔
- §8 verification → Task 9. ✔

**Placeholder scan:** One soft spot — the `--color-pink` token name in Task 7 is flagged to confirm against `globals.css` (a real "verify, don't invent" instruction, not a TODO). All code blocks are complete and runnable.

**Type consistency:** `toggle(tx, reactor_uuid, reactor_id, peer_uuid, kind, stanza_id=...)` defined in Task 2 and called identically in Task 3. `reactions: Map<string,{kind,mine}>` and `react(messageId)` defined in Task 6, consumed in Task 8. `reaction-in` event shape identical across Task 4 (type), Task 5 (decode), Task 6 (handler). `reacted`/`canReact`/`onReact` props defined in Task 7, passed in Task 8. ✔


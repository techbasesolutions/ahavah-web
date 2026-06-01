# Chat Reactions (heart) — Design Spec

> **Status: APPROVED 2026-05-20.** Supersedes the stub at
> `docs/superpowers/plans/2026-05-19-chat-reactions.md`. Source: PDF
> 2026-05-19 `/Chat` section — "Add a like (heart) action that a user can
> send by double-tapping or holding down on a message from another user."
>
> Spans two repos: `ahavah-web` (frontend) + `ahavah-api` (backend).

---

## 1. Scope (confirmed with user)

- **Reaction set:** HEART ONLY for v1. A `kind` column is stored from day
  one so multi-emoji is a non-breaking add later.
- **Target:** OTHER users' messages only (`side="them"`). You cannot react
  to your own sent bubbles.
- **Model:** TOGGLE. One reaction per person per message; re-reacting
  removes it. Idempotent.
- **Desktop gesture:** a heart button that fades in on bubble hover
  (`@media (hover: hover)`); click to toggle.
- **Touch gesture:** double-tap OR 500ms long-press on a `them` bubble.
- **Cost:** FREE. Reactions do not touch the token economy.

## 2. Architecture decision

**Chosen: Option B — REST persistence + Redis fan-out.** Reactions live in
a dedicated `message_reactions` table, written via a Flask toggle endpoint.
Real-time delivery reuses the chat server's existing Redis username-channel
fan-out: the Flask handler publishes a `<reaction/>` frame to the peer's
channel, and the chat server forwards it to the peer's socket **without any
chat-server code change** (`service/chat/__init__.py` →
`redis_forward_to_websocket`, identity output middleware for the `xmpp`
subprotocol; each connection subscribes to its own username channel).

Rejected: Option A (XMPP-native stanza persisted in MAM). It would touch the
MAM/inbox/batcher code — the fragile path that caused migration 0014's
silent rollback (emptied `/discover` for everyone). Higher risk, larger
surface (interleaved history query + IndexedDB schema change), no product
benefit over Option B.

## 3. Data model (backend)

New migration `migrations/0016_message_reactions.sql` (next free number —
0015 was used for rewind). **Must be idempotent** (the deploy re-runs every
migration every time and swallows errors):

```sql
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

- PK `(message_stanza_id, reactor_id)` enforces one reaction per person per
  message (the toggle model).
- `peer_id` makes the "all reactions in this conversation" hydrate query
  cheap (`WHERE reactor_id IN (me, peer) AND peer_id IN (me, peer)`).
- `message_stanza_id` is the client-generated UUID stamped on the message
  stanza (`crypto.randomUUID()` on send; surfaced as the MAM row id on
  history fetch). Both participants reference the same logical message by
  this id. No FK to MAM — MAM has no exposed single-row PK, and the
  reaction is conceptually "X reacted to stanza S," cheap to store loosely.

## 4. Backend endpoint — new `service/api/reactions_routes.py`

Follow the **sibling-routes module pattern** (`notifications_routes.py`,
`moderation_routes.py`) — imported at the bottom of `service/api/__init__.py`
so we never touch the brittle top-level `from service import (...)` block.

Patterns to match (from `post_tokens_rewind`):
- `@apost(...)` / `@aget(...)` decorators.
- Handler signature `def handler(s: t.SessionInfo)`; use `s.person_uuid`,
  `s.person_id`.
- `with api_tx() as tx:` for the transaction.
- Return `(dict, status)` tuples.

### `POST /messages/<stanza_id>/reactions`
- Body: `{ "peer_uuid": "<uuid>", "kind": "heart" }`. `kind` optional,
  defaults `"heart"`; reject any kind != `"heart"` for v1 with 400.
- Resolve `peer_id` from `peer_uuid`; 400 if missing/unknown.
- Toggle inside one `api_tx()`:
  - If a row exists for `(stanza_id, reactor_id=me)` → `DELETE`,
    `action = "remove"`.
  - Else `INSERT (stanza_id, me, peer_id, kind)` → `action = "add"`.
- After the transaction commits, publish a real-time frame to the peer
  (see §5). Wrap the publish in try/except so a Redis hiccup can never fail
  the request (persistence already succeeded).
- Return `{ "action": "add"|"remove", "kind": "heart" }`, 200.

### `GET /reactions?with=<peer_uuid>`
- Returns every reaction in the conversation between me and the peer (both
  directions):
  `[{ "message_stanza_id", "reactor_uuid", "kind" }]`.
- Used by the frontend to hydrate reactions once after MAM history loads.

### Redis client in the API
The chat server uses `redis.Redis(host=DUO_REDIS_HOST, port=DUO_REDIS_PORT)`
and publishes to the bare-uuid username channel. The API container is on the
same docker network and reaches the same `redis` service. The reactions
module instantiates its own small sync redis client (or reuses an existing
API redis handle if one is already wired — confirm in planning) and calls
`publish(<peer_uuid>, <frame>)`.

## 5. Real-time wire shape

The peer's chat connection subscribes to its bare-uuid channel
(`pubsub.subscribe(session.username)`), and `redis_forward_to_websocket`
sends whatever is published straight to the socket (identity middleware).
So the API publishes a self-contained stanza:

```xml
<reaction xmlns="ahavah:reactions:0"
          from="<reactor_uuid>@ahavah.app"
          to="<peer_uuid>@ahavah.app"
          message-id="<stanza_id>"
          kind="heart"
          action="add"/>
```

`action` is `"add"` or `"remove"` mirroring the toggle result. The
frontend `splitStanzas` treats it as a top-level stanza; `decodeStanza`
adds a `case "reaction"`.

## 6. Frontend

### `src/lib/chat-types.ts`
Add to the `ChatEvent` union:
```ts
| { type: "reaction-in"; threadId: string; messageId: string;
    kind: string; action: "add" | "remove" }
```

### `src/lib/chat-stanza.ts`
`decodeStanza` gains `case "reaction":` → read `message-id`, `kind`,
`action`, `from`/`to` (bare-jid both); `threadId` = the peer relative to
`ownUuid`. Return a `reaction-in` event.

### `src/lib/use-chat-thread.ts`
- New state `reactions: Map<messageId, { kind: string; mine: boolean }>`.
- On mount (once `threadId` + `myUuid` known) fetch
  `GET /reactions?with=<threadId>` via `apiClient`; seed the map (`mine` =
  `reactor_uuid === myUuid`).
- In the event subscription, handle `reaction-in`: update the map for the
  message (add/remove). These are always the PEER's reactions (the server
  only publishes to the other party), so `mine = false`.
- New `react(messageId: string)` callback: optimistic toggle of the local
  map (`mine` entry), then `POST /messages/<messageId>/reactions`
  `{ peer_uuid: threadId }`; on failure, roll back the optimistic change.
- Expose `reactions` + `react` in the hook's return type.

### `src/components/app/chat-bubble.tsx`
Extend `TextBubble` (kit primitive — no new ad-hoc atom):
- New optional props: `reacted?: boolean`, `onReact?: () => void`,
  `canReact?: boolean` (true only for `side="them"`).
- **Reaction chip:** when `reacted`, render a small heart chip floating at
  the bubble's bottom-right, partially overlapping. `motion` pop-in 200ms /
  fade-out 150ms. Reduce-motion respected (existing globals.css pattern).
- **Desktop affordance:** a heart button that fades in on bubble hover,
  gated `@media (hover: hover)`; click → `onReact`.
- **Touch affordance:** a `useReactGesture(onReact)` hook (new, in
  `chat-bubble.tsx` or a sibling lib file) handling double-tap and 500ms
  long-press on touch pointers. Mounted only when `canReact`.
- `aria-live` announcement ("Liked"/"Removed like") when a reaction lands.

### `src/components/app/chat-thread-view.tsx`
Pass `reacted={reactions.has(m.id)}`, `canReact={m.fromUserId !== myUuid}`,
and `onReact={() => react(m.id)}` into each `TextBubble`.

## 7. Edge cases / non-goals

- Recipient offline at react time → no live frame; they see it on next
  thread open via the `GET /reactions` hydrate. (Acceptable.)
- Reactor's OTHER devices → pick up on next thread open. Live multi-device
  sync is DEFERRED (would require publishing back to the reactor's own
  channel + de-duping the optimistic update). Noted, not built.
- Multi-emoji picker → DEFERRED. `kind` column makes it additive.
- Self-reactions → out of scope (gesture/affordance not mounted on `me`).
- No token cost.

## 8. Verification

- **Web:** `npx tsc --noEmit` clean + `npx eslint <changed files>` clean.
- **Backend:** `pytest tests/test_message_reactions.py` — toggle add then
  remove returns the right `action`; second identical call flips back; GET
  hydrate returns both directions; missing/unknown `peer_uuid` → 400;
  `kind != heart` → 400. (Runs in the test harness, NOT the prod container —
  prod has no pytest.)
- **Post-deploy backend smoke:** `curl` the route on the droplet
  (`http://127.0.0.1:5000/...`) and confirm a non-404 (it should 400/401
  without a real session, like other authed routes).
- **Cannot visually verify the auth-gated chat UI** (no browser/creds). The
  reaction chip, hover button, and gestures pass tsc/lint but must be
  eyeballed by the user — flag explicitly, same as the map hover card.

## 9. Working-rule compliance

- Plan-before-code: this spec + a follow-on implementation plan, approved
  before code. ✔
- Kit primitives: extend `TextBubble`, no hand-rolled atoms. ✔
- Idempotent migration (`IF NOT EXISTS`). ✔
- No em-dashes in user-facing strings (chip a11y labels: "Liked",
  "Removed like"). ✔
- Stage files by name; one topical commit per repo. ✔
- Deploy via git push (web → Vercel on `master`; api → GHA on
  `ahavah/main`). ✔

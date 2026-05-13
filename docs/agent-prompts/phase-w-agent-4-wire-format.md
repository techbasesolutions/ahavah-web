# Phase W Agent 4 — Wire-format spike

Reverse-engineered from the ahavah-api codebase. Three reference points were
used:

1. **Python backend** — `d:/Antigravity/ahavah-api/service/chat/**`
2. **Bash integration tests** — `d:/Antigravity/ahavah-api/test/functionality4/xmpp*.sh` and `functionality6/`
3. **JS test harness** (the `chattest` + `chatjsontest` proxies that forward HTTP `/send` → WebSocket) — `d:/Antigravity/ahavah-api/test/chattest/index.js`, `test/chatjsontest/index.js`

> Note: the orchestrator brief described a separate `tests/chat/` directory.
> That doesn't exist. The actual chat tests are the `.sh` files under
> `test/functionality4/` and `test/functionality6/`, plus the proxies above.

---

## 1. Transport overview

- **URL**: `ws://167.71.93.27:5443` (production), `ws://chat:5443` inside the
  docker-compose network, `ws://localhost:5443` from a host shell.
- **Endpoint**: the chat server is FastAPI; the WebSocket route is mounted
  at `/` (`@app.websocket("/")` in `service/chat/__init__.py`).
- **Subprotocol selection**: server inspects `Sec-WebSocket-Protocol`. If the
  client offers `json`, the server replies with `json` and runs both directions
  through `xmltodict` (JSON ⇄ XML). Anything else falls through to plain XMPP
  XML.
- **Auth carrier**: SASL PLAIN over the chat stream. Despite the brief's
  hint that "duo_session is sent automatically on WS upgrade", **the backend
  does not read the cookie at all** — `service/chat/session/__init__.py` only
  consumes the SASL `<auth>` stanza. We must explicitly send the session
  token as the SASL password.
- **Auth format**: base64 of `\0<user-uuid>\0<session-token>` (RFC 4616 PLAIN
  authzid empty, authcid = uuid, passwd = token). Token is SHA-512'd
  server-side and looked up against `duo_session.session_token_hash`.

We use the **XMPP XML subprotocol** (no `Sec-WebSocket-Protocol` header at
all — server's `else` branch picks XMPP). Justification: it's the path
exercised by the real integration tests in `functionality4` and is what the
existing Flutter/RN clients use. JSON subprotocol is an alternative we
don't need.

---

## 2. Opening handshake

Once the WS is `open`, the client sends in order:

### 2.a Open frame

```xml
<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" to="ahavah.app" version="1.0"/>
```

Server replies with **two** stanzas (top-level concatenated, no wrapping):

```xml
<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" from="ahavah.app" id="<server-uuid>" version="1.0"/>
<stream:features xmlns="http://etherx.jabber.org/streams"><starttls xmlns="urn:ietf:params:xml:ns:xmpp-tls"/><mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><mechanism>PLAIN</mechanism></mechanisms></stream:features>
```

We can ignore STARTTLS (we're already on the WS, TLS is the WS's job).

### 2.b SASL auth

```xml
<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN"><BASE64></auth>
```

`<BASE64>` = `btoa("\u0000" + uuid + "\u0000" + sessionToken)`.

Success:
```xml
<success xmlns="urn:ietf:params:xml:ns:xmpp-sasl"/>
```

Failure:
```xml
<failure xmlns="urn:ietf:params:xml:ns:xmpp-sasl"><not-authorized/></failure>
</stream:stream>
```

The server then *closes* the WS on failure (we should listen for this and
surface `auth-fail` to the UI).

### 2.c Re-open + bind

After SASL `<success>`, the client re-sends `<open>` (same as 2.a). Server
replies with another `<open>` + a `<stream:features>` that now offers
`session` + `bind`. Then:

```xml
<iq type="set" id="bind1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>web</resource></bind></iq>
```

Server replies (resource is ignored — server always returns bare JID):
```xml
<iq type="result" id="bind1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><jid><uuid>@ahavah.app</jid></bind></iq>
```

Session activation (some clients skip this; backend will respond):
```xml
<iq type="set" id="session1"><session xmlns="urn:ietf:params:xml:ns:xmpp-session"/></iq>
```

Server replies `<iq type="result" id="session1"/>`.

At this point the stream is **ready**. The server begins publishing inbound
stanzas to the per-username Redis pubsub channel (see
`process_websocket_messages` → `pubsub.subscribe(session.username)`).

---

## 3. Sending a chat message (client → server)

```xml
<message
  type="chat"
  from="<my-uuid>@ahavah.app"
  to="<peer-uuid>@ahavah.app"
  id="<client-stanza-id>"
  xmlns="jabber:client">
  <body>hello user 2</body>
  <request xmlns="urn:xmpp:receipts"/>
</message>
```

Notes:
- `id` is echoed in the server's ack — use it for optimistic-state correlation.
- The `<request xmlns="urn:xmpp:receipts"/>` is **part of the standard
  outgoing shape** (test scripts always include it). Backend re-serializes
  the message and includes it on relay to peer.
- `from` is what the client claims; server doesn't validate strictly (it
  trusts the bound session) but the test fixtures include it so we include
  it for byte-compatibility.
- Body text is `XMLEscape`d (`&` `<` `>` `'` `"` → entities). The backend
  preserves whatever was sent and re-renders it via `lxml`.

### 3.a Server acks

The server writes back **one** of:

```xml
<duo_message_delivered id="<stanza-id>"/>
```
— success.

```xml
<duo_message_blocked id="<stanza-id>"/>
```
— recipient blocked sender (skipped).

```xml
<duo_message_blocked id="<stanza-id>" reason="spam"/>
```
— spam classifier rejected.

```xml
<duo_message_not_unique id="<stanza-id>"/>
```
— intro message is not unique vs prior intros.

```xml
<duo_message_too_long id="<stanza-id>"/>
```
— body > 5000 chars.

```xml
<duo_message_blocked id="<stanza-id>" reason="rate-limited-1day"/>
<duo_message_blocked id="<stanza-id>" reason="rate-limited-1day" subreason="unverified-basics"/>
<duo_message_blocked id="<stanza-id>" reason="rate-limited-1day" subreason="unverified-photos"/>
```
— intro daily rate-limit hit.

```xml
<duo_message_blocked id="<stanza-id>" reason="age-verification"/>
```
— sender requires identity verification.

```xml
<duo_server_error id="<stanza-id>"/>
```
— audio transcode failure (chat type with `audio_base64` attr).

All ack variants use the **stanza id** to correlate with the optimistic
client-side bubble.

### 3.b Server delivery to peer

If accepted, peer's open WS receives:

```xml
<message
  xmlns="jabber:client"
  from="<sender-uuid>@ahavah.app"
  to="<peer-uuid>@ahavah.app"
  id="<server-generated-id>"
  type="chat">
  <body>hello user 2</body>
  <request xmlns="urn:xmpp:receipts"/>
</message>
```

Important: the `id` on the **inbound** message is what the *server* stamps
on relay; it is NOT the sender's client-id (sender's client-id is what their
own ack carries). Inbound messages have no client-side optimistic id to
correlate with — they're net-new bubbles.

---

## 4. Typing indicator

Sent the same way as a chat message but with `type="typing"` and no body:

```xml
<message
  type="typing"
  from="<my-uuid>@ahavah.app"
  to="<peer-uuid>@ahavah.app"
  id="<client-stanza-id>"
  xmlns="jabber:client"/>
```

Peer receives a stanza of the same shape (server passes it straight
through, see `process_text` → `if isinstance(maybe_message, TypingMessage)`).

No XEP-0085 `<composing/>` namespace — the orchestrator brief was wrong on
this point. The backend's `xml_to_message` discriminates purely on
`type` attribute (`type="chat"` vs `type="typing"`).

> The legacy fork (Duolicious) does send typing-stop semantics by simply
> *not* sending another `type="typing"` for 5 seconds. We mirror this:
> 5-second client-side timeout after the most recent inbound typing stanza.

---

## 5. Inbox (recent threads) list

Inbox is fetched over the XMPP WebSocket itself, not via REST. The REST
`/inbox-info` endpoint (`POST`) does NOT return the recent-threads list —
it takes a list of peer UUIDs and returns enriched person rows. The actual
inbox query is:

```xml
<iq type="set" id="<query-id>">
  <inbox xmlns="erlang-solutions.com:xmpp:inbox:0" queryid="<query-id>"/>
</iq>
```

Response: one `<message>` per thread + one terminating `<iq>`:

```xml
<message xmlns="jabber:client" from="<my-uuid>@ahavah.app" to="<my-uuid>@ahavah.app" id="<msg-id>">
  <result xmlns="erlang-solutions.com:xmpp:inbox:0" unread="<n>" queryid="<query-id>">
    <forwarded xmlns="urn:xmpp:forward:0">
      <delay xmlns="urn:xmpp:delay" stamp="2026-05-12T15:33:11.123456Z"/>
      <message xmlns="jabber:client" from="<peer-uuid>@ahavah.app" to="<my-uuid>@ahavah.app" id="<msg-id>" type="chat">
        <body>last message body</body>
        <request xmlns="urn:xmpp:receipts"/>
      </message>
    </forwarded>
    <read>true|false</read>
    <box>inbox|chats</box>
    <archive>false</archive>
    <mute>0</mute>
  </result>
</message>
...
<iq id="<query-id>" type="result"><fin/></iq>
```

Where:
- `box="inbox"` = thread initiated by the peer (intro / new)
- `box="chats"` = thread the user has replied to (active chat)
- `unread` on the `result` element = unread count for that thread
- The inner `<message>`'s `from`/`to` shows who sent the last message
- `<delay stamp>` = ISO-8601 UTC of that last message

Mark-displayed (zero out unread for a thread):
```xml
<message to="<peer-uuid>@ahavah.app" from="<my-uuid>@ahavah.app">
  <displayed xmlns="urn:xmpp:chat-markers:0" id="<any-id>"/>
</message>
```
No server response; just sets `unread_count = 0` server-side.

---

## 6. Message history (MAM — Message Archive Management)

Per-thread paginated history. Each page returns up to `<max>` results in
**ascending timestamp order**, plus a terminating `<iq><fin/></iq>`. Pagination
walks **backwards** via `<before>`, which is the stanza id of the oldest
message in the previous page (Erlang base-32 integer).

Query:
```xml
<iq type="set" id="<query-id>">
  <query xmlns="urn:xmpp:mam:2" queryid="<query-id>">
    <x xmlns="jabber:x:data" type="submit">
      <field var="FORM_TYPE"><value>urn:xmpp:mam:2</value></field>
      <field var="with"><value><peer-uuid>@ahavah.app</value></field>
    </x>
    <set xmlns="http://jabber.org/protocol/rsm">
      <max>50</max>
      <before></before>
    </set>
  </query>
</iq>
```

Response page (one `<message>` per archived stanza + `<iq><fin/></iq>`):

```xml
<message xmlns="jabber:client" from="<my-uuid>@ahavah.app" to="<my-uuid>@ahavah.app" id="<wrapper-id>">
  <result xmlns="urn:xmpp:mam:2" queryid="<query-id>" id="<mam-stanza-id>">
    <forwarded xmlns="urn:xmpp:forward:0">
      <delay xmlns="urn:xmpp:delay" stamp="2026-05-12T15:33:11.123456Z"/>
      <message xmlns="jabber:client" from="<sender-uuid>@ahavah.app" to="<recipient-uuid>@ahavah.app" id="<original-id>" type="chat">
        <body>...</body>
        <request xmlns="urn:xmpp:receipts"/>
      </message>
    </forwarded>
  </result>
</message>
...
<iq xmlns="jabber:client" from="<my-uuid>@ahavah.app" to="<my-uuid>@ahavah.app" id="<query-id>" type="result">
  <fin xmlns="urn:xmpp:mam:2"/>
</iq>
```

`<result id>` is the MAM stanza id (Erlang base-32 representation of the
internal sequential row id). Use the **first** result's id (oldest message
in the page) as the `<before>` value for the next page query.

For Phase W's scope (last-50 hydration + live), one MAM page of 50 is
sufficient on chat-thread mount. Earlier pages can be added later behind
an "Load earlier" affordance.

---

## 7. Presence / online (separate from inbox)

Out of scope for Phase W Agent 4 — `service/chat/online` handles a separate
subscribe/unsubscribe `<duo_*>` stanza family for the green-dot indicator.
The header in `ChatHeader` already takes an `online: boolean` prop fed from
discovery data, so the chat module doesn't have to subscribe to presence.

---

## 8. Ping/pong (keep-alive)

```xml
<duo_ping/>
```

Server responds with:
```xml
<duo_pong preferred_interval="10000" preferred_timeout="5000"/>
```

These are millisecond hints. We will send a `<duo_ping/>` every
`preferred_interval` ms after auth-success, and reconnect if `preferred_timeout`
ms elapse without a pong.

---

## 9. Stanza framing on the wire

The WebSocket sends each XML stanza as **one or more** WS frames. The
backend uses FastAPI `websocket.send_text(...)` per stanza, so under normal
operation **each frame == one stanza**. But the server forwards from a
Redis pubsub stream, and **multiple stanzas can arrive in a single frame**
(e.g. an inbox query returns N message + 1 iq results, all forwarded
through one Redis publish_many).

Two consequences for our parser:
- We must **split** any inbound text on the boundary between adjacent
  top-level elements before parsing each stanza individually.
- A stanza may be **truncated across frames** (rare but possible if the
  server's pubsub publishes mid-stanza). We must buffer trailing partial
  XML and prepend it to the next frame.

Strategy: a simple state-tracking splitter that walks the buffer counting
`<` / `>` and `<tag` vs `</tag>` openings, emitting closed top-level
elements and keeping the open trailing fragment in the buffer. (See
`splitStanzas` in `chat-stanza.ts` task 4.1.)

---

## 10. Outgoing stanza encoder rules

- Always use double quotes for attribute values (matches server's
  `lxml.etree.tostring` output).
- Always include `xmlns="jabber:client"` on outgoing `<message>` (test
  fixtures all do; server's lookup uses `'{jabber:client}message'` tag).
- `<body>` text must escape `&`, `<`, `>` (NOT `'` or `"` — those are only
  required inside attribute values).
- Attribute values must escape `&`, `<`, `"`.
- No whitespace between adjacent tags inside the same stanza (server
  preserves whitespace; bash test fixtures DO contain leading whitespace
  but it doesn't affect parsing because lxml normalizes).

---

## 11. Reconnect contract

- On unexpected close, reconnect with exponential backoff 1s → 2s → 4s →
  8s → 16s → 30s (capped). Reset on a successful auth-success.
- After reconnect, the server's per-username Redis subscription is fresh
  — any messages dispatched while disconnected are stored in `mam_message`
  but were not delivered live. The client should re-issue the inbox
  query on every fresh connect to refresh unread counts.
- Client-side seq-id correlation: each outgoing message keeps its
  `clientId` until the server's `duo_message_delivered` ack arrives. If
  we reconnect mid-flight, the original send is lost (no replay queue in
  v1); we surface "failed to send" on a 10-second ack timeout.

---

## 12. Open issues / future work

- **JSON subprotocol**: We could opt into `json` to skip XML parsing, but
  it sends `xmltodict.parse(xml_str)` results, which adds a `@`-prefix to
  attributes and is awkward to handle on the client. Sticking with XML.
- **Real-time inbox unread bumps**: The server delivers chat messages
  via the per-username pubsub channel but does NOT push inbox-list deltas.
  Our `useInbox` hook listens to live `<message type="chat">` arrivals and
  bumps `unread_count` + `last_message` for the matching thread client-side.
- **Audio messages**: out of scope for Phase W Agent 4 — `VoiceBubble` is
  still rendered for backward compat in the chat page but we won't wire
  the send path. The encoder/decoder do recognize `audio_uuid` attr if
  present so future work can pick it up.
- **`fake-indexeddb`**: not in devDependencies. Per the brief this was a
  BLOCKER but adding it is a trivial unblock and clearly the intent — we
  add it in Task 4.2.

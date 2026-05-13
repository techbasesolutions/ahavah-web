# Phase W — Agent 4: Chat WebSocket

> **Trigger phrase**: This agent waits for the user to type **`You are Agent 4, execute`** in the terminal. Do not begin Task 4.0 / 4.1 until that phrase appears. Read the entire brief, confirm you understand your file ownership, then wait.

_Self-contained dispatch prompt. Copy entire file as the Agent tool's `prompt` parameter, `subagent_type: "general-purpose"`, `run_in_background: true`._

---

You are **Phase W Agent 4 — Chat WebSocket** for the Ahavah PWA.

**Worktree:** `d:/Antigravity/ahavah-web-phase-w-4` (branch: `phase-w-agent-4`)
**Logging file:** `d:/Antigravity/ahavah-web-phase-w-4/logs/agent-4-chat.md`

## Mission

Connect the chat surface to the backend's real WebSocket server. The backend speaks an XMPP-style XML protocol (forked from Duolicious) on `ws://167.71.93.27:5443` (plain WebSocket on the droplet IP; no WSS yet because `ahavah.app` isn't registered). You must:

1. Write a typed WebSocket wrapper that handles connect / auth / reconnect / stanza send / stanza receive
2. Parse incoming XML stanzas into typed message events
3. Encode outgoing messages as XML stanzas
4. Provide React hooks for one chat thread + the inbox list
5. Rewire `/chat/[id]` to render real messages
6. Rewire `/inbox` to show real recent threads with unread counts

This is the **hardest of the four agents**. The XMPP-XML wire format is undocumented; you must reverse-engineer from the backend's test harness. Budget more time for 4.1 (the client) than the other tasks combined.

## BEFORE YOU WRITE ANY CODE — READ IN ORDER

1. **Master plan** — `d:/Antigravity/ahavah-web/docs/phase-w-plan.md` sections 2, 4, 6, plus risk §10 (XMPP-XML undocumented quirks).
2. **Quad-agent protocol** — `d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md`.
3. **Current chat page** — `d:/Antigravity/ahavah-web-phase-w-4/src/app/chat/[id]/page.tsx` (whole file). Note the seeded bubbles + ephemeral sends pattern.
4. **Current inbox** — `src/app/inbox/page.tsx`.
5. **Backend chat module** — `d:/Antigravity/ahavah-api/service/chat/__init__.py` (whole file — it's the FastAPI/uvicorn entry point, ~400 lines, you NEED this for the wire format).
6. **Backend chatutil** — `d:/Antigravity/ahavah-api/service/chat/chatutil/__init__.py` (hardcodes + helpers).
7. **Backend chat tests** — `d:/Antigravity/ahavah-api/tests/chat/` (entire directory — these are the test harnesses that send/receive real stanzas. Treat them as the wire-format spec.)
8. **Postgres chat tables** — `d:/Antigravity/ahavah-api/database/init-api.sql` lines 1609 (`mam_message`), 1639 (`inbox`), 1675 (`rude_message`).
9. **Shared API client** — `src/lib/api-client.ts`, `api-types.ts`, `storage-keys.ts`. If missing → BLOCKER.

If files 5–7 don't give you a clear enough wire-format picture, **BLOCKER** before writing speculation. The orchestrator will either:
- Provide a JSON-bridge endpoint added to the backend (workaround), OR
- Walk through the wire format with you directly.

## Hard rules (non-negotiable)

- **No new XMPP libraries.** Don't `npm install strophe` or `xmpp.js` — they bring 100KB+ of bundle weight and we use ~10% of their feature set. Write a focused 300-line wrapper that handles only the stanzas Duolicious uses.
- **Use the browser's native `DOMParser`** for inbound XML and string-templating for outbound. Both are sync, fast, and zero-dep.
- **WebSocket auth via session cookie.** The browser sends the `duo_session` httpOnly cookie automatically on the WebSocket upgrade request (set `credentials: "include"` if there's an option; for `new WebSocket(url)` the cookie travels by default for same-origin or cross-origin with proper CORS). Confirm with backend in Foundation block.
- **Reconnect with exponential backoff.** Start at 1s, double up to 30s, reset on a successful message. Don't hammer the server.
- **Optimistic send.** Show the user's message in the bubble list immediately with a `pending` indicator; on server ack (or `id` match in the response stream), mark `sent`; on disconnect after timeout, mark `failed` with retry affordance.
- **Persist last 50 messages per thread in IndexedDB** (or sessionStorage as a fallback) so reopening a chat shows recent history before the server fetch resolves. This is cache — server is source of truth.
- **No new state library.** Use React hooks + a singleton EventEmitter or class instance for the WebSocket connection. Multiple components subscribe to the same client.
- **Don't render unparseable XML.** If a stanza fails to parse, log + ignore. Never crash the UI on bad server output.
- **`prefers-reduced-motion`** — typing indicator animations collapse to ~0ms per the global rule; verify visually.
- **No em-dashes in user-facing copy.**
- **TDD on the parser + encoder.** The XML stanza encoder/decoder is pure logic and gets thorough vitest tests. The WebSocket client itself (network) gets smoke walks against the dev backend.
- **One commit per task. Sign with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.**
- **Don't push, don't merge.** Orchestrator handles merge.

## File ownership

### Write (exclusively yours)

- `src/lib/chat-client.ts` — NEW (WebSocket wrapper, ~300 lines)
- `src/lib/chat-stanza.ts` — NEW (pure XML encoder/decoder, ~150 lines + tests)
- `src/lib/chat-types.ts` — NEW (`ChatMessage`, `ChatThread`, `StanzaEvent`, etc.)
- `src/lib/chat-cache.ts` — NEW (IndexedDB or sessionStorage cache for recent history)
- `src/lib/use-chat-thread.ts` — NEW (hook for one thread: messages + send + typing + unread)
- `src/lib/use-inbox.ts` — NEW (hook for inbox list)
- `src/app/chat/[id]/page.tsx` — rewire to real client; preserve chat-bubble / chat-header / chat-input atoms
- `src/app/inbox/page.tsx` — rewire to real inbox
- `tests/lib/chat-stanza.test.ts` — NEW (must cover every stanza type)
- `tests/lib/chat-cache.test.ts` — NEW

### Read-only

- `src/lib/api-client.ts`, `api-types.ts`, `storage-keys.ts` — orchestrator-owned
- `src/lib/profile-schema.ts` — locked
- `src/components/app/chat-bubble.tsx`, `chat-header.tsx`, `chat-input.tsx`, `block-report-sheet.tsx` — atoms exist; consume, don't rewrite
- `src/components/ui/*`, `src/components/kibo-ui/*` — primitives
- All other app pages

## Tasks

Execute IN ORDER. One commit per task. Log before AND after.

### Task 4.0 — Wire-format spike (~90 min, NOT a commit)

**Goal:** before writing any production code, understand the wire format completely.

- [ ] Read every file in `d:/Antigravity/ahavah-api/tests/chat/`. Note: these are shell + JS test harnesses. Look at the literal XML strings they send and receive.
- [ ] Document everything you learn in `logs/phase-w-agent-4-wire-format.md` (this is YOUR scratch file, not a commit). Include:
  - The opening stanza shape (XMPP-style `<stream:stream>` or simpler?)
  - The auth stanza (how does the server know the session token? Via cookie alone, or an explicit `<auth>` stanza?)
  - The message-send stanza (`<message to="..." type="chat"><body>...</body></message>`?)
  - The incoming message stanza shape
  - The typing-indicator stanza (XEP-0085 chat states: `<composing/>` / `<paused/>` / `<active/>`?)
  - The inbox-list / unread-count fetch — is this XMPP or a REST call?
  - The presence stanzas if any (online/offline)
- [ ] **If after 90 minutes you still don't have a complete enough picture to start coding, BLOCKER.** Do not bluff this; XML protocol bugs will manifest as silent message loss.

This task produces a planning doc, no code commit.

### Task 4.1 — Pure stanza encoder/decoder + exhaustive tests (~120 min)

**Goal:** `chat-stanza.ts` is a pure module that converts between TypeScript objects and XML strings. No I/O.

- [ ] Create `src/lib/chat-types.ts`:

```typescript
export type ChatMessage = {
  id: string;
  threadId: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  /** Server-assigned ISO timestamp. */
  serverTime: string;
  /** Local-only state for optimistic UI. */
  state: "pending" | "sent" | "delivered" | "failed";
};

export type ChatThread = {
  /** Conversation id. May be a UUID or a tuple of user ids depending on backend. */
  id: string;
  withUserId: string;
  lastMessage: { body: string; serverTime: string; fromUserId: string } | null;
  unreadCount: number;
};

export type ChatStateEvent =
  | { kind: "message-in"; message: ChatMessage }
  | { kind: "message-ack"; messageId: string }
  | { kind: "typing-in"; threadId: string; fromUserId: string; isTyping: boolean }
  | { kind: "presence"; userId: string; online: boolean }
  | { kind: "auth-ok" }
  | { kind: "auth-fail"; reason: string }
  | { kind: "error"; raw: string };
```

- [ ] Create `src/lib/chat-stanza.ts` with:

```typescript
import type { ChatStateEvent } from "./chat-types";

/** Encode a message-send stanza. The exact format comes from Task 4.0 spike. */
export function encodeMessage(params: {
  toUserId: string;
  body: string;
  clientId: string;  // for ack correlation
}): string {
  // ... implementation derived from wire-format spike
}

export function encodeTyping(params: {
  toUserId: string;
  isTyping: boolean;
}): string {
  // ...
}

/** Parse a single incoming stanza into a typed event. Returns null if unrecognized. */
export function decodeStanza(xml: string): ChatStateEvent | null {
  // Use DOMParser; switch on root element + attrs; return typed event.
}

/** Split a wire-incoming buffer into stanzas (each stanza is one top-level element). */
export function splitStanzas(buffer: string): string[] {
  // ... non-trivial: stanzas can be interleaved or chunked across packets
}
```

- [ ] Write `tests/lib/chat-stanza.test.ts` covering AT LEAST:
  - encodeMessage produces the exact byte-for-byte XML the backend test harness expects (use a literal from `tests/chat/` as the assertion)
  - encodeTyping for both `true` and `false`
  - decodeStanza recognizes every stanza type from your Task 4.0 notes
  - decodeStanza returns null on unknown / malformed XML
  - splitStanzas handles a buffer with 1 / 2 / 3 stanzas in one chunk
  - splitStanzas handles a partial stanza at end-of-buffer (returns the complete prefix and leaves the partial for next call)
- [ ] Run vitest — every test passes.
- [ ] Commit: `feat(phase-w-agent-4): pure chat-stanza encoder/decoder with exhaustive tests`.

### Task 4.2 — IndexedDB chat cache (~45 min)

**Goal:** persist the last 50 messages per thread so reopening shows history immediately.

- [ ] Create `src/lib/chat-cache.ts`:

```typescript
import type { ChatMessage } from "./chat-types";

const DB_NAME = "ahavah-chat";
const DB_VERSION = 1;
const STORE = "messages";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("threadId", "threadId");
    };
  });
  return dbPromise;
}

export async function appendMessage(msg: ChatMessage): Promise<void> { /* ... */ }
export async function getThreadHistory(threadId: string, limit = 50): Promise<ChatMessage[]> { /* ... */ }
export async function clearAll(): Promise<void> { /* ... */ }
```

- [ ] Write tests using `fake-indexeddb` (already in vitest's `jsdom` dependencies; if not, BLOCKER and orchestrator adds it).
- [ ] Commit: `feat(phase-w-agent-4): IndexedDB cache for recent chat history`.

### Task 4.3 — `chat-client.ts` — the WebSocket wrapper (~120 min)

**Goal:** singleton class managing the WebSocket connection. Emits typed events; consumers subscribe via callbacks.

- [ ] Create `src/lib/chat-client.ts`. Skeleton:

```typescript
"use client";

import {
  decodeStanza,
  encodeMessage,
  encodeTyping,
  splitStanzas,
} from "./chat-stanza";
import type { ChatStateEvent, ChatMessage } from "./chat-types";

type Listener = (event: ChatStateEvent) => void;

class ChatClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private incomingBuffer = "";
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.intentionalClose = false;
    const url = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "wss://chat.ahavah.app:5443";
    const ws = new WebSocket(url);
    ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Send any explicit auth stanza if Task 4.0 spike showed one is needed.
    };
    ws.onmessage = (e) => this.handleIncoming(typeof e.data === "string" ? e.data : "");
    ws.onclose = () => this.handleClose();
    ws.onerror = () => { /* logged via onclose */ };
    this.ws = ws;
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  sendMessage(toUserId: string, body: string): string {
    const clientId = crypto.randomUUID();
    const xml = encodeMessage({ toUserId, body, clientId });
    this.ws?.send(xml);
    return clientId;
  }

  sendTyping(toUserId: string, isTyping: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(encodeTyping({ toUserId, isTyping }));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleIncoming(chunk: string): void {
    this.incomingBuffer += chunk;
    const stanzas = splitStanzas(this.incomingBuffer);
    // splitStanzas returns the complete stanzas + sets aside any partial trailing one.
    // For simplicity here, assume splitStanzas returns { complete: string[], remainder: string }.
    // ... iterate, decode, emit ...
  }

  private emit(event: ChatStateEvent): void {
    for (const l of this.listeners) l(event);
  }

  private handleClose(): void {
    this.ws = null;
    if (this.intentionalClose) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect();
    }, this.reconnectDelay);
  }
}

export const chatClient = new ChatClient();
```

- [ ] Refine `splitStanzas` interface to return remainder — adjust `chat-stanza.ts` if needed.
- [ ] Smoke-test against the production WebSocket: in DevTools console, `chatClient.connect(); chatClient.subscribe(console.log); chatClient.sendMessage("<some-user-id>", "test")`. Watch console for `message-ack` or `message-in` events.
- [ ] Commit: `feat(phase-w-agent-4): chat-client WebSocket wrapper with reconnect + buffer-aware parsing`.

### Task 4.4 — `use-chat-thread` hook (~60 min)

**Goal:** consume `chatClient` for one specific thread.

- [ ] Create `src/lib/use-chat-thread.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { chatClient } from "./chat-client";
import { appendMessage, getThreadHistory } from "./chat-cache";
import type { ChatMessage } from "./chat-types";

export function useChatThread(threadId: string, withUserId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from cache, then connect.
  useEffect(() => {
    void getThreadHistory(threadId).then(setMessages);
    chatClient.connect();
    const unsubscribe = chatClient.subscribe((event) => {
      if (event.kind === "message-in" && event.message.threadId === threadId) {
        setMessages((prev) => [...prev, event.message]);
        void appendMessage(event.message);
      } else if (event.kind === "message-ack") {
        setMessages((prev) =>
          prev.map((m) => (m.id === event.messageId ? { ...m, state: "sent" as const } : m)),
        );
      } else if (event.kind === "typing-in" && event.threadId === threadId) {
        setTheyAreTyping(event.isTyping);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        if (event.isTyping) {
          typingTimeout.current = setTimeout(() => setTheyAreTyping(false), 5000);
        }
      }
    });
    return unsubscribe;
  }, [threadId]);

  const send = useCallback((body: string) => {
    const clientId = chatClient.sendMessage(withUserId, body);
    const msg: ChatMessage = {
      id: clientId,
      threadId,
      fromUserId: "me",  // resolved from useProfile().profile.id elsewhere
      toUserId: withUserId,
      body,
      serverTime: new Date().toISOString(),
      state: "pending",
    };
    setMessages((prev) => [...prev, msg]);
    void appendMessage(msg);
  }, [threadId, withUserId]);

  const setMyTyping = useCallback((isTyping: boolean) => {
    chatClient.sendTyping(withUserId, isTyping);
  }, [withUserId]);

  return { messages, theyAreTyping, send, setMyTyping };
}
```

- [ ] Commit: `feat(phase-w-agent-4): use-chat-thread hook with optimistic send + ack + typing`.

### Task 4.5 — `use-inbox` hook (~45 min)

**Goal:** GET `/inbox-info` (or whichever REST endpoint the backend exposes for the inbox list — confirm in Foundation block) and merge in real-time updates from `chatClient` so unread counts stay accurate while a user is browsing.

- [ ] Create `src/lib/use-inbox.ts`. Implementation pattern: initial `apiClient.get("/inbox-info")` for the list; subscribe to `chatClient` for inbound `message-in` events; bump the matching thread's `unreadCount` + update `lastMessage`.
- [ ] Commit: `feat(phase-w-agent-4): use-inbox hook merging REST + WebSocket updates`.

### Task 4.6 — Rewire `/chat/[id]` (~45 min)

- [ ] Open `src/app/chat/[id]/page.tsx`. Note the current shape — `SUBJECT_BY_ID` hardcoded map + seeded bubbles + ephemeral sends.
- [ ] Replace with `useChatThread(threadId, withUserId)` driving the existing `<ChatBubble>` atoms. The subject (other user's profile) is fetched via `GET /profile/<uuid>` through `apiClient` — confirm exact path in Foundation block. Loading state = `<Skeleton>`.
- [ ] Wire `<ChatInput>` `onSend` to `send(body)` from the hook.
- [ ] Wire `<ChatInput>` `onChange` to debounce-fire `setMyTyping(true)` (and `setMyTyping(false)` 3s after last keystroke).
- [ ] Render `theyAreTyping` via the existing typing-indicator atom (or as a small `<motion.div>` if no atom exists — read the chat-bubble.tsx file to see what's there).
- [ ] Smoke-walk: open `/chat/<known-thread-id>` in two browsers (different seed accounts). Send message in one; see it appear in the other within ~500ms.
- [ ] Commit: `feat(phase-w-agent-4): /chat/[id] connects to real WebSocket`.

### Task 4.7 — Rewire `/inbox` (~30 min)

- [ ] Open `src/app/inbox/page.tsx`. Replace fixtures with `useInbox()`. Each row = `<ListItem>` with unread badge from `thread.unreadCount`.
- [ ] Each row clicks to `/chat/<thread.id>`.
- [ ] Loading + empty + error states (R5).
- [ ] Commit: `feat(phase-w-agent-4): /inbox shows real recent threads with live unread counts`.

### Task 4.8 — Final verification (~30 min)

- [ ] `pnpm exec tsc --noEmit` clean.
- [ ] `pnpm exec eslint --max-warnings=0` clean on touched files.
- [ ] `pnpm exec vitest run` — baseline + your new tests pass.
- [ ] `pnpm build` clean.
- [ ] **End-to-end smoke walk:**
  1. Open two browsers (Chrome + Firefox, or two incognito windows). Sign into two different seed accounts that have a mutual match.
  2. In browser A: navigate to `/inbox`. See the thread with browser B.
  3. Click into `/chat/<thread-id>`. Empty state or 1–2 seed messages.
  4. In browser B: same navigation. Now both are on the same thread.
  5. Type in browser A: "Hello." Watch browser B — message appears within 500ms.
  6. Watch browser A: message's `pending` indicator should resolve to `sent` (via ack) within 500ms.
  7. Type in browser B without sending — "typing…" indicator should appear in browser A.
  8. Browser A: refresh page. Recent messages reload from IndexedDB cache (fast) AND server (eventual).
  9. Disconnect browser B's network (DevTools → Offline). Reconnect after 5 seconds. Browser B's `chatClient` should reconnect; missed messages from A arrive.
  10. Navigate browser A to `/inbox`. Thread's `lastMessage` shows the most recent text; `unreadCount` is 0 (since A was the active surface).
  11. Switch to browser B's account, navigate to `/inbox`. Unread count on the thread with A reflects messages A sent while B was offline.

- [ ] Emit COMPLETE:

```
COMPLETE: Agent 4
Tasks: 8/8 completed (4.0 is the wire-format spike, no commit)
Files changed:
 - src/lib/chat-types.ts (new)
 - src/lib/chat-stanza.ts (new, ~150 lines)
 - src/lib/chat-cache.ts (new, IndexedDB)
 - src/lib/chat-client.ts (new, ~300 lines WebSocket wrapper)
 - src/lib/use-chat-thread.ts (new)
 - src/lib/use-inbox.ts (new)
 - src/app/chat/[id]/page.tsx (rewired)
 - src/app/inbox/page.tsx (rewired)
 - tests/lib/chat-stanza.test.ts (new, covers every stanza type from 4.0 spike)
 - tests/lib/chat-cache.test.ts (new, fake-indexeddb)
Issues: [or none]
Verification: typecheck + lint + vitest + build + two-browser e2e smoke walk all pass.
Wire-format spike notes: docs/agent-prompts/phase-w-agent-4-wire-format.md (committed for orchestrator review)
```

## BLOCKER format

```
BLOCKER: Agent 4
Task: [task ID like 4.1]
Error: [error]
Attempted: [what you tried twice]
Need: [what would unblock — likely a wire-format clarification or a backend endpoint addition]
```

**Special blocker for 4.0:** If after 90 minutes of spike work you can't reconstruct the wire format from the backend's test harness, BLOCKER. Don't write speculative XML. The orchestrator will pair-debug with you or add a JSON-bridge endpoint to the backend.

## Logging format (`logs/agent-4-chat.md`)

Same shape — timestamped entries before/after each task. Plus the wire-format spike doc goes in `docs/agent-prompts/phase-w-agent-4-wire-format.md` (this IS committed; the orchestrator will read it during merge to confirm your understanding).

---

## Wave 1 Foundation — files now live

Agent 0 (the IDE orchestrator) has completed Foundation work. Concrete
values for your prompts:

### Backend (ahavah-api)

- **Repo**: `d:/Antigravity/ahavah-api/` on branch `ahavah/main`. Deployed
  to DigitalOcean droplet `ahavah-api-prod-01` (id 570650212, $24/mo
  s-2vcpu-4gb, nyc3 region). SSH key: `C:/Users/Ehud/.ssh/id_ed25519_ahavah`.
- **API base URL (REST)**: `http://167.71.93.27:5000` — set in
  `.env.local` as `NEXT_PUBLIC_API_BASE_URL`. Plain HTTP (no SSL yet
  because `ahavah.app` domain isn't registered).
- **WebSocket URL (chat)**: `ws://167.71.93.27:5443` — set in
  `.env.local` as `NEXT_PUBLIC_CHAT_WS_URL`. Plain WebSocket (not WSS)
  because there's no SSL cert yet.
- **Health check**: `curl http://167.71.93.27:5000/health` returns
  `status: ok` (verified during Foundation).

### Frontend foundation (already on master)

These files exist on `master` at commit `7bbf212` and beyond. Every
worktree branched from this commit, so they're already in your tree:

- `src/lib/api-client.ts` — fetch wrapper with `credentials: 'include'`,
  methods `get` / `post` / `patch` / `delete` / `postMultipart` (the
  multipart variant uses XHR for upload progress; the others use fetch).
  Throws `ApiError` (`.status` + `.body` + `.message`) on non-2xx.
- `src/lib/api-types.ts` — hand-written TypeScript types for every
  endpoint group. Source-of-truth comments cite the matching
  `service/api/__init__.py` line ranges in the backend repo.
- `src/lib/storage-keys.ts` — constants for localStorage keys
  (`PROFILE_CACHE_KEY`, `DECISIONS_CACHE_KEY`, `FILTERS_CACHE_KEY`,
  `PENDING_EMAIL_KEY`, `MAP_FIRST_MOUNT_KEY`).

### Chat wire format (specific to you)

- The backend chat service is reachable at `ws://167.71.93.27:5443`.
- Wire format is XMPP-XML — `lxml` on the backend, browser-native
  `DOMParser` on the frontend. Do not install an XMPP library.
- The `LSERVER` for JIDs is `ahavah.app`, set as an env var on the
  backend even though that domain isn't registered. JIDs are just
  identifiers; no DNS lookup is performed against them. So your
  outbound `to` attribute is `<user-uuid>@ahavah.app/web` regardless
  of the real droplet IP.
- Auth: session cookie (`duo_session`) is sent on the WebSocket upgrade
  request by the browser automatically. The plain-HTTP/IP setup means
  `SameSite=Lax` may matter; if cookies don't flow, that's a BLOCKER
  for Agent 0 to investigate. Fallback path (explicit `<auth>` stanza
  after open) is documented but the cookie path is preferred.
- **Your spike task (4.0) still applies** — reverse-engineer the exact
  wire format from `d:/Antigravity/ahavah-api/tests/chat/`. Don't rely
  on the hints below as gospel.

### Auth / OTP (context for the cookie that authenticates your WS)

- Email-only OTP via Resend (no SMS / Twilio in Phase W — deferred).
- OTP from-address is `onboarding@resend.dev` (universal Resend
  placeholder).
- Session is delivered as an httpOnly cookie named `duo_session`. The
  backend sets it on `Set-Cookie` from `/check-otp`.

### Database schema

The backend's Postgres database is `duo_api` on `postgres:16` with
pgvector + postgis extensions. 74 tables from the upstream Duolicious
schema plus the Phase W migrations:

- `swipe` (subject, object, direction, created_at) — like/pass record
- `hide_and_block` — block list
- `message_translation` — DeepL translation cache (Phase 2)
- `mam_message`, `inbox`, `rude_message` — chat tables (your domain)
- `ahavah_verification_tier` ENUM type — `'none' | 'bronze' | 'silver' | 'gold'`
- `person.ahavah_verification_tier` column (default `'none'`)

### Wire-format hints (NOT gospel — confirm in Task 4.0)

The backend's `chat/chatutil` module suggests:

- Stanza tag is `<message>` (XMPP-style)
- `type="chat"` attribute on outbound messages
- `to` attribute is `<user-uuid>@ahavah.app/web`
- `<body>` child element holds text
- `id` attribute on outbound messages is preserved on the server `ack` so you can match.
- Typing uses XEP-0085: child element `<composing xmlns="http://jabber.org/protocol/chatstates"/>` or `<paused/>`.

**These are hints, not gospel.** Confirm against the test harness in
Task 4.0.

### REST endpoints you'll use

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/inbox-info` | Recent threads + unread counts | none | `{ threads: ChatThread[] }` |
| GET | `/profile/<uuid>` | One user's profile (for chat header) | none | `Partial<Profile>` |
| GET | `/feed?thread=<id>&before=<ts>` (verify against `service/api/__init__.py`) | Message history backfill (REST, not WS) | querystring | `{ messages: ChatMessage[] }` |

The WS protocol is for real-time send/receive + typing + presence. For
historical scrollback beyond what's in cache, use the REST endpoint
above.

### What's deferred (don't try to wire these)

- **Stripe** (verification + paywall): deferred to Cutover.
- **Twilio**: no SMS OTP path. Email-only.
- **SSL / domain**: no `ahavah.app`. Plain HTTP + plain WS on droplet IP.
- **Sentry / PostHog**: env vars unset, telemetry no-ops.

### IndexedDB polyfill for tests

`fake-indexeddb` is expected in devDependencies for `chat-cache.test.ts`.
If missing, BLOCKER — Agent 0 adds it.

### Logs go to

`d:/Antigravity/ahavah-web/logs/agent-4-chat.md` on the master
repo (NOT inside your worktree). The `logs/` directory was created
by Agent 0 during F.5. Append-only; one entry per major step
(started + completed).

### Communication protocol (reminder)

When you hit a 2-attempt failure → emit a `BLOCKER:` block (template
in the brief above). When you finish all tasks → emit a `COMPLETE:`
block. Both go to **stdout in this terminal**; the user copy-pastes
them into Agent 0's IDE session for triage / acknowledgement. Agent 0
cannot see your terminal output directly.

---

**Begin Task 4.0 (wire-format spike) when ready. Log first, then work. Take 90 minutes on 4.0 before any code; bluffing the wire format will cost more later than spiking now.**

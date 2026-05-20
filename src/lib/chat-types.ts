/**
 * Chat domain types — used by chat-client, hooks, and UI.
 *
 * Two distinct id concepts (don't conflate):
 *   - `clientId`   — generated locally for optimistic-bubble correlation.
 *                    Survives until the matching `duo_message_delivered`
 *                    ack arrives (we set it as the stanza `id` on outgoing
 *                    messages). On reconnect we drop pending clientIds.
 *   - `serverId`   — the `id` attribute the server stamps on stanzas it
 *                    relays to us (different from clientId for inbound).
 *
 * `ChatMessage.status` mirrors the optimistic-send state machine:
 *   pending → (ack) → sent
 *   pending → (timeout/error) → failed
 *   <not optimistic> received messages start at `received`.
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md
 */

export type ChatMessageStatus = "pending" | "sent" | "failed" | "received";

export type ChatMessage = {
  /** Stable id used for React keys + dedupe. */
  id: string;
  /** Local optimistic id, set on outgoing only. Persists for ack correlation. */
  clientId?: string;
  /** Which thread (peer JID, bare) this message belongs to. */
  threadId: string;
  /** Sender JID (bare uuid, no @domain). */
  fromUserId: string;
  /** Recipient JID (bare uuid, no @domain). */
  toUserId: string;
  /** Message body text. Already XML-decoded. */
  body: string;
  /** ISO-8601 UTC timestamp. Local clock for outgoing, server `<delay stamp>` for inbound/MAM. */
  serverTime: string;
  /** Optimistic-send state. */
  status: ChatMessageStatus;
  /** Optional audio payload uuid (present on AudioMessage stanzas; unused by current UI). */
  audioUuid?: string;
};

export type ChatThread = {
  /** Thread id = bare peer JID (uuid). */
  id: string;
  /** Same as `id` — kept for API parity. */
  withUserId: string;
  /** Most recent message body + meta, or null when thread is empty. */
  lastMessage: {
    body: string;
    serverTime: string;
    fromUserId: string;
  } | null;
  /** Unread count on the user's side. */
  unreadCount: number;
  /** Box state — "inbox" for intros not yet replied to, "chats" once active. */
  box: "inbox" | "chats";
};

/**
 * Tagged-union events emitted by the ChatClient via subscribe().
 * Pattern-match on `type` to handle each variant.
 */
export type ChatEvent =
  | { type: "auth-success" }
  // Emitted once the resource bind completes and the connection can carry
  // queries (inbox / MAM history) and sends. This is the signal consumers
  // should fetch on — `auth-success` fires one round-trip too early (bind
  // hasn't happened yet), which is why the old "wait 250ms after auth"
  // heuristic raced the bind on slow links and stalled the inbox.
  | { type: "ready" }
  | { type: "auth-fail"; reason?: string }
  | { type: "connected" }
  | { type: "disconnected"; willReconnect: boolean }
  | { type: "reconnecting"; attempt: number }
  | { type: "message-in"; message: ChatMessage }
  | {
      type: "message-ack";
      clientId: string;
      result: "delivered" | "blocked" | "blocked-spam" | "rate-limited" | "not-unique" | "too-long" | "verification-required" | "server-error";
      reason?: string;
    }
  | { type: "typing-in"; fromUserId: string; toUserId: string }
  | { type: "inbox-result"; threads: ChatThread[] }
  | { type: "inbox-fin"; queryId: string }
  | { type: "history-result"; threadId: string; messages: ChatMessage[]; queryId: string }
  // A reaction toggle relayed from the peer (the server only publishes to
  // the OTHER party's channel). `action` mirrors the toggle: add | remove.
  | { type: "reaction-in"; threadId: string; messageId: string; kind: string; action: "add" | "remove" }
  | { type: "error"; message: string };

export type ChatEventListener = (event: ChatEvent) => void;

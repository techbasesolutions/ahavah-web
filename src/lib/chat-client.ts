/**
 * ChatClient — singleton WebSocket wrapper that handles the full ahavah
 * XMPP-over-WS lifecycle (connect → SASL PLAIN auth → resource bind →
 * inbox subscribe → message send/recv → reconnect on close).
 *
 * Pattern: singleton + EventEmitter. The chat surface mounts and calls
 * `chatClient.connect(myUuid, sessionToken)`; multiple components can
 * `subscribe(listener)` to the same event stream (we de-multiplex by event
 * type in each hook). On unmount, the client stays alive — closing only on
 * explicit `disconnect()` (sign-out).
 *
 * Reconnect: exponential backoff 1s → 30s, capped. Reset to 1s on
 * successful auth.
 *
 * Frame parsing: server may pack multiple stanzas into one WS frame, or
 * split one stanza across frames. We maintain a per-connection `rxBuffer`
 * string and feed it through `splitStanzas` on every `onmessage`.
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md
 */

import {
  decodeStanza,
  encodeAuth,
  encodeBind,
  encodeHistoryQuery,
  encodeInboxQuery,
  encodeMarkDisplayed,
  encodeMessage,
  encodeOpen,
  encodePing,
  encodeTyping,
  splitStanzas,
} from "@/lib/chat-stanza";
import type { ChatEvent, ChatEventListener, ChatMessage } from "@/lib/chat-types";

const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "ws://localhost:5443";
const XMPP_DOMAIN = "ahavah.app";
const RESOURCE = "web";

const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const PING_INTERVAL_MS = 30_000;

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "stream-opened"
  | "authenticated"
  | "bound"
  | "ready";

export class ChatClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private rxBuffer = "";
  private listeners = new Set<ChatEventListener>();
  private myUuid = "";
  private sessionToken = "";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;
  private postAuthReopen = false;

  /**
   * Connect (or reconnect) under the given identity. Idempotent: a second
   * call with the same uuid/token is a no-op if already connected. A second
   * call with a DIFFERENT uuid will tear down and restart.
   */
  connect(myUuid: string, sessionToken: string): void {
    if (this.myUuid === myUuid && this.sessionToken === sessionToken && this.ws) {
      return;
    }
    if (this.myUuid && this.myUuid !== myUuid) {
      this.disconnect();
    }
    this.myUuid = myUuid;
    this.sessionToken = sessionToken;
    this.intentionalClose = false;
    this.openSocket();
  }

  /** Tear down the connection permanently (sign-out path). */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.state = "disconnected";
    this.rxBuffer = "";
    this.reconnectAttempt = 0;
  }

  /**
   * Subscribe to all ChatEvent emissions. Returns an unsubscribe fn.
   * Listeners are invoked synchronously in registration order.
   */
  subscribe(listener: ChatEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Send a chat message stanza. Caller already created the optimistic
   * bubble with clientId; this just puts bytes on the wire.
   *
   * Returns false if not ready (caller can flip the bubble to failed or
   * defer); true if frame was handed to the WebSocket.
   */
  sendMessage(toUuid: string, clientId: string, body: string): boolean {
    if (this.state !== "ready" || !this.ws) return false;
    const xml = encodeMessage({
      fromUuid: this.myUuid,
      toUuid,
      clientId,
      body,
      domain: XMPP_DOMAIN,
    });
    try {
      this.ws.send(xml);
      return true;
    } catch {
      return false;
    }
  }

  /** Send a typing indicator. Drops silently if not ready (typing is best-effort). */
  sendTyping(toUuid: string): void {
    if (this.state !== "ready" || !this.ws) return;
    try {
      this.ws.send(
        encodeTyping({
          fromUuid: this.myUuid,
          toUuid,
          domain: XMPP_DOMAIN,
        }),
      );
    } catch {
      // best-effort
    }
  }

  /** Issue an inbox-list query. Results arrive as ChatEvent.inbox-result. */
  fetchInbox(queryId: string): void {
    if (this.state !== "ready" || !this.ws) return;
    try {
      this.ws.send(encodeInboxQuery(queryId));
    } catch {
      // best-effort
    }
  }

  /** Issue a MAM history query for a thread. */
  fetchHistory(params: { queryId: string; peerUuid: string; max?: number; before?: string }): void {
    if (this.state !== "ready" || !this.ws) return;
    try {
      this.ws.send(
        encodeHistoryQuery({
          queryId: params.queryId,
          peerUuid: params.peerUuid,
          domain: XMPP_DOMAIN,
          max: params.max,
          before: params.before,
        }),
      );
    } catch {
      // best-effort
    }
  }

  /** Clear server-side unread count for a thread. */
  markDisplayed(toUuid: string): void {
    if (this.state !== "ready" || !this.ws) return;
    try {
      this.ws.send(
        encodeMarkDisplayed({
          fromUuid: this.myUuid,
          toUuid,
          domain: XMPP_DOMAIN,
        }),
      );
    } catch {
      // best-effort
    }
  }

  /** Current high-level connection state. */
  getState(): ConnectionState {
    return this.state;
  }

  /** Current bound uuid. Empty before connect(). */
  getMyUuid(): string {
    return this.myUuid;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private openSocket(): void {
    if (typeof WebSocket === "undefined") {
      this.emit({ type: "error", message: "WebSocket unavailable" });
      return;
    }
    this.state = "connecting";
    this.rxBuffer = "";
    this.postAuthReopen = false;

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (err) {
      this.emit({ type: "error", message: `WS construct failed: ${String(err)}` });
      this.scheduleReconnect();
      return;
    }

    this.ws = ws;

    ws.onopen = () => {
      this.emit({ type: "connected" });
      ws.send(encodeOpen(XMPP_DOMAIN));
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const data = typeof ev.data === "string" ? ev.data : "";
      if (!data) return;
      this.rxBuffer += data;
      const { stanzas, rest } = splitStanzas(this.rxBuffer);
      this.rxBuffer = rest;
      for (const stanza of stanzas) {
        this.handleStanza(stanza);
      }
    };

    ws.onerror = () => {
      this.emit({ type: "error", message: "WebSocket transport error" });
    };

    ws.onclose = () => {
      this.ws = null;
      const willReconnect = !this.intentionalClose;
      this.state = "disconnected";
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.emit({ type: "disconnected", willReconnect });
      if (willReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private handleStanza(xml: string): void {
    // Drive the stream-state machine from the stanza tag where ChatClient
    // owns the transition (open / success / iq-bind-result). Then forward
    // the typed event from decodeStanza to listeners.
    if (xml.startsWith("<open") && this.state === "connecting") {
      // First server <open> arrives; on receipt of <stream:features> with
      // SASL mechanisms we'll send auth. We don't parse features — the
      // post-open <stream:features> always follows in the same flow.
      this.state = "stream-opened";
      return;
    }
    if (xml.startsWith("<stream:features") || xml.startsWith("<features")) {
      // Two times we see features:
      //   1. pre-auth: offers SASL — send <auth>.
      //   2. post-auth: offers session+bind — send <iq><bind/></iq>.
      if (this.state === "stream-opened") {
        // pre-auth features → SASL
        this.ws?.send(encodeAuth(this.myUuid, this.sessionToken));
      } else if (this.state === "authenticated") {
        // post-auth features → bind
        this.ws?.send(encodeBind("bind-1", RESOURCE));
      }
      return;
    }

    const event = decodeStanza(xml, this.myUuid);
    if (event) {
      if (event.type === "auth-success") {
        this.state = "authenticated";
        // Re-send <open> on the same stream per XMPP framing — server now
        // offers session+bind features.
        this.postAuthReopen = true;
        this.ws?.send(encodeOpen(XMPP_DOMAIN));
        // Emit auth-success to listeners.
        this.emit(event);
        return;
      }
      if (event.type === "auth-fail") {
        this.state = "disconnected";
        this.intentionalClose = true; // do not auto-reconnect on bad creds
        try {
          this.ws?.close();
        } catch {
          // ignore
        }
        this.emit(event);
        return;
      }
      this.emit(event);
      return;
    }

    // Untyped events that ChatClient consumes silently:
    //   <iq type="result" id="bind-1"><bind><jid>.../jid></bind></iq>
    //   → flips state to ready, starts ping timer.
    if (xml.startsWith("<iq") && xml.includes('id="bind-1"') && this.state === "authenticated") {
      this.state = "ready";
      this.reconnectAttempt = 0;
      this.startPing();
      return;
    }
    if (xml.startsWith("<open") && this.state === "authenticated" && this.postAuthReopen) {
      // The post-auth server <open> reply. Wait for features → bind.
      this.postAuthReopen = false;
      return;
    }
  }

  private emit(event: ChatEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        // A faulty listener mustn't take down the others.
        console.error("ChatClient listener error:", err);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    const delay = Math.min(
      INITIAL_RECONNECT_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_MS,
    );
    this.reconnectAttempt++;
    this.emit({ type: "reconnecting", attempt: this.reconnectAttempt });
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalClose) return;
      this.openSocket();
    }, delay);
  }

  private startPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.state === "ready" && this.ws) {
        try {
          this.ws.send(encodePing());
        } catch {
          // ignore
        }
      }
    }, PING_INTERVAL_MS);
  }
}

/**
 * Module-level singleton. Hooks import this directly; no need for a
 * React context (the client is global to the app).
 */
export const chatClient = new ChatClient();

// Re-export the message shape for convenience callers.
export type { ChatMessage };

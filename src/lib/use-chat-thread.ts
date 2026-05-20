/**
 * useChatThread — React hook that wires a single chat surface to the
 * ChatClient singleton + the IndexedDB cache.
 *
 * Responsibilities:
 *   1. Hydrate from cache on mount (synchronous-looking paint — the
 *      cache promise typically resolves within a frame).
 *   2. Issue a MAM history query once the client is `ready` so we have
 *      the authoritative tail-50.
 *   3. Subscribe to message-in / message-ack / typing-in events. Filter
 *      to messages relevant to THIS thread.
 *   4. send(body) — push an optimistic pending bubble + persist to cache,
 *      flip to sent/failed on ack within 10s.
 *   5. setMyTyping(isTyping) — debounce-aware caller drives this; hook
 *      forwards each `true` to the client (the wire format has no
 *      "stopped typing" stanza — server treats absence as paused).
 *   6. theyAreTyping — boolean, auto-clears 5s after the last typing-in
 *      stanza from the peer (mirrors backend's 5s typing TTL).
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md §4
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chatClient } from "@/lib/chat-client";
import { appendMessage, getThreadHistory } from "@/lib/chat-cache";
import type { ChatEvent, ChatMessage } from "@/lib/chat-types";

const ACK_TIMEOUT_MS = 10_000;
const TYPING_TTL_MS = 5_000;

export type UseChatThreadResult = {
  /** Messages ordered oldest → newest. Empty until cache + MAM resolve. */
  messages: ChatMessage[];
  /** True after cache hydration completes (whether or not any rows existed). */
  isHydrated: boolean;
  /** Peer is currently typing — auto-clears 5s after last <message type="typing"/>. */
  theyAreTyping: boolean;
  /** Send a message. Pushes optimistic pending bubble; flips on ack. */
  send: (body: string) => void;
  /** Forward a typing indicator. Caller debounces; hook just relays. */
  setMyTyping: (isTyping: boolean) => void;
};

/**
 * Bind a chat surface to a single peer thread.
 *
 * @param threadId   The bare-jid uuid of the peer (URL `[id]`). Same value
 *                   as `withUserId` in the inbox-list result.
 * @param myUuid     The current viewer's uuid. Required for own/peer
 *                   classification of inbound stanzas + for sender JID on
 *                   outgoing messages. Pass empty string to defer wiring
 *                   (e.g. while session auth is still resolving).
 */
export function useChatThread(threadId: string, myUuid: string): UseChatThreadResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [theyAreTyping, setTheyAreTyping] = useState(false);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of clientId → timeout handle for pending-ack timeouts.
  const ackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Stable ref to messages so subscriber closure can read latest state
  // without re-subscribing on every change.
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // -----------------------------------------------------------------------
  // Cache hydration
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (!threadId) {
      // Use microtask so setState isn't synchronous within the effect body
      // (React 19's recommended pattern; setState-in-effect lint rule).
      Promise.resolve().then(() => {
        if (cancelled) return;
        setMessages([]);
        setIsHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const cached = await getThreadHistory(threadId, 50);
      if (cancelled) return;
      setMessages(cached);
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // -----------------------------------------------------------------------
  // MAM history fetch — when client is ready, ask the server for the
  // authoritative tail of 50 messages. We merge by id (server id wins
  // over cached server id; pending clientIds survive).
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!threadId || !myUuid) return;
    const queryId = `mam-${threadId}-${Date.now()}`;
    const tryFetch = () => {
      if (chatClient.getState() === "ready") {
        chatClient.fetchHistory({ queryId, peerUuid: threadId, max: 50 });
        return true;
      }
      return false;
    };
    if (tryFetch()) return;
    // Otherwise fetch the moment the connection is bound + ready. (Was a
    // 250ms-after-auth-success guess that raced the bind on slow links and
    // could miss the fetch entirely until a reconnect.)
    const off = chatClient.subscribe((e) => {
      if (e.type === "ready") tryFetch();
    });
    return off;
    // threadId/myUuid only — re-running on every state churn would
    // duplicate-fetch.
  }, [threadId, myUuid]);

  // -----------------------------------------------------------------------
  // Event subscription — live messages, acks, typing.
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!threadId || !myUuid) return;

    const handle = (e: ChatEvent) => {
      switch (e.type) {
        case "message-in": {
          if (e.message.threadId !== threadId) return;
          // Dedupe: if the server-stamped id matches a row we already have,
          // skip. (MAM history + live delivery overlap is possible on
          // reconnect.)
          if (messagesRef.current.some((m) => m.id === e.message.id)) return;
          setMessages((prev) => [...prev, e.message]);
          void appendMessage(e.message);
          return;
        }
        case "history-result": {
          if (e.threadId !== threadId) return;
          setMessages((prev) => {
            const byId = new Map<string, ChatMessage>();
            for (const m of prev) byId.set(m.id, m);
            for (const m of e.messages) byId.set(m.id, m);
            // Persist any newly-seen history rows.
            for (const m of e.messages) {
              if (!prev.some((p) => p.id === m.id)) void appendMessage(m);
            }
            return Array.from(byId.values()).sort((a, b) =>
              a.serverTime.localeCompare(b.serverTime),
            );
          });
          return;
        }
        case "message-ack": {
          // Find pending bubble keyed by clientId and flip status.
          const next: ChatMessage["status"] =
            e.result === "delivered" ? "sent" : "failed";
          setMessages((prev) =>
            prev.map((m) =>
              m.clientId === e.clientId
                ? { ...m, status: next, body: m.body }
                : m,
            ),
          );
          // Persist the flip.
          const flipped = messagesRef.current.find((m) => m.clientId === e.clientId);
          if (flipped) {
            void appendMessage({ ...flipped, status: next });
          }
          // Clear the ack timeout.
          const timer = ackTimersRef.current.get(e.clientId);
          if (timer) {
            clearTimeout(timer);
            ackTimersRef.current.delete(e.clientId);
          }
          return;
        }
        case "typing-in": {
          if (e.fromUserId !== threadId) return;
          setTheyAreTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => {
            setTheyAreTyping(false);
            typingTimerRef.current = null;
          }, TYPING_TTL_MS);
          return;
        }
        default:
          return;
      }
    };

    const unsubscribe = chatClient.subscribe(handle);
    return () => {
      unsubscribe();
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [threadId, myUuid]);

  // -----------------------------------------------------------------------
  // Send
  // -----------------------------------------------------------------------
  const send = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !threadId || !myUuid) return;
      const clientId = makeClientId();
      const now = new Date().toISOString();
      const optimistic: ChatMessage = {
        id: clientId,
        clientId,
        threadId,
        fromUserId: myUuid,
        toUserId: threadId,
        body: trimmed,
        serverTime: now,
        status: "pending",
      };
      setMessages((prev) => [...prev, optimistic]);
      void appendMessage(optimistic);

      const accepted = chatClient.sendMessage(threadId, clientId, trimmed);
      if (!accepted) {
        // Couldn't even put on the wire — flip immediately.
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: "failed" } : m)),
        );
        void appendMessage({ ...optimistic, status: "failed" });
        return;
      }

      // 10s ack timeout — flip to failed if we never hear back.
      const timer = setTimeout(() => {
        ackTimersRef.current.delete(clientId);
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId && m.status === "pending"
              ? { ...m, status: "failed" }
              : m,
          ),
        );
      }, ACK_TIMEOUT_MS);
      ackTimersRef.current.set(clientId, timer);
    },
    [threadId, myUuid],
  );

  // -----------------------------------------------------------------------
  // Typing
  // -----------------------------------------------------------------------
  const setMyTyping = useCallback(
    (isTyping: boolean) => {
      if (!threadId || !myUuid) return;
      if (isTyping) chatClient.sendTyping(threadId);
      // "false" maps to "don't send" — backend treats absence as paused.
    },
    [threadId, myUuid],
  );

  // Clean up timers on unmount.
  useEffect(() => {
    const timers = ackTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return useMemo(
    () => ({ messages, isHydrated, theyAreTyping, send, setMyTyping }),
    [messages, isHydrated, theyAreTyping, send, setMyTyping],
  );
}

function makeClientId(): string {
  // crypto.randomUUID is available in modern browsers + jsdom.
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

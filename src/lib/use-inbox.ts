/**
 * useInbox — React hook for the /inbox surface.
 *
 * Wire reality: the recent-threads list is fetched via the XMPP WebSocket
 * `<iq type="set"><inbox.../></iq>` query — NOT via REST. (The backend's
 * REST `/inbox-info` is a different endpoint: it takes a list of peer
 * UUIDs and returns enriched person rows for them.)
 *
 * Live updates: subscribe to message-in. When a chat message arrives for
 * a thread we already track, bump `unreadCount` (if the sender is the
 * peer, not us) and replace `lastMessage`. If it's for an unknown peer,
 * we re-issue the inbox query to pick up the new row.
 *
 * State machine:
 *   loading → happy (with N threads) | empty | error
 *
 * On reconnect we automatically re-fetch (chat-client re-emits
 * `auth-success` on every fresh connect).
 *
 * @see docs/agent-prompts/phase-w-agent-4-wire-format.md §5
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chatClient } from "@/lib/chat-client";
import type { ChatEvent, ChatThread } from "@/lib/chat-types";

export type InboxState = "loading" | "happy" | "empty" | "error";

export type UseInboxResult = {
  threads: ChatThread[];
  state: InboxState;
  /** Manually re-issue the server query (used by retry button + reconnect). */
  refresh: () => void;
};

const INBOX_QUERY_TIMEOUT_MS = 10_000;

export function useInbox(myUuid: string): UseInboxResult {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  // Start in loading only when we actually have a uuid to query with.
  // Without it the chat client can't bind, so sitting in "loading" forever
  // is a bug — surface as empty so the right CTA renders.
  const [state, setState] = useState<InboxState>(myUuid ? "loading" : "empty");
  const pendingQueryIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!myUuid) return;
    const queryId = `inbox-${Date.now()}`;
    pendingQueryIdRef.current = queryId;
    setState((cur) => (cur === "empty" || cur === "happy" ? cur : "loading"));
    if (chatClient.getState() === "ready") {
      chatClient.fetchInbox(queryId);
    } else {
      // Defer until ready; the auth-success subscriber below will retry.
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (pendingQueryIdRef.current === queryId) {
        setState((cur) => (cur === "loading" ? "error" : cur));
      }
    }, INBOX_QUERY_TIMEOUT_MS);
  }, [myUuid]);

  // Initial fetch + reconnect-triggered refetch + live updates.
  useEffect(() => {
    if (!myUuid) return;

    // Recover from the "we mounted with no uuid → state was empty" path:
    // a uuid arrived (e.g. /me backfilled it), so we should re-enter
    // loading before issuing the actual fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((cur) => (cur === "empty" ? "loading" : cur));

    const handle = (e: ChatEvent) => {
      switch (e.type) {
        case "auth-success": {
          // Fresh connect — schedule a refresh after the bind round-trip.
          setTimeout(() => refresh(), 250);
          return;
        }
        case "inbox-result": {
          // Each backend response stanza arrives as its own inbox-result
          // event (one per thread). Merge into our state.
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          const incoming = e.threads;
          setThreads((prev) => mergeThreads(prev, incoming));
          // Drain the loading state on the FIRST inbox-result of a query
          // — subsequent ones are still part of the same response burst.
          setState((cur) => (cur === "loading" ? "happy" : cur));
          return;
        }
        case "inbox-fin": {
          // Server signaled the inbox query is complete. The zero-result
          // case sends ONLY this stanza (no inbox-result), so we drain
          // loading here too — derivedState turns happy + zero threads
          // into "empty" downstream.
          if (e.queryId !== pendingQueryIdRef.current) return;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          pendingQueryIdRef.current = null;
          setState((cur) => (cur === "loading" ? "happy" : cur));
          return;
        }
        case "message-in": {
          // Live update — bump unread / refresh lastMessage for matching
          // thread. The peer is `message.fromUserId` when they're not us;
          // when WE sent a message (echoed back via MAM on another client?)
          // we'd bump nothing.
          if (e.message.fromUserId === myUuid) return;
          const peer = e.message.fromUserId;
          setThreads((prev) => {
            const existing = prev.find((t) => t.id === peer);
            if (!existing) {
              // Unknown thread — re-issue inbox query so we pick up the
              // server-authoritative row.
              setTimeout(() => refresh(), 0);
              return prev;
            }
            return prev.map((t) =>
              t.id === peer
                ? {
                    ...t,
                    unreadCount: t.unreadCount + 1,
                    lastMessage: {
                      body: e.message.body,
                      serverTime: e.message.serverTime,
                      fromUserId: e.message.fromUserId,
                    },
                  }
                : t,
            );
          });
          return;
        }
        case "disconnected": {
          if (e.willReconnect) {
            // Don't flash error; keep the last-known happy state.
            return;
          }
          setState("error");
          return;
        }
        case "error": {
          setState((cur) => (cur === "loading" ? "error" : cur));
          return;
        }
        default:
          return;
      }
    };

    const unsubscribe = chatClient.subscribe(handle);
    // Kick off the first fetch (deferred to a microtask so we don't
    // setState synchronously inside the effect body — React 19 lint rule).
    Promise.resolve().then(() => {
      if (chatClient.getState() === "ready") {
        refresh();
      }
      // Else: auth-success subscriber above will trigger refresh when ready.
    });
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [myUuid, refresh]);

  // Derive empty state from threads + state — when we successfully fetched
  // and got zero rows, surface empty (handled in the inbox-result timeout
  // branch above).
  const derivedState = useMemo<InboxState>(() => {
    if (state === "happy" && threads.length === 0) return "empty";
    return state;
  }, [state, threads.length]);

  return useMemo(
    () => ({ threads, state: derivedState, refresh }),
    [threads, derivedState, refresh],
  );
}

function mergeThreads(prev: ChatThread[], incoming: ChatThread[]): ChatThread[] {
  const byId = new Map<string, ChatThread>();
  for (const t of prev) byId.set(t.id, t);
  for (const t of incoming) byId.set(t.id, t);
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.lastMessage?.serverTime ?? "";
    const bTime = b.lastMessage?.serverTime ?? "";
    // Most recent first.
    return bTime.localeCompare(aTime);
  });
}

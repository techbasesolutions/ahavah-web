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

// Per-session cache key for the inbox threads list. We rehydrate from
// sessionStorage on mount so /inbox paints with the last-known threads
// instantly instead of sitting on a skeleton for the duration of the
// XMPP WebSocket connect + auth bind + inbox query (which can be
// several seconds on a cold load). The cached list is replaced once
// the live query lands. Per-session (not localStorage) so a tab-close
// flushes any stale state.
const INBOX_CACHE_KEY = "ahavah:inbox-threads";

function readCachedThreads(): ChatThread[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INBOX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as ChatThread[];
  } catch {
    return null;
  }
}

function writeCachedThreads(threads: ChatThread[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(threads));
  } catch {
    /* quota exceeded -- swallow; cache is opportunistic */
  }
}

export function useInbox(myUuid: string): UseInboxResult {
  const [threads, setThreads] = useState<ChatThread[]>(
    () => readCachedThreads() ?? [],
  );
  // Start in "happy" when we have cached threads to paint -- avoids the
  // skeleton flash on every navigation back to /inbox within a session.
  // The live query still fires in the background and replaces threads
  // atomically when it lands. Cold-cache callers fall back to the
  // original behavior: loading if we have a uuid, empty otherwise.
  const [state, setState] = useState<InboxState>(() => {
    const cached = readCachedThreads();
    if (cached && cached.length > 0) return "happy";
    return myUuid ? "loading" : "empty";
  });
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
        // Timeout: never block the user with a "Couldn't load" alarm when
        // they have nothing to load. Drain to happy (derives to empty if
        // threads is still []). Real errors with existing threads keep
        // their last-known happy state.
        setState((cur) => (cur === "loading" ? "happy" : cur));
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
        case "ready": {
          // Connection is bound and can carry the inbox query. Fetch now —
          // no delay-after-auth guess (that raced the bind on slow links
          // and left the inbox stuck on the skeleton until the 10s timeout).
          refresh();
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
          // Hard disconnect (server unreachable / SSL not yet on droplet):
          // if we never received any threads, surface as empty rather than
          // a red alarm. The user has nothing to load — telling them their
          // chats failed is wrong copy. Real failures with EXISTING threads
          // keep them visible (don't clobber happy state with error).
          setState((cur) => {
            if (cur === "happy") return cur;
            return "happy"; // drains to "empty" via derivedState (zero threads)
          });
          return;
        }
        case "error": {
          // Same reasoning as `disconnected`: don't paint the error state
          // when the user has no chats. The "Try again" CTA there can't
          // help an empty inbox.
          setState((cur) => (cur === "loading" ? "happy" : cur));
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

  // Mirror the threads list into sessionStorage on every change so a
  // subsequent /inbox mount within the same session paints instantly
  // from cache before the live XMPP query finishes. Cheap O(N) per
  // change; N is bounded by the user's actual thread count.
  useEffect(() => {
    writeCachedThreads(threads);
  }, [threads]);

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

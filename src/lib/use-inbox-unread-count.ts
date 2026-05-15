"use client";

import { useEffect, useMemo, useState } from "react";

import { chatClient } from "@/lib/chat-client";
import { isChatTransportAvailable } from "@/lib/chat-transport";
import { readChatSession } from "@/lib/chat-session";
import { useInbox } from "@/lib/use-inbox";

/**
 * Total unread message count across every thread, summed in real time.
 *
 * Designed to be cheap to mount from BottomNav on every authenticated
 * page so the Inbox tab can show a live notification badge — without
 * the user having had to visit /inbox first.
 *
 * Side effect: kicks off chatClient.connect() if there's a session in
 * localStorage and the client isn't already connected. /inbox does the
 * same, so on pages where /inbox is mounted this is a no-op (chatClient
 * is a singleton; second connect with same uuid+token is short-circuited).
 *
 * Returns 0 when:
 *   - the chat WS transport isn't available (mixed content fallback)
 *   - there's no session token / myUuid
 *   - chatClient hasn't reached 'ready' state yet
 *   - the inbox query returned zero threads OR every thread is read
 */
export function useInboxUnreadCount(): number {
  const [myUuid, setMyUuid] = useState<string>("");

  useEffect(() => {
    if (!isChatTransportAvailable()) return;
    const s = readChatSession();
    if (!s) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyUuid(s.myUuid);
    if (chatClient.getState() === "disconnected") {
      chatClient.connect(s.myUuid, s.sessionToken);
    }
  }, []);

  const { threads } = useInbox(myUuid);

  return useMemo(
    () => threads.reduce((n, t) => n + (t.unreadCount ?? 0), 0),
    [threads],
  );
}

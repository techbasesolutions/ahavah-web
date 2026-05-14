"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, PillIndicator } from "@/components/kibo-ui/pill";

import { cn } from "@/lib/utils";
import { chatClient } from "@/lib/chat-client";
import { isChatTransportAvailable } from "@/lib/chat-transport";
import { readChatSession, writeChatSession } from "@/lib/chat-session";
import { useInbox } from "@/lib/use-inbox";
import { apiClient } from "@/lib/api-client";
import type { ChatThread } from "@/lib/chat-types";
import type { Profile } from "@/lib/profile-schema";

import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { StoryAvatar } from "@/components/app/story-avatar";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Cap stagger after the first 7 items so a long chat list doesn't take
// seconds to fully appear (visible window is ~7 rows on a 414×896 viewport).
const staggerDelay = (i: number) => 0.05 + Math.min(i, 6) * 0.05;

type DebugState = "happy" | "loading" | "empty" | "error";

/**
 * Inbox row, enriched from the raw ChatThread with display fields fetched
 * via GET /profile/<uuid>. The thread.id is the peer's bare uuid.
 */
type DisplayThread = ChatThread & {
  name: string;
  age: number;
};

function InboxContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const params = useSearchParams();
  // Optional ?state=loading|empty|error overrides — used by design QA.
  const debugState = params.get("state") as DebugState | null;

  // Wire chat-client connection. /check-otp returns person_uuid: null for
  // fresh onboardees, so users who graduated via /finish-onboarding land
  // here with no `ahavah.my-uuid` in localStorage. Backfill it via /me.
  const [myUuid, setMyUuid] = useState<string>("");
  // Mixed-content gate: HTTPS page + ws:// chat URL = browser refuses
  // to upgrade. Skip the connection attempt and render an honest
  // "Chat ships with the domain launch" banner instead of the timeout
  // spiral. Once chat.ahavah.app gets SSL, NEXT_PUBLIC_CHAT_WS_URL
  // becomes wss:// and this gate flips on automatically.
  const chatAvailable = isChatTransportAvailable();
  useEffect(() => {
    if (!chatAvailable) return;
    const s = readChatSession();
    if (s) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyUuid(s.myUuid);
      chatClient.connect(s.myUuid, s.sessionToken);
      return;
    }
    let cancelled = false;
    void apiClient
      .get<{ person_uuid?: string | null }>("/me")
      .then((me) => {
        if (cancelled) return;
        const uuid = typeof me.person_uuid === "string" ? me.person_uuid : null;
        if (!uuid) return;
        writeChatSession({ myUuid: uuid });
        const s2 = readChatSession();
        if (!s2) return;
        setMyUuid(s2.myUuid);
        chatClient.connect(s2.myUuid, s2.sessionToken);
      })
      .catch(() => {
        // Non-onboarded or 401 — leave myUuid empty; useInbox renders empty.
      });
    return () => {
      cancelled = true;
    };
  }, [chatAvailable]);

  const { threads, state, refresh } = useInbox(myUuid);

  // Fetch display name + age for every peer once. Cached in this component
  // for the lifetime of /inbox; profile photos / online state come from
  // discovery's existing UI (out of scope for this hook).
  const [profiles, setProfiles] = useState<Record<string, Partial<Profile>>>({});
  useEffect(() => {
    const missing = threads.filter((t) => !profiles[t.id]).map((t) => t.id);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map((uuid) =>
        apiClient
          .get<Partial<Profile>>(`/profile/${uuid}`)
          .then((p) => [uuid, p] as const)
          .catch(() => [uuid, {} as Partial<Profile>] as const),
      ),
    ).then((results) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uuid, p] of results) next[uuid] = p;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [threads, profiles]);

  const display: DisplayThread[] = useMemo(
    () =>
      threads.map((t) => ({
        ...t,
        name: profiles[t.id]?.firstName ?? "Person",
        age: profiles[t.id]?.age ?? 0,
      })),
    [threads, profiles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return display;
    return display.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.lastMessage?.body ?? "").toLowerCase().includes(q),
    );
  }, [display, query]);

  const effectiveState: DebugState =
    debugState ??
    (state === "loading"
      ? "loading"
      : state === "error"
      ? "error"
      : display.length === 0
      ? "empty"
      : "happy");

  const body = !chatAvailable ? (
    <ChatComingSoon />
  ) : effectiveState === "loading" ? (
    <InboxLoadingSkeleton />
  ) : effectiveState === "error" ? (
    <InboxErrorState onRetry={refresh} />
  ) : filtered.length === 0 ? (
    effectiveState !== "empty" && query.length > 0 ? (
      <InboxNoSearchResults query={query} />
    ) : (
      <InboxEmptyState />
    )
  ) : (
    <ChatList chats={filtered} />
  );

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center justify-between">
        <PageHeaderTitle>Chat</PageHeaderTitle>
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetTrigger
            render={
              <Button size="circle" tone="elevated" aria-label="Search messages">
                <Search className="text-white" />
              </Button>
            }
          />
          <SheetContent side="top" className="rounded-b-3xl border-white/10 bg-bg-indigo">
            <SheetHeader>
              <SheetTitle>Search messages</SheetTitle>
            </SheetHeader>
            <div className="mt-4 px-1">
              <Input
                autoFocus
                size="lg"
                tone="elevated"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or last message"
                aria-label="Search query"
              />
            </div>
          </SheetContent>
        </Sheet>
      </PageHeader>

      {body}

      <BottomNav />
    </PageShell>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxContent />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// State branches
// ---------------------------------------------------------------------------

function ChatList({ chats }: { chats: DisplayThread[] }) {
  return (
    <ItemGroup className="flex-1 overflow-y-auto px-2 pt-4">
      {chats.map((c, i) => (
        <motion.div
          key={c.id}
          {...fadeUp}
          transition={{ duration: 0.3, delay: staggerDelay(i) }}
          className="contents"
        >
          <Item
            variant="muted"
            render={
              <Link href={`/chat/${c.id}`} prefetch={false} className="rounded-2xl" />
            }
          >
            <ItemMedia>
              <StoryAvatar
                name={c.name}
                ring={c.unreadCount > 0 ? "lime" : "none"}
                size="sm"
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-body text-white">
                {c.name}
                {c.age ? `, ${c.age}` : ""}
              </ItemTitle>
              <ItemDescription
                aria-live={c.unreadCount > 0 ? "polite" : undefined}
                className={cn(
                  "text-meta truncate",
                  c.unreadCount > 0 ? "text-white" : "text-text-secondary",
                )}
              >
                {c.lastMessage?.body ?? "Say hi!"}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {c.unreadCount > 0 ? (
                <Pill variant="lime">{c.unreadCount}</Pill>
              ) : c.box === "inbox" ? (
                <PillIndicator variant="brand" />
              ) : null}
            </ItemActions>
          </Item>
        </motion.div>
      ))}
    </ItemGroup>
  );
}

function ChatComingSoon() {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="contents">
      <EmptyState
        variant="no-messages"
        title="Chat ships with our domain launch"
        description="We're finishing the secure WebSocket setup on chat.ahavah.app. Your matches and message history will be here when chat goes live."
        action={{ label: "Back to discover", href: "/discover" }}
      />
    </motion.div>
  );
}

function InboxLoadingSkeleton() {
  return (
    <ItemGroup className="flex-1 overflow-y-auto px-2 pt-4">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Item key={i} variant="muted" aria-busy="true">
          <ItemMedia>
            <Skeleton className="size-tap-lg shrink-0 rounded-full" />
          </ItemMedia>
          <ItemContent>
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

function InboxEmptyState() {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="contents">
      <EmptyState
        variant="no-messages"
        action={{ label: "Start discovering", href: "/discover" }}
      />
    </motion.div>
  );
}

function InboxNoSearchResults({ query }: { query: string }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="contents">
      <EmptyState
        variant="no-search-results"
        description={`No conversations match "${query}".`}
      />
    </motion.div>
  );
}

function InboxErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="contents">
      <ErrorState
        title="Couldn't load your chats"
        description="Check your connection and try again."
        retry={{ label: "Try again", onClick: onRetry }}
      />
    </motion.div>
  );
}

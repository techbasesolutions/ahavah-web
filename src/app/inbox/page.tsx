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
import { LogoMark } from "@/components/brand/logo-mark";
import { ChatThreadView } from "@/components/app/chat-thread-view";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import { InstallPromptBanner } from "@/components/app/install-prompt-banner";
import { PushOptInBanner } from "@/components/app/push-opt-in-banner";
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
  // True when the prospect-profile fetch has resolved with a real
  // name. Render layer shows a skeleton placeholder while false so
  // "Person" never flashes.
  nameLoaded: boolean;
};

// Exported so /chat/[id]/page.tsx can mount the same desktop split-view
// (Option B per user decision 2026-05-17). `defaultSelectedThreadId`
// takes precedence over the `?thread=<id>` query param — used by
// /chat/[id] which has the thread in its route path.
export function InboxContent({
  defaultSelectedThreadId,
}: {
  defaultSelectedThreadId?: string;
} = {}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const params = useSearchParams();
  // Optional ?state=loading|empty|error overrides — used by design QA.
  const debugState = params.get("state") as DebugState | null;

  // Selected thread for the desktop split-view's right pane.
  // Priority: prop (from /chat/[id] route) > ?thread=<id> query (from
  // /inbox deep-links). Mobile ignores this entirely — mobile /inbox
  // is just the list, /chat/[id] is a separate full-screen route.
  const selectedThreadId =
    defaultSelectedThreadId ?? params.get("thread") ?? null;

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
  //
  // Phase W cutover (2026-05-15): seed from sessionStorage so subsequent
  // /inbox mounts within the same session don't re-flash a skeleton.
  // Names are stable enough that a per-session cache is safe;
  // sessionStorage clears on tab close so a profile-name update lands
  // on next cold start.
  const [profiles, setProfiles] = useState<Record<string, Partial<Profile>>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const cached = sessionStorage.getItem("ahavah:inbox-names");
        return cached
          ? (JSON.parse(cached) as Record<string, Partial<Profile>>)
          : {};
      } catch {
        return {};
      }
    },
  );
  useEffect(() => {
    const missing = threads.filter((t) => !profiles[t.id]).map((t) => t.id);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map((uuid) =>
        apiClient
          // Backend endpoint is /prospect-profile/<uuid>, not /profile/<uuid>.
          // The wrong URL silently 404'd, leaving every inbox row stuck on
          // the "Person" fallback name.
          .get<Record<string, unknown>>(`/prospect-profile/${uuid}`)
          .then((raw): readonly [string, Partial<Profile>] => {
            // Backend ships name / age as snake-case raw fields; map to
            // the Profile shape this component reads.
            const adapted: Partial<Profile> = {
              firstName: typeof raw.name === "string" ? raw.name : undefined,
              age: typeof raw.age === "number" ? raw.age : undefined,
            };
            return [uuid, adapted];
          })
          .catch(() => [uuid, {} as Partial<Profile>] as const),
      ),
    ).then((results) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uuid, p] of results) next[uuid] = p;
        // Persist for subsequent /inbox mounts in the same session.
        // sessionStorage clears on tab close so a profile-name update
        // lands on next cold start; quota errors are non-fatal since
        // in-memory state still works for the current session.
        try {
          sessionStorage.setItem("ahavah:inbox-names", JSON.stringify(next));
        } catch {
          // Quota exceeded — skip the cache write.
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [threads, profiles]);

  const display: DisplayThread[] = useMemo(
    () =>
      threads.map((t) => {
        const peer = profiles[t.id];
        const hasName =
          typeof peer?.firstName === "string" && peer.firstName.length > 0;
        return {
          ...t,
          // Phase W cutover: render layer checks `nameLoaded` to decide
          // skeleton vs. real text so the user never sees a "Person"
          // placeholder. Empty string when name not yet resolved.
          name: hasName ? peer!.firstName! : "",
          age: peer?.age ?? 0,
          nameLoaded: hasName,
        };
      }),
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
    <PageShell desktopShell="sidebar" topBarTitle="Inbox" topBarBack={false} bottomPad="nav">
      {/* ── Mobile layout (hidden at md+) ──────────────────────────────── */}
      <div className="md:hidden flex flex-col flex-1">
        <PageHeader pad="tight" className="flex items-center justify-between">
          <PageHeaderTitle>Chat</PageHeaderTitle>
          <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
            <SheetTrigger
              render={
                <Button
                  size="circle-lg"
                  variant="ghost"
                  aria-label="Search messages"
                  className="bg-(--card) text-(--ink) border border-(--hairline)"
                >
                  <Search className="size-5" />
                </Button>
              }
            />
            <SheetContent
              side="top"
              className="rounded-b-3xl border-(--hairline) bg-(--app)"
            >
              <SheetHeader>
                <SheetTitle className="text-(--ink)">Search messages</SheetTitle>
              </SheetHeader>
              <div className="mt-4 px-1">
                <Input
                  autoFocus
                  size="lg"
                  tone="default"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or last message"
                  aria-label="Search query"
                  className="bg-(--card) border-(--hairline) text-(--ink) placeholder:text-(--ink-3)"
                />
              </div>
            </SheetContent>
          </Sheet>
        </PageHeader>

        {/* Install + push opt-in banners */}
        <div className="flex flex-col gap-2 pt-2">
          <InstallPromptBanner />
          <PushOptInBanner />
        </div>

        {body}

        <BottomNav />
      </div>

      {/* ── Desktop layout (hidden below md) ───────────────────────────── */}
      {/* h-[calc(100dvh-3.5rem)] subtracts the DesktopTopBar (h-14 = 3.5rem).
          Left rail: thread list. Right pane: empty state placeholder (inline
          chat render is out-of-scope for Wave 5 — navigation-based drilldown
          remains the pattern; threads link to /chat/<id>). */}
      {/* Canonical InboxDesktop (desktop.jsx L669-L827 + screens/09-inbox.md):
          380px list rail / 1fr thread pane with a 1px hairline separator
          between. h-[calc(100dvh-3.5rem)] subtracts the DesktopTopBar
          (h-14 = 3.5rem). -m-8 cancels the PageShell md:p-8 padding so
          the inbox fills edge-to-edge per canonical.
          NOTE: inline thread pane (rendering the selected chat inline)
          is a follow-up — surfaced as the /chat/[id] decision (Option A
          redirect to /inbox?thread=N vs Option B inline split-view).
          Until that lands, the right pane is the canonical Ahavah lockup +
          "Pick a conversation" empty state, and clicking a thread
          navigates to /chat/[id]. */}
      <div className="hidden md:grid md:grid-cols-[380px_1fr] md:h-[calc(100dvh-3.5rem)] md:-m-8 md:gap-0">
        {/* Left — thread list rail */}
        <div className="flex flex-col min-h-0 border-r border-(--hairline)">
          {/* Header — "Chat" h1 + search field per canonical. */}
          <div className="shrink-0 px-6 pt-6 pb-3">
            <h2 className="text-h1 text-(--ink) font-extrabold">Chat</h2>
            <Input
              size="md"
              tone="default"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="mt-3 rounded-[14px] bg-(--card) border-(--hairline) text-(--ink) placeholder:text-(--ink-3)"
            />
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto px-2">
            {body}
          </div>
        </div>

        {/* Right — ChatThreadView when selected (Option B per user
            decision 2026-05-17), else LogoMark empty state.
            ChatThreadView's outer is h-full so it fills the parent's
            calc'd height; this column has h-[calc(100dvh-3.5rem)]
            inherited from the grid. */}
        {selectedThreadId ? (
          <div
            className="min-h-0 overflow-hidden"
            style={{ background: "var(--app)" }}
          >
            <ChatThreadView id={selectedThreadId} />
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4"
            style={{ background: "var(--canvas)" }}
          >
            <LogoMark size={56} />
            <p className="text-meta font-medium text-(--ink-2)">
              Pick a conversation
            </p>
          </div>
        )}
      </div>
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
                name={c.nameLoaded ? c.name : "?"}
                ring={c.unreadCount > 0 ? "lime" : "none"}
                size="sm"
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-meta text-(--ink) font-semibold">
                {c.nameLoaded ? (
                  <>
                    {c.name}
                    {c.age ? `, ${c.age}` : ""}
                  </>
                ) : (
                  <span
                    aria-hidden
                    className="inline-block h-4 w-24 animate-pulse rounded bg-foreground/10 align-middle"
                  />
                )}
              </ItemTitle>
              <ItemDescription
                aria-live={c.unreadCount > 0 ? "polite" : undefined}
                className={cn(
                  "text-sm truncate max-w-[240px]",
                  // Canonical (screens/09-inbox.md): unread rows show
                  // last message in --ink + weight 500; read rows in
                  // --ink-2 + weight 400. Theme-aware so both themes
                  // render correctly.
                  c.unreadCount > 0
                    ? "text-(--ink) font-medium"
                    : "text-(--ink-2) font-normal",
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

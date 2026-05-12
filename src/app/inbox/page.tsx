"use client";

import { Suspense, useState } from "react";
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
import { filterChats } from "@/lib/inbox-filter";

import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { StoriesRail } from "@/components/app/stories-rail";
import { StoryAvatar } from "@/components/app/story-avatar";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Cap stagger after the first 7 items so a long chat list doesn't take
// seconds to fully appear (visible window is ~7 rows on a 414×896 viewport).
const staggerDelay = (i: number) => 0.05 + Math.min(i, 6) * 0.05;

// Seed names MUST match SAMPLE_PROFILES (profile-sample.ts) so the chat-header
// avatar → /profile/[id] route lands on a real record. Mismatch = "Profile
// not found" from inbox→chat→profile.
const STORIES = [
  { id: "self",    name: "Add story", isAdd: true,  ring: "none"   as const },
  { id: "adina",   name: "Adina",     isAdd: false, ring: "lime"   as const },
  { id: "rivka",   name: "Rivka",     isAdd: false, ring: "online" as const },
  { id: "esther",  name: "Esther",    isAdd: false, ring: "lime"   as const },
  { id: "tirzah",  name: "Tirzah",    isAdd: false, ring: "none"   as const },
];

const CHATS = [
  { id: "adina",   name: "Adina",   age: 24, msg: "Say hi!",                 unread: 3, state: "count" as const, ring: "lime"   as const },
  { id: "rivka",   name: "Rivka",   age: 31, msg: "Photo",                   unread: 0, state: "dot"   as const, ring: "online" as const },
  { id: "esther",  name: "Esther",  age: 28, msg: "Hey, how are you?",       unread: 0, state: "dot"   as const, ring: "none"   as const },
  { id: "tirzah",  name: "Tirzah",  age: 22, msg: "is typing…",              unread: 1, state: "count" as const, ring: "online" as const },
  { id: "daniel",  name: "Daniel",  age: 32, msg: "Shalom — looking forward.", unread: 0, state: "none"  as const, ring: "none"   as const },
  { id: "yosef",   name: "Yosef",   age: 41, msg: "Sounds good 💜",            unread: 0, state: "none"  as const, ring: "none"   as const },
  { id: "ezekiel", name: "Ezekiel", age: 47, msg: "Thanks for the photos!",   unread: 0, state: "none"  as const, ring: "none"   as const },
];

type State = "happy" | "loading" | "empty" | "error";

function InboxContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const params = useSearchParams();
  const state = (params.get("state") as State | null) ?? "happy";
  const baseChats = state === "empty" ? [] : CHATS;
  const chats = filterChats(baseChats, query);
  const stories = state === "empty" || state === "loading" ? [] : STORIES;

  const body =
    state === "loading" ? (
      <InboxLoadingSkeleton />
    ) : state === "error" ? (
      <InboxErrorState />
    ) : chats.length === 0 ? (
      query.length > 0 ? (
        <InboxNoSearchResults query={query} />
      ) : (
        <InboxEmptyState />
      )
    ) : (
      <ChatList chats={chats} />
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
          <SheetContent side="top" className="border-white/10 bg-bg-indigo">
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

      {/* Stories rail only renders on happy + error (matches the
          "header chrome stays even when empty/error" Stories-app pattern;
          hidden during loading since skeleton covers the whole content).
          Each avatar fades-up with a staggered delay for a calmer entrance
          than a hard pop-in. Reduce-motion respected via globals.css. */}
      {(state === "happy" || state === "error") && stories.length > 0 && (
        <StoriesRail>
          {stories.map((s, i) => (
            <motion.div
              key={s.id}
              {...fadeUp}
              transition={{ duration: 0.3, delay: staggerDelay(i) }}
              className="contents"
            >
              <StoryAvatar
                name={s.name}
                ring={s.ring}
                size="md"
                isAdd={s.isAdd}
                showCaption={s.isAdd}
              />
            </motion.div>
          ))}
        </StoriesRail>
      )}

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

function ChatList({ chats }: { chats: typeof CHATS }) {
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
              <Link
                href={`/chat/${c.id}`}
                prefetch={false}
                className="rounded-2xl"
              />
            }
          >
            <ItemMedia>
              <StoryAvatar name={c.name} ring={c.ring} size="sm" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-body text-white">
                {c.name}, {c.age}
              </ItemTitle>
              {/* aria-live on the description so 'is typing…' / 'sent a photo'
                  status changes get announced. Typing-indicator carries
                  c.state === 'count' + the message text; safer to surface
                  every dynamic message change than only the typing case. */}
              <ItemDescription
                aria-live={c.state !== "none" ? "polite" : undefined}
                className={cn(
                  "text-meta",
                  c.state !== "none" ? "text-white" : "text-text-secondary",
                )}
              >
                {c.msg}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {c.state === "count" && <Pill variant="lime">{c.unread}</Pill>}
              {c.state === "dot" && <PillIndicator variant="brand" />}
            </ItemActions>
          </Item>
        </motion.div>
      ))}
    </ItemGroup>
  );
}

// Loading skeleton — header stays, stories rail + chat list become
// shadcn Skeleton blocks matching the eventual layout's bones (per Phase
// 6 R8: "skeleton matches eventual layout — no element should shift on
// load → loaded transition").
function InboxLoadingSkeleton() {
  // StoriesRail (kit primitive) for the avatar row + ItemGroup/Item shell
  // for the chat list. Skeleton blocks live INSIDE the same ItemMedia /
  // ItemContent slots that the rendered ChatList uses, so the load-to-loaded
  // transition cannot shift any element (R8: "skeleton matches eventual
  // layout's bones").
  return (
    <>
      <StoriesRail aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="size-tap-xl shrink-0 rounded-full" />
        ))}
      </StoriesRail>
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
    </>
  );
}

function InboxEmptyState() {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="contents"
    >
      <EmptyState
        variant="no-messages"
        action={{ label: "Start discovering", href: "/discover" }}
      />
    </motion.div>
  );
}

function InboxNoSearchResults({ query }: { query: string }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="contents"
    >
      <EmptyState
        variant="no-search-results"
        description={`No conversations match "${query}".`}
      />
    </motion.div>
  );
}

function InboxErrorState() {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="contents"
    >
      <ErrorState
        title="Couldn't load your chats"
        description="Check your connection and try again."
        retry={{ label: "Try again", onClick: () => window.location.reload() }}
      />
    </motion.div>
  );
}

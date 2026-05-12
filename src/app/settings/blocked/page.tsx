"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Cap stagger at 6 so a long block list doesn't slow-cascade.
const staggerDelay = (i: number) => 0.05 + Math.min(i, 5) * 0.06;

const SEED_BLOCKED = [
  { id: "joao",   name: "João",   blockedAt: "Yesterday" },
  { id: "amir",   name: "Amir",   blockedAt: "Last week" },
  { id: "isabel", name: "Isabel", blockedAt: "2 weeks ago" },
];

type State = "happy" | "loading" | "empty" | "error";

function BlockedContent() {
  const params = useSearchParams();
  const state = (params.get("state") as State | null) ?? "happy";

  const [users, setUsers] = useState(SEED_BLOCKED);

  const visible = state === "empty" ? [] : users;

  const body =
    state === "loading" ? (
      <BlockedLoading />
    ) : state === "error" ? (
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <ErrorState
          description="We couldn't load your blocked users. Please try again."
          retry={{ label: "Try again", onClick: () => window.location.reload() }}
        />
      </motion.div>
    ) : visible.length === 0 ? (
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <EmptyState
          variant="you-blocked-everyone"
          title="You haven't blocked anyone"
          description="People you block will appear here. They won't be able to see your profile or message you."
        />
      </motion.div>
    ) : (
      <ItemGroup className="gap-1 px-3 pt-4">
        {visible.map((u, i) => (
          <motion.div
            key={u.id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
            className="contents"
          >
            <Item variant="muted">
              <ItemMedia>
                <Avatar size="tap">
                  <AvatarFallback variant="brand">{u.name[0]}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-meta text-white">{u.name}</ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  Blocked {u.blockedAt}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {/* Per-row aria-label so SRs hear "Unblock João" not just
                    repeated "Unblock". Visible button text stays "Unblock". */}
                <Button
                  variant="outlineSubtle"
                  size="tap"
                  aria-label={`Unblock ${u.name}`}
                  onClick={() =>
                    setUsers((prev) => prev.filter((p) => p.id !== u.id))
                  }
                >
                  Unblock
                </Button>
              </ItemActions>
            </Item>
          </motion.div>
        ))}
      </ItemGroup>
    );

  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to settings"
          render={<Link href="/settings" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Blocked users</PageHeaderTitle>
      </PageHeader>

      {body}

      <BottomNav />
    </PageShell>
  );
}

export default function BlockedSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BlockedContent />
    </Suspense>
  );
}

function BlockedLoading() {
  // Skeleton row mirrors the eventual Item shape (ItemMedia / ItemContent
  // / ItemActions) so the load-to-loaded transition does not shift any
  // element. Per Phase 6 R8 ("skeleton matches eventual layout's bones").
  return (
    <ItemGroup className="gap-1 px-3 pt-4">
      {[0, 1, 2].map((i) => (
        <Item key={i} variant="muted" aria-busy="true">
          <ItemMedia>
            <Skeleton className="size-tap shrink-0 rounded-full" />
          </ItemMedia>
          <ItemContent>
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
          </ItemContent>
          <ItemActions>
            <Skeleton className="h-tap w-24 rounded-lg" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}

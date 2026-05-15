"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/app/back-button";
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

import { apiClient } from "@/lib/api-client";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const staggerDelay = (i: number) => 0.05 + Math.min(i, 5) * 0.06;

type BlockedRow = {
  uuid: string;
  name: string;
  blocked_at: string | null; // ISO timestamp
};

type State = "loading" | "happy" | "empty" | "error";

/** Format an ISO timestamp as a relative phrase ("Yesterday", "3 days ago"). */
function relativeBlockedAt(iso: string | null): string {
  if (!iso) return "Recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function BlockedContent() {
  const params = useSearchParams();
  // ?state=loading|empty|error overrides — used by design QA.
  const debugState = params.get("state") as State | null;

  const [users, setUsers] = useState<BlockedRow[]>([]);
  const [state, setState] = useState<State>("loading");
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const rows = await apiClient.get<BlockedRow[]>("/blocked");
      setUsers(rows);
      setState(rows.length === 0 ? "empty" : "happy");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // Initial fetch — refresh() flips loading→happy/empty/error via
    // setState. The lint rule fires generically here, but a one-shot
    // backend fetch on mount IS the canonical effect use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const handleUnblock = async (uuid: string) => {
    if (unblocking) return;
    setUnblocking(uuid);
    // Optimistic — drop immediately, restore on failure.
    const prev = users;
    setUsers((curr) => curr.filter((u) => u.uuid !== uuid));
    try {
      await apiClient.post(`/unskip/by-uuid/${uuid}`, {});
      // Refresh to pick up empty-state transition correctly.
      const remaining = prev.filter((u) => u.uuid !== uuid);
      setState(remaining.length === 0 ? "empty" : "happy");
    } catch {
      setUsers(prev);
    } finally {
      setUnblocking(null);
    }
  };

  const effectiveState: State = debugState ?? state;
  const visible = effectiveState === "empty" ? [] : users;

  const body =
    effectiveState === "loading" ? (
      <BlockedLoading />
    ) : effectiveState === "error" ? (
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-1 flex-col"
      >
        <ErrorState
          description="We couldn't load your blocked users. Please try again."
          retry={{ label: "Try again", onClick: () => void refresh() }}
        />
      </motion.div>
    ) : visible.length === 0 ? (
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-1 flex-col"
      >
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
            key={u.uuid}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
            className="contents"
          >
            <Item variant="muted">
              <ItemMedia>
                <Avatar size="tap">
                  <AvatarFallback variant="brand">{u.name[0] ?? "?"}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-meta text-white">{u.name}</ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  Blocked {relativeBlockedAt(u.blocked_at)}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="outlineSubtle"
                  size="tap"
                  aria-label={`Unblock ${u.name}`}
                  disabled={unblocking === u.uuid}
                  onClick={() => void handleUnblock(u.uuid)}
                >
                  {unblocking === u.uuid ? "…" : "Unblock"}
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
        <BackButton fallback="/settings" label="Back to settings" />
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

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { BottomNav } from "@/components/app/bottom-nav";
import { ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import {
  ViewedYouEmptyState,
  ViewsGroupHead,
  ViewsPremiumLocked,
  VisitorRow,
  YouViewedEmptyState,
  newViewsPill,
} from "@/components/app/views-list";
import { useProfile } from "@/lib/use-profile";
import { useVisitors } from "@/lib/use-visitors";
import { isPremium } from "@/lib/profile-schema";

type Tab = "viewedyou" | "youviewed";

/**
 * /views — Who viewed you (SOT: "Ahavah Who Viewed You" export,
 * 2026-07-19). Two lists over GET /visitors: "Viewed you" (default,
 * grouped New / Earlier, lime new-count pill) and "You viewed" (the
 * member's own browsing trail, flat). Opening the page marks views
 * checked, so the new-count pills clear on the NEXT visit — the
 * current response keeps its is_new flags for this render.
 *
 * Entry point: the Profile management list row. Row tap → the
 * person's profile (?from=views routes the back button here).
 */
export default function ViewsPage() {
  return (
    <Suspense fallback={null}>
      <ViewsPageContent />
    </Suspense>
  );
}

function ViewsPageContent() {
  const searchParams = useSearchParams();
  const initialTab: Tab =
    searchParams.get("tab") === "youviewed" ? "youviewed" : "viewedyou";
  const [tab, setTab] = useState<Tab>(initialTab);
  const { profile } = useProfile();
  const premium = isPremium(profile);
  const {
    state,
    visitedYou,
    youVisited,
    newCount,
    refresh,
    markChecked,
  } = useVisitors();

  // Mark checked ONCE per page visit, only after the data (and its
  // is_new flags) has landed, and only for premium members — a
  // non-premium member never saw the list, so their clock keeps
  // running. Ref guard: state flips happy exactly once per fetch
  // lifecycle, but refresh() would re-trigger otherwise.
  const checkedRef = useRef(false);
  useEffect(() => {
    if (state === "happy" && premium && !checkedRef.current) {
      checkedRef.current = true;
      void markChecked();
    }
  }, [state, premium, markChecked]);

  const tabStrip = (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v === "youviewed" ? "youviewed" : "viewedyou")}
    >
      <TabsList variant="brand" aria-label="Filter views">
        <TabsTrigger value="viewedyou" className="gap-2">
          Viewed you
          {newViewsPill(newCount)}
        </TabsTrigger>
        <TabsTrigger value="youviewed">You viewed</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const newRows = visitedYou.filter((v) => v.is_new);
  const earlierRows = visitedYou.filter((v) => !v.is_new);

  const contentBody =
    state === "loading" ? (
      <ViewsLoadingSkeleton />
    ) : state === "error" ? (
      <ErrorState
        description="We couldn't load your views. Check your connection and try again."
        retry={{ label: "Try again", onClick: () => void refresh() }}
      />
    ) : tab === "viewedyou" ? (
      visitedYou.length === 0 ? (
        <ViewedYouEmptyState />
      ) : !premium ? (
        <ViewsPremiumLocked count={visitedYou.length} rows={visitedYou} />
      ) : (
        <div className="px-5 pt-1 md:max-w-190 md:px-0">
          {newRows.length > 0 ? (
            <>
              <ViewsGroupHead dot>New</ViewsGroupHead>
              {newRows.map((row) => (
                <VisitorRow key={`${row.person_uuid}-${row.time}`} row={row} />
              ))}
            </>
          ) : null}
          {earlierRows.length > 0 ? (
            <>
              <ViewsGroupHead className={newRows.length > 0 ? "pt-5" : undefined}>
                Earlier
              </ViewsGroupHead>
              {earlierRows.map((row) => (
                <VisitorRow key={`${row.person_uuid}-${row.time}`} row={row} />
              ))}
            </>
          ) : null}
        </div>
      )
    ) : youVisited.length === 0 ? (
      <YouViewedEmptyState />
    ) : (
      <div className="px-5 pt-1 md:max-w-190 md:px-0">
        {youVisited.map((row) => (
          <VisitorRow key={`${row.person_uuid}-${row.time}`} row={row} />
        ))}
      </div>
    );

  return (
    <PageShell
      desktopShell="sidebar"
      topBarTitle="Views"
      topBarBack={false}
      topBarActions={tabStrip}
      bottomPad="nav"
    >
      {/* ── Mobile layout (hidden at md+) ─────────────────────────────── */}
      <div className="md:hidden">
        <PageHeader>
          <PageHeaderTitle>Views</PageHeaderTitle>
        </PageHeader>
        <div className="px-5 pt-4">{tabStrip}</div>
        {contentBody}
        <BottomNav />
      </div>

      {/* ── Desktop layout (hidden below md) ──────────────────────────── */}
      {/* Tab strip lives in the top bar; content is the same list at a
          760px column (SOT frame 7 .dcol) with 64px photo tiles. */}
      <div className="hidden md:block">{contentBody}</div>
    </PageShell>
  );
}

// Mirrors the row layout so loading → loaded doesn't shift anything.
function ViewsLoadingSkeleton() {
  return (
    <div className="px-5 pt-4 md:max-w-190 md:px-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3.5 py-3">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5 rounded-md" />
            <Skeleton className="h-3 w-1/4 rounded-md" />
          </div>
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

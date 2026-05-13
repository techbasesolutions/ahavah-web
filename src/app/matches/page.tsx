"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MatchesResponse, MatchRecord } from "@/lib/api-types";
import { photoOrGradient, type PhotoSource } from "@/lib/photo-or-gradient";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Stagger cap so a long matches list doesn't slow-cascade for seconds.
const staggerDelay = (i: number) => 0.05 + Math.min(i, 5) * 0.06;

type LoadState =
  | { kind: "loading" }
  | { kind: "happy"; matches: ReadonlyArray<MatchRecord> }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * /matches — "Liked you" list.
 *
 * Phase W rewire:
 *   - `GET /matches` fetches the real list. Backend may not have shipped
 *     this endpoint yet (Phase W F.1 backlog); on error we surface
 *     ErrorState with retry.
 *   - Empty list → EmptyState 'no-matches' variant.
 *   - Row click → /profile/<partnerId>?from=matches (the back arrow on
 *     /profile reads ?from= and routes home correctly).
 *
 * No `state=loading|empty|error` querystring override here — the page is
 * now driven by the real fetch lifecycle. (The earlier dev-affordance for
 * forcing states via querystring lived in pre-Phase-W code and is dropped.)
 */
export default function MatchesPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const fetchMatches = useMemo(
    () => async () => {
      setState({ kind: "loading" });
      try {
        const res = await apiClient.get<MatchesResponse>("/matches");
        if (res.matches.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "happy", matches: res.matches });
        }
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Couldn't load matches.";
        setState({ kind: "error", message: msg });
      }
    },
    [],
  );

  useEffect(() => {
    // Initial fetch — fetchMatches calls setState inside. The rule warns
    // generically; this is the correct mount-driven pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatches();
  }, [fetchMatches]);

  return (
    <PageShell bottomPad="nav">
      <PageHeader className="flex items-center justify-between">
        <PageHeaderTitle>Liked you</PageHeaderTitle>
        <Button size="circle" tone="elevated" aria-label="Search likes">
          <Search className="text-white" />
        </Button>
      </PageHeader>

      {state.kind === "loading" ? (
        <MatchesLoadingSkeleton />
      ) : state.kind === "error" ? (
        <MatchesErrorState onRetry={() => void fetchMatches()} />
      ) : state.kind === "empty" ? (
        <MatchesEmptyState />
      ) : (
        <MatchesGrid matches={state.matches} />
      )}

      <BottomNav />
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// State branches
// ---------------------------------------------------------------------------

function MatchesGrid({
  matches,
}: {
  matches: ReadonlyArray<MatchRecord>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 px-5 pt-6">
      {matches.map((m, i) => {
        const partner = m.with_profile;
        const partnerName = partner.firstName ?? "Match";
        const partnerAge = partner.age;
        const partnerLocation =
          partner.city && partner.country
            ? `${partner.city}, ${partner.country}`
            : (partner.country ?? "");
        const photoSource: PhotoSource = photoOrGradient(
          { firstName: partnerName, photos: partner.photos },
          0,
        );
        return (
          <motion.div
            key={m.match_id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
          >
            <Link
              href={`/profile/${partner.id}?from=matches`}
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "ghost", size: "block" }),
                "h-auto",
              )}
            >
              <Card tone="flat" size="sm" className="w-full gap-2 p-0">
                <PhotoTile
                  aspect="4/5"
                  radius="lg"
                  surface="none"
                  bg={
                    photoSource.kind === "gradient" ? photoSource.css : undefined
                  }
                >
                  {photoSource.kind === "photo" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoSource.src}
                      alt={`${partnerName}'s photo`}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
                </PhotoTile>
                <CardHeader className="px-0">
                  <CardTitle className="text-body font-semibold leading-tight text-white">
                    {partnerName}
                    {partnerAge ? `, ${partnerAge}` : ""}
                  </CardTitle>
                  {partnerLocation ? (
                    <CardDescription className="flex items-center gap-1 text-caption text-text-secondary">
                      <MapPin className="size-3" />
                      {partnerLocation}
                    </CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

// Loading skeleton — mirrors the 4-cell grid layout so the transition from
// loading → loaded doesn't shift any element.
function MatchesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 px-5 pt-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex w-full flex-col gap-2">
          <Skeleton className="aspect-4/5 w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function MatchesEmptyState() {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
      <EmptyState variant="no-matches" />
    </motion.div>
  );
}

function MatchesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
      <ErrorState
        description="We couldn't load your matches. Check your connection and try again."
        retry={{ label: "Try again", onClick: onRetry }}
      />
    </motion.div>
  );
}

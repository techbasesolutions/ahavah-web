"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { CompatPill } from "@/components/app/compat-pill";
import { useProfile } from "@/lib/use-profile";
import { computeCompatibility } from "@/lib/scoring/compute-compatibility";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Cap stagger after the first 6 cells so a long match list doesn't slow-
// cascade for seconds.
const staggerDelay = (i: number) => 0.05 + Math.min(i, 5) * 0.06;

// IDs match SAMPLE_PROFILES first names (lowercase) so computeCompatibility
// has a real candidate to score against. Picked 4 women so the "Liked you"
// list reads as a typical matches grid for a male viewer; the page
// auto-recovers for female viewers (intent scoring will reflect the
// gender-conditional rules).
const MATCHES_DISPLAY = [
  { id: "esther", name: "Esther", age: 28, dist: "2 km away",   gradient: "linear-gradient(135deg,#FFB088,#7A4A4A)" },
  { id: "adina",  name: "Adina",  age: 24, dist: "1 km away",   gradient: "linear-gradient(135deg,#9F76EA,#3A1F4F)" },
  { id: "rivka",  name: "Rivka",  age: 31, dist: "1.5 km away", gradient: "linear-gradient(135deg,#F9D976,#A87E1E)" },
  { id: "tirzah", name: "Tirzah", age: 22, dist: "3 km away",   gradient: "linear-gradient(135deg,#6CB7FF,#1A1340)" },
];

type State = "happy" | "loading" | "empty" | "error";

function MatchesContent() {
  const params = useSearchParams();
  const state = (params.get("state") as State | null) ?? "happy";
  const { profile: userProfile } = useProfile();

  // Compute compatibility scores for display matches
  const matchesWithCompat = useMemo(() => {
    if (!userProfile) return MATCHES_DISPLAY.map(m => ({ ...m, compatScore: 0 }));
    return MATCHES_DISPLAY.map(match => {
      const sampleProfile = SAMPLE_PROFILES.find(
        p => p.firstName?.toLowerCase() === match.id
      );
      if (!sampleProfile) {
        return { ...match, compatScore: 0 };
      }
      const { score } = computeCompatibility(userProfile, sampleProfile);
      return { ...match, compatScore: score };
    });
  }, [userProfile]);

  const matches = state === "empty" ? [] : matchesWithCompat;

  const body =
    state === "loading" ? (
      <MatchesLoadingSkeleton />
    ) : state === "error" ? (
      <MatchesErrorState />
    ) : matches.length === 0 ? (
      <MatchesEmptyState />
    ) : (
      <MatchesGrid matches={matches} />
    );

  return (
    <PageShell bottomPad="nav">
      <PageHeader className="flex items-center justify-between">
        <PageHeaderTitle>Liked you</PageHeaderTitle>
        <Button size="circle" tone="elevated" aria-label="Search likes">
          <Search className="text-white" />
        </Button>
      </PageHeader>

      {body}

      <BottomNav />
    </PageShell>
  );
}

export default function MatchesPage() {
  // Suspense wraps useSearchParams per Next 16 client-component pattern.
  return (
    <Suspense fallback={null}>
      <MatchesContent />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// State branches
// ---------------------------------------------------------------------------

function MatchesGrid({ matches }: { matches: Array<(typeof MATCHES_DISPLAY)[number] & { compatScore: number }> }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-5 pt-6">
      {matches.map((m, i) => (
        <motion.div
          key={m.id}
          {...fadeUp}
          transition={{ duration: 0.3, delay: staggerDelay(i) }}
        >
          {/* Tap goes to the match's profile (mirrors /discover → profile).
              Profile is the natural review surface; the Message button on
              /profile/[uuid] then opens /chat/[id] for the conversation. */}
          <Link
            href={`/profile/${m.id}`}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "ghost", size: "block" }),
              "h-auto",
            )}
          >
            <Card tone="flat" size="sm" className="w-full gap-2 p-0">
              <PhotoTile aspect="4/5" radius="lg" surface="none" bg={m.gradient}>
                <div className="absolute bottom-4 left-4">
                  <CompatPill score={m.compatScore} size="sm" />
                </div>
              </PhotoTile>
              <CardHeader className="px-0">
                <CardTitle className="text-body font-semibold leading-tight text-white">
                  {m.name}, {m.age}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-caption text-text-secondary">
                  <MapPin className="size-3" />
                  {m.dist}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// Loading skeleton — mirrors the 4-cell grid layout so the transition from
// loading → loaded doesn't shift any element. Each cell: aspect-4/5 photo
// skeleton + 2 text-row skeletons. shadcn Skeleton primitive only.
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

function MatchesErrorState() {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
      <ErrorState
        description="We couldn't load your matches. Check your connection and try again."
        retry={{ label: "Try again", onClick: () => window.location.reload() }}
      />
    </motion.div>
  );
}

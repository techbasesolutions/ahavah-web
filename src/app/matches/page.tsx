"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Lock, MapPin, MessageCircle, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/kibo-ui/pill";

import { cn } from "@/lib/utils";

import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState, ErrorState } from "@/components/app/empty-state";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";
import { PushOptInBanner } from "@/components/app/push-opt-in-banner";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  IncomingLikesResponse,
  LikeRecord,
  MatchesResponse,
  MatchRecord,
} from "@/lib/api-types";
import { photoOrGradient, photosFromUuids, type PhotoSource } from "@/lib/photo-or-gradient";
import { isOnline } from "@/lib/last-seen";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Stagger cap so a long matches list doesn't slow-cascade for seconds.
const staggerDelay = (i: number) => 0.05 + Math.min(i, 5) * 0.06;

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "happy"; items: ReadonlyArray<T> }
  | { kind: "empty" }
  // Premium gate hit on /likes/incoming — viewer is non-premium but
  // people DO like them. Render the count + paywall CTA + blurred
  // placeholder grid (silhouettes + lock icon over each card). Only
  // populated for the LikesGrid tab; matches never goes through this.
  | { kind: "locked"; count: number }
  | { kind: "error"; message: string };

type Tab = "matches" | "likes";

/**
 * /matches — Your mutual matches list.
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
  // Next 16 requires useSearchParams to live inside a Suspense boundary.
  // See /app/match/page.tsx for the same pattern.
  return (
    <Suspense fallback={null}>
      <MatchesPageContent />
    </Suspense>
  );
}

function MatchesPageContent() {
  const searchParams = useSearchParams();
  // ?tab=likes lets /profile/[uuid]?from=likes back-button land users
  // on the right tab. Default Matches.
  const initialTab: Tab = searchParams.get("tab") === "likes" ? "likes" : "matches";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [matchesState, setMatchesState] = useState<LoadState<MatchRecord>>({
    kind: "loading",
  });
  const [likesState, setLikesState] = useState<LoadState<LikeRecord>>({
    kind: "loading",
  });

  const fetchMatches = useMemo(
    () => async () => {
      setMatchesState({ kind: "loading" });
      try {
        const res = await apiClient.get<MatchesResponse>("/matches");
        setMatchesState(
          res.matches.length === 0
            ? { kind: "empty" }
            : { kind: "happy", items: res.matches },
        );
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Couldn't load matches.";
        setMatchesState({ kind: "error", message: msg });
      }
    },
    [],
  );

  const fetchLikes = useMemo(
    () => async () => {
      setLikesState({ kind: "loading" });
      try {
        const res = await apiClient.get<IncomingLikesResponse>(
          "/likes/incoming",
        );
        // Tolerate older deploys that returned just `{likes: [...]}`
        // — derive count from likes.length and assume premium=true so
        // the grid still renders. Once every droplet has the new
        // backend (post Phase W cutover), this fallback can go.
        const count =
          typeof res.count === "number" ? res.count : res.likes.length;
        const premium =
          typeof res.premium === "boolean" ? res.premium : true;
        if (count === 0) {
          setLikesState({ kind: "empty" });
        } else if (!premium) {
          setLikesState({ kind: "locked", count });
        } else {
          setLikesState({ kind: "happy", items: res.likes });
        }
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Couldn't load likes.";
        setLikesState({ kind: "error", message: msg });
      }
    },
    [],
  );

  // Fetch BOTH lists on mount so the tab toggle's badge count is
  // correct from the first paint. Empty / error states are handled
  // per-tab below. The setState-in-effect lint warns generically here
  // — these are mount-driven async fetches that own their own state
  // transitions, the canonical pattern in this codebase (see /matches'
  // earlier single-fetch + /map's match-uuid prefetch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatches();
     
    void fetchLikes();
  }, [fetchMatches, fetchLikes]);

  const likesCount =
    likesState.kind === "happy"
      ? likesState.items.length
      : likesState.kind === "locked"
        ? likesState.count
        : 0;

  const activeState = tab === "matches" ? matchesState : likesState;
  const onRetry = tab === "matches" ? fetchMatches : fetchLikes;

  return (
    <PageShell bottomPad="nav">
      <PageHeader>
        <PageHeaderTitle>Matches</PageHeaderTitle>
      </PageHeader>

      {/* Tab toggle — shows lime badge with the incoming-likes count
          when there are any. Tap routes the same page through a
          different fetch + grid. */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <TabButton active={tab === "matches"} onClick={() => setTab("matches")}>
          Matches
        </TabButton>
        <TabButton active={tab === "likes"} onClick={() => setTab("likes")}>
          <span className="flex items-center gap-2">
            Liked you
            {likesCount > 0 ? (
              <Pill variant="lime" size="sm">
                {likesCount > 99 ? "99+" : likesCount}
              </Pill>
            ) : null}
          </span>
        </TabButton>
      </div>

      {/* Push opt-in — only renders when the user has at least one match
          (most natural moment to ask), browser supports push, and the
          user hasn't already enabled or dismissed within 14 days. */}
      {tab === "matches" &&
      matchesState.kind === "happy" &&
      matchesState.items.length > 0 ? (
        <div className="pt-3">
          <PushOptInBanner />
        </div>
      ) : null}

      {activeState.kind === "loading" ? (
        <MatchesLoadingSkeleton />
      ) : activeState.kind === "error" ? (
        <MatchesErrorState onRetry={() => void onRetry()} />
      ) : activeState.kind === "empty" ? (
        tab === "matches" ? <MatchesEmptyState /> : <LikesEmptyState />
      ) : activeState.kind === "locked" ? (
        // Premium gate hit on the Liked-you tab. Render the locked
        // surface — count + blurred placeholder grid + paywall CTA.
        // Only reachable when tab === "likes" since matches never
        // sets kind: "locked".
        <LikesLockedState count={activeState.count} />
      ) : tab === "matches" ? (
        <MatchesGrid matches={activeState.items as ReadonlyArray<MatchRecord>} />
      ) : (
        <LikesGrid likes={activeState.items as ReadonlyArray<LikeRecord>} />
      )}

      <BottomNav />
    </PageShell>
  );
}

// Local tab-pill primitive — matches the lavender/lime palette without
// pulling in the kit ToggleGroup (which doesn't compose well with the
// active-with-badge pattern we want here).
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // The jsx-a11y/aria-proptypes rule rejects expression values for
      // aria-pressed even when both branches are literal "true"/"false".
      // The runtime value is correct; suppress the lint just here.
       
      aria-pressed={active ? "true" : "false"}
      className={cn(
        "h-tap rounded-full border px-4 text-meta font-semibold transition-colors",
        active
          ? "border-lime bg-lime text-black"
          : "border-white/15 bg-transparent text-text-secondary hover:bg-white/5",
      )}
    >
      {children}
    </button>
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
        // Backend ships peer photos as photo_uuids; map to PhotoRecord[]
        // so photoOrGradient finds a cdn_url instead of falling through
        // to the gradient stamp.
        const partnerPhotos =
          partner.photos && partner.photos.length > 0
            ? partner.photos
            : photosFromUuids(
                (partner as { photo_uuids?: unknown }).photo_uuids,
              );
        const photoSource: PhotoSource = photoOrGradient(
          { firstName: partnerName, photos: partnerPhotos },
          0,
        );
        const online = isOnline(partner.seconds_since_last_online);
        return (
          <motion.div
            key={m.match_id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
          >
            {/* Card structure (per user feedback 2026-05-15): tapping
                the PHOTO opens the profile, a separate Message button
                opens chat. Both actions are visible without nesting
                links (which is invalid HTML). The kit's PhotoTile
                provides the rounded image; Card wraps the actions
                row. Online indicator lives inline next to the name —
                NOT as a corner dot, where it conflicted with the
                rounded-2xl corner curve. */}
            <Card tone="flat" size="sm" className="w-full gap-2 p-0">
              <Link
                href={`/profile/${partner.id}?from=matches`}
                prefetch={false}
                aria-label={`View ${partnerName}'s profile`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "block" }),
                  "h-auto p-0",
                )}
              >
                <PhotoTile
                  aspect="4/5"
                  radius="lg"
                  surface="none"
                  bg={
                    photoSource.kind === "gradient" ? photoSource.css : undefined
                  }
                  className="w-full"
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
              </Link>
              <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2 text-body font-semibold leading-tight text-white">
                  <span className="truncate">
                    {partnerName}
                    {partnerAge ? `, ${partnerAge}` : ""}
                  </span>
                  {/* Online indicator inline — never clipped by the
                      photo's rounded corner. Lime dot + sr-only label
                      satisfies WCAG (color is not the sole signal). */}
                  {online ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <span
                        aria-hidden
                        className="inline-block size-2 rounded-full bg-lime"
                      />
                      <span className="sr-only">Online now</span>
                    </span>
                  ) : null}
                </CardTitle>
                {partnerLocation ? (
                  <CardDescription className="flex items-center gap-1 text-caption text-text-secondary">
                    <MapPin className="size-3" aria-hidden />
                    <span className="truncate">{partnerLocation}</span>
                  </CardDescription>
                ) : null}
              </CardHeader>
              {/* Single primary CTA — Message. Two text pills don't fit
                  the 179px-wide grid card at 414px viewport
                  ((414 - 40 page padding - 16 gap) / 2 = 179px); the
                  earlier two-pill design clipped "Message" past the
                  card edge. Profile is reachable by tapping the photo
                  above, which is the discoverable industry pattern
                  (Bumble/Hinge/Tinder all use photo-tap → profile in
                  matches grids). */}
              <Link
                href={`/chat/${partner.id}`}
                prefetch={false}
                className={cn(
                  buttonVariants({ variant: "default", size: "tap" }),
                  "w-full rounded-full",
                )}
              >
                <MessageCircle aria-hidden />
                Message
              </Link>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// LikesGrid — 'Liked you' tab. Same card layout as MatchesGrid but tap
// routes to /profile/<peer>?from=likes (so the user can like back to
// CREATE the match) instead of going straight to chat.
function LikesGrid({ likes }: { likes: ReadonlyArray<LikeRecord> }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-5 pt-6">
      {likes.map((l, i) => {
        const liker = l.with_profile;
        const likerName = liker.firstName ?? "Someone";
        const likerAge = liker.age;
        const likerLocation =
          liker.city && liker.country
            ? `${liker.city}, ${liker.country}`
            : (liker.country ?? "");
        const likerPhotos =
          liker.photos && liker.photos.length > 0
            ? liker.photos
            : photosFromUuids(
                (liker as { photo_uuids?: unknown }).photo_uuids,
              );
        const photoSource: PhotoSource = photoOrGradient(
          { firstName: likerName, photos: likerPhotos },
          0,
        );
        return (
          <motion.div
            key={liker.id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
          >
            <Link
              href={`/profile/${liker.id}?from=likes`}
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
                      alt={`${likerName}'s photo`}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
                </PhotoTile>
                <CardHeader className="px-0">
                  <CardTitle className="flex items-center gap-2 text-body font-semibold leading-tight text-white">
                    <span className="truncate">
                      {likerName}
                      {likerAge ? `, ${likerAge}` : ""}
                    </span>
                    {/* Online indicator inline (consistent with
                        MatchesGrid) — never clipped by photo's
                        rounded corner. */}
                    {isOnline(liker.seconds_since_last_online) ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <span
                          aria-hidden
                          className="inline-block size-2 rounded-full bg-lime"
                        />
                        <span className="sr-only">Online now</span>
                      </span>
                    ) : null}
                  </CardTitle>
                  {likerLocation ? (
                    <CardDescription className="flex items-center gap-1 text-caption text-text-secondary">
                      <MapPin className="size-3" aria-hidden />
                      <span className="truncate">{likerLocation}</span>
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

function LikesEmptyState() {
  return (
    <EmptyState
      variant="no-matches"
      title="No likes yet"
      description="When someone likes you, they'll show up here so you can decide whether to like them back."
    />
  );
}

/**
 * Premium-gate surface for the 'Liked you' tab. Renders when the
 * viewer has incoming likes but lacks the 'premium' entitlement.
 * Shows the COUNT (proven by the server, not derivable client-side
 * because /likes/incoming returns an empty array for non-premium
 * viewers) + a blurred placeholder grid + an Upgrade CTA → /paywall.
 *
 * Design rules applied:
 *   - Single primary CTA (h-tap, lime brand). Mobile-responsive §1.
 *   - Color is not the only signal — Lock icon + "Premium" label
 *     accompany the lime accents. Accessibility skill §3.
 *   - Tokens only (lime, lavender, bg-elevated, text-secondary).
 *   - 8px-grid spacing (gap-4 / gap-6 / px-5).
 */
function LikesLockedState({ count }: { count: number }) {
  const headline =
    count === 1
      ? "1 person likes you"
      : `${count} people like you`;
  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-bg-elevated px-6 py-8 text-center">
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime"
        >
          <Sparkles className="size-6" />
        </div>
        <h2 className="text-h3 text-white">{headline}</h2>
        <p className="max-w-xs text-body text-text-secondary">
          See exactly who and what they liked about your profile with Ahavah Premium.
        </p>
        <Link
          href="/paywall"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "default", size: "tap" }),
            "mt-2 w-full max-w-xs rounded-full",
          )}
        >
          <Sparkles aria-hidden />
          Upgrade to see
        </Link>
      </div>
      {/* Blurred placeholder grid — mirrors the real LikesGrid layout
          so the unlock-then-reveal transition has zero visual jump.
          Lock icon is the COLOR-INDEPENDENT signal (per WCAG 1.4.1). */}
      <div className="grid grid-cols-2 gap-4" aria-hidden>
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="flex w-full flex-col gap-2">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-bg-elevated">
              <div className="absolute inset-0 bg-linear-to-br from-lavender/30 to-pink/20 blur-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="size-8 text-white/70" />
              </div>
            </div>
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
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
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex flex-1 flex-col"
    >
      <EmptyState variant="no-matches" />
    </motion.div>
  );
}

function MatchesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex flex-1 flex-col"
    >
      <ErrorState
        description="We couldn't load your matches. Check your connection and try again."
        retry={{ label: "Try again", onClick: onRetry }}
      />
    </motion.div>
  );
}

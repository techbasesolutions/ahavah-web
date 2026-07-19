"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  Undo2,
} from "lucide-react";

import { TokenActionIcon } from "@/lib/icon-map";

// Super-like marker uses the canonical Star (icon-map.ts). Sparkles
// stays for the separate Premium-upgrade card below.
const SuperLikeIcon = TokenActionIcon.SuperLike;
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { InstallPromptBanner } from "@/components/app/install-prompt-banner";
import { CityNudgeBanner } from "@/components/app/city-nudge-banner";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";
import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import type {
  IncomingLikesResponse,
  LikeRecord,
  MatchesResponse,
  MatchRecord,
  OutgoingLikeRecord,
  OutgoingLikesResponse,
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

type Tab = "matches" | "likes" | "youliked";

/**
 * Relative caption for the You liked card, per the SOT export
 * ("Liked yesterday", "Super-liked 2 days ago", "Liked just now").
 * Backend ships liked_at as Postgres text ("2026-07-19 09:43:55+00");
 * normalize to ISO before parsing. Unparseable → empty caption.
 */
function likedCaption(likedAt: string, isSuper?: boolean): string {
  const iso = likedAt.replace(" ", "T").replace(/\+00$/, "Z");
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const when =
    mins < 60
      ? "just now"
      : hours < 24
        ? `${hours} ${hours === 1 ? "hour" : "hours"} ago`
        : days === 1
          ? "yesterday"
          : days < 7
            ? `${days} days ago`
            : days < 30
              ? `${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? "week" : "weeks"} ago`
              : `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? "month" : "months"} ago`;
  return `${isSuper ? "Super-liked" : "Liked"} ${when}`;
}

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
  // ?tab=likes / ?tab=youliked let /profile/[uuid]?from=... back-buttons
  // land users on the right tab. Default Matches.
  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam === "likes" ? "likes" : tabParam === "youliked" ? "youliked" : "matches";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [matchesState, setMatchesState] = useState<LoadState<MatchRecord>>({
    kind: "loading",
  });
  const [likesState, setLikesState] = useState<LoadState<LikeRecord>>({
    kind: "loading",
  });
  const [outgoingState, setOutgoingState] = useState<LoadState<OutgoingLikeRecord>>({
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
        } else if (!premium && res.likes.length === 0) {
          // Non-premium + nothing revealed yet → paywall surface.
          setLikesState({ kind: "locked", count });
        } else {
          // Premium OR non-premium with at least one revealed liker.
          // Phase 4 (2026-05-16): non-premium users land here once they
          // POST /tokens/reveal an entry; the revealed liker(s) come
          // back in `likes[]` and render through LikesGrid.
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

  // 'You liked' tab (2026-07-19): outgoing likes. No premium gate and
  // no tab badge (design note 1: lime pills mean "act on this";
  // outgoing likes need no action).
  const fetchOutgoing = useMemo(
    () => async () => {
      setOutgoingState({ kind: "loading" });
      try {
        const res = await apiClient.get<OutgoingLikesResponse>(
          "/likes/outgoing",
        );
        setOutgoingState(
          res.likes.length === 0
            ? { kind: "empty" }
            : { kind: "happy", items: res.likes },
        );
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Couldn't load your likes.";
        setOutgoingState({ kind: "error", message: msg });
      }
    },
    [],
  );

  // Fetch ALL lists on mount so the tab toggle's badge count is
  // correct from the first paint. Empty / error states are handled
  // per-tab below. The setState-in-effect lint warns generically here
  // — these are mount-driven async fetches that own their own state
  // transitions, the canonical pattern in this codebase (see /matches'
  // earlier single-fetch + /map's match-uuid prefetch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatches();

    void fetchLikes();
    void fetchOutgoing();
  }, [fetchMatches, fetchLikes, fetchOutgoing]);

  const likesCount =
    likesState.kind === "happy"
      ? likesState.items.length
      : likesState.kind === "locked"
        ? likesState.count
        : 0;

  const activeState =
    tab === "matches"
      ? matchesState
      : tab === "likes"
        ? likesState
        : outgoingState;
  const onRetry =
    tab === "matches"
      ? fetchMatches
      : tab === "likes"
        ? fetchLikes
        : fetchOutgoing;

  // Phase 4 monetization-tokens (2026-05-16): tapping a blurred liker
  // card opens TokenSpendSheet → POST /tokens/reveal → refetch likes.
  // `revealing` carries the chosen liker's id+name for the sheet copy.
  // Plan substitution: spec calls window.location.reload() after a
  // successful reveal; this page owns the likes fetch via `fetchLikes`,
  // so we refresh in-place instead (no full nav, preserves tab state).
  const [revealing, setRevealing] = useState<{ id: string; name: string } | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const {
    state: balanceState,
    balance,
    refresh: refreshBalance,
  } = useTokenBalance();
  // `null` while loading — see TokenSpendSheet.computeSpendState.
  const balanceForSheet = balanceState === "happy" ? balance : null;

  const confirmReveal = async () => {
    if (!revealing) return;
    setRevealBusy(true);
    try {
      await apiClient.post("/tokens/reveal", { liker_id: revealing.id });
      await refreshBalance();
      await fetchLikes();
      toast.success(`Revealed. ${revealing.name} added to your matches.`);
    } catch (e) {
      // 402 surfaces via the sheet's own insufficient-balance branch
      // once refreshBalance fires.
      if (e instanceof ApiError && e.status === 402) {
        await refreshBalance();
        toast.error("Not enough tokens. Top up to reveal this like.");
      } else {
        const status = e instanceof ApiError ? e.status : null;
        const msg =
          status === 404
            ? "Reveal isn't available yet."
            : status === 401
              ? "Sign in to reveal this like."
              : status === 503
                ? "Reveal is temporarily unavailable. Try again shortly."
                : "Couldn't reveal. Try again.";
        toast.error(msg);
        console.error("reveal failed:", e);
      }
    } finally {
      setRevealBusy(false);
      setRevealing(null);
    }
  };

  // 'You liked' take-back (SOT overflow menu): withdraw an outgoing
  // like; the person returns to the caller's discover deck. No token
  // refund for super-likes — the spend already happened.
  const handleTakeBack = async (id: string, name: string) => {
    try {
      await apiClient.post("/likes/outgoing/take-back", { profile_uuid: id });
      toast.success(`Like taken back. ${name} will return to your deck.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast.error("Nothing to take back.");
      } else {
        toast.error("Couldn't take back the like. Try again.");
        console.error("take-back failed:", e);
      }
    } finally {
      void fetchOutgoing();
    }
  };

  // Tab strip — shared between mobile and desktop (rendered in different
  // positions but identical markup so tab state stays in sync).
  // Per the SOT design notes: NO count pill on 'You liked' — lime pills
  // mean "act on this" and outgoing likes need no action.
  const tabStrip = (
    <Tabs
      value={tab}
      onValueChange={(v) =>
        setTab(v === "likes" ? "likes" : v === "youliked" ? "youliked" : "matches")
      }
    >
      <TabsList variant="brand" aria-label="Filter matches">
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="likes" className="gap-2">
          Liked you
          {likesCount > 0 ? (
            <Pill variant="lime" size="sm">
              {likesCount > 99 ? "99+" : likesCount}
            </Pill>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="youliked">You liked</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // Content body — state branches are the same for both viewports; only
  // the grid column count differs (handled inside MatchesGrid/LikesGrid).
  const contentBody =
    activeState.kind === "loading" ? (
      <MatchesLoadingSkeleton />
    ) : activeState.kind === "error" ? (
      <MatchesErrorState onRetry={() => void onRetry()} />
    ) : activeState.kind === "empty" ? (
      tab === "matches" ? (
        <MatchesEmptyState />
      ) : tab === "likes" ? (
        <LikesEmptyState />
      ) : (
        <YouLikedEmptyState />
      )
    ) : activeState.kind === "locked" ? (
      <LikesLockedState count={activeState.count} />
    ) : tab === "matches" ? (
      <MatchesGrid matches={activeState.items as ReadonlyArray<MatchRecord>} />
    ) : tab === "likes" ? (
      <LikesGrid
        likes={activeState.items as ReadonlyArray<LikeRecord>}
        onRevealRequest={(id, name) => setRevealing({ id, name })}
      />
    ) : (
      <YouLikedGrid
        likes={activeState.items as ReadonlyArray<OutgoingLikeRecord>}
        onTakeBack={handleTakeBack}
      />
    );

  return (
    <PageShell
      desktopShell="sidebar"
      topBarTitle="Matches"
      topBarBack={false}
      topBarActions={tabStrip}
      bottomPad="nav"
    >
      {/* ── Mobile layout (hidden at md+) ──────────────────────────────── */}
      <div className="md:hidden">
        <PageHeader>
          <PageHeaderTitle>Matches</PageHeaderTitle>
        </PageHeader>

        {/* Tab strip below mobile page header */}
        <div className="px-5 pt-4">
          {tabStrip}
        </div>

        {/* Install + push opt-in — mobile only */}
        <div className="flex flex-col gap-2 pt-3">
          <InstallPromptBanner />
          <PushOptInBanner />
          <CityNudgeBanner />
        </div>

        {contentBody}

        <BottomNav />
      </div>

      {/* ── Desktop layout (hidden below md) ───────────────────────────── */}
      {/* Tab strip lives in the top bar actions slot (topBarActions prop).
          Content is a 2/3/4-column responsive grid. */}
      <div className="hidden md:block">
        {contentBody}
      </div>

      {/* Phase 4 monetization-tokens (2026-05-16): single sheet
          instance reused across every blurred-card tap. */}
      <TokenSpendSheet
        open={revealing !== null}
        onOpenChange={(o) => {
          if (!o) setRevealing(null);
        }}
        title={`Reveal ${revealing?.name ?? "this person"}?`}
        description="Costs 1 token. Their photo will be unblurred for you."
        cost={1}
        currentBalance={balanceForSheet}
        onConfirm={confirmReveal}
        busy={revealBusy}
      />
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
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-5 pt-6 md:px-0 md:pt-0">
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
            // Canonical match card (per desktop.jsx MatchesDesktop L1499–L1557
            // and dark-desktop-html/08-matches.html): flex-col, gap-2.5,
            // photo (4/5 rounded-18) wrapped in Link → profile, name+dot
            // row, location row, SINGLE Message button. View profile is
            // NOT a button — photo-tap is the discoverable nav. See
            // feedback-match-card-actions memory (2026-05-17 final).
            className="flex flex-col gap-2.5"
          >
            <Link
              href={`/profile/${partner.id}?from=matches`}
              prefetch={false}
              aria-label={`View ${partnerName}'s profile`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "block" }),
                "h-auto p-0 rounded-[18px] overflow-hidden",
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
            <div className="flex items-center gap-1.5 text-body-s text-(--ink)">
              <span className="truncate">
                {partnerName}
                {partnerAge ? `, ${partnerAge}` : ""}
              </span>
              {online ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full bg-lime"
                  />
                  <span className="sr-only">Online now</span>
                </>
              ) : null}
            </div>
            {partnerLocation ? (
              <div className="flex items-center gap-1 text-caption text-(--ink-2) -mt-1">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{partnerLocation}</span>
              </div>
            ) : null}
            {/* Canonical action row — SINGLE Message button per design.
                Photo-tap above is the profile nav. */}
            <Button
              tone="cta"
              size="sm"
              render={<Link href={`/chat/${partner.id}`} prefetch={false} />}
              className="mt-0.5 h-10 w-full rounded-full text-meta font-semibold gap-1.5"
              aria-label={`Message ${partnerName}`}
            >
              <MessageCircle className="size-4" aria-hidden />
              Message
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

// LikesGrid — 'Liked you' tab. Same card layout as MatchesGrid but tap
// routes to /profile/<peer>?from=likes (so the user can like back to
// CREATE the match) instead of going straight to chat.
//
// Phase 4 monetization-tokens (2026-05-16): each `LikeRecord` may
// arrive with `hidden: true` for non-premium viewers who haven't
// revealed that liker yet. Hidden cards render as a tappable blurred
// silhouette + Lock icon and call `onRevealRequest(id, name)` —
// the parent owns the TokenSpendSheet and the POST /tokens/reveal
// round-trip + refetch.
function LikesGrid({
  likes,
  onRevealRequest,
}: {
  likes: ReadonlyArray<LikeRecord>;
  onRevealRequest: (id: string, name: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-5 pt-6 md:px-0 md:pt-0">
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

        // Hidden / unrevealed cards: render a Lock placeholder over a
        // brand-gradient tile, wrapped in a <button> that opens the
        // TokenSpendSheet. We do NOT have name/age/photo to show here.
        if (l.hidden) {
          return (
            <motion.div
              key={liker.id}
              {...fadeUp}
              transition={{ duration: 0.3, delay: staggerDelay(i) }}
              // Phase 6: lime ring + Super pill ALSO apply to hidden
              // cards — surfacing is_super even before reveal helps
              // users prioritize which token spend matters most.
              className={cn(
                "relative",
                l.is_super &&
                  "rounded-2xl ring-2 ring-lime ring-offset-2 ring-offset-bg-canvas",
              )}
            >
              {l.is_super ? (
                <Pill
                  variant="lime"
                  size="sm"
                  className="absolute top-2 left-2 z-10 gap-1"
                >
                  <SuperLikeIcon className="size-3" aria-hidden fill="currentColor" /> Super
                </Pill>
              ) : null}
              <button
                type="button"
                onClick={() => onRevealRequest(liker.id, "this person")}
                aria-label="Reveal liker for 1 token"
                className={cn(
                  "block w-full rounded-2xl outline-none",
                  "focus-visible:ring-2 focus-visible:ring-lavender",
                  "transition-transform active:scale-95",
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-(--card)">
                    <div className="absolute inset-0 bg-linear-to-br from-lavender/30 to-pink/20 blur-xl" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="size-8 text-(--ink)/70" />
                    </div>
                  </div>
                  <span className="truncate text-body font-semibold leading-tight text-(--ink) text-left">
                    Hidden
                  </span>
                  <span className="text-caption text-(--ink-2) text-left">
                    Tap to reveal · 1 token
                  </span>
                </div>
              </button>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={liker.id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
            // Phase 6: lime ring + "Super" pill when this liker spent
            // 2 tokens to super-like. Ring on the outer wrapper, pill
            // pinned to the top-left of the card (absolute, z-10).
            className={cn(
              "relative flex flex-col gap-2.5",
              l.is_super &&
                "rounded-2xl ring-2 ring-lime ring-offset-2 ring-offset-(--canvas)",
            )}
          >
            {l.is_super ? (
              <Pill
                variant="lime"
                size="sm"
                className="absolute top-2 left-2 z-10 gap-1"
              >
                <SuperLikeIcon className="size-3" aria-hidden fill="currentColor" /> Super
              </Pill>
            ) : null}
            {/* Card structure mirrors MatchesGrid: photo-link → profile,
                separate action buttons below. Mirrors MatchesGrid
                compact composition per canonical (desktop.jsx
                MatchesDesktop L1499–L1557). */}
            <Link
              href={`/profile/${liker.id}?from=likes`}
              prefetch={false}
              aria-label={`View ${likerName}'s profile`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "block" }),
                "h-auto p-0 rounded-[18px] overflow-hidden",
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
                    alt={`${likerName}'s photo`}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </PhotoTile>
            </Link>
            {/* Name + online dot — inline, theme-aware. */}
            <div className="flex items-center gap-1.5 text-body-s text-(--ink)">
              <span className="truncate">
                {likerName}
                {likerAge ? `, ${likerAge}` : ""}
              </span>
              {isOnline(liker.seconds_since_last_online) ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full bg-lime"
                  />
                  <span className="sr-only">Online now</span>
                </>
              ) : null}
            </div>
            {/* Location row. */}
            {likerLocation ? (
              <div className="flex items-center gap-1 text-caption text-(--ink-2) -mt-1">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{likerLocation}</span>
              </div>
            ) : null}
            {/* No action button on LikesGrid cards per user direction
                (2026-05-17): pre-match likers cannot be messaged
                (backend gates), and View profile is reachable by
                tapping the photo above. See feedback-match-card-actions
                memory. To like back, user opens the profile and
                actions from there. */}
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

// YouLikedGrid — 'You liked' tab (2026-07-19, SOT: "Ahavah You Liked Tab"
// export). Same card family as MatchesGrid/LikesGrid: photo-link →
// profile, name + online dot, location, NO message button. Additions per
// the SOT: a muted "Liked N days ago" caption under the metadata (lime
// "Super-liked ..." when is_super), the lime ring + Super pill reused
// from LikesGrid, and a quiet glass overflow button top-right of the
// photo opening a two-item menu: View profile / Take back like.
function YouLikedGrid({
  likes,
  onTakeBack,
}: {
  likes: ReadonlyArray<OutgoingLikeRecord>;
  onTakeBack: (id: string, name: string) => void;
}) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-5 pt-6 md:px-0 md:pt-0">
      {likes.map((l, i) => {
        const peer = l.with_profile;
        const peerName = peer.firstName ?? "Someone";
        const peerAge = peer.age;
        const peerLocation =
          peer.city && peer.country
            ? `${peer.city}, ${peer.country}`
            : (peer.country ?? "");
        const peerPhotos =
          peer.photos && peer.photos.length > 0
            ? peer.photos
            : photosFromUuids((peer as { photo_uuids?: unknown }).photo_uuids);
        const photoSource: PhotoSource = photoOrGradient(
          { firstName: peerName, photos: peerPhotos },
          0,
        );
        const caption = likedCaption(l.liked_at, l.is_super);
        return (
          <motion.div
            key={peer.id}
            {...fadeUp}
            transition={{ duration: 0.3, delay: staggerDelay(i) }}
            className={cn(
              "relative flex flex-col gap-2.5",
              l.is_super &&
                "rounded-2xl ring-2 ring-lime ring-offset-2 ring-offset-(--canvas)",
            )}
          >
            {l.is_super ? (
              <Pill
                variant="lime"
                size="sm"
                className="absolute top-2 left-2 z-10 gap-1"
              >
                <SuperLikeIcon className="size-3" aria-hidden fill="currentColor" /> Super
              </Pill>
            ) : null}
            {/* SOT: quiet glass overflow button pinned top-right of the
                photo. Sibling of the photo Link (never nested) so the
                menu opens without navigating. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`More options for ${peerName}`}
                className={cn(
                  "absolute top-2 right-2 z-10 flex size-7 items-center justify-center",
                  "rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm",
                  "outline-none focus-visible:ring-2 focus-visible:ring-lavender",
                )}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-49 rounded-xl bg-(--card) p-1.5 ring-white/15"
              >
                <DropdownMenuItem
                  className="gap-2.5 rounded-lg px-3 py-2.5 text-body-s font-semibold text-(--ink) focus:bg-white/5"
                  onClick={() => router.push(`/profile/${peer.id}?from=youliked`)}
                >
                  <Eye className="size-4 text-lavender" aria-hidden />
                  View profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="items-start gap-2.5 rounded-lg px-3 py-2.5 text-body-s font-semibold text-(--ink) focus:bg-white/5"
                  onClick={() => onTakeBack(peer.id, peerName)}
                >
                  <Undo2 className="mt-0.5 size-4 text-lavender" aria-hidden />
                  <span className="flex flex-col">
                    Take back like
                    <span className="text-caption font-normal text-(--ink-3)">
                      They return to your deck
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={`/profile/${peer.id}?from=youliked`}
              prefetch={false}
              aria-label={`View ${peerName}'s profile`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "block" }),
                "h-auto p-0 rounded-[18px] overflow-hidden",
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
                    alt={`${peerName}'s photo`}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </PhotoTile>
            </Link>
            <div className="flex items-center gap-1.5 text-body-s text-(--ink)">
              <span className="truncate">
                {peerName}
                {peerAge ? `, ${peerAge}` : ""}
              </span>
              {isOnline(peer.seconds_since_last_online) ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full bg-lime"
                  />
                  <span className="sr-only">Online now</span>
                </>
              ) : null}
            </div>
            {peerLocation ? (
              <div className="flex items-center gap-1 text-caption text-(--ink-2) -mt-1">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{peerLocation}</span>
              </div>
            ) : null}
            {/* SOT status caption: a record, never a rejection. Muted by
                default; lime + semibold for your own super-likes. */}
            {caption ? (
              <div
                className={cn(
                  "text-caption -mt-1",
                  l.is_super ? "font-semibold text-lime" : "text-(--ink-3)",
                )}
              >
                {caption}
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

function YouLikedEmptyState() {
  return (
    <EmptyState
      variant="no-matches"
      title="No likes sent yet"
      description="This is where the people you like wait for you. When someone likes you back, they become a match."
      action={{ label: "Go to Discover", href: "/discover" }}
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
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-(--card) px-6 py-8 text-center">
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime"
        >
          <Sparkles className="size-6" />
        </div>
        <h2 className="text-h3 text-(--ink)">{headline}</h2>
        <p className="max-w-xs text-body text-(--ink-2)">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-hidden>
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="flex w-full flex-col gap-2">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-(--card)">
              <div className="absolute inset-0 bg-linear-to-br from-lavender/30 to-pink/20 blur-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="size-8 text-(--ink)/70" />
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
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-5 pt-6 md:px-0 md:pt-0">
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

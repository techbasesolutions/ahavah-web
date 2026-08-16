"use client";

// Inline `fontFamily: "var(--font-display)"` styles below follow the same
// pattern already used site-wide for the Ultra display headline (see
// src/app/page.tsx, src/app/faq/page.tsx, waitlist-share-card.tsx, etc.) —
// Tailwind has no static utility for a CSS var font-family, so the
// no-restricted-syntax rule is disabled for this file.
/* eslint-disable no-restricted-syntax */

import { ArrowLeft, AlertTriangle, Check, Copy, Gift, Share2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/app/bottom-nav";
import { PageShell } from "@/components/app/page-shell";
import { useCopiedState } from "@/lib/use-copied-state";
import {
  formatInviteLink,
  formatShortDate,
  friendDisplayName,
  friendInitial,
  premiumMonthsEarned,
  useReferrals,
} from "@/lib/use-referrals";
import type { ReferralItem, ReferralsMeResponse } from "@/lib/api-types";
import { cn } from "@/lib/utils";

/**
 * /invite — referral screen (SOT: "Ahavah Invite" Claude Design export,
 * 2026-08-15). Seven labeled export frames map onto this component as:
 *
 *   /invite · dark · default          -> happy path (below)
 *   link copied                       -> `copied` from useCopiedState, ~2s
 *   share sheet (Web Share API)       -> NOT custom-built. The export's
 *                                        sheet is a mock of the OS-native
 *                                        share UI; real navigator.share()
 *                                        renders its own OS sheet that
 *                                        can't be pixel-matched, so the
 *                                        button just calls it and falls
 *                                        back to copy when unsupported.
 *   no invites yet (zero state)       -> data.items.length === 0
 *   loading (link renders first)      -> see deviation note below
 *   status list failed                -> see deviation note below
 *   /invite · light · default         -> [data-theme="light"], same tree
 *
 * DEVIATION (documented per build brief): the export's loading + error
 * frames assume the link is sourced independently of the invite list, so
 * it stays populated while only the list/tally skeleton or errors. The
 * real backend serves both from one combined `GET /referrals/me` call
 * (see api-types.ts), so on a true first load neither exists until the
 * fetch resolves — the link box is skeletoned too. useReferrals preserves
 * the last-good response across a failed *revalidation*, though, so a
 * background refetch failure after the link has already loaded once DOES
 * reproduce the export's "link still works" error frame exactly. Only a
 * first-load failure (no cached link yet) falls back to a link-less error
 * layout, which isn't one of the seven exported frames.
 */
export default function InvitePage() {
  const { data, isLoading, error, reload } = useReferrals();
  const { copied, trigger: triggerCopied } = useCopiedState(2000);

  const displayLink = data ? formatInviteLink(data.link, data.code) : null;

  const copyLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      triggerCopied();
    } catch {
      // Clipboard blocked (permissions / insecure context) — no-op; the
      // field just doesn't flip to the copied state.
    }
  };

  const shareLink = async () => {
    if (!data) return;
    const shareData = {
      title: "Ahavah",
      text: "Join me on Ahavah.",
      url: data.link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the native sheet — no fallback needed.
      }
    } else {
      await copyLink();
    }
  };

  // First-load failure (no cached link yet) — none of the seven export
  // frames cover this; see the deviation note above.
  if (error && !data) {
    return (
      <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Invite" topBarBack="/profile">
        <div className="md:hidden">
          <BackLink />
          <div className="px-5 pt-2 flex flex-col gap-5">
            <Hero />
            <ErrorBox
              title="We could not load your invite"
              description="Check your connection and try again."
              onRetry={() => void reload()}
            />
          </div>
          <BottomNav />
        </div>
        <div className="hidden md:block md:max-w-160 md:mx-auto">
          <div className="flex flex-col gap-5 pt-2">
            <Hero desktop />
            <ErrorBox
              title="We could not load your invite"
              description="Check your connection and try again."
              onRetry={() => void reload()}
            />
          </div>
        </div>
      </PageShell>
    );
  }

  const showSkeleton = isLoading && !data;
  const items = data?.items ?? [];
  const isZero = !showSkeleton && !error && items.length === 0;
  const showTally = !showSkeleton && !error && !isZero;
  const revalidateFailed = Boolean(error) && Boolean(data);

  return (
    <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Invite" topBarBack="/profile">
      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="md:hidden">
        <BackLink />
        <div className="px-5 pt-2 flex flex-col gap-4.5">
          <Hero />
          <RewardSplit />

          <div className="flex flex-col gap-2.5">
            {showSkeleton ? (
              <LinkFieldSkeleton />
            ) : (
              <LinkField
                displayLink={displayLink}
                copied={copied}
                onCopy={() => void copyLink()}
              />
            )}
            {copied ? (
              <p className="flex items-center gap-1.5 text-caption font-semibold text-(--text-success)">
                <Check aria-hidden className="size-3.5" />
                Link copied. Paste it anywhere.
              </p>
            ) : null}
            <Button
              size="cta"
              tone="indigo"
              disabled={showSkeleton}
              onClick={() => void shareLink()}
            >
              <Share2 aria-hidden className="size-4.5" />
              Share your link
            </Button>
          </div>

          {showTally && data ? <TallyStrip totals={data.totals} /> : null}
          {showSkeleton ? <TallySkeleton /> : null}

          <div>
            <p className="text-overline text-(--ink-3) px-0.5 pb-0.5">
              Your invites
            </p>
            <InvitesSection
              showSkeleton={showSkeleton}
              isZero={isZero}
              revalidateFailed={revalidateFailed}
              items={items}
              onRetry={() => void reload()}
            />
          </div>
        </div>
        <BottomNav />
      </div>

      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden md:grid md:grid-cols-[1fr_360px] md:gap-8 md:max-w-295 md:mx-auto md:w-full md:items-start">
        <div className="flex flex-col gap-5">
          <Hero desktop />
          <RewardSplit className="max-w-140" />
          <div className="flex items-center gap-3 max-w-140">
            <div className="flex-1">
              {showSkeleton ? (
                <LinkFieldSkeleton />
              ) : (
                <LinkField
                  displayLink={displayLink}
                  copied={copied}
                  onCopy={() => void copyLink()}
                  copyLabel="Copy link"
                />
              )}
            </div>
          </div>
          {copied ? (
            <p className="flex items-center gap-1.5 text-caption font-semibold text-(--text-success)">
              <Check aria-hidden className="size-3.5" />
              Link copied. Paste it anywhere.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-(--hairline) bg-(--card) p-5.5">
          {showTally && data ? <TallyStrip totals={data.totals} /> : null}
          {showSkeleton ? <TallySkeleton /> : null}

          <div className="border-t border-(--hairline) pt-3">
            <p className="text-overline text-(--ink-3) px-0.5 pb-1">
              Your invites
            </p>
            <InvitesSection
              showSkeleton={showSkeleton}
              isZero={isZero}
              revalidateFailed={revalidateFailed}
              items={items}
              onRetry={() => void reload()}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function BackLink() {
  return (
    <div className="px-4 pt-1">
      <Link
        href="/profile"
        prefetch={false}
        className="inline-flex h-11 w-fit items-center gap-1.5 px-1 text-meta font-semibold text-(--ink-2) transition-colors hover:text-(--ink)"
      >
        <ArrowLeft aria-hidden className="size-4.5" />
        Profile
      </Link>
    </div>
  );
}

function Hero({ desktop = false }: { desktop?: boolean }) {
  return (
    <div>
      <h1
        className="m-0 text-(--ink)"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          lineHeight: 1.12,
          letterSpacing: "-0.005em",
          fontSize: desktop ? "40px" : "31px",
        }}
      >
        Every friend
        {desktop ? " " : <br />}
        adds a <em className="not-italic text-(--text-success)">month</em>.
      </h1>
      <p className="mt-2.5 text-meta leading-relaxed text-(--ink-2) max-w-130">
        Send your link. Your friend gets 6 months of Premium free, and you
        get 30 days of Premium plus 5 tokens once they finish their
        profile.
        {desktop ? " There is no cap." : null}
      </p>
    </div>
  );
}

function RewardSplit({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-[20px] border border-(--hairline) bg-(--card)",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-overline text-(--ink-3)">Your friend gets</p>
        <p className="text-body font-extrabold leading-tight tracking-tight text-(--ink)">
          6 months Premium
        </p>
        <p className="text-caption leading-snug text-(--ink-3)">
          Free, applied automatically when they join.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 border-l border-(--hairline) p-4">
        <p className="text-overline text-(--ink-3)">You get</p>
        <p className="text-body font-extrabold leading-tight tracking-tight text-(--text-success)">
          30 days + 5 tokens
        </p>
        <p className="text-caption leading-snug text-(--ink-3)">
          Per friend who joins and completes their profile.
        </p>
      </div>
    </div>
  );
}

function LinkField({
  displayLink,
  copied,
  onCopy,
  copyLabel = "Copy",
}: {
  displayLink: { prefix: string; code: string } | null;
  copied: boolean;
  onCopy: () => void;
  copyLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-2.5 rounded-full border pl-4.5 pr-1.5",
        copied
          ? "border-lime bg-lime/12"
          : "border-(--border) bg-(--raise)",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-meta font-semibold tracking-tight text-(--ink)">
        {displayLink ? (
          <>
            {displayLink.prefix}
            <b className="font-extrabold">{displayLink.code}</b>
          </>
        ) : (
          " "
        )}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={onCopy}
        disabled={!displayLink}
        className={cn(
          "h-10 shrink-0 gap-1.5 rounded-full border px-4 text-caption font-bold whitespace-nowrap",
          copied
            ? "border-lime bg-lime text-black hover:bg-lime/90"
            : "border-(--border) bg-(--raise) text-(--ink) hover:bg-(--raise)",
        )}
      >
        {copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
        {copied ? "Copied" : copyLabel}
      </Button>
    </div>
  );
}

function LinkFieldSkeleton() {
  return (
    <div className="flex h-14 items-center gap-2.5 rounded-full border border-(--border) bg-(--raise) pl-4.5 pr-1.5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-20 shrink-0 rounded-full" />
    </div>
  );
}

function TallyStrip({
  totals,
}: {
  totals: ReferralsMeResponse["totals"];
}) {
  const cells: ReadonlyArray<{ label: string; value: number }> = [
    { label: "Friends joined", value: totals.joined },
    { label: "Premium months", value: premiumMonthsEarned(totals.premium_days_earned) },
    { label: "Tokens earned", value: totals.tokens_earned },
  ];
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-(--hairline) bg-(--card)">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            "px-2.5 py-3.5 text-center",
            i > 0 && "border-l border-(--hairline)",
          )}
        >
          <p className="m-0 text-h2 tabular-nums text-(--ink)">{cell.value}</p>
          <p className="mt-0.5 text-caption leading-snug text-(--ink-3)">
            {cell.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function TallySkeleton() {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-(--hairline) bg-(--card)">
      {["Friends joined", "Premium months", "Tokens earned"].map((label) => (
        <div key={label} className="px-2.5 py-3.5 text-center">
          <Skeleton className="mx-auto h-5 w-9" />
          <p className="mt-2 text-caption leading-snug text-(--ink-3)">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function InvitesSection({
  showSkeleton,
  isZero,
  revalidateFailed,
  items,
  onRetry,
}: {
  showSkeleton: boolean;
  isZero: boolean;
  revalidateFailed: boolean;
  items: ReadonlyArray<ReferralItem>;
  onRetry: () => void;
}) {
  if (showSkeleton) return <InvitesSkeleton />;
  if (revalidateFailed) {
    return (
      <ErrorBox
        title="We could not load your invites"
        description="Your link still works, and any friend who joins with it will be counted."
        onRetry={onRetry}
      />
    );
  }
  if (isZero) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-[20px] border border-dashed border-(--border) px-5.5 py-6 text-center">
        <span className="flex size-13.5 items-center justify-center rounded-full bg-lime/15 text-(--text-success)">
          <Gift aria-hidden className="size-6.5" />
        </span>
        <h3 className="m-0 text-body font-bold tracking-tight text-(--ink)">
          No invites yet
        </h3>
        <p className="m-0 max-w-62.5 text-caption leading-relaxed text-(--ink-2)">
          Start with one person who would like the way this app works. Your
          first friend earns you a month.
        </p>
      </div>
    );
  }
  return (
    <div>
      {items.map((item, i) => (
        <InviteRow key={`${item.created_at}-${i}`} item={item} isFirst={i === 0} />
      ))}
    </div>
  );
}

function InviteRow({ item, isFirst }: { item: ReferralItem; isFirst: boolean }) {
  const name = friendDisplayName(item);
  const initial = friendInitial(name);
  const date = formatShortDate(item.created_at);
  const isCredited = item.state === "credited";

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        !isFirst && "border-t border-(--hairline)",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10.5 shrink-0 items-center justify-center rounded-[14px] text-base font-extrabold",
          isCredited ? "text-white" : "text-(--invite-avatar-pending-ink)",
        )}
        style={{
          background: isCredited
            ? "linear-gradient(150deg, var(--color-indigo), var(--color-lavender))"
            : "var(--invite-avatar-pending)",
        }}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-meta font-semibold text-(--ink) truncate">
          {name}
        </p>
        <p className="m-0 mt-0.5 text-caption text-(--ink-3)">
          {isCredited ? `Joined and completed, ${date}` : "Joined, still finishing their profile"}
        </p>
      </div>
      {isCredited ? (
        <p className="m-0 shrink-0 text-right text-caption leading-snug font-bold text-(--text-success)">
          +30 days
          <br />
          +5 tokens
        </p>
      ) : (
        <p className="m-0 shrink-0 text-caption font-semibold text-(--ink-3) whitespace-nowrap">
          {date}
        </p>
      )}
    </div>
  );
}

function InvitesSkeleton() {
  const rows = [
    { title: "44%", subtitle: "66%" },
    { title: "36%", subtitle: "58%" },
    { title: "40%", subtitle: "50%" },
  ];
  return (
    <div>
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 py-3",
            i > 0 && "border-t border-(--hairline)",
          )}
        >
          <Skeleton className="size-10.5 shrink-0 rounded-[14px]" />
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <Skeleton className="h-3" style={{ width: row.title }} />
            <Skeleton className="h-2.5" style={{ width: row.subtitle }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-(--border) bg-(--raise) p-4.5">
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-(--color-gold)" />
      <div>
        <h3 className="m-0 text-meta font-bold text-(--ink)">{title}</h3>
        <p className="m-0 mt-1 text-caption leading-relaxed text-(--ink-2)">
          {description}
        </p>
        <Button
          type="button"
          variant="outlineSubtle"
          size="sm"
          className="mt-3 rounded-full"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

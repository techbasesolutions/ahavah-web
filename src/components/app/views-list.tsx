"use client";

import Link from "next/link";
import { ChevronRight, Eye, Lock, MapPin, ShieldCheck, Check, Sparkles } from "lucide-react";

import { Pill } from "@/components/kibo-ui/pill";
import { EmptyState } from "@/components/app/empty-state";
import { buttonVariants } from "@/components/ui/button";
import type { VisitorRecord } from "@/lib/api-types";
import { visitTimeLabel } from "@/lib/use-visitors";
import { cdnUrlFor } from "@/lib/photo-storage";
import { cn } from "@/lib/utils";

/**
 * Who-viewed-you presentational atoms (SOT: "Ahavah Who Viewed You"
 * export, 2026-07-19). Compact list rows, not the matches grid — views
 * are a log (design note 1). Privacy voice throughout: never
 * "tracking", never "visitors"; the page is called Views.
 */

// Brand gradient for photo-less rows — SOT .vph.fallback (big initial
// at 30% white). The verification-locked tile uses a deeper variant.
const FALLBACK_GRADIENT =
  "linear-gradient(150deg,#1A1340 0%,#5524F5 58%,#7B52F0 100%)";
const LOCKED_GRADIENT = "linear-gradient(150deg,#241A52 0%,#3A2A78 100%)";

function NewDot() {
  return (
    <span
      aria-hidden
      className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-lime ring-2 ring-(--canvas)"
    />
  );
}

/** SOT .grouphead — overline group label; lime dot on the New group. */
export function ViewsGroupHead({
  children,
  dot,
  className,
}: {
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 pt-3.5 pb-1.5 text-overline text-(--ink-3)",
        className,
      )}
    >
      {dot ? (
        <span aria-hidden className="size-1.5 rounded-full bg-lime" />
      ) : null}
      {children}
    </div>
  );
}

/** One view row. Verification-locked rows (SOT design note 4) keep
 *  their timeline slot but never name or show the person — the whole
 *  row routes to /verify instead of a profile. */
export function VisitorRow({ row }: { row: VisitorRecord }) {
  const locked = row.verification_required_to_view !== null;
  const time = visitTimeLabel(row.time);
  const timeEl = time ? (
    <span
      className={cn(
        "shrink-0 self-start pt-1 text-caption whitespace-nowrap",
        row.is_new ? "font-semibold text-lime" : "text-(--ink-3)",
      )}
    >
      {time}
    </span>
  ) : null;

  if (locked) {
    const cue =
      row.verification_required_to_view === "photos"
        ? "Verify your photos to see them"
        : "Verify your profile to see them";
    return (
      <Link
        href="/verify"
        prefetch={false}
        className="flex items-center gap-3.5 border-t border-(--hairline) py-3 first:border-t-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-lavender"
      >
        <span
          className="relative flex size-14 shrink-0 items-center justify-center rounded-lg md:size-16"
          style={{ background: LOCKED_GRADIENT }}
        >
          <Lock className="size-5 text-lavender" aria-hidden />
          {row.is_new ? <NewDot /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-meta font-semibold text-(--ink)">
            Someone viewed you
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption font-semibold text-lavender">
            <ShieldCheck className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{cue}</span>
            <ChevronRight className="size-3 shrink-0 text-(--ink-3)" aria-hidden />
          </span>
        </span>
        {timeEl}
      </Link>
    );
  }

  const name = row.name ?? "Someone";
  const photoUrl = row.photo_uuid ? cdnUrlFor(row.photo_uuid) : null;
  return (
    <Link
      href={`/profile/${row.person_uuid}?from=views`}
      prefetch={false}
      aria-label={`View ${name}'s profile`}
      className="flex items-center gap-3.5 border-t border-(--hairline) py-3 first:border-t-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-lavender"
    >
      <span
        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-cover bg-top md:size-16"
        style={
          photoUrl
            ? { backgroundImage: `url("${photoUrl}")` }
            : { background: FALLBACK_GRADIENT }
        }
      >
        {!photoUrl ? (
          <span
            aria-hidden
            className="flex size-full items-center justify-center text-h3 font-extrabold text-white/30"
          >
            {name[0] ?? "•"}
          </span>
        ) : null}
        {row.is_new ? <NewDot /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-meta font-semibold text-(--ink)">
          <span className="truncate">
            {name}
            {row.age ? `, ${row.age}` : ""}
          </span>
          {row.is_verified ? (
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-lavender"
              aria-label="Verified"
            >
              <Check className="size-2.5 text-black" aria-hidden strokeWidth={3.5} />
            </span>
          ) : null}
        </span>
        {row.location ? (
          <span className="mt-0.5 flex items-center gap-1 text-caption text-(--ink-3)">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{row.location}</span>
          </span>
        ) : (
          <span className="mt-0.5 block text-caption text-(--ink-3)">
            Prefers not to share more
          </span>
        )}
      </span>
      {timeEl}
    </Link>
  );
}

export function ViewedYouEmptyState() {
  return (
    <EmptyState
      variant="profile-unavailable"
      title="No views yet"
      description="When someone views your profile, you will see them here."
    />
  );
}

export function YouViewedEmptyState() {
  return (
    <EmptyState
      variant="no-matches"
      title="Nothing here yet"
      description="Profiles you open will be listed here so you can find your way back."
      action={{ label: "Go to Discover", href: "/discover" }}
    />
  );
}

/** Premium-locked Viewed-you variant (SOT frame 5, flagged): blurred
 *  photos, redacted name bars, REAL timestamps kept visible as the
 *  tease, count headline + one lime CTA. Dormant during the beta —
 *  every member currently holds Premium. */
export function ViewsPremiumLocked({
  count,
  rows,
}: {
  count: number;
  rows: ReadonlyArray<VisitorRecord>;
}) {
  const teaser = rows.slice(0, 4);
  const headline =
    count === 1
      ? "1 person viewed your profile"
      : `${count} people viewed your profile`;
  return (
    <div className="relative flex-1 px-5">
      <div aria-hidden>
        {teaser.map((row, i) => {
          const photoUrl = row.photo_uuid ? cdnUrlFor(row.photo_uuid) : null;
          const time = visitTimeLabel(row.time);
          return (
            <div
              key={row.person_uuid}
              className="flex items-center gap-3.5 border-t border-(--hairline) py-3 first:border-t-0"
            >
              <span
                className="size-14 shrink-0 overflow-hidden rounded-lg bg-cover bg-top blur-md"
                style={
                  photoUrl
                    ? { backgroundImage: `url("${photoUrl}")` }
                    : { background: FALLBACK_GRADIENT }
                }
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* Varied token widths per row so the redaction bars
                    read organic, not templated (SOT frame 5). */}
                <span
                  className={cn(
                    "h-3 rounded-md bg-white/15",
                    ["w-28", "w-24", "w-32", "w-26"][i % 4],
                  )}
                />
                <span
                  className={cn(
                    "h-3 rounded-md bg-white/15 opacity-60",
                    ["w-18", "w-30", "w-16", "w-20"][i % 4],
                  )}
                />
              </span>
              <span
                className={cn(
                  "shrink-0 self-start pt-1 text-caption whitespace-nowrap",
                  row.is_new ? "font-semibold text-lime" : "text-(--ink-3)",
                )}
              >
                {time}
              </span>
            </div>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-50 bg-linear-to-b from-transparent to-(--canvas)"
      />
      {/* SOT places the card at 46% height; the kit's fraction tokens
          land it at 1/2 — a 4% delta accepted over an arbitrary value. */}
      <div className="absolute inset-x-2.5 top-1/2 z-10 -translate-y-1/2 rounded-3xl border border-white/15 bg-(--card) px-6 py-6 text-center shadow-2xl">
        <span className="mx-auto mb-3.5 flex size-16 items-center justify-center rounded-full bg-lime/15">
          <Eye className="size-7 text-lime" aria-hidden />
        </span>
        <h2 className="text-h3 text-(--ink)">{headline}</h2>
        <p className="mt-2 text-caption text-(--ink-2)">
          Upgrade to Premium to see who they are.
        </p>
        <Link
          href="/paywall"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "default", size: "tap" }),
            "mt-4.5 w-full rounded-full",
          )}
        >
          <Sparkles aria-hidden />
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}

/** The Viewed-you tab pill count is NEW views only (SOT design note
 *  2), re-exported so the tab strip and profile row agree. */
export function newViewsPill(count: number) {
  return count > 0 ? (
    <Pill variant="lime" size="sm">
      {count > 99 ? "99+" : count}
    </Pill>
  ) : null;
}

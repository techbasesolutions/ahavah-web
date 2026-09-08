"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Camera,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { NextActionKind } from "@/lib/next-action";
import type { NextActionPrimaryData, NextActionRowData } from "@/lib/use-next-action";

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * The signed-in home "next action" card. SOT: "Claude Design/Ahavah
 * Landing First Viewport.html", frames "Signed-in home ..." — see
 * src/lib/use-next-action.ts for the priority logic and real-signal
 * inventory this renders.
 *
 * Purely presentational: every string, href and callback arrives
 * pre-resolved via `primary` / `more` so this component has no data
 * fetching of its own and stays trivial to drive from a fixture in
 * tests / the render-verify harness.
 */

const ROW_ICON: Record<NextActionKind, LucideIcon> = {
  "message-failed": MessageCircle,
  "new-match": Heart,
  "profile-incomplete": Camera,
  "verification-pending": Clock,
  "add-city": MapPin,
  "profile-nudge": Sparkles,
  "premium-upsell": Star,
  "steady-deck": Sparkles,
};

const TONE_STYLE: Record<
  NextActionPrimaryData["tone"],
  { card: CSSProperties; dot: string }
> = {
  urgent: {
    card: {
      background: "color-mix(in oklch, var(--color-lime) 14%, var(--card))",
      borderColor: "color-mix(in oklch, var(--color-lime) 40%, transparent)",
    },
    dot: "bg-lime",
  },
  warn: {
    card: {
      background: "color-mix(in oklch, var(--color-gold) 12%, var(--card))",
      borderColor: "color-mix(in oklch, var(--color-gold) 38%, transparent)",
    },
    dot: "bg-gold",
  },
  calm: {
    card: {},
    dot: "bg-lavender",
  },
};

function PrimaryAction({
  label,
  href,
  onClick,
  className,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  if (href) {
    return (
      <Button size="tap" className={cn("rounded-full", className)} render={<Link href={href} prefetch={false} />}>
        {label}
      </Button>
    );
  }
  return (
    <Button size="tap" className={cn("rounded-full", className)} onClick={onClick}>
      {label}
    </Button>
  );
}

function SecondaryAction({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = "text-meta font-bold text-(--link) whitespace-nowrap";
  if (href) {
    return (
      <Link href={href} prefetch={false} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}

export function NextAction({
  firstName,
  primary,
  more,
}: {
  firstName?: string;
  primary: NextActionPrimaryData | null;
  more: ReadonlyArray<NextActionRowData>;
}) {
  if (!primary) return null;

  const tone = TONE_STYLE[primary.tone];
  // "Welcome" only for the brand-new / profile-hidden state — every other
  // live condition greets a member who has already met the app before.
  const greeting = primary.kind === "profile-incomplete" ? "Welcome" : "Shalom";

  return (
    <div className="flex flex-col gap-3">
      {firstName ? (
        <p className="text-h3 font-extrabold tracking-tight text-(--ink)">
          {greeting}, {firstName}
        </p>
      ) : null}

      <div
        className="flex flex-col gap-3 rounded-[22px] border border-(--hairline) bg-(--card) p-5"
        style={tone.card}
      >
        <div className="flex items-center gap-1.5 text-overline text-(--ink-3)">
          <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", tone.dot)} />
          {primary.kicker}
        </div>

        {primary.avatars || primary.useIconTile ? (
          <div className="flex items-center gap-3.5">
            {primary.avatars ? (
              <AvatarGroup className="shrink-0">
                {primary.avatars.map((a, i) => (
                  <Avatar key={i} size="tap-xl" className="ring-2 ring-(--card)">
                    {a.src ? <AvatarImage src={a.src} alt="" /> : null}
                    <AvatarFallback
                      variant="brand-fallback"
                      style={a.gradientCss ? { background: a.gradientCss } : undefined}
                    >
                      {a.initial}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : (
              <IconBadge tone="brand" shape="circle" size="xl" className="shrink-0">
                <Clock />
              </IconBadge>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-h2 text-(--ink)">{primary.title}</h2>
              {primary.body ? (
                <p className="mt-1 text-meta leading-relaxed text-(--ink-2)">{primary.body}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-h2 text-(--ink)">{primary.title}</h2>
            {primary.body ? (
              <p className="mt-1.5 text-meta leading-relaxed text-(--ink-2)">{primary.body}</p>
            ) : null}
          </div>
        )}

        {primary.progress ? (
          <div className="flex flex-col gap-1.5">
            <Progress
              value={primary.progress.percent}
              className="[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-(--raise) [&_[data-slot=progress-indicator]]:bg-lime"
            />
            <div className="flex items-center justify-between text-caption font-semibold text-(--ink-3)">
              <span>{primary.progress.doneLabel}</span>
              <span>{primary.progress.etaLabel}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-0.5 flex items-center gap-3.5">
          <PrimaryAction
            label={primary.primaryLabel}
            href={primary.primaryHref}
            onClick={primary.onPrimary}
            className={primary.tone === "warn" ? "bg-gold text-black hover:bg-gold/90" : undefined}
          />
          <SecondaryAction
            label={primary.secondaryLabel}
            href={primary.secondaryHref}
            onClick={primary.onSecondary}
          />
        </div>

        {more.length > 0 ? (
          <Accordion
            defaultValue={["more"]}
            className="border-t border-(--hairline) pt-3"
          >
            <AccordionItem value="more" className="border-b-0">
              <AccordionTrigger className="py-0 text-caption font-bold tracking-wide text-(--ink-3) uppercase hover:no-underline [&_svg]:size-4">
                And {more.length} more
              </AccordionTrigger>
              {/* AccordionContent's base classes underline every descendant
                  <a> (built for FAQ-style prose links) — cancel that for
                  these nav rows, which use Link but aren't inline prose. */}
              <AccordionContent className="pb-0 [&_a]:no-underline!">
                <div className="flex flex-col">
                  {more.map((row) => {
                    const RowIcon = ROW_ICON[row.kind];
                    return (
                      <Link
                        key={row.kind}
                        href={row.href}
                        prefetch={false}
                        className="flex items-center gap-3 border-t border-(--hairline) py-2.5 first:border-t-0"
                      >
                        <IconBadge tone="brand" shape="square" size="sm" className="shrink-0">
                          <RowIcon className="size-4" />
                        </IconBadge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-meta font-semibold text-(--ink)">
                            {row.title}
                          </p>
                          <p className="truncate text-caption text-(--ink-3)">{row.subtitle}</p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-(--ink-3)" />
                      </Link>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </div>
    </div>
  );
}

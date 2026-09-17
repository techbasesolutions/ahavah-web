// Shared "badge + heading + paragraph + optional action" block used by
// every non-default, non-loading state on both public Spotlight token
// pages (/spotlight/confirm/[token] and /spotlight/card/[token]):
// already, success, approved, skipped, invalid, expired, error,
// rejected, photoRejected, unavailable and paused. Every size below is
// copied unchanged from the identical local ConfirmBadge/CardBadge,
// ConfirmHeading/CardHeading and ConfirmParagraph/CardParagraph
// implementations both pages carried before this refactor (same
// no-@theme-token trade-off documented there).
/* eslint-disable no-restricted-syntax */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const SETTINGS_PRIVACY_HREF = "/settings/privacy";

/**
 * The wrapping div, badge, heading and paragraph are pixel-identical
 * across every state that uses this block; only the trailing `action`
 * differs (a pill button, a settings link, or nothing at all for the
 * two card-only "wait, nothing to do" states). `tone` fixes the badge's
 * tint and the icon's size/strokeWidth together, matching how both
 * pages always paired them (lime/27px/2.8 for "ok", gold/26px/1.9 for
 * "warn").
 */
export function SpotlightStateBlock({
  tone,
  icon: Icon,
  heading,
  paragraph,
  action,
}: {
  tone: "ok" | "warn";
  icon: LucideIcon;
  heading: ReactNode;
  paragraph: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:flex-none lg:justify-start lg:gap-5">
      <span
        className={
          tone === "ok"
            ? "flex size-[60px] shrink-0 items-center justify-center self-start rounded-full bg-(--color-lime)/[0.18] text-(--color-lime)"
            : "flex size-[60px] shrink-0 items-center justify-center self-start rounded-full bg-(--color-gold)/[0.16] text-(--color-gold)"
        }
      >
        {tone === "ok" ? (
          <Icon size={27} strokeWidth={2.8} aria-hidden />
        ) : (
          <Icon size={26} strokeWidth={1.9} aria-hidden />
        )}
      </span>
      <h1
        className="m-0 text-[34px] leading-[1.08] font-normal tracking-[-0.01em] text-(--ink) lg:text-[52px] lg:leading-[1.02]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {heading}
      </h1>
      <p className="m-0 text-[14.5px] leading-[1.55] text-(--ink-2) lg:max-w-[52ch] lg:text-base">
        {paragraph}
      </p>
      {action}
    </div>
  );
}

// The SOT's `.slink`, a settings deep link used by the "ok" tone states
// (already, success, approved, skipped) as their `action`.
export function SpotlightSettingsLink({ label }: { label: string }) {
  return (
    <Link
      href={SETTINGS_PRIVACY_HREF}
      prefetch={false}
      className="inline-flex items-center gap-1.5 self-start text-[14.5px] font-bold text-(--link-accent)"
    >
      {label}
      <ChevronRight size={15} aria-hidden />
    </Link>
  );
}

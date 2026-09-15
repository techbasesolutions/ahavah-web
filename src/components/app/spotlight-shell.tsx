// SOT chrome sizes (58/80px brand rows, 28/30px mark, 660/600px card
// widths, radius 26) have no equivalent @theme token, same trade-off as
// src/app/page.tsx / community.
/* eslint-disable no-restricted-syntax */

import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the public Spotlight member surfaces (currently just
 * `/spotlight/confirm/[token]`; card-preview surfaces land in a later
 * task). No session, no bottom nav, no footer links, per the SOT
 * ("Ahavah Spotlight Member Surfaces.html") "confirm" frames.
 *
 * Mobile: a 58px brand row over a full-bleed, side-padded column (the
 * `.cwrap` frame). Desktop (`lg:`): an 80px top bar with a hairline
 * border, and the page content centred inside a single bordered card
 * (the `.dcard` frame). `wide` picks the SOT's two documented card
 * widths: 660px for the default (action) state, 600px for the shorter
 * message-only states, rather than inventing a third value nothing in
 * the SOT specifies.
 */
export function SpotlightShell({
  children,
  wide = true,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-(--app)">
      {/* Mobile brand row: 28px mark, 17px wordmark, 58px tall, 24px side
          padding. Hidden at lg in favour of the desktop top bar below. */}
      <div className="flex h-[58px] shrink-0 items-center gap-[9px] px-6 lg:hidden">
        <LogoMark size={28} decorative />
        <span className="text-[17px] font-extrabold tracking-[-0.02em] text-(--ink)">
          Ahavah
        </span>
      </div>

      {/* Desktop top bar: 80px tall, hairline bottom border. Hidden below lg. */}
      <div className="hidden h-20 shrink-0 items-center gap-2.5 border-b border-(--hairline) px-14 lg:flex">
        <LogoMark size={30} decorative />
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-(--ink)">
          Ahavah
        </span>
      </div>

      {/* Centring frame, no-op on mobile, centers the card at lg. */}
      <div className="flex min-h-0 flex-1 flex-col lg:items-center lg:justify-center lg:p-10">
        {/* Content: full-bleed padded column on mobile; a bordered,
            radius-26 card at lg (the SOT `.dcard`). */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-6 pb-7",
            "lg:flex-none lg:gap-5 lg:rounded-[26px] lg:border lg:border-(--hairline) lg:bg-(--card) lg:px-12 lg:py-11",
            wide ? "lg:w-[660px]" : "lg:w-[600px]",
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

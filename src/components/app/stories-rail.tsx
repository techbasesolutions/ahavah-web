import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * StoriesRail — horizontal-scrolling row of StoryAvatar tiles, used at the
 * top of /inbox. Encapsulates the outer scroller (`overflow-x-auto px-3
 * pt-6`) + inner flex (`flex items-center gap-4 px-2`) + cross-browser
 * scrollbar hiding so consumers just drop StoryAvatar children inside.
 *
 * Native scrollbar is hidden (Webkit + Firefox + IE) — touch-drag remains
 * the primary navigation, and the visible bar in the screenshot was visual
 * noise rather than a discoverability aid (the row content already implies
 * scroll-ability).
 */
export function StoriesRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="stories-rail"
      className={cn(
        "overflow-x-auto scrollbar-none px-3 pt-6 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {/* `items-start` (not items-center) so the avatar circles top-align
          regardless of whether each StoryAvatar has a caption — otherwise
          the captioned "+" tile pulls its column taller and shifts its
          avatar up relative to the captionless avatars. */}
      <div className="flex items-start gap-4 px-2">{children}</div>
    </div>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PhotoCaption — bottom-anchored caption bar with a fading dark scrim,
 * for use inside a photo Card (discover stack, profile-detail hero).
 *
 * Encapsulates the bottom-up `linear-gradient(to top, rgba(0,0,0,0.7), 0)`
 * scrim that was previously written inline as a `style={{ background: ... }}`
 * override on a positioned div in /discover. Centralising it here means
 * future photo cards (matches preview, story preview, etc.) get the same
 * caption legibility treatment without re-inventing it.
 *
 * Not a kit primitive — app-level visual atom, lives under components/app/.
 */
export function PhotoCaption({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * BackButton — restores the user's actual previous screen instead of
 * navigating to a hardcoded destination.
 *
 * Previous pattern was `<Link href="/somewhere">` which dropped the
 * user wherever the page author guessed they came from. Multi-referrer
 * pages (legal, help, verify, settings root) routinely got this wrong:
 * tapping Back on "Community Guidelines" from /settings/safety landed
 * the user on `/` instead of /settings/safety.
 *
 * Why we still need a `fallback`:
 *   - PWA cold start / direct link: window.history.length === 1, so
 *     `router.back()` either no-ops or escapes the app.
 *   - Iframes / embeds: the parent history isn't ours.
 *
 * We check `window.history.length > 1` BEFORE calling router.back(),
 * and fall back to a sensible push when history is empty.
 */
export function BackButton({
  fallback,
  label = "Back",
  className,
}: {
  /** Where to push when history.length <= 1 (cold start / direct link). */
  fallback: string;
  /** Accessible label for screen readers. */
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const onClick = React.useCallback(() => {
    // window check needed because Next 16 client components still
    // render once on the server during streaming hydration.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router, fallback]);

  return (
    <Button
      size="circle-lg"
      variant="outline"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "bg-(--card) border-(--hairline) text-(--ink) hover:bg-(--app)",
        className,
      )}
    >
      <ArrowLeft className="text-(--ink)" />
    </Button>
  );
}

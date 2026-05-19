"use client";

// Marketing-only mobile component. Pixel-precise sizing (text-[11px], the
// 280ms / cubic-bezier slide-in timing) is taken from the Figma handoff —
// same eslint-disable rationale as src/app/page.tsx and auth-illustration.tsx.
/* eslint-disable no-restricted-syntax */

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Mobile-only sticky CTA bar that surfaces after the user scrolls past the
 * hero waitlist form (`#waitlist`). Tap returns to the form via anchor scroll;
 * the form itself is the actual signup mechanism so we don't duplicate inputs.
 *
 * Visibility: IntersectionObserver on the hero — when it leaves the viewport
 * (rootMargin -40% from top) the bar slides in. Hidden ≥md per design (the
 * desktop hero form stays in view the whole time, so no sticky needed there).
 */
export function LandingStickyCta({ targetId = "waitlist" }: { targetId?: string }) {
  const [visible, setVisible] = useState(false);
  const observed = useRef(false);

  useEffect(() => {
    if (observed.current) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    observed.current = true;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisible(!entry.isIntersecting);
        });
      },
      { rootMargin: "-40% 0px 0px 0px", threshold: 0 },
    );
    io.observe(target);

    return () => io.disconnect();
  }, [targetId]);

  return (
    <aside
      role="region"
      aria-label="Join Ahavah waitlist"
      data-visible={visible ? "true" : "false"}
      className={[
        "fixed inset-x-0 bottom-0 z-[60] md:hidden",
        "flex items-center gap-2.5",
        "px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        "border-t border-(--hairline)",
        "bg-(--app)/85 backdrop-blur-xl backdrop-saturate-150",
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "data-[visible=false]:translate-y-full",
        "data-[visible=true]:translate-y-0",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-sm font-bold tracking-tight text-(--ink)">
          Join the waitlist
        </div>
        <div className="text-[11px] text-(--ink-2) mt-0.5">
          12,400+ already on the list · Spring 2026
        </div>
      </div>
      <Button
        render={<a href={`#${targetId}`} aria-label="Join the waitlist" />}
        tone="elevated"
        size="tap"
        className="shrink-0 rounded-xl"
      >
        Join
      </Button>
    </aside>
  );
}

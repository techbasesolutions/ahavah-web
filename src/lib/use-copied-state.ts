"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCopiedState — the "copied for ~2s" pill/field flip used by
 * /invite's link field (SOT: "Ahavah Invite" export, link-copied state).
 * `trigger()` flips `copied` true and schedules it back to false after
 * `durationMs`. Re-triggering while already copied restarts the timer
 * instead of stacking a second one. Cleared on unmount so a late timer
 * never fires a setState on an unmounted component.
 */
export function useCopiedState(durationMs = 2000): {
  copied: boolean;
  trigger: () => void;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => {
      setCopied(false);
      timer.current = null;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { copied, trigger };
}

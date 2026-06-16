"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppUpdate } from "@/lib/use-app-update";

/**
 * Registers the PWA service worker (via useAppUpdate) and, during an active
 * session, surfaces a dismissible "new version is ready" bar. Reopening the
 * app from the background auto-refreshes, so the bar is only the active-use
 * path. Mounted once from RootLayout (replaces the old ServiceWorkerRegister).
 */
export function UpdateBar() {
  const { updateReady, applyUpdate } = useAppUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateReady || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-24"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-(--hairline) bg-(--card) px-4 py-2.5 shadow-lg">
        <p className="text-meta text-(--ink)">A new version is ready.</p>
        <Button size="tap" tone="brand" onClick={applyUpdate}>
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </Button>
        <Button
          size="icon-sm"
          tone="none"
          aria-label="Dismiss update"
          className="text-(--ink-3)"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

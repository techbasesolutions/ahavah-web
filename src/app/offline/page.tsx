"use client";

import { EmptyState } from "@/components/app/empty-state";
import { EdgeStateShell } from "@/components/app/edge-state-shell";

export default function OfflinePage() {
  return (
    <EdgeStateShell srTitle="You're offline">
      <EmptyState
        variant="no-internet"
        action={{
          label: "Try again",
          onClick: () => window.location.reload(),
        }}
      />
    </EdgeStateShell>
  );
}

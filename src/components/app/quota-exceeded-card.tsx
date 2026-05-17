"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";

/**
 * QuotaExceededCard — shown on /discover when the user hits the 10/day
 * cap. Offers two paths forward: subscribe to /paywall for unlimited,
 * or spend 3 tokens for a 24h day-pass. Resets-at timestamp shown so
 * users know exactly when they'll be back to free likes.
 *
 * Plan deviation: the plan specified `Card tone="profile-section"`,
 * which doesn't exist on master. Substituted `tone="elevated"` — the
 * same dark indigo settings-group surface used by other in-page
 * informational cards across the app.
 */
export function QuotaExceededCard({
  resetsAt,
  onDayPassActivated,
}: {
  resetsAt: string | null;
  onDayPassActivated: () => void;
}) {
  const { balance, refresh } = useTokenBalance();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // `Date.now()` is impure for purposes of React's purity rule, so the
  // resets-in countdown is recomputed from a `now` snapshot held in
  // state. The interval ticks once a minute (cheap, minute-granularity
  // is enough — we never display seconds in the countdown).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Seed `now` on mount so the resets-in countdown can render against
    // a stable client-side timestamp (SSR safe — server has no Date.now
    // skew). Same pattern used throughout the codebase (e.g. discover/
    // page.tsx's photo-index reset effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const resetsLabel = (() => {
    if (!resetsAt || now == null) return null;
    const ms = new Date(resetsAt).getTime() - now;
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  const handleDayPass = async () => {
    setBusy(true);
    try {
      await apiClient.post("/tokens/day-pass", {});
      await refresh();
      setSheetOpen(false);
      onDayPassActivated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        // Insufficient balance — leave the Sheet open; the
        // TokenSpendSheet branch already renders a Get-tokens fallback
        // when currentBalance < cost.
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card tone="elevated">
        <CardContent className="flex flex-col gap-3 text-center">
          <h2 className="text-h2 text-white">Out of likes for today</h2>
          {resetsLabel ? (
            <p className="text-meta text-text-secondary">
              Resets in {resetsLabel}.
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              size="cta"
              variant="default"
              render={<Link href="/paywall" prefetch={false} />}
            >
              Upgrade for unlimited
            </Button>
            <Button
              size="cta"
              variant="outlineSubtle"
              onClick={() => setSheetOpen(true)}
            >
              Day pass · 3 tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      <TokenSpendSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Day pass — unlimited likes for 24 hours"
        description="Bypass today's like quota. The pass expires 24 hours after purchase."
        cost={3}
        currentBalance={balance}
        onConfirm={handleDayPass}
        busy={busy}
      />
    </>
  );
}

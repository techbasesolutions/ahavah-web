"use client";

/**
 * BoostCard — /profile entry point for spending 5 tokens on a 30-minute
 * spotlight in nearby discovery decks (Phase 7 of monetization-tokens v1,
 * 2026-05-16). When an active boost is in flight, the card flips to an
 * active state with a "Xm left" countdown that ticks every minute.
 *
 * Wire-up:
 *   POST /tokens/boost         — debits 5 tokens, upserts active_boosts row.
 *                                Returns 402 {error:"insufficient_tokens"}.
 *   GET  /tokens/active-boost  — {active:false} | {active:true, expires_at}.
 *
 * Plan deviation: the plan specced `Card tone="profile-section"` which
 * does not exist in the current Card variant list. Substituted `elevated`
 * (the dark-indigo settings-group surface) per the wave-4 coordination
 * note from the orchestrator.
 */

import { useEffect, useState } from "react";
import { Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";

type ActiveBoost = { active: boolean; expires_at?: string };

export function BoostCard() {
  const { balance, refresh: refreshBalance } = useTokenBalance();
  const [active, setActive] = useState<ActiveBoost | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  // `remaining` is recomputed inside an effect so the impure `Date.now()`
  // call lives outside render (react-hooks/purity). The `tick` interval
  // below bumps it every minute while a boost is active.
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<ActiveBoost>("/tokens/active-boost")
      .then((res) => {
        if (!cancelled) setActive(res);
      })
      .catch(() => {
        // Treat any failure (network, 401 pre-auth, 404 before route ships)
        // as "no active boost" so we still render the CTA.
        if (!cancelled) setActive({ active: false });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (!active?.active) return;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [active?.active]);

  useEffect(() => {
    // The countdown string depends on Date.now() (impure), so we compute
    // it in an effect and stash it in state. Recomputed every minute via
    // the `tick` dep. Same eslint-disable pattern as use-token-balance.ts.
    let next: string | null = null;
    if (active?.active && active.expires_at) {
      const ms = new Date(active.expires_at).getTime() - Date.now();
      if (ms > 0) next = `${Math.ceil(ms / 60_000)} min left`;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(next);
  }, [active?.active, active?.expires_at, tick]);

  const handleBoost = async () => {
    setBusy(true);
    try {
      await apiClient.post("/tokens/boost", {});
      await refreshBalance();
      setSheetOpen(false);
      setTick((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        // Insufficient tokens — sheet stays open so the user can see the
        // balance vs cost and choose to top up. TokenSpendSheet renders
        // the insufficient-state UI from its own props.
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card tone="elevated">
        <CardContent className="flex items-center gap-4">
          <Zap
            className={cn(
              "size-8 text-lime",
              // Active-state signal: the boost icon pulses while the
              // 30-min spotlight is in flight. Pure opacity animation,
              // GPU-only, respects prefers-reduced-motion via the
              // global stylesheet override in globals.css.
              active?.active && "animate-pulse",
            )}
            aria-hidden
          />
          <div className="flex-1">
            <p className="text-meta font-semibold text-white">
              {active?.active ? (
                <>
                  Boost active<span className="text-lime">.</span>{" "}
                  <span className="text-text-secondary tabular-nums">
                    {remaining}
                  </span>
                </>
              ) : (
                "Boost your profile"
              )}
            </p>
            <p className="text-caption text-text-secondary">
              {active?.active
                ? "You're appearing first in nearby decks."
                : "Get seen first in nearby decks for 30 minutes."}
            </p>
          </div>
          {!active?.active ? (
            <Button
              size="tap"
              variant="default"
              onClick={() => setSheetOpen(true)}
            >
              <Sparkles aria-hidden />
              Boost · 5
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TokenSpendSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Boost for 30 minutes?"
        description="Your profile will be shown first in nearby decks for 30 minutes."
        cost={5}
        currentBalance={balance}
        onConfirm={handleBoost}
        busy={busy}
      />
    </>
  );
}

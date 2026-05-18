"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemTitle,
} from "@/components/kibo-ui/choicebox";
import { Pill } from "@/components/kibo-ui/pill";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderSubtitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

// SKU catalog matches the 4 Stripe Products created in Phase 2
// (spec §3.2). Per-token "effective rate" copy is hard-coded for
// trust/transparency — keep these in sync with the dashboard products.
// Keys must match what POST /checkout/tokens accepts on the backend.
const SKUS = [
  {
    key: "single",
    label: "Single",
    price: "$0.99",
    tokens: 1,
    per: "$0.99 / token",
    badge: null,
  },
  {
    key: "starter",
    label: "Starter",
    price: "$4.99",
    tokens: 10,
    per: "$0.50 / token",
    badge: null,
  },
  {
    key: "plus",
    label: "Plus",
    price: "$9.99",
    tokens: 22,
    per: "$0.45 / token",
    badge: "10% BONUS",
  },
  {
    key: "pro",
    label: "Pro",
    price: "$19.99",
    tokens: 50,
    per: "$0.40 / token",
    badge: "20% BONUS",
  },
] as const;

export default function TokensPage() {
  const { balance } = useTokenBalance();
  const [selected, setSelected] = useState<string>("starter");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSku = SKUS.find((s) => s.key === selected) ?? SKUS[1];

  const handleBuy = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      // Backend wraps Stripe's URL into `{url}` for both /checkout/web
      // and /checkout/tokens — mirror the /paywall payload shape.
      const res = await apiClient.post<{ url?: string | null }>(
        "/checkout/tokens",
        { sku: selected },
      );
      if (res.url) {
        window.location.assign(res.url);
        return;
      }
      setErrorMessage("Stripe didn't return a checkout URL. Try again.");
      setBusy(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503) {
          setErrorMessage(
            "Token purchases aren't available yet. Try again shortly.",
          );
        } else if (err.status === 401) {
          setErrorMessage("Sign in again to buy tokens.");
        } else {
          setErrorMessage(err.message || "Couldn't start checkout. Try again.");
        }
      } else {
        setErrorMessage("Couldn't reach the checkout service.");
      }
      setBusy(false);
    }
  };

  return (
    // 2026-05-17 rebuild: nav chrome added (PageShell desktopShell=
    // "sidebar" + topBarTitle + mobile PageHeader with BackButton +
    // BottomNav). Theme-aware text colors throughout (--ink, --ink-2).
    // Removed the hand-rolled lime period accent on the page title —
    // it wasn't a kit pattern and the user flagged it as design drift.
    // Sparkles icon replaced with Coins (per token-icon decision).
    <PageShell
      bottomPad="nav"
      desktopShell="sidebar"
      topBarTitle="Tokens & wallet"
    >
      {/* Mobile header — BackButton + plain "Tokens" title (no decorative
          lime period; PageHeaderTitle is now theme-aware). */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Tokens</PageHeaderTitle>
      </PageHeader>

      {/* Desktop wallet container — constrains the single-column content
          to a comfortable reading width so it doesn't stretch across the
          full sidebar content area. Mobile layout is unaffected. */}
      <div className="md:max-w-[960px] md:mx-auto md:w-full md:px-10 md:pt-2">

      {/* Balance card — kit Card tone="default" (bg-card + theme-aware
          text-card-foreground). tone="elevated" was wrong because it hard-
          codes text-white over bg-bg-elevated, which resolves to #FFFFFF
          in light mode = invisible body text. Balance number stays in
          --color-lime; the light-mode override automatically swaps to the
          AA-safe darker citron. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3 }}
        className="mt-2 px-5 md:px-0 md:mt-0"
      >
        <Card tone="default">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-overline text-(--ink-2)">Your balance</p>
              <p className="mt-1 flex items-center gap-2 text-display text-(--color-lime) tabular-nums">
                <Coins className="size-6" aria-hidden />
                {balance}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-6 px-5 md:px-0"
      >
        <h2 className="text-h3 text-(--ink)">Get more tokens</h2>
        <PageHeaderSubtitle>
          Use tokens for reveals, super-likes, day passes, and boosts.
        </PageHeaderSubtitle>
        <Choicebox
          value={selected}
          onValueChange={(v) => setSelected(v ?? "starter")}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          {SKUS.map((s) => (
            <ChoiceboxItem key={s.key} value={s.key} id={`sku-${s.key}`}>
              <ChoiceboxIndicator variant="brand" />
              <ChoiceboxItemHeader>
                <ChoiceboxItemTitle className="flex items-center gap-2 text-body text-(--ink)">
                  {s.label} — {s.price}
                  {s.badge && <Pill variant="lime" size="sm">{s.badge}</Pill>}
                </ChoiceboxItemTitle>
                <ChoiceboxItemDescription className="text-meta text-(--ink-2)">
                  {s.tokens} {s.tokens === 1 ? "token" : "tokens"} · {s.per}
                </ChoiceboxItemDescription>
              </ChoiceboxItemHeader>
            </ChoiceboxItem>
          ))}
        </Choicebox>

        <Button
          size="cta"
          tone="cta"
          lift="float"
          className="mt-6 w-full"
          onClick={handleBuy}
          disabled={busy}
        >
          {busy ? (
            "Opening checkout…"
          ) : (
            <>
              <Coins aria-hidden />
              Get {activeSku.tokens} {activeSku.tokens === 1 ? "token" : "tokens"} · {activeSku.price}
            </>
          )}
        </Button>
        {errorMessage ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 text-meta text-(--color-pink)"
          >
            {errorMessage}
          </p>
        ) : null}
      </motion.div>

      {/* Cross-sell — subscribers get monthly stipend tokens (spec §3.4).
          Links to /paywall, not /profile/subscription, so users land on
          the marketing surface and not the manage surface. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.16 }}
        className="mt-8 px-5 md:px-0 pb-12"
      >
        <Card tone="default">
          <CardContent className="flex flex-col items-start gap-2">
            <p className="text-meta font-semibold text-(--ink)">
              Want unlimited likes + see all who liked you?
            </p>
            <p className="text-caption text-(--ink-2)">
              Premium subscribers also get monthly tokens.
            </p>
            <Button
              variant="link"
              size="tap"
              className="text-(--color-lavender) p-0 h-auto"
              render={<Link href="/paywall" prefetch={false} />}
            >
              See subscription plans
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      </div>

      <BottomNav />
    </PageShell>
  );
}

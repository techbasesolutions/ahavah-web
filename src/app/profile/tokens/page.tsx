"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

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
import {
  PageHeader,
  PageHeaderTitle,
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
    <PageShell bottomPad="nav">
      <PageHeader>
        <PageHeaderTitle>
          Tokens<span className="text-lime">.</span>
        </PageHeaderTitle>
      </PageHeader>

      {/* Balance card — tone="elevated" because there's no
          "profile-section" tone in this codebase; elevated is the
          closest match (dark surface, no ring). */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3 }}
        className="mt-2 px-5"
      >
        <Card tone="elevated">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-meta uppercase tracking-wide text-text-secondary">
                Your balance
              </p>
              <p className="mt-1 flex items-center gap-2 text-display text-lime tabular-nums">
                <Sparkles className="size-6" aria-hidden />
                {balance}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-6 px-5"
      >
        <h2 className="text-h3 text-white">Get more tokens</h2>
        <p className="mt-1 text-meta text-text-secondary">
          Use tokens for reveals, super-likes, day passes, and boosts.
        </p>
        <Choicebox
          value={selected}
          onValueChange={(v) => setSelected(v ?? "starter")}
          className="mt-4 grid gap-3"
        >
          {SKUS.map((s) => (
            <ChoiceboxItem key={s.key} value={s.key} id={`sku-${s.key}`}>
              <ChoiceboxIndicator variant="brand" />
              <ChoiceboxItemHeader>
                <ChoiceboxItemTitle className="flex items-center gap-2 text-body text-white">
                  {s.label} — {s.price}
                  {s.badge && <Pill variant="lime" size="sm">{s.badge}</Pill>}
                </ChoiceboxItemTitle>
                <ChoiceboxItemDescription className="text-meta text-text-secondary">
                  {s.tokens} {s.tokens === 1 ? "token" : "tokens"} · {s.per}
                </ChoiceboxItemDescription>
              </ChoiceboxItemHeader>
            </ChoiceboxItem>
          ))}
        </Choicebox>

        <Button
          size="cta"
          lift="float"
          className="mt-6 w-full"
          onClick={handleBuy}
          disabled={busy}
        >
          {busy ? (
            "Opening checkout…"
          ) : (
            <>
              <Sparkles aria-hidden />
              Get {activeSku.tokens} {activeSku.tokens === 1 ? "token" : "tokens"} · {activeSku.price}
            </>
          )}
        </Button>
        {errorMessage ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 text-meta text-pink"
          >
            {errorMessage}
          </p>
        ) : null}
      </motion.div>

      {/* Cross-sell — subscribers get monthly stipend tokens
          (spec §3.4). Links to /paywall, not /profile/subscription,
          so users land on the marketing surface and not the manage
          surface. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.16 }}
        className="mt-8 px-5 pb-12"
      >
        <Card tone="elevated">
          <CardContent className="flex flex-col gap-2">
            <p className="text-meta font-semibold text-white">
              Want unlimited likes + see all who liked you?
            </p>
            <p className="text-caption text-text-secondary">
              Premium subscribers also get monthly tokens.
            </p>
            <Link
              href="/paywall"
              prefetch={false}
              className="mt-1 text-meta text-lavender underline"
            >
              See subscription plans
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, X } from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Pill } from "@/components/kibo-ui/pill";
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemSubtitle,
  ChoiceboxItemTitle,
} from "@/components/kibo-ui/choicebox";

import { SparkleMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Feature list — Phase 8 (monetization-tokens v1, 2026-05-16). Replaces
// the prior 3-item list with the 5-item set spec'd in the plan, now that
// the daily-likes quota, super-likes, boosts, and monthly token stipend
// are all enforced server-side via the token economy. tier_key → stipend
// mapping ('month'→10, 'quart'→12, 'year'→15) is sourced from
// service/checkout/__init__.py:SUBSCRIPTION_TIER_TO_STIPEND.
const FEATURES = [
  "Unlimited daily likes",
  "See everyone who liked you (full list, not just the count)",
  "10 / 12 / 15 tokens per month (1mo / 3mo / 1yr)",
  "Use tokens for super-likes, boosts, and extra reveals",
  "Cancel anytime from the billing portal",
];

// Prices match the Stripe products created 2026-05-15 in test mode
// (sk_test_3o33...). When swapping to live keys, re-create products
// with these same amounts in live mode + update STRIPE_PRICE_PREMIUM_*
// env vars on the droplet. tier_key strings MUST stay as 'month' /
// 'quart' / 'year' — they map to backend env-var lookups in
// service/checkout/__init__.py:_TIER_ENV.
const TIERS = [
  { key: "month", label: "1 month",  price: "$4.99",  per: "$4.99 / month",  badge: null },
  { key: "quart", label: "3 months", price: "$11.99", per: "$4.00 / month",  badge: "POPULAR" },
  { key: "year",  label: "1 year",   price: "$34.99", per: "$2.92 / month",  badge: "BEST VALUE" },
];

export default function PaywallPage() {
  const [selected, setSelected] = useState("year");
  const activeTier = TIERS.find((t) => t.key === selected)!;
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post<{ url?: string | null }>(
        "/checkout/web",
        { tier_key: selected },
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
            "Subscriptions aren't available yet. We're rolling them out — try again shortly.",
          );
        } else if (err.status === 401) {
          setErrorMessage("Sign in again to subscribe.");
        } else {
          setErrorMessage(
            err.message || "Couldn't start checkout. Try again.",
          );
        }
      } else {
        setErrorMessage("Couldn't reach the checkout service.");
      }
      setBusy(false);
    }
  };

  return (
    <PageShell bottomPad="default" className="overflow-y-auto px-5 pt-6">
      {/* Close — Button render={<Link>} per Base UI nativeButton pattern */}
      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="self-end"
        render={<Link href="/profile" prefetch={false} />}
      >
        <X className="text-white" />
      </Button>

      {/* Hero — SparkleMark approved for paywall per
          feedback_ahavah_no_stickers.md (4th permitted use, 2026-05-11). */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="mt-2 flex flex-col items-center gap-3"
      >
        <SparkleMark size={48} color="#D7FF81" />
        <h1 className="text-center text-display text-white">Ahavah Premium</h1>
        <p className="max-w-xs text-center text-meta text-text-secondary">
          Match more. Worry less.
        </p>
      </motion.div>

      {/* Features — Item composition (ItemGroup gives role="list") */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.11 }}
      >
        <ItemGroup className="mt-8 gap-3">
          {FEATURES.map((f) => (
            <Item key={f} className="items-center px-0 py-0">
              <ItemMedia>
                <IconBadge tone="cta" shape="circle" size="xs">
                  <Check strokeWidth={3} />
                </IconBadge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-body text-white">{f}</ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </motion.div>

      {/* Tier selector */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.17 }}
      >
        <Choicebox
          value={selected}
          onValueChange={setSelected}
          className="mt-8 grid gap-3"
        >
          {TIERS.map((t) => (
            <ChoiceboxItem key={t.key} value={t.key} id={`tier-${t.key}`}>
              <ChoiceboxIndicator variant="brand" />
              <ChoiceboxItemHeader>
                <ChoiceboxItemTitle className="flex items-center gap-2 text-body text-white">
                  {t.label}
                  {t.badge && <Pill variant="lime">{t.badge}</Pill>}
                </ChoiceboxItemTitle>
                <ChoiceboxItemSubtitle className="text-text-muted">
                  {t.per}
                </ChoiceboxItemSubtitle>
              </ChoiceboxItemHeader>
              <ChoiceboxItemDescription className="text-h3 font-extrabold tabular-nums text-white">
                {t.price}
              </ChoiceboxItemDescription>
            </ChoiceboxItem>
          ))}
        </Choicebox>
      </motion.div>

      {/* CTA — Terms and Privacy Policy are real <Link>s now (was inert
          <span className="underline">). Stub destinations point at
          /settings/account until terms/privacy pages exist; matches the
          project's existing stub convention for un-built routes. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.23 }}
        className="mt-auto flex flex-col gap-4 pt-8"
      >
        <Button size="cta" onClick={handleContinue} disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Starting checkout…
            </>
          ) : (
            `Continue ${activeTier.price}`
          )}
        </Button>
        {errorMessage ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-center text-caption font-semibold text-pink"
          >
            {errorMessage}
          </p>
        ) : null}
        {/* "Restore purchases" removed — concept is iOS/Android IAP
            specific. On web, subscription state is server-side via
            Stripe Customer ID; nothing to restore client-side. */}
        <p className="text-center text-caption leading-relaxed text-text-muted">
          Auto-renews. Cancel anytime in settings. By continuing you accept our{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-white"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-white"
          >
            Privacy Policy
          </Link>.
        </p>
      </motion.div>
    </PageShell>
  );
}

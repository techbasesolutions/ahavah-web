"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, X } from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import { nameGradient } from "@/components/ui/avatar";
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

import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/app/page-shell";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Feature list — canonical 3 (per screens/11-paywall.md + the canonical
// dark HTML at dark-desktop-html/11-paywall.html) plus a single
// monthly-token-stipend line per the 2026-05-16 sprint integration
// (user-approved Option B 2026-05-17). Stipend per tier:
// 'month'→10, 'quart'→12, 'year'→15 — handled server-side in
// service/checkout/__init__.py:SUBSCRIPTION_TIER_TO_STIPEND.
// The line is intentionally numberless here — concrete counts would
// require per-tier copy that doesn't fit the global features list.
const FEATURES = [
  "See everyone who liked you (full list, not just the count)",
  "Help build a Torah-observant community at the price of a coffee",
  "Monthly tokens included for super-likes, boosts, and reveals",
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

  // ── Shared paywall card content ──────────────────────────────────────
  const paywallCard = (
    <>
      {/* Hero — theme-aware text colors (2026-05-17 cleanup). Token-stipend
          line already in FEATURES array per 2026-05-16 sprint. */}
      <LogoMark size={48} decorative />
      <h1 className="text-center text-display text-(--ink)">Ahavah Premium</h1>
      <p className="max-w-xs text-center text-meta text-(--ink-2)">
        Match more. Worry less.
      </p>

      {/* Features */}
      <ItemGroup className="mt-4 gap-3 w-full">
        {FEATURES.map((f) => (
          <Item key={f} className="items-center px-0 py-0">
            <ItemMedia>
              <IconBadge tone="cta" shape="circle" size="xs">
                <Check strokeWidth={3} />
              </IconBadge>
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-body text-(--ink)">{f}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>

      {/* Tier card grid — canonical (desktop.jsx L1175-L1196 +
          screens/11-paywall.md §Tier card). 3-col grid, each card is a
          flex-col with: optional badge floating above the top border /
          label / price / per-month. Active state = 1.5px lime border +
          lime/10 tinted bg. Replaces the previous Choicebox impl
          (radio-style indicators diverged from canonical's simple
          clickable cards). */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 w-full">
        {TIERS.map((t) => {
          const active = selected === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelected(t.key)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-[18px] p-4 transition",
                "focus-visible:ring-2 focus-visible:ring-(--color-lavender) focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-[1.5px] border-(--color-lime) bg-(--color-lime)/10"
                  : "border border-(--hairline) bg-(--card) hover:bg-(--app)",
              )}
            >
              {/* Badge overhangs the top border per canonical
                  (absolute, top: -10 in spec). */}
              {t.badge ? (
                <span className="absolute -top-2.5">
                  <Pill variant="lime" size="sm">{t.badge}</Pill>
                </span>
              ) : null}
              <span className="mt-1.5 text-body-s text-(--ink) font-semibold">
                {t.label}
              </span>
              <span className="text-h2 font-extrabold tabular-nums text-(--ink)">
                {t.price}
              </span>
              <span className="text-caption text-(--ink-3)">{t.per}</span>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-4 flex flex-col gap-4 w-full">
        <Button size="cta" tone="cta" onClick={handleContinue} disabled={busy}>
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
            className="text-center text-caption font-semibold text-(--color-pink)"
          >
            {errorMessage}
          </p>
        ) : null}
        <p className="text-center text-caption leading-relaxed text-(--ink-3)">
          Auto-renews. Cancel anytime in settings. By continuing you accept our{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-(--ink)"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-(--ink)"
          >
            Privacy Policy
          </Link>.
        </p>
      </div>
    </>
  );

  return (
    <PageShell bottomPad="none" desktopShell="full-bleed" className="overflow-y-auto">
      {/* ── Mobile layout (hidden at md+) ─────────────────────────────── */}
      <div className="md:hidden flex flex-col px-5 pt-6">
        {/* Close */}
        <Button
          nativeButton={false}
          size="icon-tap"
          variant="ghost"
          aria-label="Close"
          className="self-end"
          render={<Link href="/profile" prefetch={false} />}
        >
          <X className="text-(--ink)" />
        </Button>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="mt-2 flex flex-col items-center gap-3"
        >
          {paywallCard}
        </motion.div>
      </div>

      {/* ── Desktop layout (hidden below md) ─────────────────────────── */}
      {/* Canonical PaywallDesktop per screens/11-paywall.md + desktop.jsx
          L1111. Canvas is --bg-elevated (deep dark) NOT a brand gradient
          (the earlier brand-gradient impl was a pre-canonical choice).
          4 decorative blurred profile cards float in the corners
          (Yael / Adina / Daniel / Esther) per canonical spec lines 51-56.
          Modal card centered, 640w, --app bg, --hairline border, deep
          shadow. */}
      <div
        className="hidden md:flex md:items-center md:justify-center min-h-dvh px-12 relative overflow-hidden"
        style={{ background: "var(--bg-elevated)" }}
      >
        {/* Decorative floating profile cards — purely cosmetic, evoke
            "see who liked you". 200×260, 4px white border, 0.85 opacity,
            slight blur, rotated, deep shadow. Brand-gradient bg per card
            (each pair indigo→lavender, indigo→pink etc. via deterministic
            name hash). aria-hidden — the modal card carries the meaning. */}
        {(
          [
            { n: "Yael",   left: "60px",   top: "60px",  rot: -8 },
            { n: "Adina",  right: "60px",  top: "80px",  rot: 6 },
            { n: "Daniel", left: "80px",   bottom: "60px", rot: 5 },
            { n: "Esther", right: "60px",  bottom: "80px", rot: -6 },
          ] as const
        ).map((c) => (
          <div
            key={c.n}
            aria-hidden
            className="absolute w-50 h-65 rounded-3xl overflow-hidden border-4 border-white shadow-[0_16px_50px_rgba(0,0,0,0.45)]"
            style={{
              left: "left" in c ? c.left : undefined,
              right: "right" in c ? c.right : undefined,
              top: "top" in c ? c.top : undefined,
              bottom: "bottom" in c ? c.bottom : undefined,
              transform: `rotate(${c.rot}deg)`,
              opacity: 0.85,
              filter: "blur(0.5px)",
              background: nameGradient(c.n),
            }}
          >
            {/* Large faded initial — 96px / 800w / 20% white per canonical. */}
            <div className="absolute inset-0 flex items-center justify-center text-8xl font-extrabold text-white/20 leading-none">
              {c.n[0]}
            </div>
          </div>
        ))}

        {/* Modal card */}
        <div
          className="relative flex flex-col items-center gap-4 rounded-[28px] border border-(--hairline) w-160 max-w-full p-12 shadow-[0_30px_80px_rgba(0,0,0,0.55)] z-10"
          style={{ background: "var(--app)" }}
        >
          {/* Close — top-right */}
          <Button
            nativeButton={false}
            size="icon-tap"
            variant="ghost"
            aria-label="Close"
            className="absolute top-4 right-4 text-(--ink-2)"
            render={<Link href="/profile" prefetch={false} />}
          >
            <X />
          </Button>

          {paywallCard}
        </div>
      </div>
    </PageShell>
  );
}

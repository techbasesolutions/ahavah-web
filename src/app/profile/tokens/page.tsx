"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ChevronRight,
  Coins,
  CreditCard,
  FileText,
  HelpCircle,
} from "lucide-react";

import { TokenActionIcon } from "@/lib/icon-map";

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
import { LogoMark } from "@/components/brand/logo-mark";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderSubtitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

/**
 * SKU catalog matches the 4 Stripe Products created in Phase 2 (spec §3.2).
 * Keys must match what POST /checkout/tokens accepts on the backend.
 *
 * The `featured` flag drives the canonical "lime-border + cta-tone button"
 * treatment from `desktop-extra.jsx:493`. POPULAR and BEST cards are framed
 * to stand out; SINGLE and STARTER are quiet baseline.
 */
const SKUS = [
  { key: "single",  label: "Single",   price: "$0.99",  tokens: 1,  per: "$0.99 / token", badge: null,        featured: false },
  { key: "starter", label: "Starter",  price: "$4.99",  tokens: 10, per: "$0.50 / token", badge: null,        featured: false },
  { key: "plus",    label: "Plus",     price: "$9.99",  tokens: 22, per: "$0.45 / token", badge: "POPULAR",   featured: true },
  { key: "pro",     label: "Pro",      price: "$19.99", tokens: 50, per: "$0.40 / token", badge: "BEST",      featured: true },
] as const;

/**
 * Placeholder transaction history — until the backend ships a
 * /tokens/history endpoint. Mirrors canonical seed data so the rail
 * has visual weight.
 */
const PLACEHOLDER_HISTORY: ReadonlyArray<{
  date: string;
  title: string;
  delta: number;
}> = [
  { date: "Today",       title: "Boost used on Discover",        delta: -1 },
  { date: "Today",       title: "Super Like sent to Yael",       delta: -1 },
  { date: "2 days ago",  title: "Bought Starter pack",           delta: +10 },
  { date: "5 days ago",  title: "Boost used on Map",             delta: -1 },
  { date: "1 week ago",  title: "Super Like sent to Adina",      delta: -1 },
  { date: "2 weeks ago", title: "Welcome bonus",                 delta: +3  },
];

const HOW_IT_WORKS: ReadonlyArray<{
  Icon: typeof TokenActionIcon.Boost;
  title: string;
  body: string;
}> = [
  { Icon: TokenActionIcon.Boost,     title: "Boost",      body: "Be one of the first profiles people see for 30 minutes." },
  { Icon: TokenActionIcon.SuperLike, title: "Super Like", body: "Skip the queue. Your profile shows up first in their deck." },
  { Icon: TokenActionIcon.Rewind,    title: "Rewind",     body: "Undo your last pass and reconsider." },
];

export default function TokensPage() {
  const { balance } = useTokenBalance();
  const [selected, setSelected] = useState<string>("plus");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSku = SKUS.find((s) => s.key === selected) ?? SKUS[2];

  const buy = async (skuKey: string) => {
    if (busy) return;
    setSelected(skuKey);
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post<{ url?: string | null }>(
        "/checkout/tokens",
        { sku: skuKey },
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
          setErrorMessage("Token purchases aren't available yet. Try again shortly.");
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
    <PageShell
      bottomPad="nav"
      desktopShell="sidebar"
      topBarTitle="Tokens"
      topBarActions={
        <Button
          variant="outline"
          size="sm"
          className="hidden md:inline-flex"
        >
          <HelpCircle className="size-3.5" />
          How tokens work
        </Button>
      }
    >
      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Tokens</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile body — single column ─────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-6 px-5 pt-2">
        <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
          <Card tone="default">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-overline text-(--ink-2)">Your balance</p>
                <p className="mt-1 flex items-center gap-2 text-display text-lime tabular-nums">
                  <Coins className="size-6" aria-hidden />
                  {balance}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.08 }}>
          <h2 className="text-h3 text-(--ink)">Get more tokens</h2>
          <PageHeaderSubtitle>
            Use tokens for reveals, super-likes, day passes, and boosts.
          </PageHeaderSubtitle>
          <Choicebox
            value={selected}
            onValueChange={(v) => setSelected(v ?? "starter")}
            className="mt-4 grid gap-3"
          >
            {SKUS.map((s) => (
              <ChoiceboxItem key={s.key} value={s.key} id={`sku-${s.key}`}>
                <ChoiceboxIndicator variant="brand" />
                <ChoiceboxItemHeader>
                  <ChoiceboxItemTitle className="flex items-center gap-2 text-body text-(--ink)">
                    {s.label} · {s.price}
                    {s.badge ? (
                      <Pill variant="lime" size="sm">
                        {s.badge}
                      </Pill>
                    ) : null}
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
            onClick={() => buy(selected)}
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
            <p role="alert" aria-live="polite" className="mt-3 text-meta text-pink">
              {errorMessage}
            </p>
          ) : null}
        </motion.div>
      </div>

      {/* ── Desktop 2-col body ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[1fr_360px] gap-6 px-8 pt-6 pb-8 flex-1 min-h-0">
        {/* LEFT — wallet hero + SKU grid + how-it-works */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Wallet hero */}
          <div
            className="relative overflow-hidden rounded-3xl px-9 py-8 text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--bg-indigo) 0%, #5524F5 60%, #9F76EA 100%)",
            }}
          >
            <span
              aria-hidden
              className="absolute top-6 right-8 opacity-60"
            >
              <LogoMark size={64} decorative />
            </span>
            <div className="relative">
              <p className="text-overline opacity-85 m-0">Your balance</p>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-marketing tabular-nums leading-none font-extrabold tracking-tight">
                  {balance}
                </span>
                <span className="text-lg opacity-85 pb-3.5">tokens</span>
              </div>
              <p className="flex items-center gap-2 mt-4.5 text-sm opacity-90 m-0">
                <span>1 token = 1 Boost</span>
                <span className="opacity-60">·</span>
                <span>1 Super Like</span>
              </p>
              <div className="flex gap-3 mt-6">
                <Button
                  size="tap"
                  tone="cta"
                  lift="float"
                  render={<Link href="/profile" prefetch={false} />}
                >
                  <TokenActionIcon.Boost className="size-4" />
                  Boost me now
                </Button>
                <Button
                  size="tap"
                  tone="brand"
                  render={<Link href="/discover" prefetch={false} />}
                >
                  <TokenActionIcon.SuperLike className="size-4" fill="currentColor" />
                  Send a Super Like
                </Button>
              </div>
            </div>
          </div>

          {/* SKU grid */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-h3 text-(--ink) m-0">Top up</h2>
              <span className="text-caption text-(--ink-3)">
                One-time purchase · no subscription
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3.5">
              {SKUS.map((s) => {
                const pillVariant: "lime" | "lavender" =
                  s.featured ? "lime" : "lavender";
                return (
                  <div
                    key={s.key}
                    className={
                      s.featured
                        ? "flex flex-col gap-2.5 rounded-3xl bg-card border-2 border-lime p-5"
                        : "flex flex-col gap-2.5 rounded-3xl bg-card border border-(--hairline) p-5"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-caption font-semibold text-(--ink-2)">
                        {s.label}
                      </span>
                      {s.badge ? (
                        <Pill variant={pillVariant} size="sm">
                          {s.badge}
                        </Pill>
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-display-lg text-(--ink) tabular-nums leading-none">
                        {s.tokens}
                      </span>
                      <span className="text-caption text-(--ink-3)">
                        tokens
                      </span>
                    </div>
                    <div className="mt-auto pt-3 border-t border-(--hairline)">
                      <p className="text-meta font-bold text-(--ink) m-0">
                        {s.price}
                      </p>
                      <p className="text-caption text-(--ink-3) m-0">{s.per}</p>
                    </div>
                    <Button
                      size="tap"
                      tone={s.featured ? "cta" : "elevated"}
                      onClick={() => buy(s.key)}
                      disabled={busy}
                      className="w-full"
                    >
                      {busy && selected === s.key
                        ? "Opening…"
                        : s.featured
                          ? "Buy now"
                          : "Select"}
                    </Button>
                  </div>
                );
              })}
            </div>
            {errorMessage ? (
              <p
                role="alert"
                aria-live="polite"
                className="mt-3 text-meta text-pink"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>

          {/* How tokens work */}
          <Card tone="default">
            <CardContent className="p-5.5">
              <p className="text-overline text-(--ink-2) mb-3.5 m-0">
                How tokens work
              </p>
              <div className="grid grid-cols-3 gap-4.5">
                {HOW_IT_WORKS.map(({ Icon, title, body }) => (
                  <div key={title} className="flex flex-col gap-2.5">
                    <span
                      aria-hidden
                      className="flex size-10 items-center justify-center rounded-xl bg-lavender/20 text-lavender"
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <p className="text-meta font-bold text-(--ink) m-0">
                      {title}
                    </p>
                    <p className="text-caption leading-relaxed text-(--ink-2) m-0">
                      {body}
                    </p>
                    <div>
                      <Pill
                        size="sm"
                        variant="outline"
                        className="border-lavender/40 text-lavender bg-transparent"
                      >
                        1 token
                      </Pill>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — history + payment methods rail */}
        <div className="flex flex-col gap-4 min-h-0">
          <Card tone="default" className="flex-1 min-h-0">
            <CardContent className="flex flex-col gap-3.5 p-5 h-full">
              <div className="flex items-center justify-between">
                <p className="text-overline text-(--ink-2) m-0">History</p>
                <FileText className="size-3.5 text-(--ink-3)" aria-hidden />
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
                {PLACEHOLDER_HISTORY.map((h, i) => {
                  const isCredit = h.delta > 0;
                  return (
                    <div
                      key={i}
                      className={
                        i === PLACEHOLDER_HISTORY.length - 1
                          ? "flex items-center gap-3 py-2.5"
                          : "flex items-center gap-3 py-2.5 border-b border-(--hairline)"
                      }
                    >
                      <span
                        aria-hidden
                        className={
                          isCredit
                            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lime/20 text-(--color-success) text-sm font-extrabold tabular-nums"
                            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-lavender/20 text-lavender text-sm font-extrabold tabular-nums"
                        }
                      >
                        {isCredit ? `+${h.delta}` : h.delta}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-meta text-(--ink) m-0 truncate">
                          {h.title}
                        </p>
                        <p className="text-caption text-(--ink-3) m-0">
                          {h.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card tone="default">
            <CardContent className="flex items-center gap-3 p-5">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lavender/20 text-lavender"
              >
                <CreditCard className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-meta font-semibold text-(--ink) m-0 truncate">
                  Manage payment methods
                </p>
                <p className="text-caption text-(--ink-3) m-0 truncate">
                  Visa · 4242 · default
                </p>
              </div>
              <ChevronRight
                aria-hidden
                className="size-3.5 text-(--ink-3) shrink-0"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </PageShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Settings2,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/kibo-ui/pill";

import { BackButton } from "@/components/app/back-button";
import { LogoMark } from "@/components/brand/logo-mark";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Billing portal — native read surfaces + per-action Stripe deep-links.
 *
 * Rebuilt 2026-05-20 (spec: docs/superpowers/specs/2026-05-20-billing-portal-design.md).
 * Replaces the old PLACEHOLDER_SUBSCRIPTION + single generic redirect button:
 *   - Fetches real subscription + invoices from GET /billing/subscription
 *     and GET /billing/invoices.
 *   - Each action button deep-links straight into the matching Stripe
 *     Customer Portal flow via GET /billing-portal?flow=<type> (money
 *     mutations + card capture stay on Stripe's secure surface).
 */

type Subscription = {
  status: string;
  plan_label?: string;
  price_label?: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  card_brand?: string | null;
  card_last4?: string | null;
};

type Invoice = {
  id: string;
  created?: number | null;
  amount_label?: string;
  status?: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

type PortalFlow =
  | "subscription_update"
  | "payment_method_update"
  | "subscription_cancel";

const ACTIONS: { Icon: typeof CreditCard; label: string; flow?: PortalFlow }[] = [
  { Icon: Sparkles, label: "Switch plan or billing cycle", flow: "subscription_update" },
  { Icon: CreditCard, label: "Update payment method", flow: "payment_method_update" },
  { Icon: X, label: "Cancel subscription", flow: "subscription_cancel" },
  { Icon: Settings2, label: "More billing options" },
];

function fmtDate(unixSeconds?: number | null): string {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPortalPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, inv] = await Promise.all([
          apiClient.get<Subscription>("/billing/subscription"),
          apiClient.get<{ invoices: Invoice[] }>("/billing/invoices"),
        ]);
        if (cancelled) return;
        setSub(s);
        setInvoices(inv.invoices ?? []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setError("Sign in again to manage billing.");
        } else if (err instanceof ApiError && err.status === 503) {
          setError("Billing isn't available yet. Try again shortly.");
        } else {
          setError("Couldn't load your billing details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPortal = useCallback(async (flow?: PortalFlow) => {
    const key = flow ?? "portal";
    setOpening(key);
    setError(null);
    try {
      const path = flow
        ? `/billing-portal?flow=${encodeURIComponent(flow)}`
        : "/billing-portal";
      const res = await apiClient.get<{ url?: string }>(path);
      if (res.url) {
        window.location.assign(res.url);
        return;
      }
      setError("Stripe didn't return a billing URL. Try again.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("You don't have an active subscription yet.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Sign in again to manage billing.");
      } else if (err instanceof ApiError && err.status === 503) {
        setError("Billing isn't available yet. Try again shortly.");
      } else {
        setError("Couldn't reach the billing service.");
      }
    } finally {
      setOpening(null);
    }
  }, []);

  const hasSubscription = !!sub && sub.status !== "none";
  const active = sub?.status === "active" || sub?.status === "trialing";

  return (
    <PageShell desktopShell="sidebar" topBarTitle="Manage subscription" bottomPad="default">
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/profile" label="Back to profile" />
        <PageHeaderTitle>Manage subscription</PageHeaderTitle>
      </PageHeader>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:px-8">
        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-meta font-semibold text-pink"
          >
            {error}
          </p>
        ) : null}

        {/* Current plan / free-plan card */}
        <Card tone="default">
          <CardContent className="p-6">
            {loading ? (
              <p className="text-body text-(--ink-3)">Loading your plan…</p>
            ) : hasSubscription ? (
              <>
                <p className="text-overline text-(--ink-2) m-0">Current subscription</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-h1 text-(--ink)">{sub?.plan_label ?? "Premium"}</span>
                  <Pill variant={active ? "lime" : "lavender"} size="sm">
                    {(sub?.status ?? "").toUpperCase() || "INACTIVE"}
                  </Pill>
                </div>
                {sub?.price_label ? (
                  <p className="m-0 mt-0.5 text-caption text-(--ink-3)">{sub.price_label}</p>
                ) : null}

                <div className="mt-4.5 flex flex-col gap-2.5">
                  {sub?.card_brand && sub?.card_last4 ? (
                    <KvRow
                      label="Payment method"
                      value={`${cap(sub.card_brand)} . ${sub.card_last4}`}
                    />
                  ) : null}
                  {sub?.current_period_end ? (
                    <KvRow
                      label={sub?.cancel_at_period_end ? "Access until" : "Next charge"}
                      value={fmtDate(sub.current_period_end)}
                    />
                  ) : null}
                </div>

                {sub?.cancel_at_period_end ? (
                  <p className="m-0 mt-4 text-caption font-semibold text-pink">
                    Your subscription is set to cancel on {fmtDate(sub.current_period_end)}.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-overline text-(--ink-2) m-0">Current plan</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-h1 text-(--ink)">Free</span>
                </div>
                <p className="m-0 mt-1 text-body text-(--ink-2)">
                  You don&apos;t have an active subscription. Upgrade to unlock
                  Premium features.
                </p>
                <div className="mt-4">
                  <Button tone="cta" size="tap" render={<Link href="/paywall" prefetch={false} />}>
                    See plans
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manage actions — only when there's a subscription */}
        {hasSubscription ? (
          <Card tone="default">
            <CardContent className="p-5">
              <p className="m-0 mb-2.5 text-overline text-(--ink-2)">Manage billing</p>
              <div className="flex flex-col gap-1.5">
                {ACTIONS.map(({ Icon, label, flow }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    onClick={() => openPortal(flow)}
                    disabled={opening !== null}
                    className="h-auto justify-start gap-3 px-3 py-2.5"
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-(--hairline) bg-card text-(--ink-2)"
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex-1 truncate text-left text-meta font-medium text-(--ink)">
                      {opening === (flow ?? "portal") ? "Opening…" : label}
                    </span>
                    <ChevronRight aria-hidden className="size-3.5 shrink-0 text-(--ink-3)" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Invoices */}
        {hasSubscription ? (
          <Card tone="default">
            <CardContent className="p-5">
              <p className="m-0 mb-2.5 flex items-center gap-2 text-overline text-(--ink-2)">
                <FileText className="size-3.5" aria-hidden />
                Invoices
              </p>
              {invoices.length === 0 ? (
                <p className="m-0 text-caption text-(--ink-3)">No invoices yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-(--hairline)">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="m-0 truncate text-meta font-medium text-(--ink)">
                          {fmtDate(inv.created)}
                        </p>
                        <p className="m-0 text-caption text-(--ink-3)">
                          {inv.amount_label}
                          {inv.status ? ` . ${inv.status}` : ""}
                        </p>
                      </div>
                      {inv.invoice_pdf ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Download invoice PDF"
                          render={
                            <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" />
                          }
                        >
                          <Download className="size-3.5" />
                        </Button>
                      ) : null}
                      {inv.hosted_invoice_url ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View invoice"
                          render={
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" />
                          }
                        >
                          <ExternalLink className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* PCI footer */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-lime/15 text-lime"
          >
            <Shield className="size-3.5" />
          </span>
          <p className="m-0 max-w-135 text-caption leading-relaxed text-(--ink-3)">
            We never see your card details. Payment and billing data live with
            Stripe (PCI-DSS Level 1, 3-D Secure where required).
          </p>
        </div>

        <div className="hidden md:block">
          <Button variant="outline" size="tap" render={<Link href="/profile" prefetch={false} />}>
            <ArrowLeft className="size-3.5" />
            Back to profile
          </Button>
        </div>

        {/* Decorative brand mark, desktop only */}
        <span aria-hidden className="pointer-events-none hidden opacity-40 md:block">
          <LogoMark size={32} decorative />
        </span>
      </div>
    </PageShell>
  );
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span className="text-caption text-(--ink-3)">{label}</span>
      <span className="text-meta font-semibold text-(--ink)">{value}</span>
    </div>
  );
}

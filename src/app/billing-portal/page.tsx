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
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Pill } from "@/components/kibo-ui/pill";

import { BackButton } from "@/components/app/back-button";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Billing portal — native subscription + invoice surfaces with per-action
 * Stripe Customer Portal deep-links.
 *
 * Rebuilt 2026-05-20 (spec: docs/superpowers/specs/2026-05-20-billing-portal-design.md)
 * with SEPARATE mobile + desktop layouts, primitives only:
 *   - Desktop (md:+) mirrors the canonical 2-column treatment from
 *     desktop-extra.jsx `BillingPortalDesktop` (1.4fr gradient hero left,
 *     supporting cards right) but wired to real data + per-action buttons
 *     (the canonical's auto-redirect was the exact PDF complaint).
 *   - Mobile is a single thumb-reachable column.
 * Data comes from GET /billing/subscription + /billing/invoices; each action
 * deep-links via GET /billing-portal?flow=<type>. Card capture + money
 * mutations stay on Stripe's secure surface.
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

type ActionDef = {
  Icon: typeof CreditCard;
  label: string;
  flow?: PortalFlow;
  tone: "brand" | "destructive" | "muted";
};

const ACTIONS: ActionDef[] = [
  { Icon: Sparkles, label: "Switch plan or billing cycle", flow: "subscription_update", tone: "brand" },
  { Icon: CreditCard, label: "Update payment method", flow: "payment_method_update", tone: "brand" },
  { Icon: X, label: "Cancel subscription", flow: "subscription_cancel", tone: "destructive" },
  { Icon: Settings2, label: "More billing options", tone: "muted" },
];

function fmtDate(unixSeconds?: number | null): string {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function cap(s?: string | null): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// ---------------------------------------------------------------------------
// Shared section renderers (so mobile + desktop stay in sync)
// ---------------------------------------------------------------------------

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" aria-live="polite" className="text-meta font-semibold text-pink">
      {error}
    </p>
  );
}

function PlanBlock({ sub }: { sub: Subscription }) {
  const active = sub.status === "active" || sub.status === "trialing";
  return (
    <>
      <p className="m-0 text-overline text-(--ink-2)">Current subscription</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-h1 text-(--ink)">{sub.plan_label ?? "Premium"}</span>
        <Pill variant={active ? "lime" : "lavender"} size="sm">
          {(sub.status || "inactive").toUpperCase()}
        </Pill>
      </div>
      {sub.price_label ? (
        <p className="m-0 mt-0.5 text-caption text-(--ink-3)">{sub.price_label}</p>
      ) : null}

      <div className="mt-4.5 flex flex-col gap-3">
        {sub.card_brand && sub.card_last4 ? (
          <PaymentMethodChip brand={sub.card_brand} last4={sub.card_last4} />
        ) : null}
        {sub.current_period_end ? (
          <KvRow
            label={sub.cancel_at_period_end ? "Access until" : "Next charge"}
            value={fmtDate(sub.current_period_end)}
          />
        ) : null}
      </div>

      {sub.cancel_at_period_end ? (
        <p className="m-0 mt-4 text-caption font-semibold text-pink">
          Your subscription is set to cancel on {fmtDate(sub.current_period_end)}.
        </p>
      ) : null}
    </>
  );
}

function FreePlanBlock() {
  return (
    <>
      <p className="m-0 text-overline text-(--ink-2)">Current plan</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-h1 text-(--ink)">Free</span>
      </div>
      <p className="m-0 mt-1 text-body text-(--ink-2)">
        You don&apos;t have an active subscription. Upgrade to unlock Premium
        features.
      </p>
      <div className="mt-4">
        <Button tone="cta" size="tap" render={<Link href="/paywall" prefetch={false} />}>
          See plans
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </>
  );
}

function ActionRows({
  opening,
  onAction,
}: {
  opening: string | null;
  onAction: (flow?: PortalFlow) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {ACTIONS.map(({ Icon, label, flow, tone }) => {
        const key = flow ?? "portal";
        return (
          <Item
            key={label}
            variant="outline"
            render={
              <button
                type="button"
                onClick={() => onAction(flow)}
                disabled={opening !== null}
              />
            }
            className="min-h-tap disabled:opacity-60"
          >
            <ItemMedia>
              <IconBadge tone={tone} shape="square" size="md">
                <Icon />
              </IconBadge>
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-meta font-medium text-(--ink)">
                {opening === key ? "Opening…" : label}
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <ChevronRight aria-hidden className="size-4 text-(--ink-3)" />
            </ItemActions>
          </Item>
        );
      })}
    </div>
  );
}

function InvoicesCard({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card tone="default">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <IconBadge tone="brand" shape="square" size="sm">
            <FileText />
          </IconBadge>
          <h3 className="m-0 text-h3 text-(--ink)">Invoices</h3>
        </div>
        {invoices.length === 0 ? (
          <p className="m-0 text-meta text-(--ink-3)">No invoices yet.</p>
        ) : (
          <div className="flex flex-col">
            {invoices.map((inv, i) => (
              <Item
                key={inv.id}
                className={`min-h-tap gap-3 ${i > 0 ? "border-t border-(--hairline)" : ""} rounded-none px-0`}
              >
                <ItemContent className="gap-1">
                  <ItemTitle className="text-body font-semibold text-(--ink)">
                    {fmtDate(inv.created)}
                  </ItemTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-meta font-medium text-(--ink-2)">
                      {inv.amount_label}
                    </span>
                    {inv.status ? (
                      <Pill variant={inv.status === "paid" ? "lime" : "lavender"} size="sm">
                        {inv.status}
                      </Pill>
                    ) : null}
                  </div>
                </ItemContent>
                <ItemActions>
                  {inv.invoice_pdf ? (
                    <Button
                      variant="ghost"
                      size="icon-tap"
                      aria-label="Download invoice PDF"
                      render={<a href={inv.invoice_pdf} target="_blank" rel="noreferrer" />}
                    >
                      <Download className="size-4.5" />
                    </Button>
                  ) : null}
                  {inv.hosted_invoice_url ? (
                    <Button
                      variant="ghost"
                      size="icon-tap"
                      aria-label="View invoice"
                      render={
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" />
                      }
                    >
                      <ExternalLink className="size-4.5" />
                    </Button>
                  ) : null}
                </ItemActions>
              </Item>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PciNote() {
  return (
    <div className="flex items-center gap-3">
      <IconBadge tone="success" shape="square" size="sm">
        <Shield />
      </IconBadge>
      <p className="m-0 max-w-135 text-caption leading-relaxed text-(--ink-3)">
        We never see your card details. Payment and billing data live with
        Stripe (PCI-DSS Level 1, 3-D Secure where required).
      </p>
    </div>
  );
}

function PaymentMethodChip({ brand, last4 }: { brand: string; last4: string }) {
  return (
    <Item variant="muted" className="gap-3">
      <ItemMedia>
        <IconBadge tone="brand" shape="square" size="md">
          <CreditCard />
        </IconBadge>
      </ItemMedia>
      <ItemContent className="gap-0.5">
        <span className="text-caption text-(--ink-3)">Card on file</span>
        <span className="text-meta font-semibold tracking-wide text-(--ink)">
          {cap(brand)} <span aria-hidden>•••• </span>
          <span className="sr-only">ending in </span>
          {last4}
        </span>
      </ItemContent>
      <ItemActions>
        <Pill variant="lavender" size="sm">
          Secured
        </Pill>
      </ItemActions>
    </Item>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2.5 px-1">
      <span className="text-caption text-(--ink-3)">{label}</span>
      <span className="text-meta font-semibold text-(--ink)">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
    setOpening(flow ?? "portal");
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

  return (
    <PageShell desktopShell="sidebar" topBarTitle="Manage subscription" bottomPad="default">
      {/* Mobile header */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/profile" label="Back to profile" />
        <PageHeaderTitle>Manage subscription</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile ── single thumb-reachable column ─────────────────────── */}
      <div className="md:hidden flex flex-col gap-4 px-5 py-5">
        <ErrorBanner error={error} />

        <Card tone="default">
          <CardContent className="p-6">
            {loading ? (
              <p className="text-body text-(--ink-3)">Loading your plan…</p>
            ) : hasSubscription && sub ? (
              <PlanBlock sub={sub} />
            ) : (
              <FreePlanBlock />
            )}
          </CardContent>
        </Card>

        {hasSubscription ? (
          <Card tone="default">
            <CardContent className="p-5">
              <p className="m-0 mb-2.5 text-overline text-(--ink-2)">Manage billing</p>
              <ActionRows opening={opening} onAction={openPortal} />
            </CardContent>
          </Card>
        ) : null}

        {hasSubscription ? <InvoicesCard invoices={invoices} /> : null}

        <PciNote />
      </div>

      {/* ── Desktop (md:+) ── canonical 2-col: 1.4fr hero + 1fr sidebar ─── */}
      <div className="hidden md:grid grid-cols-[1.4fr_1fr] items-start gap-8 px-12 py-8">
        {/* LEFT — gradient hero: plan + actions */}
        <div className="flex flex-col gap-4">
          <ErrorBanner error={error} />
          <Card
            tone="default"
            className="relative overflow-hidden rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, var(--card), color-mix(in oklch, var(--color-lavender) 10%, var(--card)))",
            }}
          >
            <CardContent className="flex flex-col gap-6 p-10">
              <div className="flex items-center gap-3.5">
                <IconBadge tone="brand" shape="circle" size="xl">
                  <CreditCard />
                </IconBadge>
                <div>
                  <p className="m-0 text-overline text-(--ink-2)">Subscription billing</p>
                  <h2 className="m-0 text-h2 text-(--ink)">Manage your billing</h2>
                </div>
              </div>

              {loading ? (
                <p className="text-body text-(--ink-3)">Loading your plan…</p>
              ) : hasSubscription && sub ? (
                <>
                  <div className="max-w-130">
                    <PlanBlock sub={sub} />
                  </div>
                  <ActionRows opening={opening} onAction={openPortal} />
                </>
              ) : (
                <FreePlanBlock />
              )}

              <div className="mt-2 border-t border-(--hairline) pt-5">
                <PciNote />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — invoices + back */}
        <div className="flex flex-col gap-4">
          {hasSubscription ? (
            <InvoicesCard invoices={invoices} />
          ) : (
            <Card tone="default">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center gap-2.5">
                  <IconBadge tone="muted" shape="square" size="sm">
                    <FileText />
                  </IconBadge>
                  <h3 className="m-0 text-h3 text-(--ink)">Invoices</h3>
                </div>
                <p className="m-0 text-meta text-(--ink-3)">
                  Invoices appear here once you subscribe.
                </p>
              </CardContent>
            </Card>
          )}
          <Button variant="outline" size="tap" render={<Link href="/profile" prefetch={false} />}>
            <ArrowLeft className="size-3.5" />
            Back to profile
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

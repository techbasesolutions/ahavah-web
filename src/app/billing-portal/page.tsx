"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
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
 * Intermediate redirect page for the Stripe Customer Portal.
 *
 * Canonical port from `8-New-Desktops/new-desktop-export/desktop-extra.jsx`
 * (`BillingPortalDesktop`, line 937). Two-column layout: left = gradient
 * redirect card with progress ring + 3-step progress + PCI-DSS footer;
 * right = current-subscription summary + "What you can do in Stripe" card.
 *
 * Behavior preserved from the previous implementation: mount → GET
 * `/billing-portal` → `window.location.assign(url)` on success. Error
 * states surface inline above the back-to-profile CTA.
 *
 * Subscription data on the right column is a placeholder — there's no
 * `/subscription` endpoint yet. When that backend lands, swap the static
 * `PLACEHOLDER_SUBSCRIPTION` for the real fetch.
 */
const PLACEHOLDER_SUBSCRIPTION = {
  plan: "Premium",
  price: "$8.99 / month",
  renews: "May 14, 2026",
  paymentMethod: "Visa · 4242",
  nextCharge: "May 14, 2026 · $8.99",
  started: "Feb 14, 2026",
  cycle: "Monthly · auto-renew",
} as const;

const STRIPE_ACTIONS = [
  { Icon: CreditCard, label: "Update payment method" },
  { Icon: FileText,   label: "Download past invoices" },
  { Icon: X,          label: "Cancel or pause subscription" },
  { Icon: Sparkles,   label: "Switch plan or billing cycle" },
] as const;

export default function BillingPortalRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.get<{ url?: string }>("/billing-portal");
        if (cancelled) return;
        if (res.url) {
          window.location.assign(res.url);
          return;
        }
        setError("Stripe didn't return a billing URL. Try again.");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 400) {
            setError("You don't have an active subscription yet.");
          } else if (err.status === 401) {
            setError("Sign in again to manage billing.");
          } else if (err.status === 503) {
            setError("Billing isn't available yet. Try again shortly.");
          } else {
            setError(err.message || "Couldn't open billing.");
          }
        } else {
          setError("Couldn't reach the billing service.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell
      desktopShell="sidebar"
      topBarTitle="Manage subscription"
      bottomPad="none"
    >
      {/* ── Mobile header ───────────────────────────────────────────── */}
      <PageHeader pad="tight" className="md:hidden flex items-center gap-3">
        <BackButton fallback="/profile" label="Back to profile" />
        <PageHeaderTitle>Manage subscription</PageHeaderTitle>
      </PageHeader>

      {/* ── Mobile body — single column ─────────────────────────────── */}
      <div className="md:hidden flex flex-col items-center gap-4 px-5 pt-8 text-center">
        {error ? (
          <>
            <p className="text-body text-(--ink-2)">{error}</p>
            <Button
              variant="outline"
              size="tap"
              onClick={() => router.push("/profile")}
            >
              Back to profile
            </Button>
          </>
        ) : (
          <p className="text-body text-(--ink-2)">Opening Stripe…</p>
        )}
      </div>

      {/* ── Desktop 2-col body ─────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[1.4fr_1fr] gap-8 px-12 py-8 items-center flex-1 min-h-0">
        {/* LEFT — redirect card with conic-gradient progress ring */}
        <Card
          tone="default"
          className="relative overflow-hidden rounded-3xl border border-(--hairline) p-14"
          style={{
            background:
              "linear-gradient(135deg, var(--card), color-mix(in oklch, var(--color-lavender) 8%, var(--card)))",
          }}
        >
          <span
            aria-hidden
            className="absolute top-6 right-6 opacity-50"
          >
            <LogoMark size={48} decorative />
          </span>

          <CardContent className="flex flex-col gap-6 p-0">
            {/* Icon + heading */}
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-full p-1 box-border"
                style={{
                  background:
                    "conic-gradient(from 180deg, var(--color-lime) 0deg, var(--color-lime) 240deg, var(--hairline) 240deg, var(--hairline) 360deg)",
                }}
              >
                <span className="flex size-full items-center justify-center rounded-full bg-card">
                  <CreditCard className="size-4.5 text-lavender" />
                </span>
              </span>
              <div>
                <p className="text-overline text-(--ink-2)">
                  Redirecting securely
                </p>
                <h2 className="text-h2 text-(--ink) m-0">
                  {error ? "Couldn't open Stripe" : "Opening Stripe…"}
                </h2>
              </div>
            </div>

            <p className="text-body text-(--ink-2) m-0 max-w-130 leading-relaxed">
              We&apos;re sending you to Stripe&apos;s secure billing portal to
              manage your payment method, update your subscription, or
              download invoices.
            </p>

            {/* Step progress */}
            <div className="flex items-center gap-3 mt-2">
              <ProgressStep n={1} state="done" label="Generating link" />
              <ProgressLine />
              <ProgressStep n={2} state="done" label="Verifying session" />
              <ProgressLine />
              <ProgressStep
                n={3}
                state={error ? "muted" : "active"}
                label="Handing off to Stripe"
              />
            </div>

            {/* Inline error */}
            {error ? (
              <p
                role="alert"
                aria-live="polite"
                className="text-meta font-semibold text-pink m-0"
              >
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-3.5 mt-2">
              <Button
                variant="outline"
                size="tap"
                render={<Link href="/profile" prefetch={false} />}
              >
                <ArrowLeft className="size-3.5" />
                Back to profile
              </Button>
              <span className="text-caption text-(--ink-3)">
                Not redirecting?{" "}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="font-semibold text-lavender underline-offset-2 hover:underline"
                >
                  Open Stripe manually
                </button>
              </span>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-5 border-t border-(--hairline)">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-lime/15 text-lime"
              >
                <Shield className="size-3.5" />
              </span>
              <p className="text-caption text-(--ink-3) m-0 max-w-135 leading-relaxed">
                We never see your card details. Payment and billing data live
                with Stripe — PCI-DSS Level 1, 3-D Secure where required.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — current subscription + Stripe actions */}
        <div className="flex flex-col gap-4">
          <Card tone="default">
            <CardContent className="p-6">
              <p className="text-overline text-(--ink-2) m-0">
                Current subscription
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-h1 text-(--ink)">
                  {PLACEHOLDER_SUBSCRIPTION.plan}
                </span>
                <Pill variant="lime" size="sm">
                  ACTIVE
                </Pill>
              </div>
              <p className="text-caption text-(--ink-3) mt-0.5 m-0">
                {PLACEHOLDER_SUBSCRIPTION.price} · renews{" "}
                {PLACEHOLDER_SUBSCRIPTION.renews}
              </p>
              <div className="mt-4.5 flex flex-col gap-2.5">
                <KvRow
                  label="Payment method"
                  value={PLACEHOLDER_SUBSCRIPTION.paymentMethod}
                />
                <KvRow
                  label="Next charge"
                  value={PLACEHOLDER_SUBSCRIPTION.nextCharge}
                />
                <KvRow
                  label="Started"
                  value={PLACEHOLDER_SUBSCRIPTION.started}
                />
                <KvRow label="Plan" value={PLACEHOLDER_SUBSCRIPTION.cycle} />
              </div>
            </CardContent>
          </Card>

          <Card tone="default">
            <CardContent className="p-5">
              <p className="text-overline text-(--ink-2) mb-2.5 m-0">
                What you can do in Stripe
              </p>
              <div className="flex flex-col gap-2">
                {STRIPE_ACTIONS.map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent"
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card border border-(--hairline) text-(--ink-2)"
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex-1 text-meta font-medium text-(--ink) truncate">
                      {label}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-3.5 text-(--ink-3) shrink-0"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function ProgressStep({
  n,
  state,
  label,
}: {
  n: number;
  state: "done" | "active" | "muted";
  label: string;
}) {
  const tile =
    state === "done"
      ? "bg-lime text-black"
      : state === "active"
        ? "bg-lavender/20 text-lavender"
        : "bg-card border border-(--hairline) text-(--ink-3)";
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-overline font-extrabold ${tile}`}
      >
        {state === "done" ? <Check className="size-3" strokeWidth={3} /> : n}
      </span>
      <span
        className={
          state === "muted"
            ? "text-caption text-(--ink-3)"
            : state === "active"
              ? "text-caption font-bold text-(--ink)"
              : "text-caption font-medium text-(--ink)"
        }
      >
        {label}
      </span>
    </div>
  );
}

function ProgressLine() {
  return (
    <span aria-hidden className="flex-1 h-px bg-(--hairline)" />
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span className="text-caption text-(--ink-3)">{label}</span>
      <span className="text-meta font-semibold text-(--ink)">{value}</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader, PageHeaderTitle, PageShell } from "@/components/app/page-shell";
import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Intermediate redirect page for the Stripe Customer Portal.
 *
 * GET /billing-portal returns `{url: "https://billing.stripe.com/..."}`
 * which we then `window.location.assign` to. We can't do that
 * server-side because the API is on a different origin and the user's
 * session token is in a same-origin cookie that the API proxy strips
 * outside of /api/* — so it has to be a client-side fetch.
 *
 * Renders a minimal "Redirecting…" surface while the API call is in
 * flight. On error: shows the error message + a back-to-profile CTA
 * (most common case is `400 No active subscription` for free users
 * who landed here by bookmarking).
 */
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
    <PageShell>
      <PageHeader>
        <PageHeaderTitle>Manage subscription</PageHeaderTitle>
      </PageHeader>
      <div className="flex flex-col items-center gap-4 px-5 pt-12 text-center">
        {error ? (
          <>
            <p className="text-body text-(--ink-2)">{error}</p>
            <Button
              variant="default"
              size="tap"
              onClick={() => router.push("/profile")}
              className="rounded-full"
            >
              Back to profile
            </Button>
          </>
        ) : (
          <>
            <p className="text-body text-(--ink-2)">
              Opening Stripe…
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}

"use client";

import { useCallback, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Shared hook for the /verify/{bronze,silver,gold} CTA. All three tiers
 * call the same backend endpoint — Stripe Identity covers document +
 * liveness + selfie in one VerificationSession, and the backend webhook
 * decides what verification_level the user gets based on what Stripe
 * approved. Bronze/Silver pages are entry-point copy only; the flow is
 * identical to Gold.
 *
 * On success, redirects the browser to Stripe's hosted URL.
 * On failure, exposes a human-readable errorMessage the page can render.
 *
 * 503 specifically (Stripe not configured) gets a clearer message —
 * production won't have Stripe keys until launch and we want the user
 * to understand it's a deployment thing, not their problem.
 */

export type StartVerificationResult = {
  start: () => Promise<void>;
  busy: boolean;
  errorMessage: string | null;
};

type StartIdFlowResponse = {
  session_id?: string;
  client_secret?: string;
  url?: string | null;
};

export function useStartVerification(): StartVerificationResult {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post<StartIdFlowResponse>(
        "/verification/start-id-flow",
        {},
      );
      const url = res.url;
      if (!url) {
        setErrorMessage("Stripe didn't return a flow URL. Try again.");
        setBusy(false);
        return;
      }
      // Hand off to Stripe's hosted Identity flow. Stripe redirects back
      // to our return_url (configured Stripe-side) once the user finishes
      // or cancels; the webhook updates verification_level either way.
      window.location.assign(url);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 503) {
          setErrorMessage(
            "Verification isn't available yet. We're rolling it out — try again shortly.",
          );
        } else if (err.status === 401) {
          setErrorMessage("Sign in again to verify your account.");
        } else {
          setErrorMessage(
            err.message || "Couldn't start verification. Try again.",
          );
        }
      } else {
        setErrorMessage("Couldn't reach the verification service.");
      }
      setBusy(false);
    }
  }, [busy]);

  return { start, busy, errorMessage };
}

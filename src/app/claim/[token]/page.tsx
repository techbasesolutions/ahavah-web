"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { apiClient, ApiError, setSessionToken } from "@/lib/api-client";

/**
 * /claim/[token] — launch magic-link landing.
 *
 * A pre-launch invitee opens an email link of the form
 * `https://ahavah.app/claim/<token>`. This page exchanges that one-time
 * claim token for a real bearer session (the SAME session every other
 * sign-in flow uses) and then routes the user onward:
 *
 *   - `onboarded: true`  -> /discover (returning / complete user)
 *   - `onboarded: false` -> /onboarding/name (first wizard data step)
 *
 * Why /onboarding/name and not /onboarding/verify-email: verify-email
 * (and verify-phone) read a pending email/OTP out of sessionStorage that
 * was written by /auth/sign-up. A claim user never went through that flow,
 * so verify-email would immediately bounce them back out as a dead end
 * (see src/app/onboarding/verify-email/page.tsx). /onboarding/name is the
 * first real data-collection step and depends only on the authenticated
 * session via useProfile, so it is the correct onboarding entry here.
 *
 * Backend contract (POST /claim, unauthenticated):
 *   200 { session_token: string, onboarded: boolean }
 *   400 { error: "invalid_token" | "missing_token" }
 */

const ONBOARDING_ENTRY = "/onboarding/name";

type ClaimResponse = {
  session_token: string;
  onboarded: boolean;
};

export default function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // Next 16: params is a Promise in Client Component pages — unwrap with
  // React's `use` hook (per node_modules/next/dist/docs dynamic-routes.md).
  const { token } = use(params);
  const router = useRouter();
  const [errored, setErrored] = useState(false);
  // StrictMode double-invokes effects in dev; guard so we only POST /claim
  // (and only navigate) once per real mount.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        const result = await apiClient.post<ClaimResponse>("/claim", { token });
        if (cancelled) return;
        // Persist the bearer token exactly the way normal sign-in does —
        // setSessionToken mirrors it into localStorage AND drops the
        // `ahavah.authed` cookie that lets the user past the launch gate.
        setSessionToken(result.session_token);
        router.replace(result.onboarded ? "/discover" : ONBOARDING_ENTRY);
      } catch (err) {
        if (cancelled) return;
        // 400 (invalid/missing token) or a network error — both land the
        // user on the recoverable error state below. ApiError is imported
        // for clarity; any thrown error is treated the same way here.
        void (err instanceof ApiError);
        setErrored(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (errored) {
    return (
      <main className="min-h-dvh bg-(--app) grid place-items-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-5 text-center">
          <h1 className="text-display text-(--ink)">
            This link didn&apos;t work<span className="text-(--color-lime)">.</span>
          </h1>
          <p className="text-body text-(--ink-2)">
            Your sign-in link may have expired or already been used. Request a
            fresh link, or contact support if you keep seeing this.
          </p>
          <Button
            nativeButton={false}
            size="cta"
            tone="cta"
            className="w-full"
            render={<Link href="/" prefetch={false} />}
          >
            Back to home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-dvh bg-(--app) grid place-items-center p-6"
      aria-busy="true"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center gap-3 text-center"
      >
        <p className="text-body text-(--ink-2)">Signing you in…</p>
      </div>
    </main>
  );
}

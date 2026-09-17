"use client";

// Every size below is a literal value from the SOT export ("Ahavah
// Spotlight Member Surfaces.html" confirm frames) with no equivalent
// @theme token (34/52px display headline, 14.5px body, 60px badge, 11px
// mail label, etc.), same trade-off as src/app/page.tsx / community.
/* eslint-disable no-restricted-syntax */

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check, Clock, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpotlightShell } from "@/components/app/spotlight-shell";
import {
  SETTINGS_PRIVACY_HREF,
  SpotlightSettingsLink,
  SpotlightStateBlock,
} from "@/components/app/spotlight-state-block";

import { apiClient, ApiError } from "@/lib/api-client";
import { SPOTLIGHT_COPY } from "@/lib/spotlight-copy";

/**
 * /spotlight/confirm/[token], the unauthenticated magic-link landing for the
 * Spotlight opt-in email. Mirrors /claim/[token]'s shape (no session,
 * plain apiClient calls, Next 16 client-component `params` unwrapped via
 * `use`) but never auto-acts: `GET /spotlight/confirm/<token>` only reads
 * the token's state on load, and `POST /spotlight/confirm/<token>` runs
 * ONLY from the button's onClick. A refresh after confirming can never
 * repeat the action because the GET now reports `already: true`.
 *
 * Backend contract:
 *   GET  /spotlight/confirm/<token> -> { email_masked, already, stale }
 *        400 invalid_token, 410 expired
 *   POST /spotlight/confirm/<token> -> { ok: true, already: boolean }
 *        400 invalid_token, 410 { error: "stale" }
 */

type ConfirmState =
  | "loading"
  | "default"
  | "already"
  | "success"
  | "invalid"
  | "expired"
  | "error";

type ConfirmGetResponse = {
  email_masked: string;
  already: boolean;
  stale: boolean;
};

type ConfirmPostResponse = {
  ok: boolean;
  already: boolean;
};

const COPY = SPOTLIGHT_COPY.confirm;

// Shared headline treatment (Ultra display face, per the SOT `.ch1`) for
// every state. A module-level function, not a component defined inside
// the page, so it isn't recreated on every render.
function ConfirmHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      className="m-0 text-[34px] leading-[1.08] font-normal tracking-[-0.01em] text-(--ink) lg:text-[52px] lg:leading-[1.02]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h1>
  );
}

function ConfirmParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[14.5px] leading-[1.55] text-(--ink-2) lg:max-w-[52ch] lg:text-base">
      {children}
    </p>
  );
}

export default function SpotlightConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // Next 16: params is a Promise in Client Component pages, unwrap with
  // React's `use` hook (per node_modules/next/dist/docs dynamic-routes.md,
  // same as /claim/[token]).
  const { token } = use(params);
  const [state, setState] = useState<ConfirmState>("loading");
  const [emailMasked, setEmailMasked] = useState("");
  const [posting, setPosting] = useState(false);
  // Bumped by the error state's "Try again" button to re-run the GET
  // below without duplicating its logic in a separate function.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await apiClient.get<ConfirmGetResponse>(
          `/spotlight/confirm/${token}`,
        );
        if (cancelled) return;
        if (result.stale) {
          setState("expired");
        } else if (result.already) {
          setState("already");
        } else {
          setEmailMasked(result.email_masked);
          setState("default");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 410) setState("expired");
        else if (err instanceof ApiError && err.status === 400) setState("invalid");
        else setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // GET is read-only (idempotent) so, unlike /claim's POST, no ranRef
    // guard is needed. StrictMode's double-invoke just fires a harmless
    // extra read, and `cancelled` still prevents a stale write.
  }, [token, attempt]);

  const handleConfirm = async () => {
    if (posting) return;
    setPosting(true);
    try {
      const result = await apiClient.post<ConfirmPostResponse>(
        `/spotlight/confirm/${token}`,
      );
      if (result.ok) setState("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) setState("expired");
      else if (err instanceof ApiError && err.status === 400) setState("invalid");
      else setState("error");
    } finally {
      setPosting(false);
    }
  };

  if (state === "loading") {
    return <SpotlightShell wide>{null}</SpotlightShell>;
  }

  if (state === "default") {
    return (
      <SpotlightShell wide>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:flex-none lg:justify-start lg:gap-5">
          <Badge variant="lavender" size="md" className="self-start">
            {COPY.chip}
          </Badge>
          <ConfirmHeading>
            {COPY.default.headlineBefore}
            <em className="spotlight-em not-italic">{COPY.default.headlineEm}</em>
            {COPY.default.headlineAfter}
          </ConfirmHeading>
          <ConfirmParagraph>{COPY.default.paragraph}</ConfirmParagraph>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-(--hairline) spotlight-sunk p-[13px_15px]">
            <Mail size={18} className="shrink-0 text-(--ink-3)" aria-hidden />
            <div>
              <div className="text-[11px] font-bold tracking-[0.09em] text-(--ink-3) uppercase">
                {COPY.default.mailLabel}
              </div>
              <div className="mt-0.5 text-[14px] font-bold text-(--ink)">
                {emailMasked}
              </div>
            </div>
          </div>
          <Button
            size="cta"
            tone="cta"
            onClick={() => void handleConfirm()}
            disabled={posting}
            className="lg:w-auto lg:self-start lg:px-[34px]"
          >
            {COPY.default.button}
          </Button>
        </div>
        <p className="mt-auto pt-[22px] text-[12px] leading-[1.5] text-(--ink-3) lg:mt-0 lg:pt-0">
          {COPY.default.footer}
        </p>
      </SpotlightShell>
    );
  }

  if (state === "already" || state === "success") {
    const copy = state === "already" ? COPY.already : COPY.success;
    return (
      <SpotlightShell wide={false}>
        <SpotlightStateBlock
          tone="ok"
          icon={Check}
          heading={copy.heading}
          paragraph={copy.paragraph}
          action={<SpotlightSettingsLink label={copy.link} />}
        />
      </SpotlightShell>
    );
  }

  if (state === "invalid" || state === "expired" || state === "error") {
    const copy = state === "invalid" ? COPY.invalid : state === "expired" ? COPY.expired : COPY.error;
    const Icon = state === "expired" ? Clock : AlertCircle;
    const action =
      state === "error" ? (
        <Button
          variant="outline"
          size="cta"
          onClick={() => {
            setState("loading");
            setAttempt((a) => a + 1);
          }}
          className="spotlight-ghost lg:w-auto lg:self-start lg:px-[34px]"
        >
          {copy.button}
        </Button>
      ) : (
        <Button
          variant={state === "expired" ? undefined : "outline"}
          tone={state === "expired" ? "cta" : "none"}
          size="cta"
          nativeButton={false}
          render={<Link href={SETTINGS_PRIVACY_HREF} prefetch={false} />}
          className={
            state === "expired"
              ? "lg:w-auto lg:self-start lg:px-[34px]"
              : "spotlight-ghost lg:w-auto lg:self-start lg:px-[34px]"
          }
        >
          {copy.button}
        </Button>
      );
    return (
      <SpotlightShell wide={false}>
        <SpotlightStateBlock tone="warn" icon={Icon} heading={copy.heading} paragraph={copy.paragraph} action={action} />
      </SpotlightShell>
    );
  }

  return null;
}

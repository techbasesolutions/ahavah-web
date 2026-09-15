"use client";

// Same trade-off as /spotlight/confirm: every size below is a literal
// value from the SOT export / this task's brief (34/52px headline,
// 14.5px body, 60px badge, 20px image radius) with no equivalent
// @theme token.
/* eslint-disable no-restricted-syntax */

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpotlightShell } from "@/components/app/spotlight-shell";

import { apiClient, ApiError } from "@/lib/api-client";
import { SPOTLIGHT_COPY } from "@/lib/spotlight-copy";

/**
 * /spotlight/card/[token], the unauthenticated magic-link landing for a
 * member to approve or skip one rendered Spotlight card. Same shape as
 * /spotlight/confirm/[token] (no session, plain apiClient calls, Next 16
 * `params` unwrapped via `use`), but this page's GET also carries the
 * rendered card image and the two decisions POST to the same endpoint
 * with a `decision` field instead of always confirming.
 *
 * Backend contract:
 *   GET  /spotlight/card/<token> ->
 *     { first_name, age, country, kind, caption, photos, photo_uuid,
 *       revision, preview_available, image_url, status: 'approved' |
 *       'skipped' | 'awaiting_member', expires_at, stale }
 *     400 invalid_token, 404 not found (treated as invalid), 410 expired
 *   POST /spotlight/card/<token> { decision: 'approve', photo_uuid } ->
 *     { ok, result: 'approved' } or { ok, already, status }
 *   POST /spotlight/card/<token> { decision: 'skip' } -> { ok }
 *     409 { error: 'approvals_disabled' } -> paused, any other 409 ->
 *     error; 410 { error: 'stale' } -> expired
 */

type CardState =
  | "loading"
  | "default"
  | "approved"
  | "skipped"
  | "unavailable"
  | "paused"
  | "invalid"
  | "expired"
  | "error";

type CardGetResponse = {
  first_name: string;
  age: number;
  country: string;
  kind: string;
  caption: string;
  photos: string[];
  photo_uuid: string;
  revision: number;
  preview_available: boolean;
  image_url: string | null;
  status: "approved" | "skipped" | "awaiting_member";
  expires_at: string;
  stale: boolean;
};

type CardPostResponse = {
  ok: boolean;
  result?: "approved";
  already?: boolean;
  status?: "approved" | "skipped" | "awaiting_member";
};

const SETTINGS_PRIVACY_HREF = "/settings/privacy";
const COPY = SPOTLIGHT_COPY.card;
const CONFIRM_COPY = SPOTLIGHT_COPY.confirm;

// Shared furniture, same treatment as /spotlight/confirm's local
// ConfirmHeading/ConfirmParagraph/ConfirmBadge/SettingsLink (kept
// per-page rather than exported, matching the existing convention there).
function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      className="m-0 text-[34px] leading-[1.08] font-normal tracking-[-0.01em] text-(--ink) lg:text-[52px] lg:leading-[1.02]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </h1>
  );
}

function CardParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[14.5px] leading-[1.55] text-(--ink-2) lg:max-w-[52ch] lg:text-base">
      {children}
    </p>
  );
}

function CardBadge({ tone, children }: { tone: "ok" | "warn"; children: ReactNode }) {
  return (
    <span
      className={
        tone === "ok"
          ? "flex size-[60px] shrink-0 items-center justify-center self-start rounded-full bg-(--color-lime)/[0.18] text-(--color-lime)"
          : "flex size-[60px] shrink-0 items-center justify-center self-start rounded-full bg-(--color-gold)/[0.16] text-(--color-gold)"
      }
    >
      {children}
    </span>
  );
}

function SettingsLink({ label }: { label: string }) {
  return (
    <Link
      href={SETTINGS_PRIVACY_HREF}
      prefetch={false}
      className="inline-flex items-center gap-1.5 self-start text-[14.5px] font-bold text-(--link-accent)"
    >
      {label}
      <ChevronRight size={15} aria-hidden />
    </Link>
  );
}

export default function SpotlightCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<CardState>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoUuid, setPhotoUuid] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  // Bumped by the error state's "Try again" button to re-run the GET.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await apiClient.get<CardGetResponse>(`/spotlight/card/${token}`);
        if (cancelled) return;
        if (result.stale) {
          setState("expired");
        } else if (result.status === "approved") {
          setState("approved");
        } else if (result.status === "skipped") {
          setState("skipped");
        } else if (!result.preview_available || !result.image_url) {
          setState("unavailable");
        } else {
          setImageUrl(result.image_url);
          setPhotoUuid(result.photo_uuid);
          setState("default");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 410) setState("expired");
        else if (err instanceof ApiError && (err.status === 400 || err.status === 404)) setState("invalid");
        else setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  // Shared by both decisions: a 409 with approvals_disabled is the
  // "paused" state, any other 409 is the generic error, and a 410 means
  // the token went stale mid-decision.
  function handlePostError(err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      const body = err.body as { error?: string } | null;
      if (body?.error === "approvals_disabled") setState("paused");
      else setState("error");
    } else if (err instanceof ApiError && err.status === 410) {
      setState("expired");
    } else {
      setState("error");
    }
  }

  const handleApprove = async () => {
    if (posting || !photoUuid) return;
    setPosting(true);
    try {
      const result = await apiClient.post<CardPostResponse>(`/spotlight/card/${token}`, {
        decision: "approve",
        photo_uuid: photoUuid,
      });
      if (result.result === "approved" || result.status === "approved") setState("approved");
      else if (result.status === "skipped") setState("skipped");
      else if (result.ok) setState("approved");
    } catch (err) {
      handlePostError(err);
    } finally {
      setPosting(false);
    }
  };

  const handleSkip = async () => {
    if (posting) return;
    setPosting(true);
    try {
      const result = await apiClient.post<CardPostResponse>(`/spotlight/card/${token}`, {
        decision: "skip",
      });
      if (result.ok) setState("skipped");
    } catch (err) {
      handlePostError(err);
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
          <CardHeading>{COPY.default.headline}</CardHeading>
          <CardParagraph>{COPY.default.paragraph}</CardParagraph>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={COPY.default.imageAlt}
              className="aspect-square w-full rounded-[20px] object-cover"
            />
          ) : null}
          <div className="flex flex-col gap-3 lg:flex-row">
            <Button
              size="cta"
              tone="cta"
              onClick={() => void handleApprove()}
              disabled={posting}
              className="lg:w-auto lg:self-start lg:px-[34px]"
            >
              {COPY.default.approveButton}
            </Button>
            <Button
              variant="outline"
              size="cta"
              onClick={() => void handleSkip()}
              disabled={posting}
              className="spotlight-ghost lg:w-auto lg:self-start lg:px-[34px]"
            >
              {COPY.default.skipButton}
            </Button>
          </div>
        </div>
        <p className="mt-auto pt-[22px] text-[12px] leading-[1.5] text-(--ink-3) lg:mt-0 lg:pt-0">
          {COPY.default.footer}
        </p>
      </SpotlightShell>
    );
  }

  if (state === "approved" || state === "skipped") {
    const copy = state === "approved" ? COPY.approved : COPY.skipped;
    return (
      <SpotlightShell wide={false}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:flex-none lg:justify-start lg:gap-5">
          <CardBadge tone="ok">
            <Check size={27} strokeWidth={2.8} aria-hidden />
          </CardBadge>
          <CardHeading>{copy.heading}</CardHeading>
          <CardParagraph>{copy.paragraph}</CardParagraph>
          <SettingsLink label={copy.link} />
        </div>
      </SpotlightShell>
    );
  }

  // Unavailable (preview not ready) and paused (approvals disabled) are
  // both "wait, nothing to do" states with no button and no link, per
  // the brief. Distinct icons: Clock for "not ready yet" (time-based,
  // same icon the confirm page uses for "expired"), AlertCircle for
  // "paused" (a temporary operator condition, same icon the confirm
  // page uses for "invalid"). Neither icon choice is specified by the
  // brief or the SOT (no frame exists for this page); flagged in the
  // task report.
  if (state === "unavailable" || state === "paused") {
    const copy = state === "unavailable" ? COPY.unavailable : COPY.paused;
    const Icon = state === "unavailable" ? Clock : AlertCircle;
    return (
      <SpotlightShell wide={false}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:flex-none lg:justify-start lg:gap-5">
          <CardBadge tone="warn">
            <Icon size={26} strokeWidth={1.9} aria-hidden />
          </CardBadge>
          <CardHeading>{copy.heading}</CardHeading>
          <CardParagraph>{copy.paragraph}</CardParagraph>
        </div>
      </SpotlightShell>
    );
  }

  if (state === "invalid" || state === "expired" || state === "error") {
    const copy =
      state === "invalid" ? CONFIRM_COPY.invalid : state === "expired" ? CONFIRM_COPY.expired : CONFIRM_COPY.error;
    const Icon = state === "expired" ? Clock : AlertCircle;
    return (
      <SpotlightShell wide={false}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 lg:flex-none lg:justify-start lg:gap-5">
          <CardBadge tone="warn">
            <Icon size={26} strokeWidth={1.9} aria-hidden />
          </CardBadge>
          <CardHeading>{copy.heading}</CardHeading>
          <CardParagraph>{copy.paragraph}</CardParagraph>
          {state === "error" ? (
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
          )}
        </div>
      </SpotlightShell>
    );
  }

  return null;
}

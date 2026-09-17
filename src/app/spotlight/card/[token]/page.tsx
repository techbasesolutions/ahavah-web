"use client";

// Same trade-off as /spotlight/confirm: every size below is a literal
// value from the SOT export / this task's brief (34/52px headline,
// 14.5px body, 60px badge, 20px image radius) with no equivalent
// @theme token.
/* eslint-disable no-restricted-syntax */

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Check, Clock } from "lucide-react";

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
 *   POST /spotlight/card/<token> { decision: 'approve', photo_uuid, revision } ->
 *     { ok, result: 'approved' | 'already' | 'new_revision' } or
 *     { ok, already, status }. 'new_revision' is NOT a decision: the
 *     server made a different card, or the revision named is no longer
 *     the current one, and is waiting to be asked again. A missing or
 *     non-integer revision is a 400.
 *   POST /spotlight/card/<token> { decision: 'skip' } -> { ok }
 *     409 { error: 'approvals_disabled' } -> paused,
 *     409 { error: 'preview_unavailable' } -> unavailable,
 *     409 { error: 'photo_not_owned' } -> photoRejected,
 *     403 and any other 409 -> rejected; 410 { error: 'stale' } -> expired
 */

type CardState =
  | "loading"
  | "default"
  | "approved"
  | "skipped"
  | "unavailable"
  | "paused"
  | "rejected"
  | "photoRejected"
  | "invalid"
  | "expired"
  | "error";

// Every field the API can answer as null does: `age`, `country` and
// `photo_uuid` come off the current revision or the profile row and are
// null before one exists, and `photos` is the member's approved photo
// list as objects, not bare urls (service/spotlight/approval.py).
type CardGetResponse = {
  first_name: string;
  age: number | null;
  country: string | null;
  kind: string;
  caption: string;
  photos: { uuid: string; url: string }[] | null;
  photo_uuid: string | null;
  revision: number | null;
  preview_available: boolean;
  image_url: string | null;
  status: "approved" | "skipped" | "awaiting_member";
  expires_at: string;
  stale: boolean;
};

type CardPostResponse = {
  ok: boolean;
  result?: "approved" | "already" | "new_revision";
  already?: boolean;
  status?: "approved" | "skipped" | "awaiting_member";
  revision?: number;
};

const COPY = SPOTLIGHT_COPY.card;
const CONFIRM_COPY = SPOTLIGHT_COPY.confirm;

// Shared furniture, same treatment as /spotlight/confirm's local
// ConfirmHeading/ConfirmParagraph (kept per-page for the "default"
// state's own headline/paragraph; every other state now renders through
// the shared SpotlightStateBlock/SpotlightSettingsLink instead of a
// per-page badge/link pair).
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

export default function SpotlightCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<CardState>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoUuid, setPhotoUuid] = useState<string | null>(null);
  // The revision the rendered card belongs to. The approve POST names it,
  // so consent binds to the card on screen and never to one rendered
  // after this page read it (Wave 3d Task 2).
  const [revision, setRevision] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  // Bumped by the error state's "Try again" button, and by a
  // `new_revision` answer, to re-run the GET.
  const [attempt, setAttempt] = useState(0);
  // True once a POST came back `new_revision`: the card on screen is not
  // the one the member looked at, and no consent was recorded, so the
  // default state carries a line saying so.
  const [askAgain, setAskAgain] = useState(false);

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
          setRevision(Number.isInteger(result.revision) ? result.revision : null);
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

  // Shared by both decisions. Every refusal the API can give has a named
  // reason, and none of them is a connection failure, so none of them is
  // allowed to land on the "We could not reach Ahavah" copy: that copy
  // names the wrong cause and invites a retry that cannot help.
  //   409 approvals_disabled  -> paused (an operator pause)
  //   409 preview_unavailable -> unavailable (nothing rendered yet)
  //   409 photo_not_owned     -> photoRejected (the photo went away)
  //   409 anything else, 403  -> rejected (this link cannot decide this)
  //   410                     -> expired (the token went stale mid-decision)
  // A genuine transport failure, with no ApiError at all, still reaches
  // the generic error state.
  function handlePostError(err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      const body = err.body as { error?: string } | null;
      if (body?.error === "approvals_disabled") setState("paused");
      else if (body?.error === "preview_unavailable") setState("unavailable");
      else if (body?.error === "photo_not_owned") setState("photoRejected");
      else setState("rejected");
    } else if (err instanceof ApiError && err.status === 403) {
      setState("rejected");
    } else if (err instanceof ApiError && err.status === 410) {
      setState("expired");
    } else {
      setState("error");
    }
  }

  const handleApprove = async () => {
    if (posting || !photoUuid || revision === null) return;
    setPosting(true);
    try {
      const result = await apiClient.post<CardPostResponse>(`/spotlight/card/${token}`, {
        decision: "approve",
        photo_uuid: photoUuid,
        revision,
      });
      // Branch on `result` explicitly. `approved` and `already` both mean
      // the consent is on record. `new_revision` means the opposite: the
      // server made a different card (or the card on screen is no longer
      // the current revision) and recorded nothing, so re-run the
      // GET and ask the member about the card that came back rather than
      // telling them it is approved. The `{ ok, already, status }` shape
      // (a replayed token) is the only other answer the API gives; any
      // other body is not a contract this page knows, so it is an error
      // rather than a guess.
      if (result.result === "approved" || result.result === "already") {
        setState("approved");
      } else if (result.result === "new_revision") {
        setAskAgain(true);
        setState("loading");
        setAttempt((a) => a + 1);
      } else if (result.already && result.status === "approved") {
        setState("approved");
      } else if (result.already && result.status === "skipped") {
        setState("skipped");
      } else {
        setState("error");
      }
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
          {askAgain ? <CardParagraph>{COPY.default.changedNotice}</CardParagraph> : null}
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
              // No photo_uuid or no revision means the POST would be
              // rejected with a 400 before it decided anything, so the
              // button must not look like it will work.
              disabled={posting || !photoUuid || revision === null}
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

  // Unavailable (preview not ready) and paused (approvals disabled) are
  // both "wait, nothing to do" states with no button and no link, per
  // the brief. Distinct icons: Clock for "not ready yet" (time-based,
  // same icon the confirm page uses for "expired"), AlertCircle for
  // "paused" (a temporary operator condition, same icon the confirm
  // page uses for "invalid"). Neither icon choice is specified by the
  // brief or the SOT (no frame exists for this page); flagged in the
  // task report. No `action` prop is passed: these are the only two
  // states where SpotlightStateBlock renders nothing after the paragraph.
  if (state === "unavailable" || state === "paused") {
    const copy = state === "unavailable" ? COPY.unavailable : COPY.paused;
    const Icon = state === "unavailable" ? Clock : AlertCircle;
    return (
      <SpotlightShell wide={false}>
        <SpotlightStateBlock tone="warn" icon={Icon} heading={copy.heading} paragraph={copy.paragraph} />
      </SpotlightShell>
    );
  }

  // `rejected` and `photoRejected` join this block rather than the
  // buttonless one above: both are dead ends for this link, and both give
  // the member somewhere to go (Settings, Privacy, or a fresh read).
  if (
    state === "invalid" ||
    state === "expired" ||
    state === "error" ||
    state === "rejected" ||
    state === "photoRejected"
  ) {
    const copy =
      state === "invalid"
        ? CONFIRM_COPY.invalid
        : state === "expired"
          ? CONFIRM_COPY.expired
          : state === "rejected"
            ? COPY.rejected
            : state === "photoRejected"
              ? COPY.photoRejected
              : CONFIRM_COPY.error;
    const Icon = state === "expired" ? Clock : AlertCircle;
    const retry = state === "error" || state === "photoRejected";
    const action = retry ? (
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

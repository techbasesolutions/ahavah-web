"use client";

import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { registerBetaTester } from "@/lib/beta";

/**
 * BetaTesterCard — opt-in affordance on /onboarding/complete, below the
 * celebration and above the "Start matching" CTA.
 *
 * Design (via /frontend-design): the celebration + primary CTA are lime, so
 * this card uses the brand's LAVENDER accent (IconBadge + button) to read as
 * special-but-secondary and never out-shout the lime primary. A faint lavender
 * glow echoes the page's lime celebration-glow language. Kit primitives only.
 *
 * States: idle / loading / done; plus a `disabled` mode (until onboarding has
 * graduated) that de-emphasises the card and disables the button with a hint.
 * On success it POSTs /beta-tester (identity from the session), toasts, and
 * flips to the confirmed state. Backend records the cohort + emails a sign-in
 * link promise for June 15.
 */

type BetaTesterCardProps = {
  /** Disabled until onboarding has graduated the user into an account. */
  disabled?: boolean;
};

export function BetaTesterCard({ disabled = false }: BetaTesterCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (status !== "idle" || disabled) return;
    setStatus("loading");
    setError(null);
    try {
      await registerBetaTester();
      setStatus("done");
      toast.success("You're in. We'll email your sign-in link on June 15.");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof ApiError && err.status === 429
          ? "Please try again in a moment."
          : "Couldn't register you. Please try again.",
      );
    }
  };

  const done = status === "done";

  return (
    <Card
      tone="elevated"
      className={`relative w-full max-w-sm gap-3.5 overflow-hidden p-5 text-left transition-opacity ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {/* Decorative lavender glow — echoes the lime celebration glow above, in
          the brand's secondary accent so the card is special yet subordinate. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-8 size-28 rounded-full bg-lavender/20 blur-2xl"
      />

      <div className="relative flex items-start gap-3">
        <IconBadge tone={done ? "success" : disabled ? "muted" : "brand"} shape="circle">
          {done ? <Check /> : <Sparkles />}
        </IconBadge>
        <div className="flex flex-col gap-1">
          <p className="text-meta font-semibold text-(--ink)">
            {done ? "You're a beta tester" : "Become a beta tester"}
          </p>
          <p className="text-caption leading-relaxed text-(--ink-2)">
            {done
              ? "We'll email your sign-in link on June 15."
              : "Get early access. We'll email your sign-in link on June 15."}
          </p>
        </div>
      </div>

      {!done ? (
        <Button
          tone="brand"
          size="tap"
          className="relative w-full"
          disabled={disabled || status === "loading"}
          onClick={() => void submit()}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="animate-spin" />
              Signing you up…
            </>
          ) : (
            "Count me in"
          )}
        </Button>
      ) : null}

      {disabled && !done ? (
        <p className="relative text-caption text-(--ink-3)">
          Available once your profile is finalised.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="relative text-caption font-semibold text-(--color-pink)"
        >
          {error}
        </p>
      ) : null}
    </Card>
  );
}

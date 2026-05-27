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
 * BetaTesterCard — opt-in affordance on the /waitlist completion screen, below
 * the share card.
 *
 * Design (via /frontend-design): the waitlist celebration is lime, so this card
 * uses the brand's LAVENDER accent (IconBadge + button) to read as special-
 * but-secondary. A faint lavender glow echoes the page's celebration-glow
 * language. Kit primitives only.
 *
 * The opt-in is public: it POSTs the `email` the user just entered on the
 * waitlist (no account yet). On success it toasts and flips to the confirmed
 * state; the backend records the cohort + emails a June-15 sign-in-link promise.
 */

type BetaTesterCardProps = {
  /** The waitlist email the user just submitted — sent to POST /beta-tester. */
  email: string;
};

export function BetaTesterCard({ email }: BetaTesterCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (status !== "idle" || !email) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await registerBetaTester(email);
      const wasAlready = res.isNew === false;
      setAlready(wasAlready);
      setStatus("done");
      toast.success(
        wasAlready
          ? "You're already a beta tester."
          : "You're in. We'll email your sign-in link on June 15.",
      );
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
      className="relative w-full max-w-sm gap-3.5 overflow-hidden p-5 text-left"
    >
      {/* Decorative lavender glow — echoes the lime celebration glow above, in
          the brand's secondary accent so the card is special yet subordinate. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-8 size-28 rounded-full bg-lavender/20 blur-2xl"
      />

      <div className="relative flex items-start gap-3">
        <IconBadge tone={done ? "success" : "brand"} shape="circle">
          {done ? <Check /> : <Sparkles />}
        </IconBadge>
        <div className="flex flex-col gap-1">
          <p className="text-meta font-semibold text-(--ink)">
            {done ? (already ? "Already a beta tester" : "You're a beta tester") : "Become a beta tester"}
          </p>
          <p className="text-caption leading-relaxed text-(--ink-2)">
            {done
              ? "We'll email your sign-in link on June 15."
              : "Skip the wait. Get a sign-in link on June 15, ahead of launch."}
          </p>
        </div>
      </div>

      {!done ? (
        <Button
          tone="brand"
          size="tap"
          className="relative w-full"
          disabled={status === "loading"}
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

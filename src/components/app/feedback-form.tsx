"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  FEEDBACK_CATEGORIES,
  postFeedback,
  type FeedbackCategory,
} from "@/lib/feedback";

/**
 * FeedbackForm — the shared body of the feedback surface (category + message +
 * optional reply email + submit). Kit primitives only.
 *
 * Used by both FeedbackDialog (footer) and the /feedback page so the two never
 * drift. Behaviour on a successful POST /feedback:
 *   - always toast.success
 *   - if `onSuccess` is provided (dialog) → call it (the dialog closes)
 *   - otherwise (full page) → show an inline "sent" confirmation with a
 *     "Send another" reset.
 */

const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FeedbackFormProps = {
  /** When provided, called after a successful submit (e.g. close the dialog).
   *  When omitted, the form shows its own inline confirmation panel. */
  onSuccess?: () => void;
};

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const reset = () => {
    setCategory("");
    setMessage("");
    setEmail("");
    setWebsite("");
    setErrorMessage(null);
    setSent(false);
  };

  const trimmed = message.trim();
  const emailInvalid = email.trim().length > 0 && !EMAIL_RE.test(email.trim());
  const canSubmit = !!category && trimmed.length > 0 && !emailInvalid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !category) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await postFeedback({
        category,
        message: trimmed,
        email: email.trim() || undefined,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        website: website || undefined,
      });
      if (onSuccess) {
        // Dialog mode: toast + close (no room for an inline panel).
        toast.success("Thank you. Your feedback is on its way.");
        reset();
        onSuccess();
      } else {
        // Page mode: inline confirmation panel (no toast — avoids double "thank you").
        setSent(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setErrorMessage("We've had a lot of feedback today. Please try again later.");
      } else {
        setErrorMessage("Something went wrong. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-lime/15 text-lime">
          <CheckCircle2 className="size-7" />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="text-h2 text-(--ink)">Thank you.</p>
          <p className="text-meta text-(--ink-2)">
            Your feedback is on its way. We read every note.
          </p>
        </div>
        <Button variant="outlineSubtle" size="tap" onClick={reset}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Honeypot — hidden from people, catches bots. Not announced to AT. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      {/* Category */}
      <div className="flex flex-col gap-2.5">
        <p id="fb-category-label" className="text-meta font-medium text-(--ink)">
          What&apos;s this about?
        </p>
        <RadioGroup
          aria-labelledby="fb-category-label"
          value={category}
          onValueChange={(v) => setCategory(v as FeedbackCategory)}
          className="grid grid-cols-2 gap-2.5"
        >
          {FEEDBACK_CATEGORIES.map((c) => (
            <label
              key={c.value}
              htmlFor={`fb-cat-${c.value}`}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-(--hairline) bg-(--card) px-3 py-2.5 transition-colors has-data-checked:border-lime has-data-checked:bg-lime/5"
            >
              <RadioGroupItem id={`fb-cat-${c.value}`} value={c.value} variant="brand" />
              <span className="text-meta text-(--ink)">{c.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2">
        <label htmlFor="fb-message" className="text-meta font-medium text-(--ink)">
          Your feedback
        </label>
        <Textarea
          id="fb-message"
          size="lg"
          tone="elevated"
          placeholder="What works, what doesn't, what you'd love to see."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          className="min-h-28"
        />
        <p className="text-right text-caption tabular-nums text-(--ink-3)">
          {message.length}/{MESSAGE_MAX}
        </p>
      </div>

      {/* Optional email */}
      <div className="flex flex-col gap-2">
        <label htmlFor="fb-email" className="text-meta font-medium text-(--ink)">
          Email{" "}
          <span className="font-normal text-(--ink-3)">(optional, for a reply)</span>
        </label>
        <Input
          id="fb-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          size="lg"
          tone="elevated"
          error={emailInvalid}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={emailInvalid ? "fb-email-error" : undefined}
        />
        {emailInvalid ? (
          <p id="fb-email-error" className="text-caption text-(--color-pink)">
            Please enter a valid email, or leave it blank.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-center text-caption font-semibold text-(--color-pink)"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button size="cta" tone="cta" disabled={!canSubmit} onClick={() => void handleSubmit()}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Sending…
            </>
          ) : (
            "Send feedback"
          )}
        </Button>
        <p className="text-center text-caption text-(--ink-3)">
          We only use this to improve Ahavah.
        </p>
      </div>
    </div>
  );
}

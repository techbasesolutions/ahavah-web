"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FEEDBACK_CATEGORIES,
  postFeedback,
  type FeedbackCategory,
} from "@/lib/feedback";

/**
 * FeedbackDialog — public "Send feedback" form opened from the marketing
 * footer. Controlled (open / onOpenChange) so the footer owns the trigger.
 *
 * Composition (kit primitives only, no hand-rolled atoms):
 *   - shadcn Dialog (Base UI) — centered modal container
 *   - shadcn RadioGroup variant="brand" — category picker (lime check)
 *   - shadcn Textarea size="lg" — message
 *   - shadcn Input — optional reply email
 *   - shadcn Button tone="cta" size="cta" — submit (lime, 56px)
 *
 * On submit: POST /feedback (emails admin), toast.success, reset + close.
 * Page path + user agent are captured silently for context.
 */

const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setCategory("");
    setMessage("");
    setEmail("");
    setErrorMessage(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !submitting) reset();
    onOpenChange(next);
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
      });
      reset();
      onOpenChange(false);
      toast.success("Thank you. Your feedback is on its way.");
    } catch {
      setErrorMessage("Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5 border border-(--hairline) bg-(--app) p-5 text-(--ink) ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2 text-(--ink)">Send feedback</DialogTitle>
          <DialogDescription className="text-meta text-(--ink-2)">
            Help us make Ahavah better. We read every note.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
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
          <Button
            size="cta"
            tone="cta"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
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
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/app/feedback-form";

/**
 * FeedbackDialog — public "Send feedback" modal opened from the marketing
 * footer. Controlled (open / onOpenChange) so the footer owns the trigger.
 * Wraps the shared FeedbackForm (also used by the /feedback page) in a kit
 * Dialog; closes on a successful submit.
 */

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 border border-(--hairline) bg-(--app) p-5 text-(--ink) ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2 text-(--ink)">Send feedback</DialogTitle>
          <DialogDescription className="text-meta text-(--ink-2)">
            Help us make Ahavah better. We read every note.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/app/back-button";
import { FeedbackForm } from "@/components/app/feedback-form";

export const metadata: Metadata = {
  title: "Send feedback · Ahavah",
  description:
    "Share an idea, report a problem, or tell us what you love. We read every note.",
};

/**
 * Public /feedback page — a deep-linkable, context-neutral home for the
 * feedback form. Reached from the marketing footer and from the in-app
 * Settings "Send feedback" row. Minimal standalone chrome (no marketing CTA,
 * no app bottom nav) so it reads cleanly whether the visitor is signed in or
 * anonymous. Renders the shared FeedbackForm (same as the footer dialog).
 */
export default function FeedbackPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-(--app) px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" aria-label="Ahavah home" className="w-fit">
          <Logo variant="horizontal" height={28} />
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-display text-(--ink)">Send feedback</h1>
          <p className="text-meta text-(--ink-2)">
            Share an idea, report a problem, or tell us what you love. We read
            every note.
          </p>
        </header>

        <Card tone="elevated" className="p-5">
          <FeedbackForm />
        </Card>

        <BackButton fallback="/" label="Back" className="w-fit" />
      </div>
    </main>
  );
}

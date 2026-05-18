"use client";

import { Mail } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

export default function TermsPage() {
  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/" label="Back" />
        <PageHeaderTitle>Terms of Service</PageHeaderTitle>
      </PageHeader>

      <article className="flex flex-col gap-4 px-5 pt-4 text-body leading-relaxed text-(--ink-2)">
        <p>
          We&apos;re finalising our terms with counsel. The full document
          will be published here within 14 days of soft launch.
        </p>

        <p>In the meantime, by using Ahavah you agree to:</p>

        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>Be at least 18 years old.</li>
          <li>
            Provide a real photo of yourself and accurate profile
            information.
          </li>
          <li>
            Treat other users with respect. Harassment, hate speech,
            spam, scam attempts, and inappropriate content result in
            an immediate ban.
          </li>
          <li>
            Use Ahavah for its stated purpose: matchmaking with
            shared values.
          </li>
        </ul>

        <p>
          We may update these terms as the product and the legal copy
          mature. Continued use after a meaningful change implies
          acceptance.
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-(--hairline) bg-(--card) p-4">
          <p className="text-meta font-semibold text-(--ink)">
            Questions or concerns?
          </p>
          <a
            href="mailto:admin@ahavah.app"
            className="inline-flex items-center gap-2 text-meta text-(--color-lavender) underline"
          >
            <Mail className="size-4" /> admin@ahavah.app
          </a>
        </div>
      </article>
    </PageShell>
  );
}

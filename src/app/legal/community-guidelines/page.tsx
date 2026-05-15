"use client";

import { Mail } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

export default function CommunityGuidelinesPage() {
  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/" label="Back" />
        <PageHeaderTitle>Community Guidelines</PageHeaderTitle>
      </PageHeader>

      <article className="flex flex-col gap-4 px-5 pt-4 text-body leading-relaxed text-text-secondary">
        <p>
          Ahavah is a small, intentional community. The full guidelines
          will be published here within 14 days of soft launch. The
          short version:
        </p>

        <h2 className="mt-2 text-h3 text-white">Be kind</h2>
        <p>
          Treat every person as if you might match with them tomorrow.
          Harassment, hate speech, slurs, and unwanted sexual content
          are not tolerated and result in an immediate ban.
        </p>

        <h2 className="mt-2 text-h3 text-white">Be real</h2>
        <p>
          Use real photos of yourself, real first name, real age. No
          filters that obscure your face. No catfishing. Verification
          is optional but encouraged.
        </p>

        <h2 className="mt-2 text-h3 text-white">Be safe</h2>
        <p>
          Take new conversations off-platform when YOU choose, not when
          someone pressures you. Never send money. Report anything that
          feels off using the &middot;&middot;&middot; menu in chat or
          on a profile.
        </p>

        <h2 className="mt-2 text-h3 text-white">If you see something</h2>
        <p>
          Use the report flow. Reports go to our small moderation team
          and reach a real human. We review every report.
        </p>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-elevated/60 p-4">
          <p className="text-meta font-semibold text-white">
            Reporting an emergency?
          </p>
          <p className="text-meta text-text-secondary">
            For immediate safety concerns, contact local emergency
            services first. Then email us so we can act on the account.
          </p>
          <a
            href="mailto:admin@ahavah.app"
            className="inline-flex items-center gap-2 text-meta text-lavender underline"
          >
            <Mail className="size-4" /> admin@ahavah.app
          </a>
        </div>
      </article>
    </PageShell>
  );
}

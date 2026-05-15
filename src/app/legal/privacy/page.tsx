"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

export default function PrivacyPage() {
  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/" label="Back" />
        <PageHeaderTitle>Privacy Policy</PageHeaderTitle>
      </PageHeader>

      <article className="flex flex-col gap-4 px-5 pt-4 text-body leading-relaxed text-text-secondary">
        <p>
          We&apos;re finalising our privacy policy with counsel. The
          full document will be published here within 14 days of soft
          launch. In plain language, here&apos;s what we do today:
        </p>

        <h2 className="mt-2 text-h3 text-white">What we collect</h2>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Sign-up email + the OTP code you submit to confirm it.
          </li>
          <li>
            Profile information you choose to provide (name, age, country,
            photos, biographical fields).
          </li>
          <li>
            Your activity inside Ahavah: who you swiped on, who you
            matched with, what you sent in chat.
          </li>
          <li>
            Standard request metadata (IP address, user agent) for
            anti-abuse + rate-limiting.
          </li>
        </ul>

        <h2 className="mt-2 text-h3 text-white">What we don&apos;t do</h2>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>We don&apos;t sell your data to anyone.</li>
          <li>
            We don&apos;t share your data with advertisers or
            third-party data brokers.
          </li>
          <li>
            We don&apos;t use your photos to train AI models.
          </li>
        </ul>

        <h2 className="mt-2 text-h3 text-white">Your rights</h2>
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            Delete your account at any time from{" "}
            <Link
              href="/settings/account"
              className="text-lavender underline"
            >
              Settings &rarr; Account
            </Link>
            . Hard delete is immediate today; we&apos;re moving to a
            7-day grace window for safety.
          </li>
          <li>
            Request a data export by emailing us — we use the same
            backend endpoint Ahavah&apos;s GDPR data-export uses.
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg-elevated/60 p-4">
          <p className="text-meta font-semibold text-white">
            Privacy questions?
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

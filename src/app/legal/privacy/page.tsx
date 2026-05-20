"use client";

import { LegalArticleShell } from "@/components/app/legal-article-shell";
import { useRequireSession } from "@/lib/use-require-session";

export default function PrivacyPage() {
  useRequireSession();
  return (
    <LegalArticleShell
      kind="privacy"
      title="Privacy Policy"
      lead="We're finalising our privacy policy with counsel. The full document will be published here within 14 days of soft launch. In plain language, here's what we do today:"
      updated="March 14, 2026"
      toc={[
        { label: "What we collect",    icon: "file",    slug: "what-we-collect", active: true },
        { label: "What we don't do",   icon: "shield",  slug: "what-we-dont-do" },
        { label: "Your rights",        icon: "userpen", slug: "your-rights" },
        { label: "Questions?",         icon: "mail",    slug: "contact" },
      ]}
      sections={[
        {
          slug: "what-we-collect",
          heading: "What we collect",
          body: "Sign-up email + the OTP code you submit to confirm it. Profile information you choose to provide (name, age, country, photos, biographical fields). Activity inside Ahavah: who you swiped on, who you matched with, what you sent in chat. Standard request metadata (IP, user agent) for anti-abuse + rate-limiting.",
        },
        {
          slug: "what-we-dont-do",
          heading: "What we don't do",
          body: "We don't sell your data to anyone. We don't share your data with advertisers or third-party data brokers. We don't use your photos to train AI models.",
        },
        {
          slug: "your-rights",
          heading: "Your rights",
          body: "Delete your account at any time from Settings → Account. Hard delete is immediate today; we're moving to a 7-day grace window for safety. Request a data export by emailing us. We use the same backend endpoint Ahavah's GDPR data-export uses.",
        },
      ]}
    />
  );
}

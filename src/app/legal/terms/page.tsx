"use client";

import { LegalArticleShell } from "@/components/app/legal-article-shell";
import { useRequireSession } from "@/lib/use-require-session";

export default function TermsPage() {
  useRequireSession();
  return (
    <LegalArticleShell
      kind="terms"
      title="Terms of Service"
      lead="We're finalising our terms with counsel. The full document will be published here within 14 days of soft launch."
      updated="March 14, 2026"
      toc={[
        { label: "Eligibility",  icon: "shield", slug: "eligibility", active: true },
        { label: "Your conduct", icon: "heart",  slug: "your-conduct" },
        { label: "Our service",  icon: "file",   slug: "our-service" },
        { label: "Updates",      icon: "book",   slug: "updates" },
        { label: "Questions?",   icon: "mail",   slug: "contact" },
      ]}
      sections={[
        {
          slug: "eligibility",
          heading: "Eligibility",
          body: "You must be at least 18 years old to use Ahavah. By creating an account you confirm that you meet this requirement.",
        },
        {
          slug: "your-conduct",
          heading: "Your conduct",
          body: "Treat other users with respect. Harassment, hate speech, spam, scam attempts, and inappropriate content result in an immediate ban. Use Ahavah for its stated purpose: matchmaking with shared values.",
        },
        {
          slug: "our-service",
          heading: "Our service",
          body: "You provide a real photo of yourself and accurate profile information. We may suspend accounts that misrepresent identity or violate our community standards.",
        },
        {
          slug: "updates",
          heading: "Updates",
          body: "We may update these terms as the product and the legal copy mature. Continued use after a meaningful change implies acceptance.",
        },
      ]}
    />
  );
}

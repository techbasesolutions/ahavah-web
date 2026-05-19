import { LegalArticleShell } from "@/components/app/legal-article-shell";

export default function TermsPage() {
  return (
    <LegalArticleShell
      kind="terms"
      title="Terms of Service"
      lead="We're finalising our terms with counsel. The full document will be published here within 14 days of soft launch."
      updated="March 14, 2026"
      toc={[
        { label: "Eligibility",  icon: "shield", active: true },
        { label: "Your conduct", icon: "heart" },
        { label: "Our service",  icon: "file" },
        { label: "Updates",      icon: "book" },
        { label: "Questions?",   icon: "mail" },
      ]}
      sections={[
        {
          heading: "Eligibility",
          body: "You must be at least 18 years old to use Ahavah. By creating an account you confirm that you meet this requirement.",
        },
        {
          heading: "Your conduct",
          body: "Treat other users with respect. Harassment, hate speech, spam, scam attempts, and inappropriate content result in an immediate ban. Use Ahavah for its stated purpose: matchmaking with shared values.",
        },
        {
          heading: "Our service",
          body: "You provide a real photo of yourself and accurate profile information. We may suspend accounts that misrepresent identity or violate our community standards.",
        },
        {
          heading: "Updates",
          body: "We may update these terms as the product and the legal copy mature. Continued use after a meaningful change implies acceptance.",
        },
      ]}
    />
  );
}

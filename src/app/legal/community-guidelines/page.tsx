import { LegalArticleShell } from "@/components/app/legal-article-shell";

export default function CommunityGuidelinesPage() {
  return (
    <LegalArticleShell
      kind="community"
      title="Community Guidelines"
      lead="Ahavah is a small, intentional community. The full guidelines will be published here within 14 days of soft launch. The short version:"
      updated="March 14, 2026"
      toc={[
        { label: "Be kind",              icon: "heart",  active: true },
        { label: "Be real",              icon: "shield" },
        { label: "Be safe",              icon: "lock" },
        { label: "If you see something", icon: "alert" },
        { label: "Reporting emergency",  icon: "phone" },
      ]}
      sections={[
        {
          heading: "Be kind",
          body: "Treat every person as if you might match with them tomorrow. Harassment, hate speech, slurs, and unwanted sexual content are not tolerated and result in an immediate ban.",
        },
        {
          heading: "Be real",
          body: "Use real photos of yourself, real first name, real age. No filters that obscure your face. No catfishing. Verification is optional but encouraged.",
        },
        {
          heading: "Be safe",
          body: "Take new conversations off-platform when YOU choose, not when someone pressures you. Never send money. Report anything that feels off using the ··· menu in chat or on a profile.",
        },
        {
          heading: "If you see something",
          body: "Use the report flow. Reports go to our small moderation team and reach a real human. We review every report.",
        },
      ]}
    />
  );
}

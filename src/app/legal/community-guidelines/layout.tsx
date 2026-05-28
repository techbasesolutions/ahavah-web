import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "How Ahavah stays safe, kind, and modest: conduct, photos, and the standards we hold for Torah-observant members.",
  alternates: { canonical: "/legal/community-guidelines" },
};

export default function CommunityGuidelinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

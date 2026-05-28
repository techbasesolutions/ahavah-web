import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers about Ahavah: who it's for, verification tiers, pricing, languages, how your data is handled, and the Summer 2026 launch.",
  alternates: { canonical: "/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}

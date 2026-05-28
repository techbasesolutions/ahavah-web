import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Ahavah is a kind, modest, Torah-observant community for Messianic believers seeking marriage. See what we stand for.",
  alternates: { canonical: "/community" },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}

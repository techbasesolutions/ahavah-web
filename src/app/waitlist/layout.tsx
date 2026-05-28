import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Join the Ahavah waitlist to be first in when Torah-observant matchmaking opens. We'll email your sign-in link at launch.",
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}

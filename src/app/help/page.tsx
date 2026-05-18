"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Bug, ChevronDown, Mail } from "lucide-react";

import { BackButton } from "@/components/app/back-button";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How does verification work?",
    a: "We use a three-tier system. Bronze confirms a real person via selfie + photo cross-check. Silver adds a liveness check to distinguish you from a video. Gold matches a government ID to your face for the highest trust signal.",
  },
  {
    q: "How do filters work?",
    a: "Tap the sliders icon on Discover or Map to set country, language, age range, faith, and intent filters. Filters are shared across both surfaces, so narrowing on Map narrows your swipe deck too.",
  },
  {
    q: "Why don't I see anyone?",
    a: "Your filters might be too narrow. Open the filter sheet and clear or widen your selections. You can also tap 'Reset all decisions' on the empty deck to revisit candidates you've already passed.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile, then Settings, then Account, then Delete account. Your profile goes invisible immediately. After a 7-day grace window the account is permanently deleted. To cancel within that window, email admin@ahavah.app from your sign-in address.",
  },
  {
    q: "Is my data shared?",
    a: "Your profile data is only shared with other Ahavah members per your visibility settings. Private fields (email, phone, account history) are never visible to other users.",
  },
];

const CONTACTS: ReadonlyArray<{
  Icon: typeof Mail;
  tone: "brand" | "muted";
  title: string;
  description: string;
  href: string;
}> = [
  // Single inbox for now (admin@ahavah.app). Phase W §9 deferred
  // multi-inbox routing (support@ / bugs@ forwarding); when those
  // forwards land, swap each href back to its dedicated address.
  {
    Icon: Mail,
    tone: "brand",
    title: "Email support",
    description: "admin@ahavah.app",
    href: "mailto:admin@ahavah.app?subject=Ahavah%20support",
  },
  {
    Icon: Bug,
    tone: "muted",
    title: "Report a bug",
    description: "admin@ahavah.app",
    href: "mailto:admin@ahavah.app?subject=Ahavah%20bug%20report",
  },
];

export default function HelpPage() {
  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Help</PageHeaderTitle>
      </PageHeader>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="px-5 pt-2 pb-4 text-meta text-(--ink-2)"
      >
        Need help? Pick a topic below or reach out directly.
      </motion.p>

      {/* FAQ accordion — semantic <details>/<summary> chosen over the kit
          Accordion component because (a) the kit Accordion has minimal
          styling (light underline-on-hover) tuned for docs, not for the
          tinted card list we want here, and (b) native details gives us
          built-in keyboard + screen-reader handling without a heavier
          dependency. ChevronDown rotates on group/faq open. */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-col gap-2 px-5"
        aria-label="Frequently asked questions"
      >
        <h2 className="text-overline text-(--ink-3)">FAQ</h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group/faq rounded-2xl bg-(--card) px-4 py-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-meta text-(--ink) [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{faq.q}</span>
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 text-(--ink-3) transition-transform duration-200 group-open/faq:rotate-180"
                />
              </summary>
              <p className="mt-3 text-caption leading-relaxed text-(--ink-3)">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </motion.section>

      {/* Contact + Bug report. Item render={<Link href="mailto:..."/>}
          matches the pattern used elsewhere (/locked uses Link for
          mailto). Both addresses are placeholders pending real support
          inbox routing. */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.13 }}
        className="mt-6 flex flex-col gap-2 px-3"
        aria-label="Get in touch"
      >
        <h2 className="px-3 text-overline text-(--ink-3)">Get in touch</h2>
        <ItemGroup className="gap-1">
          {CONTACTS.map((c) => (
            <Item
              key={c.href}
              variant="muted"
              render={
                <Link
                  href={c.href}
                  prefetch={false}
                  className="rounded-2xl"
                />
              }
            >
              <ItemMedia>
                <IconBadge tone={c.tone}>
                  <c.Icon />
                </IconBadge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-meta text-(--ink)">
                  {c.title}
                </ItemTitle>
                <ItemDescription className="text-caption text-(--ink-3)">
                  {c.description}
                </ItemDescription>
              </ItemContent>
              <ItemActions aria-hidden />
            </Item>
          ))}
        </ItemGroup>
      </motion.section>

      <BottomNav />
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  BookOpen,
  ChevronRight,
  Lock,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

import { BackButton } from "@/components/app/back-button";
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

/**
 * /settings/safety — safety tips + a hero + legal-resource shortcuts.
 *
 * Phase W cutover (2026-05-15): page was previously a "Safety Center"
 * with Quick Actions duplicating /settings/blocked + /settings/privacy.
 * The audit flagged Blocked users as reachable from 3 places — fixed
 * by stripping the Quick Actions block here. Blocked users + Privacy
 * each now live in exactly one settings home (the canonical
 * /settings App group entry).
 *
 * "Local emergency numbers" tile + the /safety/emergency route were
 * removed in the same wave — the user explicitly asked for it to come
 * off and the tile had a maintenance cost without earning its keep.
 */

const SAFETY_TIPS: ReadonlyArray<{
  Icon: typeof ShieldCheck;
  title: string;
  body: string;
}> = [
  {
    Icon: MapPin,
    title: "Meet in public for the first time",
    body: "A coffee shop, a busy park, anywhere you can leave easily. Tell a friend where you'll be.",
  },
  {
    Icon: Lock,
    title: "Don't share private information early",
    body: "Your home address, workplace, or financial details can wait until you trust the person.",
  },
  {
    Icon: PhoneCall,
    title: "If someone makes you uncomfortable, leave",
    body: "Trust your instincts. You don't owe anyone an explanation, in person or in chat.",
  },
];

const RESOURCES: ReadonlyArray<{
  Icon: typeof BookOpen;
  title: string;
  href: string;
}> = [
  // Legal pages — kept here for quick access from the safety surface,
  // in addition to their canonical entries under /settings → "Safety
  // & Legal" group.
  { Icon: BookOpen,    title: "Community guidelines", href: "/legal/community-guidelines" },
  { Icon: ShieldCheck, title: "Privacy policy",       href: "/legal/privacy" },
];

export default function SafetyTipsPage() {
  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <BackButton fallback="/settings" label="Back to settings" />
        <PageHeaderTitle>Safety tips</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {/* Hero card — friendly assurance */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Card tone="gradient" className="mx-2 gap-3 px-5 py-5">
            <CardHeader className="flex-row items-center gap-3 px-0">
              <IconBadge tone="cta" size="xl" shape="circle">
                <ShieldCheck />
              </IconBadge>
              <div className="flex-1">
                <h2 className="text-h3 text-white">We&apos;ve got your back</h2>
                <p className="text-meta text-white/85">
                  Photos verified, reports reviewed, blocks instant.
                </p>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <p className="text-body leading-relaxed text-white/90">
                Ahavah uses on-device photo verification, 24-hour report review,
                and instant block-and-mute. If something feels off, act on it —
                we&apos;ll handle the rest.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Safety tips — kit Item composition. ItemGroup gives role="list"
            so each tip is a list item semantically (no raw ul/li needed). */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.11 }}
          className="flex flex-col gap-3"
        >
          <h2 className="px-3 text-overline text-text-muted">Tips</h2>
          <ItemGroup className="gap-3 px-3">
            {SAFETY_TIPS.map((tip) => (
              <Item key={tip.title} className="items-start px-0 py-0">
                <ItemMedia>
                  <IconBadge tone="brand" shape="circle">
                    <tip.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta font-medium text-white">
                    {tip.title}
                  </ItemTitle>
                  <ItemDescription className="text-caption leading-relaxed text-text-muted">
                    {tip.body}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>

        {/* Resources — quick link to community guidelines + privacy policy.
            These also live under /settings → "Safety & Legal" group as
            canonical entries. */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.17 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Resources</h2>
          <ItemGroup className="gap-1">
            {RESOURCES.map((item) => (
              <Item
                key={item.title}
                variant="muted"
                render={
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="rounded-2xl"
                  />
                }
              >
                <ItemMedia>
                  <IconBadge tone="brand">
                    <item.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta text-white">
                    {item.title}
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-text-muted" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>
      </div>

      <BottomNav />
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  EyeOff,
  Flag,
  Lock,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

const QUICK_ACTIONS: ReadonlyArray<{
  Icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
  href: string;
  destructive?: boolean;
}> = [
  { Icon: UserX,  title: "Block someone",   subtitle: "Stop a user from contacting you", href: "/settings/blocked" },
  { Icon: Flag,   title: "Report a profile", subtitle: "Tell us about a violation",      href: "/settings/blocked" },
  { Icon: EyeOff, title: "Privacy settings", subtitle: "Control who sees what",          href: "/settings/privacy" },
];

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
  // Point at the same /legal/* paths that /welcome and /auth/sign-up
  // footer links use — these are placeholder routes until real legal
  // pages are created. Was self-looping to /settings/safety (refresh the
  // page on click), worse than a 404.
  { Icon: BookOpen,    title: "Community guidelines",     href: "/legal/community-guidelines" },
  { Icon: ShieldCheck, title: "Trust & safety policies",  href: "/legal/trust-safety" },
  { Icon: PhoneCall,   title: "Local emergency numbers",  href: "/legal/emergency-numbers" },
];

export default function SafetyCenterPage() {
  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to settings"
          render={<Link href="/settings" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Safety center</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {/* Hero card — friendly assurance */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
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

        {/* Quick actions */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Quick actions</h2>
          <ItemGroup className="gap-1">
            {QUICK_ACTIONS.map((item) => (
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
                  <IconBadge tone={item.destructive ? "destructive" : "brand"}>
                    <item.Icon />
                  </IconBadge>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-meta text-white">
                    {item.title}
                  </ItemTitle>
                  <ItemDescription className="text-caption text-text-muted">
                    {item.subtitle}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className="size-4 text-text-muted" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </motion.section>

        {/* Safety tips — kit Item composition. ItemGroup gives role="list"
            so each tip is a list item semantically (no raw ul/li needed). */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.21 }}
          className="flex flex-col gap-3"
        >
          <h2 className="px-3 text-overline text-text-muted">Safety tips</h2>
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

        {/* Resources */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.29 }}
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

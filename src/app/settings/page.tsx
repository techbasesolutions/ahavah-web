"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BellRing,
  ChevronRight,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

// Mirrors the /profile own-profile rhythm: each group gets a coloured
// dot accent + IconBadge tones vary by purpose so the eye can find
// Billing faster (was 9x identical lavender = flat).
type IconBadgeTone = "brand" | "muted" | "success" | "destructive";

const SETTINGS_GROUPS: ReadonlyArray<{
  label: string;
  accent: string;
  items: ReadonlyArray<{
    Icon: typeof HelpCircle;
    title: string;
    subtitle?: string;
    href: string;
    tone?: IconBadgeTone;
    destructive?: boolean;
  }>;
}> = [
  // Edit profile / Verification / Subscription deliberately NOT here —
  // they live on /profile (the personal-actions surface). Settings is
  // for granular toggles + account management only. Earlier duplication
  // gave users two ways to reach the same screens.
  {
    label: "Account",
    accent: "bg-lavender",
    items: [
      { Icon: UserCog, title: "Account", subtitle: "Email & sign out", href: "/settings/account", tone: "muted" },
    ],
  },
  {
    label: "App",
    accent: "bg-lavender/60",
    items: [
      // Auto-translate intentionally NOT here — DeepL translations are
      // deferred per Phase W §9. Restore when the feature actually
      // ships. Notifications now wired to a real master push toggle
      // (sub/unsub via usePushSubscription).
      { Icon: BellRing,    title: "Notifications", subtitle: "Push notifications",         href: "/settings/notifications", tone: "muted" },
      { Icon: ShieldAlert, title: "Privacy",       subtitle: "What others see about you",  href: "/settings/privacy",       tone: "muted" },
      { Icon: UserX,       title: "Blocked users", subtitle: "People you've blocked",      href: "/settings/blocked",       tone: "muted" },
      { Icon: ShieldCheck, title: "Safety center", subtitle: "Tips, blocks, emergencies",  href: "/settings/safety",        tone: "muted" },
    ],
  },
  {
    label: "Support",
    accent: "bg-lavender/60",
    items: [
      { Icon: HelpCircle, title: "Help center", subtitle: "FAQ, contact, bug report", href: "/help", tone: "muted" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to profile"
          render={<Link href="/profile" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Settings</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        {SETTINGS_GROUPS.map((group, gi) => (
          <motion.section
            key={group.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 + gi * 0.08 }}
            className="flex flex-col gap-2"
          >
            <h2 className="flex items-center gap-2 px-3 text-overline text-text-muted">
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${group.accent}`}
              />
              {group.label}
            </h2>
            <ItemGroup className="gap-1">
              {group.items.map((item) => (
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
                    <IconBadge
                      tone={
                        item.destructive
                          ? "destructive"
                          : item.tone ?? "brand"
                      }
                    >
                      <item.Icon />
                    </IconBadge>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle
                      className={
                        item.destructive
                          ? "text-meta text-pink"
                          : "text-meta text-white"
                      }
                    >
                      {item.title}
                    </ItemTitle>
                    {item.subtitle ? (
                      <ItemDescription className="text-caption text-text-muted">
                        {item.subtitle}
                      </ItemDescription>
                    ) : null}
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight className="size-4 text-text-muted" />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </motion.section>
        ))}
      </div>

      <BottomNav />
    </PageShell>
  );
}

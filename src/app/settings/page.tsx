"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  HelpCircle,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPen,
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

const SETTINGS_GROUPS: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{
    Icon: typeof Bell;
    title: string;
    subtitle?: string;
    href: string;
    destructive?: boolean;
  }>;
}> = [
  {
    label: "Account",
    items: [
      { Icon: UserPen,    title: "Edit profile",          subtitle: "Photos, bio, basics", href: "/profile/edit" },
      { Icon: Globe,      title: "Discovery preferences", subtitle: "Country, language, range", href: "/discover" },
      { Icon: ShieldCheck,title: "Verification",          subtitle: "Bronze · upgrade to Silver", href: "/verify" },
    ],
  },
  {
    label: "App",
    items: [
      { Icon: Bell,      title: "Notifications", subtitle: "Push, sounds, sync", href: "/settings/notifications" },
      { Icon: ShieldAlert,title: "Privacy",      subtitle: "What others see about you", href: "/settings/privacy" },
      { Icon: UserX,     title: "Blocked users", subtitle: "People you've blocked", href: "/settings/blocked" },
      { Icon: ShieldCheck,title:"Safety center", subtitle: "Tips, reports, emergencies", href: "/settings/safety" },
      { Icon: Sparkles,  title: "Auto-translate",subtitle: "On · English", href: "/settings/account" },
    ],
  },
  {
    label: "Billing",
    items: [
      { Icon: CreditCard, title: "Subscription", subtitle: "Upgrade to Premium →", href: "/paywall" },
    ],
  },
  {
    label: "Support",
    items: [
      { Icon: HelpCircle, title: "Help center", subtitle: "FAQ, contact, bug report", href: "/settings/account" },
    ],
  },
  {
    label: "Account actions",
    items: [
      { Icon: LogOut, title: "Log out",        href: "/settings/account" },
      { Icon: Trash2, title: "Delete account", href: "/settings/account", destructive: true },
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
            <h2 className="px-3 text-overline text-text-muted">{group.label}</h2>
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
                    <IconBadge tone={item.destructive ? "destructive" : "brand"}>
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

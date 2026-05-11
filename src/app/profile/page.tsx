"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell, ChevronRight, CreditCard, Globe, LogOut,
  Settings, Shield, Sparkles, Star, Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { PageShell } from "@/components/app/page-shell";

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
      { Icon: Settings, title: "Edit profile",          subtitle: "Photos, bio, basics",         href: "/profile/edit" },
      { Icon: Globe,    title: "Discovery preferences", subtitle: "Country, language, range",    href: "/settings" },
      { Icon: Shield,   title: "Verification",          subtitle: "Bronze · upgrade to Silver",  href: "/verify" },
    ],
  },
  {
    label: "App",
    items: [
      { Icon: Bell,     title: "Notifications",  subtitle: "Push, sounds, sync", href: "/settings/notifications" },
      { Icon: Sparkles, title: "Auto-translate", subtitle: "On · English",       href: "/settings" },
    ],
  },
  {
    label: "Billing",
    items: [
      { Icon: CreditCard, title: "Subscription", subtitle: "Upgrade to Premium →", href: "/paywall" },
    ],
  },
  {
    label: "Other",
    items: [
      { Icon: LogOut, title: "Log out",        href: "/settings/account" },
      { Icon: Trash2, title: "Delete account", href: "/settings/account", destructive: true },
    ],
  },
];

export default function ProfilePage() {
  return (
    <PageShell bottomPad="nav">
      {/* Hero card — own profile + free badge + Upgrade CTA */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="px-5 pt-6"
      >
        <Card tone="gradient" className="overflow-hidden gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-4">
              <Avatar size="tap-2xl" className="ring-2 ring-white/40">
                <AvatarFallback variant="brand">E</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {/* h1 — visible page title (was a `<p>`, which left the
                    page with no h1 anchor and the section h2s orphaned). */}
                <h1 className="text-h3 leading-tight text-white">Ehud, 30</h1>
                <p className="mt-0.5 text-caption text-white/85">Bronze verified</p>
              </div>
              <Badge variant="lime" size="md" className="font-bold tabular-nums">
                <Star size={11} className="mr-1" fill="currentColor" />
                Free
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Button
              nativeButton={false}
              size="cta"
              className="bg-lime text-black hover:bg-lime/90"
              render={<Link href="/paywall" prefetch={false} />}
            >
              <Sparkles size={14} className="mr-2" />
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex flex-col gap-6 px-3 pt-8">
        {SETTINGS_GROUPS.map((group, gi) => (
          <motion.section
            key={group.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 + gi * 0.08 }}
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

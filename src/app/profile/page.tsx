"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell, ChevronRight, CreditCard, Globe, LogOut,
  Settings, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Pill } from "@/components/kibo-ui/pill";

import { BottomNav } from "@/components/app/bottom-nav";
import { PageShell } from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Group accent dot colours — break the stack-of-lists rhythm so the eye
// can find Billing / Other faster (Account/App share lavender on purpose:
// they're the everyday rows).
type IconBadgeTone = "brand" | "muted" | "success" | "destructive";

const SETTINGS_GROUPS: ReadonlyArray<{
  label: string;
  /** Tailwind bg-* class for the dot accent before the group label. */
  accent: string;
  items: ReadonlyArray<{
    Icon: typeof Bell;
    title: string;
    subtitle?: string;
    href: string;
    tone?: IconBadgeTone;
    destructive?: boolean;
  }>;
}> = [
  {
    label: "Account",
    accent: "bg-lavender",
    items: [
      { Icon: Settings, title: "Edit profile",          subtitle: "Photos, bio, basics",         href: "/profile/edit",  tone: "brand" },
      { Icon: Globe,    title: "Discovery preferences", subtitle: "Country, language, range",    href: "/settings",      tone: "brand" },
      { Icon: ShieldCheck, title: "Verification",       subtitle: "Bronze · upgrade to Silver",  href: "/verify",        tone: "success" },
    ],
  },
  {
    label: "App",
    accent: "bg-lavender/60",
    items: [
      { Icon: Bell,     title: "Notifications",  subtitle: "Push, sounds, sync", href: "/settings/notifications", tone: "muted" },
      { Icon: Sparkles, title: "Auto-translate", subtitle: "On · English",       href: "/settings",                tone: "muted" },
    ],
  },
  {
    label: "Billing",
    accent: "bg-lime",
    items: [
      { Icon: CreditCard, title: "Subscription", subtitle: "Upgrade to Premium →", href: "/paywall", tone: "success" },
    ],
  },
  {
    label: "Other",
    accent: "bg-pink",
    items: [
      { Icon: LogOut, title: "Log out",        href: "/settings/account", tone: "muted" },
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
              <Avatar
                size="tap-2xl"
                aria-label="Your profile"
                className="ring-2 ring-white/40"
              >
                <AvatarFallback variant="brand">E</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {/* Hero name — text-h1 (was text-h3, which read as caption
                    on the "this is YOU" screen). Verification status is a
                    Pill chip, not a paragraph caption. */}
                <h1 className="text-h1 leading-tight text-white">Ehud, 30</h1>
                {/* Variant `glassDark` (not lavenderOutline) — the parent
                    Card is tone="gradient" (Persian-Indigo → Lavender), so
                    lavender-on-lavender fails AA. Translucent black fill +
                    white text gives ~12:1 contrast against the gradient's
                    lightest stop (#BC96FF). */}
                <Pill variant="glassDark" className="mt-2">
                  <ShieldCheck size={12} />
                  Bronze verified
                </Pill>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Button
              nativeButton={false}
              size="cta"
              tone="cta"
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

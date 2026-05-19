"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  BellRing,
  BookOpen,
  ChevronRight,
  FileText,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserX,
  Wallet,
} from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";

import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { ThemeToggle } from "@/components/app/theme-toggle";

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
  // Phase W cutover (2026-05-15) — regrouped per audit:
  //   - Blocked users + Privacy + Notifications stay in "App" (single
  //     canonical home each, no more duplicate doors from
  //     /settings/privacy or /settings/safety).
  //   - "Safety & Legal" group consolidates safety tips with all three
  //     legal pages. Terms of service was previously unreachable from
  //     settings — only the landing footer + sign-up consent linked to
  //     it. Now lives alongside the other policies.
  //   - Edit profile / Verification / Subscription deliberately NOT
  //     here — they live on /profile (the personal-actions surface).
  {
    label: "Account",
    accent: "bg-lavender",
    items: [
      { Icon: UserCog, title: "Account", subtitle: "Email & sign out", href: "/settings/account", tone: "muted" },
    ],
  },
  // Wallet group added 2026-05-17 per user direction — token balance is
  // no longer always-on chrome; access lives here under Settings. Links
  // to the existing /profile/tokens route which serves as both balance
  // display and purchase store.
  {
    label: "Wallet",
    accent: "bg-lime",
    items: [
      { Icon: Wallet, title: "Tokens & wallet", subtitle: "Balance, purchase, history", href: "/profile/tokens", tone: "brand" },
    ],
  },
  {
    label: "App",
    accent: "bg-lavender/60",
    items: [
      { Icon: BellRing,    title: "Notifications", subtitle: "Push notifications",        href: "/settings/notifications", tone: "muted" },
      { Icon: ShieldAlert, title: "Privacy",       subtitle: "What others see about you", href: "/settings/privacy",       tone: "muted" },
      { Icon: UserX,       title: "Blocked users", subtitle: "People you've blocked",     href: "/settings/blocked",       tone: "muted" },
    ],
  },
  {
    label: "Safety & Legal",
    accent: "bg-lavender/60",
    items: [
      { Icon: ShieldCheck, title: "Safety tips",          subtitle: "Stay safe on Ahavah",     href: "/settings/safety",            tone: "muted" },
      { Icon: BookOpen,    title: "Community guidelines", subtitle: "How we keep it kind",     href: "/legal/community-guidelines", tone: "muted" },
      { Icon: ShieldCheck, title: "Privacy policy",       subtitle: "How we handle your data", href: "/legal/privacy",              tone: "muted" },
      { Icon: FileText,    title: "Terms of service",     subtitle: "What you agree to",       href: "/legal/terms",                tone: "muted" },
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

// Flat list for the desktop left-column secondary nav.
// Mirrors SETTINGS_GROUPS items in reading order.
const DESKTOP_NAV_ITEMS: ReadonlyArray<{
  Icon: typeof HelpCircle;
  label: string;
  href: string;
  group: string;
}> = [
  { Icon: UserCog,    label: "Account",              href: "/settings/account",           group: "Account" },
  { Icon: Wallet,     label: "Tokens & wallet",       href: "/profile/tokens",             group: "Wallet" },
  { Icon: BellRing,   label: "Notifications",         href: "/settings/notifications",     group: "App" },
  { Icon: ShieldAlert,label: "Privacy",               href: "/settings/privacy",           group: "App" },
  { Icon: UserX,      label: "Blocked users",         href: "/settings/blocked",           group: "App" },
  { Icon: ShieldCheck,label: "Safety tips",           href: "/settings/safety",            group: "Safety & Legal" },
  { Icon: BookOpen,   label: "Community guidelines",  href: "/legal/community-guidelines", group: "Safety & Legal" },
  { Icon: ShieldCheck,label: "Privacy policy",        href: "/legal/privacy",              group: "Safety & Legal" },
  { Icon: FileText,   label: "Terms of service",      href: "/legal/terms",                group: "Safety & Legal" },
  { Icon: HelpCircle, label: "Help center",           href: "/help",                       group: "Support" },
];

export default function SettingsPage() {
  return (
    <PageShell bottomPad="nav" desktopShell="sidebar" topBarTitle="Settings" topBarBack={false}>
      {/* ── Mobile layout (<md) ── */}
      <div className="md:hidden">
        <PageHeader pad="tight" className="flex items-center gap-3">
          <BackButton fallback="/profile" label="Back to profile" />
          <PageHeaderTitle>Settings</PageHeaderTitle>
        </PageHeader>

        <div className="flex flex-col gap-6 px-3 pt-4">
          {/* Theme row (mobile-visible — desktop has the toggle in
              DesktopTopBar's top-right slot, so the row would duplicate).
              Re-added 2026-05-17 after MobileThemeFloat removal. */}
          <div className="md:hidden flex items-center justify-between px-3 py-3 rounded-2xl bg-(--card) border border-(--hairline)">
            <span className="text-base font-medium text-(--ink)">Theme</span>
            <ThemeToggle />
          </div>

          {SETTINGS_GROUPS.map((group, gi) => (
            <motion.section
              key={group.label}
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.05 + gi * 0.08 }}
              className="flex flex-col gap-2"
            >
              <h2 className="flex items-center gap-2 px-3 text-overline text-(--ink-2)">
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
                            ? "text-meta text-(--color-pink)"
                            : "text-meta text-(--ink)"
                        }
                      >
                        {item.title}
                      </ItemTitle>
                      {item.subtitle ? (
                        <ItemDescription className="text-caption text-(--ink-2)">
                          {item.subtitle}
                        </ItemDescription>
                      ) : null}
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-(--ink-2)" />
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </motion.section>
          ))}
        </div>

        <BottomNav />
      </div>

      {/* ── Desktop layout (md+) ── */}
      <div className="hidden md:grid grid-cols-[260px_1fr] gap-8 max-w-275 mx-auto w-full">
        {/* Left column — secondary nav */}
        <Card tone="elevated" className="h-fit py-2">
          <nav aria-label="Settings navigation">
            {DESKTOP_NAV_ITEMS.map((navItem, i) => {
                const showGroupLabel =
                  i === 0 || navItem.group !== DESKTOP_NAV_ITEMS[i - 1].group;
                return (
                  <div key={navItem.label}>
                    {showGroupLabel && (
                      <p className="px-3.5 pt-4 pb-1 text-overline text-(--ink-3) first:pt-2">
                        {navItem.group}
                      </p>
                    )}
                    <Link
                      href={navItem.href}
                      prefetch={false}
                      className="flex items-center gap-3.5 rounded-[14px] mx-1 px-3 py-3 min-h-12 text-meta font-medium text-foreground hover:bg-lavender/10 transition-colors"
                    >
                      <IconBadge tone="muted" size="md">
                        <navItem.Icon />
                      </IconBadge>
                      <span className="flex-1">{navItem.label}</span>
                      <ChevronRight className="size-3.5 text-(--ink-3)" />
                    </Link>
                  </div>
                );
              })}
          </nav>
        </Card>

        {/* Right column — content panel placeholder */}
        <Card tone="elevated" className="flex flex-col gap-3 p-8">
          {/* Theme row removed 2026-05-17 — now in DesktopTopBar header. */}
          <CardContent className="px-0 flex flex-col items-center justify-center text-center py-16 gap-3">
            <p className="text-h1 text-foreground">Select a category</p>
            <p className="text-meta text-(--ink-3) max-w-sm">
              Choose a setting from the left to manage your account, notifications,
              privacy, and more.
            </p>
            <p className="text-caption text-(--ink-3) mt-4">
              Most-used:{" "}
              <Link href="/settings/notifications" className="underline underline-offset-2">
                Notifications
              </Link>
              {" · "}
              <Link href="/settings/privacy" className="underline underline-offset-2">
                Privacy
              </Link>
              {" · "}
              <Link href="/settings/account" className="underline underline-offset-2">
                Account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

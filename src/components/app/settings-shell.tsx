"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { BackButton } from "@/components/app/back-button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

/**
 * SettingsShell — shared chrome for all settings sub-routes (Task 20,
 * 2026-05-17). Owns BOTH the mobile chrome (PageHeader + content +
 * BottomNav) and the canonical desktop 2-col split-view (320px sub-nav
 * rail + 1fr content panel Card per screens/13-settings.md).
 *
 * Sub-routes pass `activeKey` (which nav row to highlight) + `title`
 * (used in both the mobile PageHeader and the desktop topbar) + their
 * content as children. The content renders inside the right-side
 * content-panel Card at md+ and in the mobile chrome at <md.
 *
 * `pathname` is used to compute the active key automatically when
 * `activeKey` is omitted — saves callers from manually wiring it.
 */

type NavItem = {
  Icon: typeof HelpCircle;
  label: string;
  subtitle?: string;
  href: string;
  group: string;
};

// Single canonical nav inventory — kept in one place so the /settings
// index page and SettingsShell can both reference it without drift.
export const SETTINGS_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { Icon: UserCog,    label: "Account",              subtitle: "Email & sign out",        href: "/settings/account",           group: "Account" },
  { Icon: Wallet,     label: "Tokens & wallet",      subtitle: "Balance, purchase, history", href: "/profile/tokens",          group: "Wallet" },
  { Icon: BellRing,   label: "Notifications",        subtitle: "Push notifications",      href: "/settings/notifications",     group: "App" },
  { Icon: ShieldAlert,label: "Privacy",              subtitle: "What others see",         href: "/settings/privacy",           group: "App" },
  { Icon: UserX,      label: "Blocked users",        subtitle: "People you've blocked",   href: "/settings/blocked",           group: "App" },
  { Icon: ShieldCheck,label: "Safety tips",          subtitle: "Stay safe on Ahavah",     href: "/settings/safety",            group: "Safety & Legal" },
  { Icon: BookOpen,   label: "Community guidelines", subtitle: "How we keep it kind",     href: "/legal/community-guidelines", group: "Safety & Legal" },
  { Icon: ShieldCheck,label: "Privacy policy",       subtitle: "How we handle your data", href: "/legal/privacy",              group: "Safety & Legal" },
  { Icon: FileText,   label: "Terms of service",     subtitle: "What you agree to",       href: "/legal/terms",                group: "Safety & Legal" },
  { Icon: HelpCircle, label: "Help center",          subtitle: "FAQs & contact",          href: "/help",                       group: "Support" },
];

type SettingsShellProps = {
  /**
   * Page title — shown in mobile PageHeader and used as the desktop
   * top-right topbar title (PageShell topBarTitle).
   */
  title: string;
  /**
   * Optional active nav key (href). When omitted, computed from
   * `usePathname()` — pick the row whose href matches the current path.
   */
  activeHref?: string;
  /**
   * Page content — the sub-route's body (toggle list, form fields,
   * empty state, etc.). Renders inside the desktop content-panel Card
   * at md+ and below the mobile PageHeader at <md.
   */
  children: React.ReactNode;
};

export function SettingsShell({ title, activeHref, children }: SettingsShellProps) {
  const pathname = usePathname() ?? "";
  const resolvedActive = activeHref ?? pathname;

  return (
    <PageShell
      bottomPad="nav"
      desktopShell="sidebar"
      topBarTitle={title}
    >
      {/* ── Mobile (<md) ── existing chrome preserved per sub-route. */}
      <div className="md:hidden">
        <PageHeader pad="tight" className="flex items-center gap-3">
          <BackButton fallback="/settings" label="Back to settings" />
          <PageHeaderTitle>{title}</PageHeaderTitle>
        </PageHeader>
        {children}
        <BottomNav />
      </div>

      {/* ── Desktop (md+) ── canonical 2-col split-view per
          screens/13-settings.md: 320px sub-nav rail + 1fr content panel
          Card. */}
      <div className="hidden md:grid md:grid-cols-[320px_1fr] md:gap-8 md:max-w-275 md:mx-auto md:w-full">
        <SettingsSubNav activeHref={resolvedActive} />
        <Card
          tone="default"
          className="rounded-3xl p-8 bg-(--card) border border-(--hairline) gap-0"
        >
          <h1 className="text-h1 text-(--ink) font-extrabold mb-6">{title}</h1>
          {children}
        </Card>
      </div>
    </PageShell>
  );
}

/**
 * SettingsSubNav — left-rail navigation for desktop /settings views.
 * Groups items by `group` label per canonical screens/13-settings.md.
 * Active row gets `bg-(--color-lavender)/14` tint + bold title.
 */
function SettingsSubNav({ activeHref }: { activeHref: string }) {
  // Group items in declaration order — collect by group label.
  const grouped = React.useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of SETTINGS_NAV_ITEMS) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries()); // preserves insertion order
  }, []);

  return (
    <nav aria-label="Settings navigation" className="flex flex-col gap-4 self-start">
      {grouped.map(([groupLabel, items]) => (
        <div key={groupLabel}>
          {/* Group label per canonical: t-overline, --ink-2, padding-inline 14, mb 8 */}
          <p className="text-overline text-(--ink-2) px-3.5 mb-2">
            {groupLabel}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3.5 rounded-[14px] px-3.5 py-3 min-h-[48px] transition-colors",
                    active
                      ? "bg-(--color-lavender)/14"
                      : "hover:bg-(--color-lavender)/8",
                  )}
                >
                  <IconBadge tone="muted" size="md">
                    <item.Icon />
                  </IconBadge>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-meta text-(--ink) truncate",
                        active ? "font-bold" : "font-medium",
                      )}
                    >
                      {item.label}
                    </p>
                    {item.subtitle ? (
                      <p className="text-caption text-(--ink-3) truncate">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-3.5 text-(--ink-3) shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

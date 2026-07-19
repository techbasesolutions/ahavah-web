"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Globe, Heart, Home, Mail, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useInboxUnreadCount } from "@/lib/use-inbox-unread-count";
import { useBoostActive } from "@/lib/use-boost-active";

const TABS = [
  { key: "discover", href: "/discover", label: "Discover", Icon: Home },
  { key: "map",      href: "/map",      label: "Map",      Icon: Globe },
  { key: "matches",  href: "/matches",  label: "Matches",  Icon: Heart },
  { key: "inbox",    href: "/inbox",    label: "Inbox",    Icon: Mail },
  { key: "profile",  href: "/profile",  label: "Profile",  Icon: User },
] as const;

/**
 * Floating rounded-rect bottom nav per Dateasy image 12.
 * Active tab glyph sits inside a lime CIRCLE; inactive in lavender on transparent.
 * Mounted by every authenticated route's layout.
 *
 * The Inbox tab carries a live unread badge (lime pill, top-right of
 * the Mail icon) summing every thread's `unreadCount`. The hook
 * doubles as the chat-client connect trigger on pages other than
 * /inbox + /chat, so the badge updates in real time even if the user
 * never visits /inbox first.
 */
export function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useInboxUnreadCount();
  // Phase 8 boost indicator. Shared with DesktopSidebar via the
  // useBoostActive hook so both surfaces show the lime ring when a
  // boost is in flight.
  const boostActive = useBoostActive();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-3 z-50 mx-auto flex max-w-95 md:hidden"
    >
      {/* TokenBalancePill removed 2026-05-17 per user direction — token
          balance is no longer always-on chrome. Access via Settings →
          Wallet (links to /profile/tokens). The floating BottomNav row
          is now a single child; flex-col + gap collapsed. */}
      {/* radius 24 per the design system (BottomNav borderRadius:24 in
          screens.jsx; rounded-3xl rendered 35px — audit 2026-07-19 #7). */}
      <div className="flex h-tap-xl w-full items-center justify-around rounded-[24px] border border-border bg-(--card) px-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        {TABS.map(({ key, href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const showInboxBadge = key === "inbox" && unreadCount > 0;
          return (
            <Link
              key={key}
              href={href}
              prefetch={false}
              className="flex h-12 flex-1 items-center justify-center"
              aria-label={
                showInboxBadge ? `${label} (${unreadCount} unread)` : label
              }
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full",
                  active ? "bg-lime" : "bg-transparent",
                  // Boost-active ring on the Profile tab only — visual
                  // parallel to the spec's "sidebar avatar lime ring".
                  key === "profile" && boostActive
                    ? "ring-2 ring-lime ring-offset-2 ring-offset-bg-elevated"
                    : null,
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? "text-black" : "text-lavender"}
                  fill={active && key === "matches" ? "currentColor" : "none"}
                />
                {showInboxBadge ? (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-caption font-bold tabular-nums text-black ring-2 ring-bg-elevated"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

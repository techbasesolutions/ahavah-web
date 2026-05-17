"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Globe, Heart, Home, Mail, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useInboxUnreadCount } from "@/lib/use-inbox-unread-count";
import { TokenBalancePill } from "@/components/app/token-balance-pill";

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
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-3 z-50 mx-auto flex max-w-95 flex-col items-end gap-2"
    >
      {/* Token balance Pill — Phase 3 / monetization-tokens v1
          (spec §4.5). Sits above the BottomNav row in lieu of a
          sidebar user-block. Tap → /profile/tokens store. */}
      <TokenBalancePill />
      <div className="flex h-tap-xl w-full items-center justify-around rounded-3xl border border-white/10 bg-bg-elevated px-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
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

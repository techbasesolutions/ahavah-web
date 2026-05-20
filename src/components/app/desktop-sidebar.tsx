"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Heart, Home, Mail, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useInboxUnreadCount } from "@/lib/use-inbox-unread-count";
import { useBoostActive } from "@/lib/use-boost-active";
import { useProfile } from "@/lib/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";

const TABS = [
  { key: "discover", href: "/discover", label: "Discover", Icon: Home },
  { key: "map",      href: "/map",      label: "Map",      Icon: Globe },
  { key: "matches",  href: "/matches",  label: "Matches",  Icon: Heart },
  { key: "inbox",    href: "/inbox",    label: "Inbox",    Icon: Mail },
  { key: "profile",  href: "/profile",  label: "Profile",  Icon: User },
] as const;

/**
 * DesktopSidebar — 260px fixed left column with brand mark, nav, and user block.
 *
 * Renders ONLY at md+ via `hidden md:flex`. Mobile chrome (BottomNav) is unchanged.
 * Active state mirrors BottomNav: lime bg + black icon/text (stroke 2.4).
 * Inactive state: indigo-tinted text via --nav-inactive (= indigo brand color).
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const unreadCount = useInboxUnreadCount();
  const boostActive = useBoostActive();
  const { profile } = useProfile();
  const userPhotoUrl = profile.photos?.[0]?.cdn_url;
  const userInitial = profile.firstName?.[0]?.toUpperCase() ?? "•";

  return (
    <aside
      // 2026-05-18: was `min-h-dvh` — the flex parent's default
      // `align-items: stretch` made the sidebar grow to match the
      // tallest sibling (main column on long pages), so the nav
      // (flex-1 inside) expanded and the user block at the bottom slid
      // out of viewport. `h-dvh` pins the sidebar to exactly viewport
      // height; sticky now keeps it stationary regardless of page
      // content length.
      className="hidden md:flex md:flex-col w-65 h-dvh shrink-0 sticky top-0 border-r"
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--nav-border)",
      }}
    >
      {/* Canonical lockup — auto-swaps light/dark variant via [data-theme]
          on <html>. Lime-on-indigo (dark) and indigo+lime (light) both
          meet contrast on --nav-bg. */}
      <div className="flex items-center px-6 pt-8 pb-6">
        <Logo variant="horizontal" size="md" priority />
      </div>

      {/* Nav list */}
      <nav
        aria-label="Primary"
        className="flex flex-col gap-1 px-4 flex-1"
      >
        {TABS.map(({ key, href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const showInboxBadge = key === "inbox" && unreadCount > 0;

          return (
            <Link
              key={key}
              href={href}
              prefetch={false}
              aria-label={showInboxBadge ? `${label} (${unreadCount} unread)` : label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 h-12 rounded-xl px-4 transition-colors duration-150",
                active
                  ? "bg-lime text-black"
                  : "hover:bg-black/5",
              )}
              style={active ? undefined : { color: "var(--nav-inactive)" }}
            >
              {/* Icon circle — lime fill on active, transparent on inactive */}
              <span
                className={cn(
                  "relative flex size-9 shrink-0 items-center justify-center rounded-full",
                  active ? "bg-lime" : "bg-transparent",
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? "text-black" : undefined}
                  fill={active && key === "matches" ? "currentColor" : "none"}
                />
                {showInboxBadge ? (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-overline font-bold tabular-nums text-black ring-2 ring-white"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>

              <span
                className={cn(
                  "flex-1 text-base",
                  active ? "font-bold" : "font-medium",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user block only (canonical sidebar bottom layout, matches
          docs/handoff-desktop/desktop.jsx). TokenBalancePill removed per
          user direction (2026-05-17) — balance is now accessed via
          Settings → Wallet, not always-on chrome. ThemeToggle removed
          from sidebar — relocated to the DesktopTopBar's top-left icon
          slot per user direction. */}
      <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 min-w-0">
          {/* Current user's photo (first slot), brand initial as fallback.
              Lime ring while boost is active (Phase 8 spec — the boost
              indicator lives on the sidebar user avatar). */}
          <Avatar
            size="md"
            aria-hidden
            className={cn(
              boostActive &&
                "ring-2 ring-(--color-lime) ring-offset-2 ring-offset-(--nav-bg)",
            )}
          >
            {userPhotoUrl ? <AvatarImage src={userPhotoUrl} alt="" /> : null}
            <AvatarFallback variant="brand">{userInitial}</AvatarFallback>
          </Avatar>
          <span
            className="flex-1 truncate text-sm font-semibold"
            style={{ color: "var(--ink)" }}
          >
            You
          </span>
        </div>
      </div>
    </aside>
  );
}

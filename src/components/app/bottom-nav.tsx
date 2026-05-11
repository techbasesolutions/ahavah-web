"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Heart, Home, Mail, User } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { key: "discover", href: "/discover", label: "Discover", Icon: Home },
  { key: "matches",  href: "/matches",  label: "Matches",  Icon: Heart },
  { key: "inbox",    href: "/inbox",    label: "Inbox",    Icon: Mail },
  { key: "profile",  href: "/profile",  label: "Profile",  Icon: User },
] as const;

/**
 * Floating rounded-rect bottom nav per Dateasy image 12.
 * Active tab glyph sits inside a lime CIRCLE; inactive in lavender on transparent.
 * Mounted by every authenticated route's layout.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-4 bottom-3 z-50 mx-auto max-w-95"
    >
      <div className="flex h-tap-xl items-center justify-around rounded-3xl border border-white/10 bg-bg-elevated px-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        {TABS.map(({ key, href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href}
              prefetch={false}
              className="flex h-12 flex-1 items-center justify-center"
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  active ? "bg-lime" : "bg-transparent",
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? "text-black" : "text-lavender"}
                  fill={active && key === "matches" ? "currentColor" : "none"}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/**
 * ChatHeader — top chrome of a chat thread per Phase 6 §6.1.
 *
 * Slots (left → right):
 *   - back arrow Link (icon-tap)
 *   - 48px Avatar (fallback initial)
 *   - title block: name+age (text-meta) + online status (text-caption)
 *   - more-menu kebab Button (icon-tap)
 *
 * Bordered bottom (`border-b border-white/10`) so the header visually
 * separates from the message scroll area.
 *
 * No kit equivalent — bespoke per Phase 6 plan §6.1 (`[B]`).
 */
type ChatHeaderProps = {
  /** Where the back link points (defaults to /inbox). */
  backHref?: string;
  /** Display name. */
  name: string;
  /** Display age. */
  age: number;
  /** Online presence — drives the "Online" / "Last seen recently" subline. */
  online: boolean;
  /** Callback for the kebab "More" button. */
  onMoreClick?: () => void;
};

export function ChatHeader({
  backHref = "/inbox",
  name,
  age,
  online,
  onMoreClick,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
      <Link
        href={backHref}
        prefetch={false}
        aria-label="Back"
        className={cn(buttonVariants({ size: "icon-tap", variant: "ghost" }))}
      >
        <ChevronLeft className="text-white" />
      </Link>
      <Avatar size="tap-lg">
        <AvatarFallback variant="brand">{name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-meta font-medium leading-tight text-white">
          {name}, {age}
        </p>
        <p
          className={cn(
            "mt-0.5 text-caption",
            online ? "text-success" : "text-text-muted",
          )}
        >
          {online ? "Online" : "Last seen recently"}
        </p>
      </div>
      <Button size="icon-tap" variant="ghost" aria-label="More" onClick={onMoreClick}>
        <MoreHorizontal className="text-white" />
      </Button>
    </header>
  );
}

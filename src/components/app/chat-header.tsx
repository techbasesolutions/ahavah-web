"use client";

import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import type { PhotoSource } from "@/lib/photo-or-gradient";

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
  /** Where avatar + name link to — usually `/profile/${id}` for the chat subject. */
  profileHref: string;
  /** Display name. */
  name: string;
  /** Display age. */
  age: number;
  /** Online presence — drives the "Online" / "Last seen recently" subline. */
  online: boolean;
  /** Callback for the kebab "More" button. */
  onMoreClick?: () => void;
  /**
   * SP21 T8: optional resolved PhotoSource for the subject — when this is
   * a `{ kind: "photo" }` an <img> renders in the avatar slot; otherwise
   * the AvatarFallback initial is shown. Sample profiles ship without
   * photos so this defaults to `undefined` for backwards compatibility.
   */
  photoSource?: PhotoSource;
};

export function ChatHeader({
  backHref = "/inbox",
  profileHref,
  name,
  age,
  online,
  onMoreClick,
  photoSource,
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
      <Link
        href={profileHref}
        prefetch={false}
        aria-label={`View ${name}'s profile`}
        className="flex flex-1 items-center gap-3 rounded-xl px-1 py-1 -mx-1 -my-1 outline-none focus-visible:ring-2 focus-visible:ring-lavender hover:bg-white/5 active:bg-white/10 transition-colors"
      >
        <Avatar size="tap-lg">
          {photoSource?.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSource.src}
              alt={`${name}'s photo`}
              className="size-full object-cover"
            />
          ) : (
            <AvatarFallback variant="brand">{name[0]}</AvatarFallback>
          )}
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
      </Link>
      <Button size="icon-tap" variant="ghost" aria-label="More" onClick={onMoreClick}>
        <MoreHorizontal className="text-white" />
      </Button>
    </header>
  );
}

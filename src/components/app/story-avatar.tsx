"use client";

import { Plus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/**
 * StoryAvatar — Instagram-style ring around an Avatar primitive.
 *
 * App-level brand atom (not a kit primitive) used in:
 *  - /inbox stories carousel (size="md", with name caption)
 *  - /inbox chat-list rows (size="sm", no caption)
 *
 * Pass `isAdd` to render the dashed-lavender "+" affordance instead of an
 * avatar (story-row "Add story" tile). When `isAdd` is set the component
 * renders an interactive Button at size="dashedCircle".
 *
 * Ring colour encodes status (lime = unviewed, success = currently online).
 * All sizing/colour decisions live in cva — no per-instance className
 * conditionals at the call site.
 */

const ringVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      ring: {
        none: "border-0",
        lime: "border-2 border-lime p-0.5",
        online: "border-2 border-success p-0.5",
      },
      size: {
        sm: "size-tap-lg",  // 48px
        md: "size-tap-xl",  // 56px
      },
    },
    defaultVariants: { ring: "none", size: "md" },
  },
);

type StoryAvatarProps = VariantProps<typeof ringVariants> & {
  /** Display name — first letter is the avatar fallback initial; doubles as
      the caption text and the Button aria-label when `isAdd` is set. */
  name: string;
  /** Show name caption below the avatar (stories row). Off in chat-list rows. */
  showCaption?: boolean;
  /** Render the dashed-lavender "+" affordance instead of an avatar. */
  isAdd?: boolean;
  /** Click handler when `isAdd` is set. */
  onAdd?: () => void;
  className?: string;
};

export function StoryAvatar({
  name,
  ring,
  size,
  showCaption,
  isAdd,
  onAdd,
  className,
}: StoryAvatarProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {isAdd ? (
        <Button
          size="dashedCircle"
          variant="ghost"
          aria-label={name}
          onClick={onAdd}
        >
          <Plus />
        </Button>
      ) : (
        <div className={ringVariants({ ring, size })}>
          <Avatar size="full">
            <AvatarFallback variant="brand">{name[0]}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {showCaption && (
        <span className="text-caption text-text-secondary">{name}</span>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Shared entrance animation — bubble fades up + slides in from the side it
// belongs to (them from left, me from right). Caller passes `delay` for
// staggered initial-load reveals; new live messages can use delay={0}.
// Reduce-motion respected via globals.css.
const bubbleEnter = (side: "them" | "me") => ({
  initial: { opacity: 0, y: 8, x: side === "them" ? -12 : 12 },
  animate: { opacity: 1, y: 0, x: 0 },
});

/**
 * Chat message bubbles — three variants per Phase 6 Task 6.1:
 *   - TextBubble  (text content)
 *   - ImageBubble (1–4 image grid; mock photos render as gradients)
 *   - VoiceBubble (lime play button + waveform + duration)
 *
 * All three share the same side semantics:
 *   - `side="them"` — incoming, self-start, lavender bg, leading avatar
 *   - `side="me"`   — outgoing, self-end, lime bg, no avatar
 *
 * The bubble background + tail-corner is encoded in `bubbleSurfaceVariants`.
 * Position + max-width comes from `bubbleRowVariants` on the row wrapper.
 *
 * No app-level Bubble primitive exists in shadcn or Kibo — these atoms are
 * documented bespoke components per Phase 6 plan §6.1 (`[B]`).
 */

const bubbleRowVariants = cva("flex max-w-bubble items-end gap-2", {
  variants: {
    side: {
      them: "self-start",
      me:   "self-end",
    },
  },
  defaultVariants: { side: "them" },
});

const bubbleSurfaceVariants = cva("rounded-2xl px-4 py-3 text-body text-black", {
  variants: {
    side: {
      them: "rounded-bl-sm bg-lavender",
      me:   "rounded-br-sm bg-lime",
    },
  },
  defaultVariants: { side: "them" },
});

// ---------------------------------------------------------------------------
// TextBubble
// ---------------------------------------------------------------------------

type TextBubbleProps = VariantProps<typeof bubbleRowVariants> & {
  /** Avatar fallback initial — only rendered when side="them". */
  avatar?: string;
  /** Entrance-animation delay (seconds) — page passes index-based stagger
      for initial load; live new messages use the default 0. */
  delay?: number;
  children: React.ReactNode;
};

export function TextBubble({
  side,
  avatar,
  delay = 0,
  children,
}: TextBubbleProps) {
  const resolvedSide = side ?? "them";
  return (
    <motion.div
      className={bubbleRowVariants({ side })}
      {...bubbleEnter(resolvedSide)}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
    >
      {resolvedSide === "them" && avatar && (
        <Avatar size="xs">
          <AvatarFallback variant="brand">{avatar}</AvatarFallback>
        </Avatar>
      )}
      <div className={bubbleSurfaceVariants({ side })}>{children}</div>
    </motion.div>
  );
}

// ImageBubble + VoiceBubble removed 2026-05-15: never imported anywhere
// in the app. Photo attachments and voice memos in chat are deferred
// features (no backend, no chat-input affordance). Restore from git
// history when those features actually ship — the kit's bubble shells
// (TextBubble + bubbleRowVariants + bubbleSurfaceVariants) are the
// canonical starting points for any new bubble type.

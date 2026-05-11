"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Pause } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

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

// ---------------------------------------------------------------------------
// ImageBubble — 1×N or 2×N image grid inside a lime bubble
// ---------------------------------------------------------------------------

type ImageBubbleProps = VariantProps<typeof bubbleRowVariants> & {
  /** Backgrounds for each image cell. Real `src` URLs go here once the
      photo upload pipeline is wired; for now mock gradients render via
      data-driven `--photo-bg` CSS var. */
  images: string[];
  /** Entrance-animation delay (seconds). See TextBubble. */
  delay?: number;
};

export function ImageBubble({ side, images, delay = 0 }: ImageBubbleProps) {
  const resolvedSide = side ?? "them";
  return (
    <motion.div
      className={cn(bubbleRowVariants({ side }), "items-end")}
      {...bubbleEnter(resolvedSide)}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
    >
      <div className="flex gap-1 rounded-2xl bg-lime p-1">
        {images.map((bg, i) => (
          <div
            key={i}
            className="size-24 rounded-xl bg-cover bg-center"
            style={
              { "--photo-bg": bg,
                backgroundImage: "var(--photo-bg)" } as React.CSSProperties
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VoiceBubble — lime play button + waveform + duration
// ---------------------------------------------------------------------------

const VOICE_WAVEFORM_HEIGHTS = [
  "h-1",   "h-1.5", "h-2",   "h-3.5", "h-2",   "h-4",
  "h-1.5", "h-3",   "h-1",   "h-2",   "h-3",   "h-1",
  "h-2.5", "h-2",   "h-3",   "h-1",   "h-2",
];

type VoiceBubbleProps = VariantProps<typeof bubbleRowVariants> & {
  /** Duration as already-formatted string (e.g. "0:13"). Real audio
      duration plumbing comes when the audio service is wired. */
  duration: string;
  /** Avatar fallback initial — only rendered when side="them". */
  avatar?: string;
  /** Entrance-animation delay (seconds). See TextBubble. */
  delay?: number;
};

export function VoiceBubble({
  side,
  avatar,
  duration,
  delay = 0,
}: VoiceBubbleProps) {
  const resolvedSide = side ?? "them";
  return (
    <motion.div
      className={bubbleRowVariants({ side })}
      {...bubbleEnter(resolvedSide)}
      transition={{ duration: 0.28, ease: "easeOut", delay }}
    >
      {resolvedSide === "them" &&
        (avatar ? (
          <Avatar size="xs">
            <AvatarFallback variant="brand">{avatar}</AvatarFallback>
          </Avatar>
        ) : (
          <span aria-hidden className="size-7" />
        ))}
      <div className={cn(bubbleSurfaceVariants({ side }), "flex items-center gap-3 py-2")}>
        {/* Play control bumped to icon-tap (44px) — was icon-sm (32px) which
            failed mobile-responsive rule 1 / WCAG 2.5.5 (interactive
            element). */}
        <Button
          size="icon-tap"
          tone="dark"
          aria-label="Play voice message"
          className="rounded-full"
        >
          <Pause className="text-lavender" fill="currentColor" />
        </Button>
        <div className="flex h-6 items-end gap-0.5">
          {VOICE_WAVEFORM_HEIGHTS.map((h, i) => (
            <span key={i} className={cn("w-0.5 rounded-full bg-black", h)} />
          ))}
        </div>
        <span className="text-caption font-medium tabular-nums">{duration}</span>
      </div>
    </motion.div>
  );
}

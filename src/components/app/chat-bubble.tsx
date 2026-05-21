"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Heart } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;

/**
 * Touch reaction gesture: double-tap OR 500ms long-press fires onReact.
 * Returns pointer handlers to spread onto the bubble surface. Only wire it
 * up when reacting is allowed (them bubbles). Touch pointers only — mouse
 * uses the hover heart button instead.
 */
function useReactGesture(onReact?: () => void) {
  const lastTapRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !onReact) return;
      clear();
      timerRef.current = setTimeout(() => onReact(), LONG_PRESS_MS);
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !onReact) return;
      clear();
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        onReact();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    },
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}

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
  /** True when the viewer has reacted to this message (renders the chip). */
  reacted?: boolean;
  /** True when reacting is allowed (them bubbles only). Mounts affordances. */
  canReact?: boolean;
  /** Toggle the viewer's reaction. */
  onReact?: () => void;
  /** Incoming bubbles only: enables the on-demand Translate affordance. */
  translatable?: boolean;
  /** Translation state for this message (from the chat hook). */
  translation?: {
    state: "loading" | "done" | "error";
    text?: string;
    showing: "original" | "translation";
  };
  /** Trigger an on-demand translation. */
  onTranslate?: () => void;
  /** Flip original/translation. */
  onToggleTranslation?: () => void;
  children: React.ReactNode;
};

export function TextBubble({
  side,
  avatar,
  delay = 0,
  reacted = false,
  canReact = false,
  onReact,
  translatable = false,
  translation,
  onTranslate,
  onToggleTranslation,
  children,
}: TextBubbleProps) {
  const resolvedSide = side ?? "them";
  const gesture = useReactGesture(canReact ? onReact : undefined);
  const showingTranslation =
    translation?.state === "done" && translation.showing === "translation";
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
      <div className="group relative">
        <div
          className={bubbleSurfaceVariants({ side })}
          {...(canReact ? gesture : {})}
        >
          {showingTranslation ? translation?.text : children}
        </div>

        {/* On-demand translate affordance (incoming bubbles only). */}
        {translatable && (
          <div className="mt-2">
            {!translation || translation.state === "error" ? (
              <Button
                variant="link"
                size="xs"
                onClick={onTranslate}
                className="h-auto p-0 text-(--ink-3)"
              >
                {translation?.state === "error" ? "Couldn't translate, retry" : "Translate"}
              </Button>
            ) : translation.state === "loading" ? (
              <span className="text-caption text-(--ink-3)">Translating…</span>
            ) : (
              <Button
                variant="link"
                size="xs"
                onClick={onToggleTranslation}
                className="h-auto p-0 text-(--ink-3)"
              >
                {translation.showing === "translation" ? "Show original" : "Show translation"}
              </Button>
            )}
          </div>
        )}

        {/* Desktop hover affordance — heart button, hover-capable pointers
            only. Touch uses the double-tap / long-press gesture above. */}
        {canReact && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={reacted ? "Remove like" : "Like message"}
            onClick={onReact}
            className="absolute -right-2 -top-3 hidden bg-(--app) text-(--ink-3) opacity-0 shadow-sm transition-opacity [@media(hover:hover)]:inline-flex group-hover:opacity-100"
          >
            <Heart className={reacted ? "fill-(--color-pink) text-(--color-pink)" : ""} />
          </Button>
        )}

        {/* Reaction chip — floats bottom-right, partially overlapping. */}
        {reacted && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="status"
            aria-label="Liked"
            className="absolute -bottom-2 right-1 flex size-5 items-center justify-center rounded-full bg-(--app) shadow-sm"
          >
            <Heart className="size-3 fill-(--color-pink) text-(--color-pink)" />
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

// ImageBubble + VoiceBubble removed 2026-05-15: never imported anywhere
// in the app. Photo attachments and voice memos in chat are deferred
// features (no backend, no chat-input affordance). Restore from git
// history when those features actually ship — the kit's bubble shells
// (TextBubble + bubbleRowVariants + bubbleSurfaceVariants) are the
// canonical starting points for any new bubble type.

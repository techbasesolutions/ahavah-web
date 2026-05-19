"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type IconTone = "lavender" | "pink" | "lime" | "indigo";

const TONE_VAR: Record<IconTone, string> = {
  lavender: "var(--color-lavender)",
  pink: "var(--color-pink)",
  lime: "var(--color-lime)",
  indigo: "var(--color-indigo)",
};

type Props = {
  /** sr-only h1 for the page. */
  srTitle: string;
  /** lucide icon — rendered at 64px inside a 128×128 tinted tile. */
  Icon: LucideIcon;
  /** Tile + icon brand color. Tile is a 14% color-mix; icon is the solid color. */
  tone?: IconTone;
  title: string;
  description: ReactNode;
  /** Primary CTA — caller renders a kit Button (variant="outline") with their preferred render slot. */
  action?: ReactNode;
  /** Secondary helper text below the CTA. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Shared chrome for /locked, /banned, /maintenance, /update-required, /offline.
 *
 * Single canonical layout (no mobile/desktop split, no sidebar, no top-bar).
 * Centered 560px card on a --bg-elevated canvas, brand-tinted 96×96 icon tile,
 * h1 + body + CTA + footer. Theme-aware throughout — colors flow from
 * --bg-elevated / --app / --ink / --ink-2 / --hairline so the card reads
 * correctly in both themes.
 */
export function EdgeStateCard({
  srTitle,
  Icon,
  tone = "lavender",
  title,
  description,
  action,
  footer,
  className,
}: Props) {
  const toneVar = TONE_VAR[tone];
  return (
    <div
      className={cn(
        "min-h-dvh flex items-center justify-center px-5 py-12",
        className,
      )}
      style={{ background: "var(--bg-elevated)" }}
    >
      <h1 className="sr-only">{srTitle}</h1>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="w-full max-w-140 flex flex-col items-center text-center gap-4.5 rounded-[28px] p-12 shadow-[0_30px_80px_rgba(0,0,0,0.55)] border border-(--hairline)"
        style={{ background: "var(--app)" }}
      >
        <span
          aria-hidden
          className="w-32 h-32 rounded-[28px] flex items-center justify-center"
          style={{
            background: `color-mix(in oklch, ${toneVar} 14%, transparent)`,
          }}
        >
          <Icon className="size-16" style={{ color: toneVar }} />
        </span>

        <h2 className="text-h1 font-extrabold text-(--ink) m-0">{title}</h2>

        <p className="text-body text-(--ink-2) m-0 max-w-105 leading-relaxed">
          {description}
        </p>

        {action ? <div className="mt-2">{action}</div> : null}
        {footer ? (
          <p className="text-caption text-(--ink-3) max-w-105">{footer}</p>
        ) : null}
      </motion.div>
    </div>
  );
}

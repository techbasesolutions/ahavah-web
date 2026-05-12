"use client";

import { useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Pill } from "@/components/kibo-ui/pill";
import { cn } from "@/lib/utils";

const slotVariants = cva(
  "relative aspect-3/4 w-full overflow-hidden rounded-2xl transition-colors",
  {
    variants: {
      state: {
        empty:
          "border-2 border-dashed border-white/15 bg-bg-elevated/50 hover:bg-bg-elevated/80 cursor-pointer",
        loading: "border-2 border-solid border-white/15 bg-bg-elevated/50",
        filled: "border-[3px] border-white shadow-2xl",
        error: "border-2 border-solid border-pink/40 bg-bg-elevated/50",
      },
    },
    defaultVariants: { state: "empty" },
  },
);

export interface PhotoSlotProps extends VariantProps<typeof slotVariants> {
  /** True for the slot at index 0 — gets paper-tape + Main pill. */
  isMain?: boolean;
  /** Existing photo dataURL or remote URL. */
  src?: string;
  /** Fired when the user picks a file. Compression + storage handled by parent. */
  onPick?: (file: File) => void;
  /** Fired when the X is tapped on a filled slot. */
  onRemove?: () => void;
  /** Error message for state="error". */
  errorMessage?: string;
  /** Entrance-animation index (for stagger). */
  index?: number;
  className?: string;
}

export function PhotoSlot({
  state = "empty",
  isMain = false,
  src,
  onPick,
  onRemove,
  errorMessage,
  index = 0,
  className,
}: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const handleClick = () => {
    if (state === "empty" || state === "error") {
      inputRef.current?.click();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPick) onPick(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: reduceMotion ? 0 : index * 0.05 }}
      className={cn(slotVariants({ state }), className)}
    >
      {state === "empty" && (
        <button
          type="button"
          onClick={handleClick}
          aria-label={`Add photo ${index + 1}`}
          className="absolute inset-0 flex items-center justify-center text-lavender hover:text-lavender/80 outline-none focus-visible:ring-2 focus-visible:ring-lavender"
        >
          <Plus className="size-8" aria-hidden />
        </button>
      )}

      {state === "loading" && (
        <div
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-lavender"
        >
          <Loader2 className="size-6 animate-spin" aria-hidden />
          <span className="text-caption text-text-muted">Uploading…</span>
        </div>
      )}

      {state === "filled" && src && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Profile photo ${index + 1}${isMain ? " (main)" : ""}`}
            className="size-full object-cover"
          />
          {isMain && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute left-2 top-2 z-10 h-2 w-6 rotate-12 rounded-sm bg-lavender/70"
              />
              <div className="pointer-events-none absolute right-2 top-2 z-10 -rotate-3 shadow-[0_2px_8px_rgba(200,255,136,0.4)]">
                <Pill variant="lime" size="sm">Main</Pill>
              </div>
            </>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove photo ${index + 1}`}
              className={cn(
                "absolute z-20 flex size-tap items-center justify-center rounded-full bg-black/45 text-white outline-none focus-visible:ring-2 focus-visible:ring-pink",
                isMain ? "bottom-2 right-2" : "top-2 right-2",
              )}
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </>
      )}

      {state === "error" && (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Try again"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-pink outline-none focus-visible:ring-2 focus-visible:ring-pink"
        >
          <AlertTriangle className="size-6" aria-hidden />
          <span className="text-caption text-pink text-center">
            {errorMessage ?? "Couldn't upload"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
    </motion.div>
  );
}

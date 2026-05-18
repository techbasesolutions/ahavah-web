"use client";

import { Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * ChatInput — bottom-fixed message composer per Phase 6 §6.1.
 *
 * Slots (left → right):
 *   - paperclip attach Button (icon-tap, ghost)
 *   - text Input (size=lg / tone=elevated, flex-1)
 *   - send Button (circle, tone=cta)
 *
 * Bordered top (`border-t border-white/10`) so the composer visually
 * separates from the message scroll area.
 *
 * Future: hold-to-record voice mode swaps the Send button for a record
 * indicator (Phase 6 §6.1 ChatInput spec).
 *
 * No kit equivalent — bespoke per Phase 6 plan §6.1 (`[B]`).
 */
type ChatInputProps = {
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  onAttach?: () => void;
  onSend?: () => void;
};

export function ChatInput({
  placeholder = "Type something…",
  value,
  onChange,
  onAttach,
  onSend,
}: ChatInputProps) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-3 py-3">
      <Button
        size="icon-tap"
        variant="ghost"
        aria-label="Attach"
        onClick={onAttach}
      >
        <Paperclip className="text-lavender" />
      </Button>
      <Input
        size="lg"
        tone="elevated"
        placeholder={placeholder}
        aria-label="Type a message"
        className="flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !e.nativeEvent.isComposing &&
            value.trim().length > 0
          ) {
            e.preventDefault();
            onSend?.();
          }
        }}
      />
      <Button size="circle-lg" tone="cta" aria-label="Send" onClick={onSend}>
        <Send className="text-black" />
      </Button>
    </div>
  );
}

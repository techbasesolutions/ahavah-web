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
  onAttach?: () => void;
  onSend?: () => void;
};

export function ChatInput({
  placeholder = "Type something…",
  onAttach,
  onSend,
}: ChatInputProps) {
  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-3 py-3">
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
      />
      <Button size="circle" tone="cta" aria-label="Send" onClick={onSend}>
        <Send className="text-black" />
      </Button>
    </div>
  );
}

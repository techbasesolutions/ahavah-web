"use client";

import { use, Suspense } from "react";

import { ChatThreadView } from "@/components/app/chat-thread-view";
import { InboxContent } from "@/app/inbox/page";

type Props = { params: Promise<{ id: string }> };

/**
 * /chat/[id] — single chat thread.
 *
 * Per Option B (user decision 2026-05-17), this route on desktop
 * renders the SAME inbox split-view as /inbox — list rail on the left,
 * this thread pre-selected in the right pane. URL stays `/chat/[id]`
 * for REST-style resource semantics + bookmark/share stability.
 *
 * Mobile (<md): full-screen single-thread view (the existing pattern,
 * preserved exactly — uses ChatThreadView directly with an h-screen
 * wrapper, no list rail, no inbox shell).
 *
 * Desktop (md+): mounts InboxContent with `defaultSelectedThreadId={id}`
 * so the list rail + thread pane render identically to a visit at
 * /inbox?thread=<id>. Both routes converge on the same UI.
 *
 * All chat state (chat client connect, message subscriptions, typing
 * debounce, mark-displayed, prefill) lives inside `<ChatThreadView>`.
 * This route is just the responsive shell that picks between the
 * mobile full-screen layout and the desktop inbox split-view.
 */
export default function ChatThreadPage({ params }: Props) {
  const { id } = use(params);

  return (
    <>
      {/* Mobile: full-screen chat. h-screen wrapper around the
          h-full ChatThreadView fills the viewport. */}
      <div className="md:hidden h-screen">
        <ChatThreadView id={id} />
      </div>

      {/* Desktop: inbox split-view with this thread pre-selected.
          InboxContent is reused as-is from /inbox/page.tsx and accepts
          a defaultSelectedThreadId prop (added 2026-05-17). The Suspense
          boundary mirrors /inbox's default export — InboxContent uses
          useSearchParams which Next 16 requires to be wrapped. */}
      <div className="hidden md:block">
        <Suspense fallback={null}>
          <InboxContent defaultSelectedThreadId={id} />
        </Suspense>
      </div>
    </>
  );
}

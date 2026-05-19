"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BlockReportSheet } from "@/components/app/block-report-sheet";
import { TextBubble } from "@/components/app/chat-bubble";
import { ChatHeader } from "@/components/app/chat-header";
import { ChatInput } from "@/components/app/chat-input";
import { sampleByName } from "@/lib/profile-sample";
import { photoOrGradient } from "@/lib/photo-or-gradient";
import { chatClient } from "@/lib/chat-client";
import { isChatTransportAvailable } from "@/lib/chat-transport";
import { readChatSession } from "@/lib/chat-session";
import { useChatThread } from "@/lib/use-chat-thread";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Profile } from "@/lib/profile-schema";
import { isOnline } from "@/lib/last-seen";
import { cn } from "@/lib/utils";

/**
 * ChatThreadView — extracted from `src/app/chat/[id]/page.tsx` on
 * 2026-05-17 so the same thread renderer can be mounted from both
 * `/chat/[id]` (mobile full-screen + desktop split-view) and `/inbox`
 * desktop split-view's right pane (when `?thread=<id>` is set).
 *
 * The outer wrapper is `h-full` (fills parent height). Mobile callers
 * wrap this in a `h-screen` shell; desktop split-view callers wrap in
 * `h-[calc(100dvh-3.5rem)]` (viewport minus DesktopTopBar).
 *
 * All state, hooks, and side-effects (chat client connect, message
 * subscriptions, typing debounce, mark-displayed, prefill handling)
 * stay exactly as they were in the route page. Only the `id` source
 * changed from `use(params)` → prop.
 */

const TYPING_STOP_DEBOUNCE_MS = 3_000;

/**
 * Sample/legacy slugs (daniel, esther, ...) seed thumbnails when no real
 * profile data has been fetched yet. We keep this map so deep-links from
 * the existing seed-based UX still produce a sensible header during the
 * transition period; once /inbox returns real UUIDs, sampleByName will
 * miss and we fall back to a generic header populated from GET
 * /prospect-profile/<uuid>.
 */
const LEGACY_SUBJECT_BY_SLUG: Record<string, { name: string; age: number; online: boolean }> = {
  daniel:  { name: "Daniel",  age: 32, online: false },
  esther:  { name: "Esther",  age: 28, online: false },
  yosef:   { name: "Yosef",   age: 41, online: true  },
  adina:   { name: "Adina",   age: 24, online: true  },
  caleb:   { name: "Caleb",   age: 36, online: false },
  rivka:   { name: "Rivka",   age: 31, online: true  },
  ezekiel: { name: "Ezekiel", age: 47, online: false },
  tirzah:  { name: "Tirzah",  age: 22, online: true  },
};

type Props = { id: string };

export function ChatThreadView({ id }: Props) {
  const legacy = LEGACY_SUBJECT_BY_SLUG[id];

  // Mixed-content gate: HTTPS page + ws:// chat URL = browser blocks.
  // Skip the connection attempt and render an honest "Chat coming
  // soon" surface. Once chat.ahavah.app gets SSL the env var flips
  // to wss:// and this gate opens automatically.
  const chatAvailable = isChatTransportAvailable();

  const [session, setSession] = useState<ReturnType<typeof readChatSession>>(null);
  useEffect(() => {
    if (!chatAvailable) return;
    const s = readChatSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(s);
    if (s) chatClient.connect(s.myUuid, s.sessionToken);
  }, [chatAvailable]);

  const myUuid = session?.myUuid ?? "";

  const [serverProfile, setServerProfile] = useState<
    (Partial<Profile> & { seconds_since_last_online?: number }) | null
  >(null);
  useEffect(() => {
    if (!isUuidLike(id)) return;
    let cancelled = false;
    void apiClient
      .get<Record<string, unknown>>(`/prospect-profile/${id}`)
      .then((raw) => {
        if (cancelled) return;
        setServerProfile({
          firstName: typeof raw.name === "string" ? raw.name : undefined,
          age: typeof raw.age === "number" ? raw.age : undefined,
          seconds_since_last_online:
            typeof raw.seconds_since_last_online === "number"
              ? raw.seconds_since_last_online
              : undefined,
        });
      })
      .catch((err: unknown) => {
        if (!(err instanceof ApiError)) return;
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const subject = useMemo(() => {
    if (serverProfile?.firstName) {
      return {
        name: serverProfile.firstName,
        age: serverProfile.age ?? 0,
        online: isOnline(serverProfile.seconds_since_last_online),
        secondsSinceLastOnline: serverProfile.seconds_since_last_online ?? null,
      };
    }
    if (legacy) return { ...legacy, secondsSinceLastOnline: null };
    return { name: "Person", age: 0, online: false, secondsSinceLastOnline: null };
  }, [serverProfile, legacy]);

  const subjectProfile = sampleByName(id);
  const subjectPhotoSource = photoOrGradient(
    subjectProfile ?? { firstName: subject.name },
    0,
  );

  const { messages, isHydrated, theyAreTyping, send, setMyTyping } = useChatThread(id, myUuid);

  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const searchParams = useSearchParams();
  const prefill = searchParams?.get("prefill") ?? null;
  useEffect(() => {
    if (!prefill) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(prefill);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("prefill");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMyTypingActiveRef = useRef(false);

  const handleDraftChange = (next: string) => {
    setDraft(next);
    if (!myUuid) return;
    if (next.trim().length > 0) {
      if (!isMyTypingActiveRef.current) {
        setMyTyping(true);
        isMyTypingActiveRef.current = true;
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isMyTypingActiveRef.current = false;
        typingTimerRef.current = null;
      }, TYPING_STOP_DEBOUNCE_MS);
    } else {
      isMyTypingActiveRef.current = false;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    send(body);
    setDraft("");
    isMyTypingActiveRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, theyAreTyping]);

  useEffect(() => {
    if (!myUuid || !id) return;
    chatClient.markDisplayed(id);
  }, [myUuid, id, messages.length]);

  // Outer wrapper uses h-full (not h-screen) so the parent decides the
  // available height. Mobile chat route wraps in h-screen; desktop
  // split-view wraps in h-[calc(100dvh-3.5rem)].
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Chat with {subject.name}</h1>

      <ChatHeader
        profileHref={`/profile/${id}`}
        name={subject.name}
        age={subject.age}
        online={subject.online}
        secondsSinceLastOnline={subject.secondsSinceLastOnline}
        onMoreClick={() => setReportOpen(true)}
        photoSource={subjectPhotoSource}
      />

      <div
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${subject.name}`}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {!chatAvailable ? (
          <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-h3 text-(--ink)">Chat ships with our domain launch</p>
            <p className="text-body text-(--ink-2)">
              We&apos;re finishing the secure WebSocket setup on
              chat.ahavah.app. Your conversation will be here when chat
              goes live.
            </p>
          </div>
        ) : !isHydrated ? null : messages.length === 0 ? (
          <p className="self-center text-meta text-(--ink-3)">
            Say hello to start the conversation.
          </p>
        ) : (
          messages.map((m) => (
            <TextBubble
              key={m.id}
              side={m.fromUserId === myUuid ? "me" : "them"}
              avatar={m.fromUserId === myUuid ? undefined : subject.name[0]}
              delay={0}
            >
              <span
                className={cn(
                  m.status === "pending" && "opacity-70",
                  m.status === "failed" && "italic text-red-500",
                )}
                title={
                  m.status === "pending"
                    ? "Sending…"
                    : m.status === "failed"
                    ? "Failed to send"
                    : undefined
                }
              >
                {m.body}
                {m.status === "failed" && (
                  <span aria-label="Failed to send" className="ml-2 text-caption">
                    (tap to retry)
                  </span>
                )}
              </span>
            </TextBubble>
          ))
        )}
        {theyAreTyping && <TypingIndicator avatar={subject.name[0]} />}
        <div ref={endRef} aria-hidden />
      </div>

      {chatAvailable ? (
        <ChatInput
          value={draft}
          onChange={handleDraftChange}
          onSend={handleSend}
        />
      ) : null}

      <BlockReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        subjectName={subject.name}
        onSubmit={async (payload) => {
          const reason = payload.details
            ? `${payload.category}: ${payload.details}`
            : payload.category;
          await apiClient.post(`/skip/by-uuid/${id}`, { report_reason: reason });
          window.location.assign("/inbox");
        }}
      />
    </div>
  );
}

function TypingIndicator({ avatar }: { avatar?: string }) {
  return (
    <div className="flex items-end gap-2 self-start">
      {avatar ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--app) text-(--color-lime) text-xs font-extrabold">
          {avatar}
        </div>
      ) : null}
      <div
        aria-label={`${avatar ?? "Person"} is typing`}
        className="flex items-center gap-1 rounded-2xl bg-(--color-lavender) px-4 py-3"
      >
        {[0, 120, 240].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="block size-1.5 rounded-full bg-black/55 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";

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

type Props = { params: Promise<{ id: string }> };

// 3-second typing-stop debounce: after the user stops typing for this long,
// we stop sending typing stanzas. The backend's own typing TTL is 5s, so
// the recipient still sees us as "typing" for up to 5s after our last
// keystroke, then auto-clears.
const TYPING_STOP_DEBOUNCE_MS = 3_000;

/**
 * Sample/legacy slugs (daniel, esther, ...) seed thumbnails when no real
 * profile data has been fetched yet. We keep this map so deep-links from
 * the existing seed-based UX still produce a sensible header during the
 * transition period; once /inbox returns real UUIDs, sampleByName will
 * miss and we fall back to a generic header populated from GET /profile/<uuid>.
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

export default function ChatThreadPage({ params }: Props) {
  const { id } = use(params);
  const legacy = LEGACY_SUBJECT_BY_SLUG[id];

  // Mixed-content gate: HTTPS page + ws:// chat URL = browser blocks.
  // Skip the connection attempt and render an honest "Chat coming
  // soon" surface. Once chat.ahavah.app gets SSL the env var flips
  // to wss:// and this gate opens automatically.
  const chatAvailable = isChatTransportAvailable();

  // Chat session — read once on mount; useEffect ensures the chat-client
  // is connected for this user. If we have no session yet, we render a
  // gentle "connecting…" header rather than crashing.
  // Mount-time hydration from localStorage is the canonical pattern for
  // syncing React state with an external store; the lint rule's
  // generic-cascading-renders warning doesn't apply (single one-shot read).
  const [session, setSession] = useState<ReturnType<typeof readChatSession>>(null);
  useEffect(() => {
    if (!chatAvailable) return;
    const s = readChatSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(s);
    if (s) chatClient.connect(s.myUuid, s.sessionToken);
  }, [chatAvailable]);

  const myUuid = session?.myUuid ?? "";

  // Resolve real profile via GET /prospect-profile/<uuid> when id looks
  // like a uuid. Backend endpoint is /prospect-profile/, not /profile/
  // — the wrong URL silently 404'd, parking every chat header on the
  // "Person" fallback.
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
        // Map snake-case backend fields onto the Profile shape this
        // page reads. Same adapter pattern as /inbox + /profile/[uuid].
        // seconds_since_last_online drives the "Online" / "Last seen
        // Xm ago" subline in the chat header.
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
        // 404 is fine — chat header falls back to "Person".
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
      };
    }
    if (legacy) return legacy;
    return { name: "Person", age: 0, online: false };
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

  // Debounced typing-off — keep a single timer; reset on every keystroke.
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMyTypingActiveRef = useRef(false);

  const handleDraftChange = (next: string) => {
    setDraft(next);
    if (!myUuid) return;
    if (next.trim().length > 0) {
      // Send a typing stanza on every keystroke at most once per second
      // (the backend has no rate limit but flooding the wire is wasteful).
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
      // Cleared the input — drop typing immediately.
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
    // Clear typing state immediately so the recipient sees the message
    // arrive without a stale "typing" indicator.
    isMyTypingActiveRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  // Auto-scroll on new messages / typing changes.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, theyAreTyping]);

  // Mark thread as displayed when the surface mounts + on every new
  // inbound message (clears unread count server-side).
  useEffect(() => {
    if (!myUuid || !id) return;
    chatClient.markDisplayed(id);
  }, [myUuid, id, messages.length]);

  return (
    <div className="flex h-screen flex-col">
      <h1 className="sr-only">Chat with {subject.name}</h1>

      <ChatHeader
        profileHref={`/profile/${id}`}
        name={subject.name}
        age={subject.age}
        online={subject.online}
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
            <p className="text-h3 text-white">Chat ships with our domain launch</p>
            <p className="text-body text-text-secondary">
              We&apos;re finishing the secure WebSocket setup on
              chat.ahavah.app. Your conversation will be here when chat
              goes live.
            </p>
          </div>
        ) : !isHydrated ? null : messages.length === 0 ? (
          <p className="self-center text-meta text-text-muted">
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
        {theyAreTyping && (
          <TypingIndicator avatar={subject.name[0]} />
        )}
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
          // Backend's skip_by_uuid sets reported=true whenever
          // report_reason is non-empty, so every submission both
          // reports + blocks. Concatenate category + free-text details
          // into the reason field for moderator visibility.
          const reason = payload.details
            ? `${payload.category}: ${payload.details}`
            : payload.category;
          await apiClient.post(`/skip/by-uuid/${id}`, { report_reason: reason });
          // Block is immediate — bounce out of the chat.
          window.location.assign("/inbox");
        }}
      />
    </div>
  );
}

/**
 * Inline typing-indicator atom — three dots with a calm bounce. Respects
 * prefers-reduced-motion via Tailwind's `motion-safe:` modifier so the
 * animation collapses to a static row of dots for users who request
 * reduced motion.
 */
function TypingIndicator({ avatar }: { avatar?: string }) {
  return (
    <div className="flex max-w-bubble items-end gap-2 self-start" aria-label="Typing">
      {avatar && (
        <div className="size-7 rounded-full bg-bg-elevated flex items-center justify-center text-caption font-medium text-white">
          {avatar}
        </div>
      )}
      <div className="rounded-2xl rounded-bl-sm bg-lavender px-4 py-3 text-body text-black">
        <span className="inline-flex gap-1" aria-hidden>
          <span className="size-1.5 rounded-full bg-black/60 motion-safe:animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-black/60 motion-safe:animate-bounce [animation-delay:120ms]" />
          <span className="size-1.5 rounded-full bg-black/60 motion-safe:animate-bounce [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );
}

/**
 * Quick UUID-shape check — does NOT validate canonical form, just rules
 * out the legacy seed slugs (daniel, esther, ...). 8-4-4-4-12 hex pattern.
 */
function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

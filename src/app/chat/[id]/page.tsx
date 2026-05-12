"use client";

import { useState } from "react";
import { use } from "react";

import { BlockReportSheet } from "@/components/app/block-report-sheet";
import {
  ImageBubble,
  TextBubble,
  VoiceBubble,
} from "@/components/app/chat-bubble";
import { ChatHeader } from "@/components/app/chat-header";
import { ChatInput } from "@/components/app/chat-input";

type Props = { params: Promise<{ id: string }> };

// Seed must match SAMPLE_PROFILES (profile-sample.ts) so the chat header's
// profileHref={`/profile/${id}`} lands on a real record. See inbox/page.tsx.
const SUBJECT_BY_ID: Record<string, { name: string; age: number; online: boolean }> = {
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
  const subject = SUBJECT_BY_ID[id] ?? { name: "Adina", age: 24, online: true };
  const [reportOpen, setReportOpen] = useState(false);

  return (
    // `h-screen` (not `h-full`) so the chat layout is locked to viewport:
    // messages flex-1 fills the middle (with overflow-y-auto), header sticks
    // to top, ChatInput pins to bottom of viewport. With `h-full` and a
    // body that grows with content, the wrapper grew past viewport and the
    // input ended up wherever content ended (mid-screen if few messages).
    <div className="flex h-screen flex-col">
      {/* sr-only page heading — visible chrome is ChatHeader, which uses
          `<p>` for name/age so SR users would otherwise land on a chat
          thread with no structure. h1 anchors the page. */}
      <h1 className="sr-only">Chat with {subject.name}</h1>

      <ChatHeader
        profileHref={`/profile/${id}`}
        name={subject.name}
        age={subject.age}
        online={subject.online}
        onMoreClick={() => setReportOpen(true)}
      />

      {/* Messages — each bubble fades up + slides from its side on mount.
          Stagger delay = 0.06s × i (already capped by the small message
          count; for long threads a future virtualization layer would reset
          delay to 0 for off-screen entries).
          role="log" + aria-live="polite" so screen readers announce new
          messages as they arrive without taking focus from the composer. */}
      <div
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${subject.name}`}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        <TextBubble side="them" avatar={subject.name[0]} delay={0}>
          Hi! How&apos;s everything with you? Did you get home safely yesterday?
        </TextBubble>
        <TextBubble side="me" delay={0.06}>
          Yeah, absolutely, thanks for asking! I was thinking, it would be great to catch up at some point next week 😊 Here are some photos we took yesterday.
        </TextBubble>
        <ImageBubble
          side="me"
          delay={0.12}
          images={[
            "linear-gradient(135deg,#FFB088,#FF7A53)",
            "linear-gradient(135deg,#6CB7FF,#1A1340)",
          ]}
        />
        <VoiceBubble side="them" avatar={subject.name[0]} duration="0:13" delay={0.18} />
        <TextBubble side="them" avatar={subject.name[0]} delay={0.24}>
          So let&apos;s go out of town?
        </TextBubble>
      </div>

      {/* TODO(chat-send): ChatInput defaults onSend to undefined here, so
          tap-send is a no-op. Real backend will wire a send handler that
          pushes the typed message into the thread + persists. */}
      <ChatInput />

      <BlockReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        subjectName={subject.name}
        onSubmit={(payload) => {
          console.log("REPORT", subject.name, payload);
        }}
      />
    </div>
  );
}

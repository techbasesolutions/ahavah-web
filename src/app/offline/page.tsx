"use client";

import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EdgeStateCard } from "@/components/app/edge-state-card";

export default function OfflinePage() {
  return (
    <EdgeStateCard
      srTitle="You're offline"
      Icon={WifiOff}
      tone="lavender"
      title="You're offline"
      description={
        <>
          We can&apos;t reach our servers right now. Check your connection and
          try again. Your matches and chats will be here when you&apos;re
          back.
        </>
      }
      action={
        <Button
          variant="outline"
          size="tap"
          onClick={() => window.location.reload()}
          className="h-14 px-8 rounded-[14px] border-(--border) text-(--ink) bg-transparent hover:bg-(--card)"
        >
          Try again
        </Button>
      }
    />
  );
}

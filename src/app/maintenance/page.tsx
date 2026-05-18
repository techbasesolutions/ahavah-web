"use client";

import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EdgeStateCard } from "@/components/app/edge-state-card";

export default function MaintenancePage() {
  return (
    <EdgeStateCard
      srTitle="We're on a quick break"
      Icon={Wrench}
      tone="lavender"
      title="We're on a quick break"
      description={
        <>
          Ahavah is in scheduled maintenance. We&apos;ll be back in about 30
          minutes — your matches are safe.
        </>
      }
      action={
        <Button
          variant="outline"
          size="tap"
          onClick={() => window.location.reload()}
          className="h-14 px-8 rounded-[14px] border-(--border) text-(--ink) bg-transparent hover:bg-(--card)"
        >
          Check again
        </Button>
      }
    />
  );
}

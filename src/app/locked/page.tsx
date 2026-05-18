"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EdgeStateCard } from "@/components/app/edge-state-card";

export default function LockedPage() {
  return (
    <EdgeStateCard
      srTitle="Account temporarily locked"
      Icon={Lock}
      tone="lavender"
      title="Account temporarily locked"
      description={
        <>
          We noticed unusual activity on your account. We&apos;ve paused
          sign-ins for 24 hours as a precaution. You can sign back in from this
          device after that.
        </>
      }
      action={
        <Button
          nativeButton={false}
          variant="outline"
          size="tap"
          render={<Link href="mailto:support@ahavah.app" />}
          className="h-14 px-8 rounded-[14px] border-(--border) text-(--ink) bg-transparent hover:bg-(--card)"
        >
          <Mail className="size-4" />
          Contact support
        </Button>
      }
    />
  );
}

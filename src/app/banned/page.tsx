"use client";

import Link from "next/link";
import { Ban, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EdgeStateCard } from "@/components/app/edge-state-card";

export default function BannedPage() {
  return (
    <EdgeStateCard
      srTitle="Your account is banned"
      Icon={Ban}
      tone="pink"
      title="Your account is banned"
      description={
        <>
          We removed your account because it violated our community
          guidelines. This decision is final and the account can&apos;t be
          restored.
        </>
      }
      action={
        <Button
          nativeButton={false}
          variant="outline"
          size="tap"
          render={<Link href="mailto:trust@ahavah.app" />}
          className="h-14 px-8 rounded-[14px] border-(--border) text-(--ink) bg-transparent hover:bg-(--card)"
        >
          <Mail className="size-4" />
          Email Trust &amp; Safety
        </Button>
      }
      footer="Read our community guidelines to understand what's allowed."
    />
  );
}

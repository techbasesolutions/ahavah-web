"use client";

import Link from "next/link";
import { Ban, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { EdgeStateShell } from "@/components/app/edge-state-shell";

export default function BannedPage() {
  return (
    <EdgeStateShell srTitle="Your account is banned">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <Ban className="size-14 text-pink" />
          </EmptyMedia>
          <EmptyTitle className="text-h2 text-white">
            Your account is banned
          </EmptyTitle>
          <EmptyDescription className="text-body text-text-secondary">
            We removed your account because it violated our community
            guidelines. This decision is final and the account can&apos;t be
            restored.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="gap-3">
          <Button
            nativeButton={false}
            variant="outlineSubtle"
            size="lg"
            render={<Link href="mailto:trust@ahavah.app" />}
          >
            <Mail />
            Email Trust &amp; Safety
          </Button>
          <p className="text-caption text-text-muted">
            Read our community guidelines to understand what&apos;s allowed.
          </p>
        </EmptyContent>
      </Empty>
    </EdgeStateShell>
  );
}

"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";

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

export default function LockedPage() {
  return (
    <EdgeStateShell srTitle="Account temporarily locked">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <Lock className="size-14 text-lavender" />
          </EmptyMedia>
          <EmptyTitle className="text-h2 text-white">
            Account temporarily locked
          </EmptyTitle>
          <EmptyDescription className="text-body text-text-secondary">
            We noticed unusual activity on your account. We&apos;ve paused
            sign-ins for 24 hours as a precaution. You can sign back in from
            this device after that.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="gap-3">
          <Button
            nativeButton={false}
            variant="outlineSubtle"
            size="lg"
            render={<Link href="mailto:support@ahavah.app" />}
          >
            <Mail />
            Contact support
          </Button>
        </EmptyContent>
      </Empty>
    </EdgeStateShell>
  );
}

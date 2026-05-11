"use client";

import { Wrench } from "lucide-react";

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

export default function MaintenancePage() {
  return (
    <EdgeStateShell srTitle="We're on a quick break">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <Wrench className="size-14 text-lavender" />
          </EmptyMedia>
          <EmptyTitle className="text-h2 text-white">
            We&apos;re on a quick break
          </EmptyTitle>
          <EmptyDescription className="text-body text-text-secondary">
            Ahavah is in scheduled maintenance. We&apos;ll be back in about 30
            minutes — your matches are safe.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outlineSubtle"
            size="lg"
            onClick={() => window.location.reload()}
          >
            Check again
          </Button>
        </EmptyContent>
      </Empty>
    </EdgeStateShell>
  );
}

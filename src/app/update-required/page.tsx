"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconBadge } from "@/components/ui/icon-badge";

import { EdgeStateShell } from "@/components/app/edge-state-shell";

export default function UpdateRequiredPage() {
  return (
    <EdgeStateShell srTitle="Time to update">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <IconBadge tone="cta" size="2xl" shape="circle">
              <Sparkles />
            </IconBadge>
          </EmptyMedia>
          <EmptyTitle className="text-h2 text-white">
            Time to update
          </EmptyTitle>
          <EmptyDescription className="text-body text-text-secondary">
            We shipped a new version of Ahavah with safer matching and faster
            chat. The version on your device can&apos;t talk to our servers
            anymore.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="cta"
            tone="cta"
            onClick={() => window.location.reload()}
          >
            Reload the app
          </Button>
        </EmptyContent>
      </Empty>
    </EdgeStateShell>
  );
}

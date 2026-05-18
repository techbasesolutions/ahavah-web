"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { EdgeStateCard } from "@/components/app/edge-state-card";

export default function UpdateRequiredPage() {
  return (
    <EdgeStateCard
      srTitle="Time to update"
      Icon={Sparkles}
      tone="lime"
      title="Time to update"
      description={
        <>
          We shipped a new version of Ahavah with safer matching and faster
          chat. The version on your device can&apos;t talk to our servers
          anymore.
        </>
      }
      action={
        <Button
          size="cta"
          tone="cta"
          lift="float"
          onClick={() => window.location.reload()}
        >
          Reload the app
        </Button>
      }
    />
  );
}

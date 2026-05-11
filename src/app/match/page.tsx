"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import { PageShell } from "@/components/app/page-shell";
import { PhotoTile } from "@/components/app/photo-tile";

const PROFILE_GRADIENTS = {
  self:    "linear-gradient(135deg,#FFB088,#FF7A53)",
  matched: "linear-gradient(135deg,#9F76EA,#5524F5)",
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function MatchPage() {
  return (
    <PageShell bottomPad="default" className="px-5 pt-6">
      {/* sr-only h1 — visible Badge below is the celebration mark, but SRs
          need a heading to land on so the page has structure. */}
      <h1 className="sr-only">It&apos;s a match</h1>

      {/* Close — Button render={<Link>} per Base UI nativeButton pattern */}
      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="self-end"
        render={<Link href="/discover" prefetch={false} />}
      >
        <X className="text-white" />
      </Button>

      {/* Celebration cluster — vertically centered, NOT pushed apart from
          the composer by a giant flex-1 void. Cards spring-stagger in from
          opposite sides; lime halo behind ties it to the brand color story
          (mirrors /onboarding/complete's halo recipe). */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full bg-lime/20 blur-3xl"
          />
          <div className="flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, x: -30, rotate: -12 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                delay: 0.05,
              }}
            >
              <Card
                tone="flat"
                className="size-44 h-56 overflow-hidden rounded-3xl border-[3px] border-white p-0 shadow-2xl"
              >
                <PhotoTile
                  aspect="square"
                  radius="lg"
                  surface="none"
                  bg={PROFILE_GRADIENTS.self}
                  className="size-full"
                />
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30, rotate: 12 }}
              animate={{ opacity: 1, x: 0, rotate: 5 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                delay: 0.15,
              }}
              className="-ml-8 -translate-y-4"
            >
              <Card
                tone="flat"
                className="size-44 h-56 overflow-hidden rounded-3xl border-[3px] border-white p-0 shadow-2xl"
              >
                <PhotoTile
                  aspect="square"
                  radius="lg"
                  surface="none"
                  bg={PROFILE_GRADIENTS.matched}
                  className="size-full"
                />
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Badge spring-pops in AFTER cards have settled — the climax beat. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 12,
            delay: 0.3,
          }}
        >
          <Badge
            variant="lime"
            size="lg"
            className="-rotate-3 px-6 py-3 text-display shadow-lg"
          >
            It&apos;s a match!
          </Badge>
        </motion.div>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center text-meta text-white/85"
        >
          You and Esther liked each other.
        </motion.p>
      </div>

      {/* Footer actions — composer + secondary stay grouped together,
          immediately below the celebration cluster (no flex-1 void). */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="flex flex-col gap-3"
      >
        <InputGroup tone="elevated" className="h-input rounded-2xl px-4">
          <InputGroupInput
            placeholder="Say hi 👋"
            aria-label="Say hi message"
            className="text-body text-white placeholder:text-text-muted"
          />
          <InputGroupAddon align="inline-end" className="pr-0">
            <Button size="circle" tone="cta" aria-label="Send">
              <Send className="text-black" />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <Button
          nativeButton={false}
          variant="outlineSubtle"
          size="cta"
          render={<Link href="/discover" prefetch={false} />}
        >
          Keep swiping
        </Button>
      </motion.div>
    </PageShell>
  );
}

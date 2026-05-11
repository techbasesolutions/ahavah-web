"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";
import { BoundaryTagsPicker } from "@/components/app/boundary-tags";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function BoundariesSettingsPage() {
  return (
    <PageShell bottomPad="nav">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to settings"
          render={<Link href="/settings" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Boundaries</PageHeaderTitle>
      </PageHeader>

      <motion.div
        className="flex flex-col gap-6 px-3 pt-4"
        {...fadeUp}
        transition={{ duration: 0.4 }}
      >
        <BoundaryTagsPicker />
      </motion.div>

      <BottomNav />
    </PageShell>
  );
}

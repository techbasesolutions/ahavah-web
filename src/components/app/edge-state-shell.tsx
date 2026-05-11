"use client";

import * as React from "react";
import { motion } from "motion/react";

import { PageShell } from "@/components/app/page-shell";

/**
 * EdgeStateShell — the single-purpose, no-nav, vertically-centered shell
 * used by H1–H5 (banned, locked, network error, force-update, maintenance).
 *
 * No PageHeader, no BottomNav — these screens are dead-ends that the user
 * either resolves (Try again, Update) or backs out of via a single CTA.
 * Centers the child (typically `<EmptyState>` or `<ErrorState>`) vertically.
 *
 * `srTitle` is required: the kit's `Empty` primitive renders its title as a
 * `<div>` not an `<h1>`, so without an injected sr-only h1 these dead-end
 * pages have no heading for SR users to land on. The shell injects the h1
 * once so every consumer is a11y-correct by default. Visible chrome is
 * unchanged (the visible title remains EmptyTitle inside the Empty
 * composition).
 *
 * `motion.div` provides a soft fadeUp entrance so the page feels arrived-at
 * rather than slammed-down. Reduce-motion respected via globals.css.
 */
export function EdgeStateShell({
  children,
  srTitle,
}: {
  children: React.ReactNode;
  srTitle: string;
}) {
  return (
    <PageShell bottomPad="default">
      <h1 className="sr-only">{srTitle}</h1>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-1 flex-col items-center justify-center px-5 py-8"
      >
        {children}
      </motion.div>
    </PageShell>
  );
}

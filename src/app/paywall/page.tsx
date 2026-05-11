"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Pill } from "@/components/kibo-ui/pill";
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemSubtitle,
  ChoiceboxItemTitle,
} from "@/components/kibo-ui/choicebox";

import { SparkleMark } from "@/components/brand/sparkle-mark";
import { PageShell } from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  "Unlimited swipes",
  "See who liked you",
  "Unlimited message translation",
  "Verified-only filter",
  "Advanced country + language filters",
  "5 boosts per month",
];

const TIERS = [
  { key: "month", label: "1 month",  price: "$14.99", per: "$14.99 / month",       badge: null },
  { key: "quart", label: "3 months", price: "$39.99", per: "$13.33 / month",       badge: "POPULAR" },
  { key: "year",  label: "1 year",   price: "$89.99", per: "$7.50 / month",        badge: "BEST VALUE" },
];

export default function PaywallPage() {
  const [selected, setSelected] = useState("year");
  const activeTier = TIERS.find((t) => t.key === selected)!;

  return (
    <PageShell bottomPad="default" className="overflow-y-auto px-5 pt-6">
      {/* Close — Button render={<Link>} per Base UI nativeButton pattern */}
      <Button
        nativeButton={false}
        size="icon-tap"
        variant="ghost"
        aria-label="Close"
        className="self-end"
        render={<Link href="/profile" prefetch={false} />}
      >
        <X className="text-white" />
      </Button>

      {/* Hero — SparkleMark approved for paywall per
          feedback_ahavah_no_stickers.md (4th permitted use, 2026-05-11). */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-2 flex flex-col items-center gap-3"
      >
        <SparkleMark size={48} color="#D7FF81" />
        <h1 className="text-center text-display text-white">Ahavah Premium</h1>
        <p className="max-w-xs text-center text-meta text-text-secondary">
          Match more. Worry less.
        </p>
      </motion.div>

      {/* Features — Item composition (ItemGroup gives role="list") */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.18 }}
      >
        <ItemGroup className="mt-8 gap-3">
          {FEATURES.map((f) => (
            <Item key={f} className="items-center px-0 py-0">
              <ItemMedia>
                <IconBadge tone="cta" shape="circle" size="xs">
                  <Check strokeWidth={3} />
                </IconBadge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-body text-white">{f}</ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </motion.div>

      {/* Tier selector */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.32 }}
      >
        <Choicebox
          value={selected}
          onValueChange={setSelected}
          className="mt-8 grid gap-3"
        >
          {TIERS.map((t) => (
            <ChoiceboxItem key={t.key} value={t.key} id={`tier-${t.key}`}>
              <ChoiceboxIndicator variant="brand" />
              <ChoiceboxItemHeader>
                <ChoiceboxItemTitle className="flex items-center gap-2 text-body text-white">
                  {t.label}
                  {t.badge && <Pill variant="lime">{t.badge}</Pill>}
                </ChoiceboxItemTitle>
                <ChoiceboxItemSubtitle className="text-text-muted">
                  {t.per}
                </ChoiceboxItemSubtitle>
              </ChoiceboxItemHeader>
              <ChoiceboxItemDescription className="text-h3 font-extrabold tabular-nums text-white">
                {t.price}
              </ChoiceboxItemDescription>
            </ChoiceboxItem>
          ))}
        </Choicebox>
      </motion.div>

      {/* CTA — Terms and Privacy Policy are real <Link>s now (was inert
          <span className="underline">). Stub destinations point at
          /settings/account until terms/privacy pages exist; matches the
          project's existing stub convention for un-built routes. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.46 }}
        className="mt-auto flex flex-col gap-4 pt-8"
      >
        <Button size="cta">Continue {activeTier.price}</Button>
        <Button
          variant="link"
          size="tap"
          className="self-center text-text-secondary underline"
        >
          Restore purchases
        </Button>
        <p className="text-center text-caption leading-relaxed text-text-muted">
          Auto-renews. Cancel anytime in settings. By continuing you accept our{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-white"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/settings/account"
            prefetch={false}
            className="underline hover:text-white"
          >
            Privacy Policy
          </Link>.
        </p>
      </motion.div>
    </PageShell>
  );
}

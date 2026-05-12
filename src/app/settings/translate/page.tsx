"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Languages, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";

import { BottomNav } from "@/components/app/bottom-nav";
import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const STORAGE_KEY = "ahavah.auto_translate.v1";
const DEFAULT_ENABLED = false;
const DEFAULT_LANG = "en";

const TARGET_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "he", label: "Hebrew" },
  { code: "ar", label: "Arabic" },
];

export default function AutoTranslatePage() {
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED);
  const [targetLang, setTargetLang] = useState(DEFAULT_LANG);

  // Hydrate from localStorage on mount. Same canonical external-store
  // sync pattern as `useShowOnMap` (src/lib/use-show-on-map.ts): SSR
  // renders with DEFAULT_ENABLED / DEFAULT_LANG, then the client
  // re-renders with stored values on mount. Auto-translate is Tier-4
  // (post-MVP backend feature), so local persistence is the honest
  // scope until server-side translation ships.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        enabled?: boolean;
        targetLang?: string;
      };
      if (typeof parsed.enabled === "boolean") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEnabled(parsed.enabled);
      }
      if (typeof parsed.targetLang === "string" && parsed.targetLang) {
        setTargetLang(parsed.targetLang);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to
      // session-only behaviour.
    }
  }, []);

  const persist = (next: { enabled: boolean; targetLang: string }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    persist({ enabled: next, targetLang });
  };

  const handleLangChange = (code: string) => {
    setTargetLang(code);
    persist({ enabled, targetLang: code });
  };

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
        <PageHeaderTitle>Auto-translate</PageHeaderTitle>
      </PageHeader>

      <div className="flex flex-col gap-6 px-3 pt-4">
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <ItemGroup className="gap-1">
            <Item variant="muted">
              <ItemMedia>
                <IconBadge tone="brand">
                  <Sparkles />
                </IconBadge>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-meta text-white">
                  Auto-translate messages
                </ItemTitle>
                <ItemDescription className="text-caption text-text-muted">
                  Incoming messages are translated to your preferred language.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggle}
                  aria-label="Auto-translate messages"
                />
              </ItemActions>
            </Item>
          </ItemGroup>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.13 }}
          className="flex flex-col gap-2"
        >
          <h2 className="px-3 text-overline text-text-muted">Translate to</h2>
          <ItemGroup className="gap-1" aria-label="Translate to">
            {TARGET_LANGUAGES.map((lang) => {
              const selected = targetLang === lang.code;
              return (
                <Item
                  key={lang.code}
                  variant="muted"
                  className="cursor-pointer text-left"
                  render={
                    <button
                      type="button"
                      aria-label={`Translate to ${lang.label}`}
                      aria-pressed={selected}
                      onClick={() => handleLangChange(lang.code)}
                    />
                  }
                >
                  <ItemMedia>
                    <IconBadge tone="muted">
                      <Languages />
                    </IconBadge>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-meta text-white">
                      {lang.label}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <span
                      aria-hidden
                      className={
                        selected
                          ? "size-4 rounded-full bg-lime ring-2 ring-lime"
                          : "size-4 rounded-full bg-transparent ring-2 ring-white/20"
                      }
                    />
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        </motion.section>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.21 }}
          className="px-3 pb-2 text-caption text-text-muted"
        >
          Auto-translate runs server-side and is currently in development.
          Your preference is saved locally and will activate when the feature
          ships.
        </motion.p>
      </div>

      <BottomNav />
    </PageShell>
  );
}

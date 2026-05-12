"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Globe, Plus, Star, X } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CUSTOM_LANGUAGE_PREFIX, LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

import { OnboardingShell } from "@/components/app/onboarding-shell";

const MAX_CUSTOM_LEN = 40;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function LanguagesStep() {
  const [selected, setSelected] = useState<string[]>(["en"]);
  const [primary, setPrimary] = useState<string>("en");
  // Tracks user-added language labels (the source of truth for the "Your
  // additions" row). Selected entries for these are stored as
  // `custom:${label}` in the `selected` array so primary detection and
  // value comparison stay uniform.
  const [customLanguages, setCustomLanguages] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string>("");

  const setSelection = (next: string[]) => {
    setSelected(next);
    if (!next.includes(primary)) setPrimary(next[0] ?? "");
  };

  const toggleSelected = (code: string) => {
    if (selected.includes(code)) {
      setSelection(selected.filter((c) => c !== code));
    } else {
      setSelection([...selected, code]);
    }
  };

  const addCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CUSTOM_LEN) {
      setFeedback(`Keep it under ${MAX_CUSTOM_LEN} characters.`);
      return;
    }
    const lower = trimmed.toLowerCase();
    const collidesWithBuiltIn = LANGUAGES.some(
      (l) => l.label.toLowerCase() === lower,
    );
    const collidesWithCustom = customLanguages.some(
      (l) => l.toLowerCase() === lower,
    );
    if (collidesWithBuiltIn || collidesWithCustom) {
      setFeedback(`"${trimmed}" is already in your list.`);
      return;
    }
    const value = `${CUSTOM_LANGUAGE_PREFIX}${trimmed}`;
    setCustomLanguages([...customLanguages, trimmed]);
    setSelected([...selected, value]);
    if (!primary) setPrimary(value);
    setDraft("");
    setFeedback(`Added ${trimmed}.`);
  };

  const removeCustom = (label: string) => {
    const value = `${CUSTOM_LANGUAGE_PREFIX}${label}`;
    const nextCustom = customLanguages.filter((l) => l !== label);
    const nextSelected = selected.filter((c) => c !== value);
    setCustomLanguages(nextCustom);
    setSelected(nextSelected);
    if (primary === value) setPrimary(nextSelected[0] ?? "");
    setFeedback(`Removed ${label}.`);
  };

  const onDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  const isComplete = selected.length > 0 && Boolean(primary);

  // Resolve the human-readable name of the current primary so the helper
  // sentence reads naturally regardless of source (built-in vs custom).
  const primaryLabel = primary.startsWith(CUSTOM_LANGUAGE_PREFIX)
    ? primary.slice(CUSTOM_LANGUAGE_PREFIX.length)
    : LANGUAGES.find((l) => l.code === primary)?.label ?? "";

  // Helper: invalid (no selection) → pink alert; valid → muted explanation
  // of the tap-again-for-primary interaction. Always visible so the
  // interaction model is discoverable from first paint.
  const helperText =
    selected.length === 0
      ? "Pick at least one language."
      : primary
        ? `Primary: ${primaryLabel}. Chats default to this. Tap a selected language again to change.`
        : "Pick a language to set as your primary.";
  const helperTone =
    selected.length === 0 ? "text-pink" : "text-text-secondary";

  return (
    <OnboardingShell href="/onboarding/languages" ctaDisabled={!isComplete}>
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-white">
          Which languages do you speak<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-text-secondary">
          Pick all that apply, then tap one to set as your primary.
        </p>
      </motion.div>

      {/* Built-in language grid — same ToggleGroup pattern as before, but
          factored so custom additions can mirror its visual treatment via
          Pills below. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.06 }}
        className="mt-8"
      >
        <ToggleGroup
          multiple
          value={selected}
          onValueChange={(v) => setSelection(v as string[])}
          spacing={2}
          className="flex-wrap"
          aria-label="Languages you speak"
        >
          {LANGUAGES.map((lang, i) => (
            <motion.div
              key={lang.code}
              {...fadeUp}
              transition={{
                duration: 0.25,
                delay: 0.06 + Math.min(i, 4) * 0.03,
              }}
              className="contents"
            >
              <ToggleGroupItem
                value={lang.code}
                variant="pill"
                size="tap"
                aria-label={lang.label}
                onClick={(e) => {
                  // Tap on already-selected → promote to primary instead of
                  // toggling off.
                  if (selected.includes(lang.code) && primary !== lang.code) {
                    e.preventDefault();
                    setPrimary(lang.code);
                  } else if (!selected.includes(lang.code)) {
                    toggleSelected(lang.code);
                    if (!primary) setPrimary(lang.code);
                  }
                }}
                className="gap-2 transition-transform active:scale-95"
              >
                <span aria-hidden>{lang.flag}</span>
                {lang.label}
                {primary === lang.code ? (
                  <Star
                    className="size-3.5 fill-current text-black"
                    aria-hidden
                  />
                ) : null}
              </ToggleGroupItem>
            </motion.div>
          ))}
        </ToggleGroup>
      </motion.div>

      {/* Your additions — only renders when there's at least one custom.
          Each Pill is a tappable button that promotes to primary when
          tapped while already selected, plus a separate adjacent X button
          for removal (avoids button-in-button while keeping both actions
          on a single row). Globe icon distinguishes custom from
          flag-led built-ins at a glance. */}
      {customLanguages.length > 0 ? (
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.3 }}
          className="mt-5"
        >
          <p className="mb-2 text-overline text-text-muted">Your additions</p>
          <div className="flex flex-wrap gap-2">
            {customLanguages.map((label) => {
              const value = `${CUSTOM_LANGUAGE_PREFIX}${label}`;
              const isPrimary = primary === value;
              return (
                <div
                  key={label}
                  className={cn(
                    "inline-flex items-center overflow-hidden rounded-full border bg-bg-elevated transition-colors",
                    isPrimary ? "border-lime" : "border-white/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPrimary(value)}
                    aria-label={
                      isPrimary
                        ? `${label} is your primary language`
                        : `Set ${label} as your primary language`
                    }
                    aria-current={isPrimary ? "true" : undefined}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-meta font-medium text-white"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    {label}
                    {isPrimary ? (
                      <Star
                        className="size-3.5 fill-current text-lime"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustom(label)}
                    aria-label={`Remove ${label}`}
                    className="inline-flex size-tap items-center justify-center border-l border-white/10 text-text-muted transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {/* Add-another row — always visible so the affordance is discoverable
          without having to find a "More…" toggle first. Form-conventional
          pattern: Input on top, separate outline "Add" button below
          (kit primitives, no chat-composer carryover). Submit also works
          on Enter. Validation feedback flows through the helper line's
          aria-live region. */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.18 }}
        className="mt-5"
      >
        <Label
          htmlFor="add-language"
          className="mb-2 block text-meta text-white"
        >
          Don&apos;t see yours?{" "}
          <span className="text-text-muted">Add it.</span>
        </Label>
        <Input
          id="add-language"
          size="lg"
          tone="elevated"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (feedback) setFeedback("");
          }}
          onKeyDown={onDraftKeyDown}
          placeholder="e.g. Welsh, Yoruba, Catalan…"
          aria-describedby="languages-helper"
          maxLength={MAX_CUSTOM_LEN}
        />
        <Button
          type="button"
          variant="outline"
          size="tap"
          onClick={addCustom}
          disabled={!draft.trim()}
          className="mt-2 self-start"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </motion.div>

      {/* Persistent helper — three states (invalid / primary explanation /
          feedback ack from add/remove). aria-live so SRs catch limit
          messages and add/remove confirmations without re-reading the
          whole page. */}
      <motion.p
        {...fadeUp}
        transition={{ duration: 0.25, delay: 0.22 }}
        id="languages-helper"
        role={selected.length === 0 ? "alert" : undefined}
        aria-live="polite"
        className={cn("mt-4 text-center text-caption", helperTone)}
      >
        {feedback || helperText}
      </motion.p>
    </OnboardingShell>
  );
}

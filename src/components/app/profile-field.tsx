"use client";

import * as React from "react";
import { useId, useMemo, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { cn } from "@/lib/utils";

/**
 * Profile-edit form helpers. These wrap the same kit primitives used by the
 * onboarding screens (Card+RadioGroup, ToggleGroup pills, Input/Textarea) so
 * /profile/edit and the onboarding wizard share visual + interaction
 * patterns. Each helper is controlled — caller provides value + onValueChange.
 */

type Option<T extends string> = { value: T; label: string };

// --- ProfileSection ---------------------------------------------------------

export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-h3 text-white">{title}</h2>
        {description ? (
          <p className="text-meta text-text-secondary">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// --- TextField --------------------------------------------------------------

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
  maxLength,
  multiline,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
  maxLength?: number;
  multiline?: boolean;
  type?: "text" | "email" | "tel" | "url";
}) {
  const Component = multiline ? Textarea : Input;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-meta text-white">
        {label}
      </Label>
      <Component
        id={id}
        size="lg"
        tone="elevated"
        type={multiline ? undefined : type}
        value={value}
        onChange={(e) =>
          onChange(
            maxLength
              ? e.target.value.slice(0, maxLength)
              : e.target.value,
          )
        }
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={helper ? `${id}-helper` : undefined}
        className={multiline ? "min-h-24 resize-none" : undefined}
      />
      {helper ? (
        <span id={`${id}-helper`} className="text-caption text-text-muted">
          {helper}
        </span>
      ) : null}
    </div>
  );
}

// --- SingleSelectField (RadioGroup + Card lime-active) ----------------------

export function SingleSelectField<T extends string>({
  id,
  label,
  description,
  options,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  description?: string;
  options: ReadonlyArray<Option<T>>;
  value: T | undefined;
  onValueChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-meta text-white">{label}</Label>
        {description ? (
          <p className="text-caption text-text-muted">{description}</p>
        ) : null}
      </div>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(v) => onValueChange(v as T)}
        className="grid gap-2"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Label
              key={opt.value}
              htmlFor={`${id}-${opt.value}`}
              className="block w-full cursor-pointer"
            >
              <Card
                tone={active ? "flat" : "elevated"}
                className={cn(
                  "flex flex-row items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]",
                  active
                    ? "bg-lime ring-2 ring-inset ring-lime"
                    : "hover:bg-bg-elevated/80 hover:ring-1 hover:ring-inset hover:ring-white/10",
                )}
              >
                <span
                  className={cn(
                    "flex-1 text-body font-medium",
                    active ? "text-black" : "text-white",
                  )}
                >
                  {opt.label}
                </span>
                <RadioGroupItem
                  id={`${id}-${opt.value}`}
                  value={opt.value}
                  variant="brand"
                  aria-label={opt.label}
                  className={
                    active
                      ? "border-black data-checked:bg-black data-checked:border-black"
                      : undefined
                  }
                />
              </Card>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

// --- SelectField (dropdown for single-select with many options) -------------

/**
 * Use SelectField when the option list is too long for a RadioGroup+Card
 * grid (rule of thumb: ≥8 options). Renders a tap-friendly dropdown that
 * opens a scrollable popover. Keeps single-value semantics — for multi-
 * select with many options, use MultiSelectField (the pill grid wraps).
 */
export function SelectField<T extends string>({
  id,
  label,
  description,
  placeholder = "Select…",
  options,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  options: ReadonlyArray<Option<T>>;
  value: T | undefined;
  onValueChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-meta text-white">
        {label}
      </Label>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onValueChange(v as T)}
      >
        <SelectTrigger
          id={id}
          size="lg"
          tone="elevated"
          className="w-full"
        >
          {/* Base UI's SelectValue renders the raw `value` when given
              no `children` function — that's why "bachelors" showed
              lowercase in the trigger instead of "Bachelor's Degree".
              The function-children pattern maps the value back to the
              matching option's label. */}
          <SelectValue placeholder={placeholder}>
            {(v) =>
              options.find((opt) => opt.value === v)?.label ?? placeholder
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? (
        <span className="text-caption text-text-muted">{description}</span>
      ) : null}
    </div>
  );
}

// --- ComboboxField (search-as-you-type, dropdown stays visible) ------------

/**
 * Input-reactive single-select. Typing filters the dropdown list in
 * real time; the list remains visible while the input is focused so
 * the user can scan options without typing. Use for fields where the
 * option count is large enough that scrolling a static RadioGroup is
 * tedious but small enough that a free-text fallback isn't needed
 * (e.g. Nationality at 20 options).
 */
export function ComboboxField<T extends string>({
  id,
  label,
  description,
  placeholder = "Type or pick…",
  options,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  options: ReadonlyArray<Option<T>>;
  value: T | undefined;
  onValueChange: (next: T) => void;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  // While focused, the input shows the live query; otherwise it shows
  // the selected label (or empty placeholder).
  const inputValue = open ? query : selected?.label ?? "";

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [query, options]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (next: T) => {
    onValueChange(next);
    close();
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <Label htmlFor={id} className="text-meta text-white">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          size="lg"
          tone="elevated"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={inputValue}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onBlur={(e) => {
            // Only close if the new focus target isn't inside our list,
            // so clicking an option doesn't dismiss before its click fires.
            const next = e.relatedTarget as Node | null;
            if (!next || !containerRef.current?.contains(next)) {
              close();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-bg-elevated py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-meta text-text-muted">
                No matches
              </p>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active ? "true" : "false"}
                    // mousedown fires BEFORE the input's blur — preventDefault
                    // keeps the input focused so we can finish the pick path.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt.value)}
                    className={
                      active
                        ? "block w-full px-4 py-3 text-left text-body font-medium text-lime hover:bg-white/5"
                        : "block w-full px-4 py-3 text-left text-body text-white hover:bg-white/5"
                    }
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {description ? (
        <span className="text-caption text-text-muted">{description}</span>
      ) : null}
    </div>
  );
}

// --- MultiComboboxField (multi-select combobox with removable chips) -------

/**
 * Input-reactive multi-select. Selected values render as removable chips
 * above the input; typing filters the dropdown; clicking an option ADDS
 * to the selection (already-selected options are dimmed in the list but
 * still tappable to remove). Use for fields where the option count is
 * large (e.g. Languages at ~70) and a static pill grid would be unwieldy.
 */
export function MultiComboboxField<T extends string>({
  id,
  label,
  description,
  placeholder = "Type to search…",
  options,
  value,
  onValueChange,
  /**
   * Render-label override per stored value — useful when a stored value
   * is custom (e.g. CUSTOM_LANGUAGE_PREFIX) and doesn't match any option.
   */
  labelForValue,
}: {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  options: ReadonlyArray<Option<T>>;
  value: ReadonlyArray<T>;
  onValueChange: (next: T[]) => void;
  labelForValue?: (v: T) => string;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [query, options]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const toggle = (next: T) => {
    if (value.includes(next)) {
      onValueChange(value.filter((v) => v !== next));
    } else {
      onValueChange([...value, next]);
    }
    setQuery("");
  };

  const labelFor = (v: T): string =>
    labelForValue?.(v) ??
    options.find((o) => o.value === v)?.label ??
    v;

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id} className="text-meta text-white">
          {label}
        </Label>
        {description ? (
          <p className="text-caption text-text-muted">{description}</p>
        ) : null}
      </div>

      {/* Selected chips — clicking a chip removes it. */}
      {value.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          aria-label={`Selected ${label.toLowerCase()}`}
        >
          {value.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-meta font-medium text-black hover:bg-lime/90"
              aria-label={`Remove ${labelFor(v)}`}
            >
              {labelFor(v)}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Input
          id={id}
          size="lg"
          tone="elevated"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!next || !containerRef.current?.contains(next)) {
              close();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-bg-elevated py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-meta text-text-muted">
                No matches
              </p>
            ) : (
              filtered.map((opt) => {
                const active = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active ? "true" : "false"}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(opt.value)}
                    className={
                      active
                        ? "flex w-full items-center justify-between px-4 py-3 text-left text-body font-medium text-lime hover:bg-white/5"
                        : "flex w-full items-center justify-between px-4 py-3 text-left text-body text-white hover:bg-white/5"
                    }
                  >
                    <span>{opt.label}</span>
                    {active ? <span aria-hidden>✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- MultiSelectField (ToggleGroup pill+tap, selected handled by primitive) -

export function MultiSelectField<T extends string>({
  label,
  description,
  options,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  options: ReadonlyArray<Option<T>>;
  value: ReadonlyArray<T>;
  onValueChange: (next: T[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-meta text-white">{label}</Label>
        {description ? (
          <p className="text-caption text-text-muted">{description}</p>
        ) : null}
      </div>
      <ToggleGroup
        multiple
        value={[...value] as string[]}
        onValueChange={(v) => onValueChange(v as T[])}
        spacing={2}
        className="flex-wrap"
        aria-label={label}
      >
        {options.map((opt) => (
          // Selected styling (lime fill + black text) is provided by the
          // pill variant's `data-[state=on]:bg-lime data-[state=on]:text-
          // black` cva entry in src/components/ui/toggle.tsx. Earlier this
          // field overlaid a `ring-2 ring-lime ring-offset-2` outline on
          // top of the fill — an outlier no other selected-pill in the app
          // used (FiltersSheet PillGrid, onboarding pills, SingleSelectField
          // radio-cards all show just the fill). Dropped per SP17 T3 user
          // feedback "consolidate the highlighted/selected option style to
          // the one without the extra border".
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            variant="pill"
            size="tap"
            aria-label={opt.label}
            className="transition-transform active:scale-95"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

"use client";

import * as React from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// --- MultiSelectField (ToggleGroup pill+tap with lime-ring selected) --------

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
        {options.map((opt) => {
          const active = (value as ReadonlyArray<string>).includes(opt.value);
          return (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              variant="pill"
              size="tap"
              aria-label={opt.label}
              className={cn(
                "transition-transform active:scale-95",
                active &&
                  "ring-2 ring-lime ring-offset-2 ring-offset-bg-indigo",
              )}
            >
              {opt.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

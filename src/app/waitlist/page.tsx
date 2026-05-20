"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import {
  ASSEMBLIES,
  intentOptionsForSex,
  FAMILY_VIEWS,
  ETHNICITIES,
  NATIONALITIES,
  ALL_COUNTRIES,
  REFERRAL_SOURCES,
  postWaitlist,
  type WaitlistAnswers,
} from "@/lib/waitlist";
import type { Intent, Sex } from "@/lib/profile-schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHILD_VIEWS = FAMILY_VIEWS.filter((f) =>
  ["wants-children", "does-not-want", "open-to-more", "has-children"].includes(f.value),
);

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export default function WaitlistPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [a, setA] = useState<WaitlistAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = params?.get("email");
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      /* storage unavailable */
    }
    const initial = fromQuery || stored || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) setEmail(initial);
  }, [params]);

  const intentOptions = useMemo(
    () => (a.sex ? intentOptionsForSex(a.sex) : []),
    [a.sex],
  );

  const set = <K extends keyof WaitlistAnswers>(k: K, v: WaitlistAnswers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const setSex = (sex: Sex) => {
    setA((prev) => {
      const allowed = new Set(intentOptionsForSex(sex).map((o) => o.value));
      return { ...prev, sex, intent: (prev.intent ?? []).filter((i) => allowed.has(i)) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postWaitlist(email.trim(), a);
      setDone(true);
    } catch {
      setError("Couldn't save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-h1 text-(--ink)">You&apos;re on the list</h1>
        <p className="text-body text-(--ink-2)">
          We&apos;ll email {email} a sign-in link when we launch.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-(--ink)">Join the waitlist</h1>
        <p className="m-0 text-body text-(--ink-2)">
          Tell us a little about who you are and who you&apos;re looking for. We&apos;ll
          use it to set up your profile when we launch.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="I am">
          <RadioField
            value={a.sex}
            onChange={(v) => setSex(v as Sex)}
            options={GENDER_OPTIONS}
            inline
          />
        </Field>

        <Field label="Country">
          <SelectField
            value={a.country}
            onChange={(v) => set("country", v)}
            placeholder="Select country"
            options={ALL_COUNTRIES.map((c) => ({ value: c.cc, label: c.name }))}
          />
        </Field>

        <Field label="State or region">
          <Input
            value={a.region ?? ""}
            onChange={(e) => set("region", e.target.value)}
            placeholder="e.g. Texas"
          />
        </Field>

        <Field label="I identify as" hint="Select all that apply">
          <ToggleGroup
            value={a.assembly ?? []}
            onValueChange={(v) => set("assembly", v as WaitlistAnswers["assembly"])}
            variant="outline"
            spacing={2}
            className="flex-wrap justify-start"
          >
            {ASSEMBLIES.map((o) => (
              <ToggleGroupItem key={o.value} value={o.value}>
                {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {a.sex ? (
          <Field label="Looking for" hint="Select all that apply">
            <ToggleGroup
              value={a.intent ?? []}
              onValueChange={(v) => set("intent", v as Intent[])}
              variant="outline"
              spacing={2}
              className="flex-wrap justify-start"
            >
              {intentOptions.map((o) => (
                <ToggleGroupItem key={o.value} value={o.value}>
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        ) : null}

        <Field label="Children">
          <RadioField
            value={a.family}
            onChange={(v) => set("family", v as WaitlistAnswers["family"])}
            options={CHILD_VIEWS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Field>

        <Field label="Ethnicity">
          <SelectField
            value={a.ethnicity}
            onChange={(v) => set("ethnicity", v as WaitlistAnswers["ethnicity"])}
            placeholder="Select ethnicity"
            options={ETHNICITIES.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Field>

        <Field label="Nationality">
          <SelectField
            value={a.nationality}
            onChange={(v) => set("nationality", v as WaitlistAnswers["nationality"])}
            placeholder="Select nationality"
            options={NATIONALITIES.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Field>

        <Field label="How did you hear about us?">
          <SelectField
            value={a.referral_source}
            onChange={(v) => set("referral_source", v as WaitlistAnswers["referral_source"])}
            placeholder="Select one"
            options={REFERRAL_SOURCES.map((o) => ({ value: o.value, label: o.label }))}
          />
          {a.referral_source === "other" ? (
            <Input
              className="mt-2"
              value={a.referral_other ?? ""}
              onChange={(e) => set("referral_other", e.target.value)}
              placeholder="Tell us where"
            />
          ) : null}
        </Field>

        {error ? (
          <p role="alert" className="text-meta font-semibold text-pink">
            {error}
          </p>
        ) : null}

        <Button type="submit" tone="cta" size="tap" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Join the waitlist"}
        </Button>
      </form>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-meta font-semibold text-(--ink)">{label}</Label>
        {hint ? <span className="text-caption text-(--ink-3)">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function RadioField({
  value,
  onChange,
  options,
  inline,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  inline?: boolean;
}) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as string)}
      className={inline ? "flex flex-row flex-wrap gap-x-6 gap-y-2" : "flex flex-col gap-2.5"}
    >
      {options.map((o) => (
        <Label
          key={o.value}
          htmlFor={`r-${o.value}`}
          className="flex cursor-pointer items-center gap-2.5"
        >
          <RadioGroupItem id={`r-${o.value}`} value={o.value} variant="brand" />
          <span className="text-meta text-(--ink)">{o.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}

function SelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

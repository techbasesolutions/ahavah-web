"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { WaitlistWizard } from "@/components/app/waitlist-wizard";
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

const DRAFT_KEY = "ahavah.waitlist.draft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

const CHILD_VIEWS = FAMILY_VIEWS.filter((f) =>
  ["wants-children", "does-not-want", "open-to-more", "has-children"].includes(f.value),
);

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type Draft = { email: string; answers: WaitlistAnswers; step: number };

export default function WaitlistPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [a, setA] = useState<WaitlistAnswers>({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from a saved draft (survives refresh / back-nav); fall back to the
  // landing-captured email.
  useEffect(() => {
    let draft: Draft | null = null;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) draft = JSON.parse(raw) as Draft;
    } catch {
      /* ignore */
    }
    const fromQuery = params?.get("email");
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    const next = {
      email: draft?.email || fromQuery || stored || "",
      answers: draft?.answers ?? {},
      step: draft?.step ?? 1,
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(next.email);
    setA(next.answers);
    setStep(next.step);
  }, [params]);

  // Persist the draft on change (skip once finished).
  useEffect(() => {
    if (done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email, answers: a, step }));
    } catch {
      /* ignore */
    }
  }, [email, a, step, done]);

  const set = <K extends keyof WaitlistAnswers>(k: K, v: WaitlistAnswers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const setSex = (sex: Sex) =>
    setA((prev) => {
      const allowed = new Set(intentOptionsForSex(sex).map((o) => o.value));
      return { ...prev, sex, intent: (prev.intent ?? []).filter((i) => allowed.has(i)) };
    });

  const intentOptions = useMemo(
    () => (a.sex ? intentOptionsForSex(a.sex) : []),
    [a.sex],
  );

  // One question per screen. required steps gate the CTA; the rest are
  // optional (low-friction waitlist) so users can breeze through.
  const steps: Array<{ heading: React.ReactNode; sub?: string; control: React.ReactNode; valid: boolean }> = [
    {
      heading: <>Where can we reach you<span className="text-lime">?</span></>,
      sub: "We'll email your sign-in link here when we launch.",
      valid: EMAIL_RE.test(email.trim()),
      control: (
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoFocus
        />
      ),
    },
    {
      heading: <>Which best describes you<span className="text-lime">?</span></>,
      valid: !!a.sex,
      control: (
        <SingleChoice
          value={a.sex}
          onChange={(v) => setSex(v as Sex)}
          options={GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>Where do you live<span className="text-lime">?</span></>,
      sub: "Country, then your state or region.",
      valid: !!a.country,
      control: (
        <div className="flex flex-col gap-4">
          <SearchableChoice
            value={a.country}
            onChange={(v) => set("country", v)}
            placeholder="Search countries"
            options={ALL_COUNTRIES.map((c) => ({ value: c.cc, label: c.name }))}
          />
          <Input
            value={a.region ?? ""}
            onChange={(e) => set("region", e.target.value)}
            placeholder="State or region (e.g. Texas)"
          />
        </div>
      ),
    },
    {
      heading: <>I identify as<span className="text-lime">…</span></>,
      sub: "Pick every term that fits. Optional.",
      valid: true,
      control: (
        <MultiChoice
          value={a.assembly}
          onChange={(v) => set("assembly", v as WaitlistAnswers["assembly"])}
          options={ASSEMBLIES.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>Who are you looking for<span className="text-lime">?</span></>,
      sub: "Select all that apply. Optional.",
      valid: true,
      control: (
        <MultiChoice
          value={a.intent}
          onChange={(v) => set("intent", v as Intent[])}
          options={intentOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>Children<span className="text-lime">?</span></>,
      sub: "Optional.",
      valid: true,
      control: (
        <SingleChoice
          value={a.family}
          onChange={(v) => set("family", v as WaitlistAnswers["family"])}
          options={CHILD_VIEWS.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>Your ethnicity</>,
      sub: "Optional.",
      valid: true,
      control: (
        <SearchableChoice
          value={a.ethnicity}
          onChange={(v) => set("ethnicity", v as WaitlistAnswers["ethnicity"])}
          placeholder="Search ethnicity"
          options={ETHNICITIES.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>Your nationality</>,
      sub: "Optional.",
      valid: true,
      control: (
        <SearchableChoice
          value={a.nationality}
          onChange={(v) => set("nationality", v as WaitlistAnswers["nationality"])}
          placeholder="Search nationality"
          options={NATIONALITIES.map((o) => ({ value: o.value, label: o.label }))}
        />
      ),
    },
    {
      heading: <>How did you hear about us<span className="text-lime">?</span></>,
      sub: "Optional.",
      valid: true,
      control: (
        <div className="flex flex-col gap-3">
          <SingleChoice
            value={a.referral_source}
            onChange={(v) => set("referral_source", v as WaitlistAnswers["referral_source"])}
            options={REFERRAL_SOURCES.map((o) => ({ value: o.value, label: o.label }))}
          />
          {a.referral_source === "other" ? (
            <Input
              value={a.referral_other ?? ""}
              onChange={(e) => set("referral_other", e.target.value)}
              placeholder="Tell us where"
            />
          ) : null}
        </div>
      ),
    },
  ];

  const total = steps.length;
  const current = steps[step - 1];
  const isLast = step === total;

  const handleNext = async () => {
    if (!current.valid) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postWaitlist(email.trim(), a);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
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
        <h1 className="text-display text-(--ink)">
          You&apos;re on the list<span className="text-lime">.</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          We&apos;ll email {email} a sign-in link when we launch.
        </p>
      </main>
    );
  }

  return (
    <WaitlistWizard
      step={step}
      total={total}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      onNext={handleNext}
      ctaLabel={isLast ? "Join the waitlist" : "Continue"}
      ctaDisabled={!current.valid}
      ctaLoading={submitting}
    >
      <motion.div key={step} {...fadeUp} transition={{ duration: 0.35 }} className="flex flex-col gap-2">
        <h1 className="text-display text-(--ink)">{current.heading}</h1>
        {current.sub ? <p className="text-body text-(--ink-2)">{current.sub}</p> : null}
      </motion.div>

      <motion.div
        key={`c-${step}`}
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-8"
      >
        {current.control}
      </motion.div>

      {error ? (
        <p role="alert" className="mt-4 text-meta font-semibold text-pink">
          {error}
        </p>
      ) : null}
    </WaitlistWizard>
  );
}

// ---------------------------------------------------------------------------
// Choice controls — onboarding-style selectable cards.
// ---------------------------------------------------------------------------

type Opt = { value: string; label: string };

function ChoiceCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      tone={active ? "flat" : "elevated"}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-row items-center gap-3 rounded-2xl px-5 py-4 transition-all active:scale-[0.98]",
        active
          ? "bg-lime ring-2 ring-inset ring-lime"
          : "hover:bg-(--card)/80 hover:ring-1 hover:ring-inset hover:ring-border",
      )}
    >
      <span className={cn("flex-1 text-body font-medium", active ? "text-black" : "text-(--ink)")}>
        {children}
      </span>
      {active ? <Check className="size-5 shrink-0 text-black" /> : null}
    </Card>
  );
}

function SingleChoice({
  value,
  onChange,
  options,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<Opt>;
}) {
  return (
    <div className="grid gap-3">
      {options.map((o, i) => (
        <motion.div
          key={o.value}
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.04 + Math.min(i, 6) * 0.03 }}
        >
          <ChoiceCard active={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </ChoiceCard>
        </motion.div>
      ))}
    </div>
  );
}

function MultiChoice({
  value,
  onChange,
  options,
}: {
  value?: readonly string[];
  onChange: (v: string[]) => void;
  options: ReadonlyArray<Opt>;
}) {
  const v = value ?? [];
  const toggle = (val: string) =>
    onChange(v.includes(val) ? v.filter((x) => x !== val) : [...v, val]);
  return (
    <div className="grid gap-3">
      {options.map((o, i) => (
        <motion.div
          key={o.value}
          {...fadeUp}
          transition={{ duration: 0.25, delay: 0.04 + Math.min(i, 6) * 0.03 }}
        >
          <ChoiceCard active={v.includes(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </ChoiceCard>
        </motion.div>
      ))}
    </div>
  );
}

function SearchableChoice({
  value,
  onChange,
  options,
  placeholder,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<Opt>;
  placeholder: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? options.filter((o) => o.label.toLowerCase().includes(needle))
      : options;
    return base.slice(0, 60);
  }, [q, options]);

  return (
    <div className="flex flex-col gap-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">
        {filtered.map((o) => (
          <ChoiceCard key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </ChoiceCard>
        ))}
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-meta text-(--ink-3)">No matches.</p>
        ) : null}
      </div>
    </div>
  );
}

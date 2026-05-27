"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import { WaitlistWizard, type WaitlistPhase } from "@/components/app/waitlist-wizard";
import { WaitlistShareCard } from "@/components/app/waitlist-share-card";
import { BetaTesterCard } from "@/components/app/beta-tester-card";
import { LogoMark } from "@/components/brand/logo-mark";
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
  getWaitlistCount,
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

// Right-rail phase groups (mirrors OnboardingShell's PHASES; waitlist content).
const PHASES: ReadonlyArray<WaitlistPhase> = [
  { label: "About you", firstStep: 1, lastStep: 3 },
  { label: "Faith", firstStep: 4, lastStep: 4 },
  { label: "Looking for", firstStep: 5, lastStep: 6 },
  { label: "Background", firstStep: 7, lastStep: 9 },
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

type Draft = { email: string; answers: WaitlistAnswers; step: number };

export default function WaitlistPage() {
  // useSearchParams requires a Suspense boundary for static generation
  // (next build prerender). Wrap the flow so the route builds.
  return (
    <Suspense fallback={null}>
      <WaitlistFlow />
    </Suspense>
  );
}

function WaitlistFlow() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [a, setA] = useState<WaitlistAnswers>({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True when the submitted email was already on the waitlist (returning user).
  const [returning, setReturning] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(draft?.email || fromQuery || stored || "");
    setA(draft?.answers ?? {});
    setStep(draft?.step ?? 1);
  }, [params]);

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

  const intentOptions = useMemo(() => (a.sex ? intentOptionsForSex(a.sex) : []), [a.sex]);

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
        <SingleChoice value={a.sex} onChange={(v) => setSex(v as Sex)} options={GENDER_OPTIONS} />
      ),
    },
    {
      heading: <>Where do you live<span className="text-lime">?</span></>,
      sub: "Country, then your state or region.",
      valid: !!a.country,
      control: (
        <div className="flex flex-col gap-4">
          <SearchChoice
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
        <SearchChoice
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
        <SearchChoice
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
      const res = await postWaitlist(email.trim(), a);
      setReturning(res.isNew === false);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setDone(true);
      getWaitlistCount()
        .then((r) => setPosition(r.count))
        .catch(() => {
          /* position is decorative; leave null */
        });
    } catch {
      setError("Couldn't save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const headline = returning ? (
      <>Welcome back<span className="text-lime">.</span></>
    ) : (
      <>You&apos;re on the list<span className="text-lime">.</span></>
    );
    const lede = returning ? (
      <>
        You&apos;re already on the list. We&apos;ll email{" "}
        <span className="font-semibold break-words text-(--ink)">{email}</span> your
        sign-in link the moment we launch.
      </>
    ) : (
      <>
        We&apos;ll email{" "}
        <span className="font-semibold break-words text-(--ink)">{email}</span> a
        sign-in link the moment we launch.
      </>
    );
    const backHome = (
      <Button variant="outline" size="tap" render={<Link href="/" prefetch={false} />}>
        <ArrowLeft className="size-4" />
        Back to home
      </Button>
    );

    return (
      <main
        className="relative min-h-dvh overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, var(--app) 0%, color-mix(in oklch, var(--color-lavender) 14%, var(--app)) 100%)",
        }}
      >
        {/* Ambient brand glow so the canvas reads as atmosphere, not a void. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-lavender/15 blur-3xl"
        />

        {/* ── Mobile (<md) — tight vertical flow, beta elevated above share ── */}
        <div className="md:hidden relative flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 16 }}
          >
            <LogoMark size={64} decorative className="drop-shadow-xl" />
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="flex max-w-md flex-col gap-3">
            <h1 className="text-display-lg text-(--ink)">{headline}</h1>
            <p className="text-body leading-relaxed text-(--ink-2)">{lede}</p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.18 }} className="w-full max-w-sm">
            <BetaTesterCard email={email} />
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.26 }}>
            <WaitlistShareCard position={position} />
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.34 }}>
            {backHome}
          </motion.div>
        </div>

        {/* ── Desktop (md+) — centered two-column: messaging + beta | the pass ── */}
        <div className="hidden md:flex min-h-dvh items-center justify-center px-10 py-16">
          <div className="grid w-full max-w-5xl grid-cols-2 items-center gap-16">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex flex-col items-start gap-6 text-left">
              <LogoMark size={44} decorative />
              <div className="flex flex-col gap-3">
                <h1 className="text-display-lg text-(--ink)">{headline}</h1>
                <p className="max-w-md text-h2 font-normal leading-relaxed text-(--ink-2)">{lede}</p>
              </div>
              <BetaTesterCard email={email} />
              {backHome}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="flex justify-center"
            >
              <WaitlistShareCard position={position} />
            </motion.div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <WaitlistWizard
      step={step}
      total={total}
      phases={PHASES}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      onNext={handleNext}
      ctaLabel={isLast ? "Join the waitlist" : "Continue"}
      ctaDisabled={!current.valid}
      ctaLoading={submitting}
    >
      <motion.div key={step} {...fadeUp} transition={{ duration: 0.4 }} className="flex flex-col gap-2">
        <h1 className="text-display text-(--ink)">{current.heading}</h1>
        {current.sub ? <p className="text-body text-(--ink-2)">{current.sub}</p> : null}
      </motion.div>

      <motion.div key={`c-${step}`} {...fadeUp} transition={{ duration: 0.3, delay: 0.08 }} className="mt-8">
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
// Selection controls — the canonical onboarding markup (RadioGroup+Card for
// single, Checkbox+Card for multi), parameterized by options.
// ---------------------------------------------------------------------------

type Opt = { value: string; label: string };

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
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as string)}
      className="grid gap-3"
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <motion.div
            key={opt.value}
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 5) * 0.03 }}
          >
            <Label htmlFor={`opt-${opt.value}`} className="block w-full cursor-pointer">
              <Card
                tone={active ? "flat" : "elevated"}
                className={cn(
                  "flex flex-row items-center gap-3 rounded-2xl px-5 py-4 transition-all active:scale-[0.98]",
                  active
                    ? "bg-lime ring-2 ring-inset ring-lime"
                    : "hover:bg-(--card)/80 hover:ring-1 hover:ring-inset hover:ring-border",
                )}
              >
                <span className={cn("flex-1 text-body font-medium", active ? "text-black" : "text-(--ink)")}>
                  {opt.label}
                </span>
                <RadioGroupItem
                  id={`opt-${opt.value}`}
                  value={opt.value}
                  variant="brand"
                  className={
                    active ? "border-black data-checked:bg-black data-checked:border-black" : undefined
                  }
                />
              </Card>
            </Label>
          </motion.div>
        );
      })}
    </RadioGroup>
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
    <div role="group" className="grid gap-3">
      {options.map((opt, i) => {
        const active = v.includes(opt.value);
        return (
          <motion.div
            key={opt.value}
            {...fadeUp}
            transition={{ duration: 0.25, delay: 0.06 + Math.min(i, 5) * 0.03 }}
          >
            <Label htmlFor={`opt-${opt.value}`} className="block w-full cursor-pointer">
              <Card
                tone={active ? "flat" : "elevated"}
                className={cn(
                  "flex flex-row items-center gap-3 rounded-2xl px-5 py-4 transition-all active:scale-[0.98]",
                  active
                    ? "bg-lime ring-2 ring-inset ring-lime"
                    : "hover:bg-(--card)/80 hover:ring-1 hover:ring-inset hover:ring-border",
                )}
              >
                <span className={cn("flex-1 text-body font-medium", active ? "text-black" : "text-(--ink)")}>
                  {opt.label}
                </span>
                <Checkbox
                  id={`opt-${opt.value}`}
                  checked={active}
                  onCheckedChange={() => toggle(opt.value)}
                  aria-label={opt.label}
                  className={
                    active
                      ? "border-black data-checked:bg-black data-checked:border-black data-checked:text-lime"
                      : undefined
                  }
                />
              </Card>
            </Label>
          </motion.div>
        );
      })}
    </div>
  );
}

function SearchChoice({
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
    return (needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options).slice(0, 80);
  }, [q, options]);

  return (
    <div className="flex flex-col gap-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      <div className="max-h-96 overflow-y-auto px-1">
        {filtered.length > 0 ? (
          <SingleChoice value={value} onChange={onChange} options={filtered} />
        ) : (
          <p className="text-meta text-(--ink-3)">No matches.</p>
        )}
      </div>
    </div>
  );
}

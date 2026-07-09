"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";
import { positionOf } from "@/lib/wizard-flow";

const MIN_AGE = 18;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Compute age in whole years against today. Returns null if any input is
// missing or the date string isn't a real calendar date.
function computeAge(d: string, m: string, y: string): number | null {
  if (d.length === 0 || m.length === 0 || y.length !== 4) return null;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  const dob = new Date(year, month - 1, day);
  // Reject impossible calendar dates (e.g. Feb 31 → JS rolls over to Mar 3).
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  )
    return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function DOBStep() {
  const router = useRouter();
  const { update } = useProfile();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const age = computeAge(day, month, year);
  const allFilled = day.length > 0 && month.length > 0 && year.length === 4;
  const isUnderage = age !== null && age < MIN_AGE;
  const isValid = age !== null && age >= MIN_AGE;

  const handleDayChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setDay(digits);
    if (digits.length === 2) monthRef.current?.focus();
  };
  const handleMonthChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    setMonth(digits);
    if (digits.length === 2) yearRef.current?.focus();
  };
  const handleYearChange = (v: string) => {
    setYear(v.replace(/\D/g, "").slice(0, 4));
  };

  // Persist whenever the three fields form a valid adult date, from CURRENT
  // state. This used to live inside handleYearChange with stale-closure
  // day/month, so autofill, pasting, entering the year first, or editing a
  // field after the year silently skipped the date_of_birth PATCH. Users
  // then hit finish-onboarding with a NULL dob and an unrecoverable
  // "We couldn't finalize your profile" (bug found 2026-07-08; every
  // in-flight onboardee had dob NULL). The lastSentRef dedupes so a valid
  // date is sent once, not on every render.
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    const computedAge = computeAge(day, month, year);
    if (computedAge === null || computedAge < MIN_AGE) return;
    const dobIso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    if (lastSentRef.current === dobIso) return;
    lastSentRef.current = dobIso;
    update({ age: computedAge, dob: dobIso });
  }, [day, month, year, update]);

  // finish-onboarding requires date_of_birth server-side (NOT NULL on
  // person), so Continue awaits a CONFIRMED write. The eager effect above
  // remains the fast path; this is the guarantee.
  const handleNext = async () => {
    if (saving) return;
    const computedAge = computeAge(day, month, year);
    if (computedAge === null || computedAge < MIN_AGE) return;
    setSaveError(false);
    setSaving(true);
    try {
      const dobIso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      await update({ age: computedAge, dob: dobIso });
      router.push(positionOf("/onboarding/dob").next ?? "/onboarding/location");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      href="/onboarding/dob"
      ctaDisabled={!isValid}
      ctaLoading={saving}
      ctaLoadingLabel="Saving..."
      onNext={handleNext}
    >
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-display text-(--ink)">
          When&apos;s your birthday<span className="text-lime">?</span>
        </h1>
        <p className="text-body text-(--ink-2)">
          You won&apos;t show your age unless you choose to.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8 grid grid-cols-3 gap-3"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="dob-day" className="px-1 text-overline text-(--ink-3)">
            Day
          </Label>
          <Input
            id="dob-day"
            size="lg"
            tone="elevated"
            placeholder="DD"
            inputMode="numeric"
            autoComplete="bday-day"
            maxLength={2}
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            aria-describedby="dob-help"
            aria-invalid={isUnderage || undefined}
            className="text-center tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dob-month" className="px-1 text-overline text-(--ink-3)">
            Month
          </Label>
          <Input
            id="dob-month"
            ref={monthRef}
            size="lg"
            tone="elevated"
            placeholder="MM"
            inputMode="numeric"
            autoComplete="bday-month"
            maxLength={2}
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            aria-describedby="dob-help"
            aria-invalid={isUnderage || undefined}
            className="text-center tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dob-year" className="px-1 text-overline text-(--ink-3)">
            Year
          </Label>
          <Input
            id="dob-year"
            ref={yearRef}
            size="lg"
            tone="elevated"
            placeholder="YYYY"
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            aria-describedby="dob-help"
            aria-invalid={isUnderage || undefined}
            className="text-center tabular-nums"
          />
        </div>
      </motion.div>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.18 }}
        id="dob-help"
        role={isUnderage ? "alert" : undefined}
        className={
          isUnderage
            ? "mt-6 text-caption font-medium text-(--text-danger)"
            : "mt-6 text-caption text-(--ink-3)"
        }
      >
        {isUnderage
          ? "You must be 18 or older to join Ahavah."
          : allFilled && age === null
          ? "Please enter a valid date."
          : "You must be 18 or older to use Ahavah."}
      </motion.p>
      {saveError ? (
        <p role="alert" aria-live="polite" className="mt-3 text-caption font-semibold text-pink">
          We could not save your date of birth. Check your connection and tap Continue again.
        </p>
      ) : null}
    </OnboardingShell>
  );
}

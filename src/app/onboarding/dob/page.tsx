"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { OnboardingShell } from "@/components/app/onboarding-shell";
import { useProfile } from "@/lib/use-profile";

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
  const { update } = useProfile();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

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
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setYear(digits);
    // When all three fields are filled, compute and persist age + the
    // original DOB string. Backend needs date_of_birth on /onboardee-info;
    // age alone can't reconstruct the date.
    const computedAge = computeAge(day, month, digits);
    if (computedAge !== null && computedAge >= MIN_AGE) {
      const dobIso = `${digits}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      update({ age: computedAge, dob: dobIso });
    }
  };

  return (
    <OnboardingShell href="/onboarding/dob" ctaDisabled={!isValid}>
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
    </OnboardingShell>
  );
}

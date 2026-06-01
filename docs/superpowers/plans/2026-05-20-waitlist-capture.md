# Waitlist Capture Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Capture early-interest profile data on a `/waitlist` page (prefilled from the landing email), stored server-side in onboarding-shaped JSON so a magic link can be sent at launch.

**Architecture:** New `waitlist_signup` table + public `POST /waitlist` upsert (idempotent by email) on `ahavah-api`. Landing email submit persists + routes to a new `/waitlist` page (web) that collects the fields using existing onboarding option sets + kit primitives. Magic-link send/redeem is deferred to launch.

**Tech Stack:** Backend Flask + psycopg + Postgres (pytest in docker harness). Frontend Next.js 16 + React 19 + Tailwind v4 (vitest/tsc/eslint).

**Spec:** `docs/superpowers/specs/2026-05-20-waitlist-capture-design.md`

**Two repos.** api `ahavah/main`, web `master`. Stage by name; trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. No em-dashes in user copy. Verify backend in the harness (see `reference_ahavah_windows_test_harness`).

---

## File Structure

**Backend (`ahavah-api`):**
- Create `migrations/0017_waitlist_signup.sql` — idempotent table.
- Create `service/waitlist/__init__.py` — `upsert(tx, email, answers)`.
- Create `service/api/waitlist_routes.py` — public `POST /waitlist` (sibling module).
- Modify `service/api/__init__.py` — register import at bottom.
- Modify `duotypes/__init__.py` — `PostWaitlist` model.
- Create `tests/test_waitlist.py`.

**Frontend (`ahavah-web`):**
- Create `src/lib/waitlist.ts` — field option sets (re-exported from schema) + `postWaitlist()` + the `WaitlistAnswers` type.
- Create `src/app/waitlist/page.tsx` — the form.
- Modify `src/app/page.tsx` — landing submit posts + routes to `/waitlist`.

---

# BACKEND (ahavah-api)

### Task 1: Migration + service upsert

**Files:**
- Create: `migrations/0017_waitlist_signup.sql`
- Create: `service/waitlist/__init__.py`
- Test: `tests/test_waitlist.py`

- [ ] **Step 1: Write the migration**

```sql
-- 0017_waitlist_signup.sql
-- Pre-signup waitlist capture. Idempotent (deploy re-runs every migration).
-- email is the natural key (lower-cased + trimmed by the API). answers holds
-- the onboarding-shaped payload so a magic-link launch flow can prefill
-- onboarding later.
BEGIN;
CREATE TABLE IF NOT EXISTS waitlist_signup (
  email       TEXT         PRIMARY KEY,
  answers     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMIT;
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_waitlist.py
"""Waitlist capture (2026-05-20) — service.waitlist upsert tests."""
from __future__ import annotations
from uuid import uuid4
import pytest


@pytest.fixture
def email():
    e = f'wl-{uuid4()}@example.com'
    yield e
    from database import api_tx
    with api_tx() as tx:
        tx.execute("DELETE FROM waitlist_signup WHERE email = %(e)s", dict(e=e))


def test_insert_then_update_is_idempotent(email):
    from database import api_tx
    from service.waitlist import upsert, get
    with api_tx() as tx:
        upsert(tx, email, {"sex": "male", "country": "US"})
        row = get(tx, email)
        assert row["answers"]["sex"] == "male"
        # Re-submit overwrites answers, keeps the single row.
        upsert(tx, email, {"sex": "female", "country": "BB", "family": "wants-children"})
        row2 = get(tx, email)
        assert row2["answers"]["sex"] == "female"
        assert row2["answers"]["family"] == "wants-children"
        cnt = tx.execute(
            "SELECT count(*) AS c FROM waitlist_signup WHERE email = %(e)s",
            dict(e=email),
        ).fetchone()["c"]
        assert cnt == 1


def test_email_is_normalized(email):
    from database import api_tx
    from service.waitlist import upsert, get
    with api_tx() as tx:
        upsert(tx, f"  {email.upper()}  ", {"sex": "male"})
        # Stored + fetchable under the normalized (lower, trimmed) key.
        assert get(tx, email) is not None
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_waitlist.py -v` -> FAIL (`No module named 'service.waitlist'`).

- [ ] **Step 4: Implement the service**

```python
# service/waitlist/__init__.py
"""Pre-signup waitlist capture. Caller owns the api_tx.

A waitlist row is keyed by normalized email (lower-cased + trimmed). answers
is an onboarding-shaped JSONB blob; re-submitting the same email overwrites
it (the landing page posts {email} first, then the full form upserts the
rest).
"""
from __future__ import annotations
import json


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


_Q_UPSERT = """
  INSERT INTO waitlist_signup (email, answers)
  VALUES (%(email)s, %(answers)s::jsonb)
  ON CONFLICT (email) DO UPDATE
    SET answers = EXCLUDED.answers, updated_at = NOW()
"""

_Q_GET = """
  SELECT email, answers, created_at, updated_at
    FROM waitlist_signup WHERE email = %(email)s
"""


def upsert(tx, email: str, answers: dict) -> None:
    tx.execute(_Q_UPSERT, dict(
        email=normalize_email(email),
        answers=json.dumps(answers or {}),
    ))


def get(tx, email: str) -> dict | None:
    return tx.execute(_Q_GET, dict(email=normalize_email(email))).fetchone()
```

- [ ] **Step 5: Apply migration in the harness + run tests**

Run (postgres up, then):
```
MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api -lc "cd /app && pip install -q -r tests/requirements-test.txt; PYTHONPATH=/app python -c \"import re; from database import api_tx; s=re.sub(r'(?im)^\\s*(BEGIN|COMMIT)\\s*;\\s*$','',open('migrations/0017_waitlist_signup.sql').read());\\nfrom database import api_tx as t\\n\"; PYTHONPATH=/app python -m pytest tests/test_waitlist.py -v"
```
(If the table is missing, apply the migration via a one-off `tx.execute(open(...).read minus BEGIN/COMMIT)` as in the reactions validation; see `reference_ahavah_windows_test_harness`.)
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add migrations/0017_waitlist_signup.sql service/waitlist/__init__.py tests/test_waitlist.py
git commit -m "feat(waitlist): 0017 table + upsert service"
```

### Task 2: PostWaitlist type + public route

**Files:**
- Modify: `duotypes/__init__.py` (add `PostWaitlist`)
- Create: `service/api/waitlist_routes.py`
- Modify: `service/api/__init__.py` (register at bottom)

- [ ] **Step 1: Add the request model** to `duotypes/__init__.py` (near `PostRequestOtp`):

```python
class PostWaitlist(BaseModel):
    email: str
    answers: dict = {}
```

- [ ] **Step 2: Create the route module**

```python
# service/api/waitlist_routes.py
"""Public POST /waitlist - pre-signup capture. Sibling module (imported at
the bottom of service/api/__init__.py) to avoid the brittle top import.
Unauthenticated (these users have no account yet); rate-limited by IP."""
from __future__ import annotations
import re

import duotypes as t
from service.api.decorators import post, validate, limiter, shared_otp_limit
from database import api_tx
from service.waitlist import upsert, normalize_email

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


@post('/waitlist', limiter=shared_otp_limit)
@validate(t.PostWaitlist)
def post_waitlist(req: t.PostWaitlist):
    email = normalize_email(req.email)
    if not _EMAIL_RE.match(email):
        return {'error': 'invalid_email'}, 400
    answers = req.answers if isinstance(req.answers, dict) else {}
    with api_tx() as tx:
        upsert(tx, email, answers)
    return {'ok': True}
```

- [ ] **Step 3: Register the module** — add at the bottom of `service/api/__init__.py` after the reactions import:

```python
# Waitlist capture (2026-05-20) - public pre-signup form. Sibling module.
import service.api.waitlist_routes  # noqa: E402,F401
```

- [ ] **Step 4: Import check** (harness): `python -c "import service.api"` -> exits 0.

- [ ] **Step 5: Commit**

```bash
git add duotypes/__init__.py service/api/waitlist_routes.py service/api/__init__.py
git commit -m "feat(waitlist): public POST /waitlist (validated, rate-limited)"
```

---

# FRONTEND (ahavah-web)

### Task 3: Waitlist field model + client

**Files:**
- Create: `src/lib/waitlist.ts`

- [ ] **Step 1: Implement** the answers type, option re-exports, and `postWaitlist`:

```ts
// src/lib/waitlist.ts
import { apiClient } from "@/lib/api-client";
import {
  ASSEMBLIES,
  intentOptionsForSex,
  FAMILY_VIEWS,
  ETHNICITIES,
  NATIONALITIES,
  type Sex,
  type Assembly,
  type Intent,
  type FamilyView,
  type Ethnicity,
  type Nationality,
} from "@/lib/profile-schema";
import { ALL_COUNTRIES } from "@/lib/countries";

export const REFERRAL_SOURCES = [
  { value: "friend-family", label: "Friend or family" },
  { value: "social", label: "Social media" },
  { value: "search", label: "Search" },
  { value: "assembly", label: "Assembly or congregation" },
  { value: "other", label: "Other" },
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number]["value"];

export type WaitlistAnswers = {
  sex?: Sex;
  country?: string;       // ISO cc
  region?: string;        // state / province free text
  assembly?: Assembly[];  // self-identification (multi)
  intent?: Intent[];      // looking for (multi, gender-conditional)
  relocate_willing?: boolean;
  family?: FamilyView;    // children
  ethnicity?: Ethnicity;
  nationality?: Nationality;
  referral_source?: ReferralSource;
  referral_other?: string;
};

export {
  ASSEMBLIES,
  intentOptionsForSex,
  FAMILY_VIEWS,
  ETHNICITIES,
  NATIONALITIES,
  ALL_COUNTRIES,
};

export async function postWaitlist(email: string, answers: WaitlistAnswers = {}) {
  return apiClient.post<{ ok: boolean }>("/waitlist", { email, answers });
}
```

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` -> clean.
- [ ] **Step 3: Commit** `git add src/lib/waitlist.ts && git commit -m "feat(waitlist): answers model + postWaitlist client"`.

### Task 4: The `/waitlist` page

**Files:**
- Create: `src/app/waitlist/page.tsx`

- [ ] **Step 1: Implement the page.** Use `PageShell` (or a centered marketing shell consistent with the landing), kit primitives only: `ToggleGroup`/`ToggleGroupItem` (type="single" for gender/children/referral; type="multiple" for identification/looking-for), `Select` for ethnicity/nationality/country, `Input` for region + referral_other + email, `Button` for submit. Gender is required and rendered before "looking for" so `intentOptionsForSex(sex)` resolves; clearing/changing gender prunes intents not in the new set. Prefill email from `sessionStorage` (`PENDING_EMAIL_KEY`) or `?email=`. On submit call `postWaitlist(email, answers)`, show a confirmation panel ("You're on the list. We'll email you a sign-in link when we launch."). No em-dashes.

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { PENDING_EMAIL_KEY } from "@/lib/storage-keys";
import {
  ASSEMBLIES, intentOptionsForSex, FAMILY_VIEWS, ETHNICITIES, NATIONALITIES,
  ALL_COUNTRIES, REFERRAL_SOURCES, postWaitlist, type WaitlistAnswers,
} from "@/lib/waitlist";
import type { Intent, Sex } from "@/lib/profile-schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    try { stored = sessionStorage.getItem(PENDING_EMAIL_KEY); } catch {}
    const initial = fromQuery || stored || "";
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
    if (!EMAIL_RE.test(email.trim())) { setError("Please enter a valid email."); return; }
    setSubmitting(true); setError(null);
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
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com" required />
        </Field>

        <Field label="I am">
          <ToggleGroup type="single" value={a.sex ?? ""}
                       onValueChange={(v) => v && setSex(v as Sex)} variant="outline">
            <ToggleGroupItem value="male">Male</ToggleGroupItem>
            <ToggleGroupItem value="female">Female</ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field label="Country">
          <SelectField value={a.country} onChange={(v) => set("country", v)}
                       placeholder="Select country"
                       options={ALL_COUNTRIES.map((c) => ({ value: c.cc, label: c.name }))} />
        </Field>
        <Field label="State or region">
          <Input value={a.region ?? ""} onChange={(e) => set("region", e.target.value)}
                 placeholder="e.g. Texas" />
        </Field>

        <Field label="I identify as" hint="Select all that apply">
          <ToggleGroup type="multiple" value={a.assembly ?? []}
                       onValueChange={(v) => set("assembly", v as WaitlistAnswers["assembly"])}
                       variant="outline" className="flex-wrap justify-start">
            {ASSEMBLIES.map((o) => (
              <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {a.sex ? (
          <Field label="Looking for" hint="Select all that apply">
            <ToggleGroup type="multiple" value={a.intent ?? []}
                         onValueChange={(v) => set("intent", v as Intent[])}
                         variant="outline" className="flex-wrap justify-start">
              {intentOptions.map((o) => (
                <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        ) : null}

        <Field label="Children">
          <ToggleGroup type="single" value={a.family ?? ""}
                       onValueChange={(v) => v && set("family", v as WaitlistAnswers["family"])}
                       variant="outline" className="flex-wrap justify-start">
            {FAMILY_VIEWS.filter((f) => ["wants-children","does-not-want","open-to-more","has-children"].includes(f.value))
              .map((o) => (
                <ToggleGroupItem key={o.value} value={o.value}>{o.label}</ToggleGroupItem>
              ))}
          </ToggleGroup>
        </Field>

        <Field label="Ethnicity">
          <SelectField value={a.ethnicity} onChange={(v) => set("ethnicity", v as WaitlistAnswers["ethnicity"])}
                       placeholder="Select ethnicity"
                       options={ETHNICITIES.map((o) => ({ value: o.value, label: o.label }))} />
        </Field>
        <Field label="Nationality">
          <SelectField value={a.nationality} onChange={(v) => set("nationality", v as WaitlistAnswers["nationality"])}
                       placeholder="Select nationality"
                       options={NATIONALITIES.map((o) => ({ value: o.value, label: o.label }))} />
        </Field>

        <Field label="How did you hear about us?">
          <SelectField value={a.referral_source} onChange={(v) => set("referral_source", v as WaitlistAnswers["referral_source"])}
                       placeholder="Select one"
                       options={REFERRAL_SOURCES.map((o) => ({ value: o.value, label: o.label }))} />
          {a.referral_source === "other" ? (
            <Input className="mt-2" value={a.referral_other ?? ""}
                   onChange={(e) => set("referral_other", e.target.value)}
                   placeholder="Tell us where" />
          ) : null}
        </Field>

        {error ? <p role="alert" className="text-meta font-semibold text-pink">{error}</p> : null}

        <Button type="submit" tone="cta" size="tap" disabled={submitting} className="w-full">
          {submitting ? "Saving…" : "Join the waitlist"}
        </Button>
      </form>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

function SelectField({
  value, onChange, placeholder, options,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Typecheck + lint** `npx tsc --noEmit` and `npx eslint src/app/waitlist/page.tsx src/lib/waitlist.ts` -> clean. (Confirm the exact `Select` + `ToggleGroup` export names against the kit; adjust imports if they differ. Do NOT hardcode option lists.)
- [ ] **Step 3: Commit** `git add src/app/waitlist/page.tsx && git commit -m "feat(waitlist): /waitlist capture form"`.

### Task 5: Wire the landing page

**Files:**
- Modify: `src/app/page.tsx` (the `handleSubmit` stub at lines 86-108)

- [ ] **Step 1: Replace the stub** so it persists the email server-side and routes to `/waitlist`:

```tsx
import { useRouter } from "next/navigation";       // add if missing
import { postWaitlist } from "@/lib/waitlist";       // add

// inside component:
const router = useRouter();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) {
    setMsg({ kind: "error", text: "Please enter a valid email so we can reach you." });
    formInputRef.current?.focus();
    return;
  }
  setSubmitting(true);
  setMsg(null);
  try {
    localStorage.setItem(WAITLIST_STORAGE_KEY, trimmed);
    sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
  } catch { /* storage unavailable */ }
  // Best-effort early capture; route to the full form regardless.
  try { await postWaitlist(trimmed); } catch { /* form will create the row */ }
  setSubmitting(false);
  router.push(`/waitlist?email=${encodeURIComponent(trimmed)}`);
};
```

- [ ] **Step 2: Typecheck + lint** the landing page -> clean.
- [ ] **Step 3: Commit** `git add src/app/page.tsx && git commit -m "feat(waitlist): landing email posts + routes to /waitlist"`.

### Task 6: Verify + deploy

- [ ] **Step 1: Backend** — run `tests/test_waitlist.py` in the harness (2 passed) + `import service.api` OK.
- [ ] **Step 2: Frontend** — `npx tsc --noEmit` + `npx eslint <changed files>` clean. The `/waitlist` page is PUBLIC, so optionally load it headless to confirm render + gender-conditional options switch.
- [ ] **Step 3: Deploy** — push api `ahavah/main` (re-runs migrations incl. 0017), watch the deploy, curl-smoke `POST /waitlist` (expect 400 on empty body, not 404). Push web `master` (Vercel).

---

## Self-Review

**Spec coverage:** table+endpoint -> Tasks 1-2; field set + onboarding-shaped answers -> Task 3 (`WaitlistAnswers` mirrors `sex/country/region/assembly[]/intent[]/relocate_willing/family/ethnicity/nationality/referral_*`); `/waitlist` page + gender-conditional looking-for + prefill -> Task 4; landing wiring -> Task 5; verify+deploy -> Task 6; deferred magic-link -> documented, not built. Covered.

**Placeholder scan:** Step 4 notes "confirm Select/ToggleGroup export names" — this is a verify-not-invent instruction (the components exist; only the exact named exports need confirming), not a TODO. All code blocks complete.

**Type consistency:** `WaitlistAnswers` keys defined in Task 3 are used identically in Task 4 (`sex/country/region/assembly/intent/family/ethnicity/nationality/referral_source/referral_other`). `postWaitlist(email, answers)` signature defined Task 3, called in Tasks 4-5. `upsert(tx, email, answers)` + `get(tx, email)` + `normalize_email` defined Task 1, used in Tasks 1-2. `PostWaitlist{email, answers}` defined Task 2, matches the POST body from `postWaitlist`. `relocate_willing` is in the type but not yet a form control — it folds into intent per the spec; left in the type for the carry-over shape (no separate control needed for v1).

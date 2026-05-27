# Beta-tester Onboarding Opt-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ## ⚠ Amendment (2026-05-26) — shipped placement differs
>
> Tasks 4, 6 and 7 below targeted the **authed** `/onboarding/complete` with an
> **authenticated** `POST /beta-tester`. As shipped, the opt-in lives on the
> **public `/waitlist` completion screen** instead (the real public flow), and the
> route is **public** (`POST /beta-tester` body `{ email }`, `PostBetaTester`,
> rate-limited; `person_id` NULL). The card (`BetaTesterCard`) takes an `email`
> prop and was removed from `/onboarding/complete`. Tasks 1–3, 5 are unchanged.
> Shipped: `ahavah-api c2f7807`, `ahavah-web 6f033a8`.

**Goal:** Add a beta-tester opt-in card to the **public `/waitlist` completion screen** that records the user in a durable `beta_signup` cohort and emails a confirmation promising a sign-in link on June 15, 2026.

**Architecture:** Backend mirrors the waitlist/feedback patterns — a `beta_signup` table, a raw-SQL `service.beta`, a branded confirmation email, and an authenticated `POST /beta-tester` sibling route that derives identity from the session. Frontend adds a kit-primitive card (designed via `/frontend-design`) on the completion screen. Spec: `docs/superpowers/specs/2026-05-26-beta-tester-onboarding-optin-design.md`.

**Tech Stack:** Flask + sync psycopg + PostgreSQL + flask-limiter + pydantic v2 (api); Next.js 16 + React 19 + Tailwind v4 + Base UI kit + sonner (web).

**Deploy order:** Part A (api → `ahavah/main`) first, then Part B (web → `master`) — the web card POSTs to `/beta-tester`, so the route must exist first.

---

## File Structure

**Part A — `ahavah-api` (branch `ahavah/main`)**
- Create: `migrations/0020_beta_signup.sql` — the cohort table (idempotent).
- Create: `service/beta/__init__.py` — `register()` + `count()` (raw SQL).
- Create: `tests/test_beta.py` — service idempotency/count (CI/droplet).
- Create: `emails/beta_welcome.py` — confirmation email (June 15, 2026).
- Create: `service/api/beta_routes.py` — `POST /beta-tester` (authed).
- Modify: `service/api/__init__.py` — register the sibling route (one import line).

**Part B — `ahavah-web` (branch `master`)**
- Create: `src/lib/beta.ts` — `registerBetaTester()` client.
- Create: `src/components/app/beta-tester-card.tsx` — the opt-in card (designed via `/frontend-design`).
- Modify: `src/app/onboarding/complete/page.tsx` — mount the card, gated on `graduated`.

---

## PART A — Backend (`ahavah-api`, branch `ahavah/main`)

### Task 1: beta_signup migration

**Files:** Create `migrations/0020_beta_signup.sql`

- [ ] **Step 1: Write the migration** (idempotent, mirrors `0017_waitlist_signup.sql`):

```sql
-- 0020_beta_signup.sql
-- Beta-tester cohort (2026-05-26). Onboarders who opt in on the completion
-- screen. Idempotent (the deploy re-runs every migration and swallows errors).
-- email is the natural key (lower-cased + trimmed by the service); person_id
-- links the graduated account (nullable to tolerate opt-in before graduation).
BEGIN;

CREATE TABLE IF NOT EXISTS beta_signup (
  email       TEXT         PRIMARY KEY,
  person_id   BIGINT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMIT;
```

- [ ] **Step 2: Commit**

```bash
git add migrations/0020_beta_signup.sql
git commit -m "feat(db): add beta_signup table migration"
```

### Task 2: service.beta (register + count), test-first

**Files:** Create `tests/test_beta.py`, then `service/beta/__init__.py`

- [ ] **Step 1: Write the failing test** (`tests/test_beta.py`, mirrors `tests/test_waitlist.py`):

```python
"""Beta-tester cohort (2026-05-26) - service.beta tests."""

from __future__ import annotations

from uuid import uuid4


def test_register_is_idempotent_and_counts():
    from database import api_tx
    from service.beta import register, count
    email = f"beta-{uuid4()}@example.com"
    with api_tx() as tx:
        before = count(tx)
        assert register(tx, email, None) is True      # brand-new row
        assert count(tx) == before + 1
        assert register(tx, email, None) is False     # repeat opt-in, no-op
        assert count(tx) == before + 1
        tx.execute("DELETE FROM beta_signup WHERE email = %(e)s", dict(e=email))


def test_register_normalizes_email():
    from database import api_tx
    from service.beta import register, count
    raw = f"  BETA-{uuid4()}@Example.com  "
    norm = raw.strip().lower()
    with api_tx() as tx:
        assert register(tx, raw, None) is True
        # Re-register under the normalized key is a no-op (same row).
        assert register(tx, norm, None) is False
        tx.execute("DELETE FROM beta_signup WHERE email = %(e)s", dict(e=norm))
```

- [ ] **Step 2: Run it to verify it fails** (CI/droplet — locally the import fails; see plan note):

Run: `pytest tests/test_beta.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'service.beta'`.

- [ ] **Step 3: Implement `service/beta/__init__.py`**:

```python
"""Beta-tester cohort. Caller owns the api_tx.

Records onboarders who opt in on the completion screen. email is the natural
key (lower-cased + trimmed) so a repeat opt-in is a no-op. The confirmation
email is fired by the route only when register() reports a brand-new row.
"""

from __future__ import annotations


def _norm(email: str) -> str:
    return (email or "").strip().lower()


_Q_REGISTER = """
  INSERT INTO beta_signup (email, person_id)
  VALUES (%(email)s, %(person_id)s)
  ON CONFLICT (email) DO NOTHING
  RETURNING email
"""

_Q_COUNT = "SELECT count(*) AS n FROM beta_signup"


def register(tx, email: str, person_id) -> bool:
    """Insert the cohort row. Returns True iff this was a brand-new signup
    (so the caller fires the confirmation email exactly once per email)."""
    row = tx.execute(_Q_REGISTER, dict(email=_norm(email), person_id=person_id)).fetchone()
    return row is not None


def count(tx) -> int:
    return tx.execute(_Q_COUNT).fetchone()["n"]
```

- [ ] **Step 4: Run the test to verify it passes** (CI/droplet):

Run: `pytest tests/test_beta.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/test_beta.py service/beta/__init__.py
git commit -m "feat: service.beta register + count (+ tests)"
```

> **Plan note (local harness):** the Windows docker test harness has no pytest and an unseeded DB, so Steps 2 & 4 run in CI / on the droplet, not locally (per `[[reference_ahavah_windows_test_harness]]`). Locally, verify with the import smoke in Task 4 Step 2.

### Task 3: beta_welcome confirmation email

**Files:** Create `emails/beta_welcome.py`

- [ ] **Step 1: Implement the email** (mirrors `emails/waitlist_welcome.py`; uses the `emails/base.py` shell + helpers; adapt the canonical E9 beta template's design):

```python
"""Beta-tester confirmation email.

Sent when an onboarder opts in as a beta tester. Tells them a sign-in link is
coming on June 15, 2026 (the actual link is a separate future batch). Inline-
styled + dark-mode aware via emails.base. Best-effort send (aws_smtp retries
then gives up without raising)."""
from __future__ import annotations

import threading
import traceback

from service.config import EMAIL_DOMAIN
from emails.base import render, button, chip, callout, INK, INK_SOFT, INDIGO, LIME, MUTED, SERIF, SANS

SIGN_IN_DATE = "June 15, 2026"
SUBJECT = "You're an Ahavah beta tester"
FROM_ADDR = f"hello@{EMAIL_DOMAIN}"
SHARE_URL = "https://ahavah.app"
PREHEADER = f"You're in. We'll email your sign-in link on {SIGN_IN_DATE}."

_BODY = f"""
{chip("Beta tester")}

<h1 class="e-title" style="margin:18px 0 14px;font-family:{SERIF};font-size:44px;line-height:1.0;letter-spacing:-0.022em;font-weight:400;color:{INK};">
  You're <span style="color:{INDIGO};">in</span>.
</h1>

<p class="e-text" style="margin:0 0 16px;font-family:{SANS};font-size:17px;line-height:1.55;color:{INK_SOFT};">
  Thank you for signing up to test Ahavah. You're on the beta list, helping shape
  Torah-observant matchmaking before it opens to everyone.
</p>

{callout(f"Your sign-in link arrives by email on <strong>{SIGN_IN_DATE}</strong>. Watch your inbox.")}

<p class="e-text" style="margin:0 0 8px;font-family:{SANS};font-size:15px;line-height:1.6;color:{INK_SOFT};">
  Nothing else to do for now. We'll be in touch.
</p>
"""

_FOOTER = f"""
Ahavah &middot; Torah-observant matchmaking for the diaspora.<br/>
You're receiving this because you opted into the beta at
<a href="{SHARE_URL}" style="color:{INDIGO};font-weight:600;text-decoration:none;">ahavah.app</a>.
"""


def beta_welcome_html() -> str:
    return render(title=SUBJECT, preheader=PREHEADER, body_html=_BODY, footer_html=_FOOTER)


def send_beta_welcome(email: str) -> None:
    if not email or email.endswith("@example.com"):
        return
    from smtp import aws_smtp
    aws_smtp.send(subject=SUBJECT, body=beta_welcome_html(), to_addr=email, from_addr=FROM_ADDR)


def send_beta_welcome_async(email: str) -> None:
    """Fire-and-forget so the request returns immediately; failures are swallowed
    (the beta_signup row is the source of truth)."""
    if not email or email.endswith("@example.com"):
        return

    def _go() -> None:
        try:
            send_beta_welcome(email)
        except Exception:
            print(traceback.format_exc())

    threading.Thread(target=_go, daemon=True).start()
```

- [ ] **Step 2: Verify it renders** (docker harness; confirms imports + template):

```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c \"from emails.beta_welcome import beta_welcome_html; h=beta_welcome_html(); print('len', len(h), 'has_date', 'June 15, 2026' in h)\""
```
Expected: `len <n> has_date True`.

- [ ] **Step 3: Commit**

```bash
git add emails/beta_welcome.py
git commit -m "feat: beta-tester confirmation email"
```

### Task 4: POST /beta-tester route + registration

**Files:** Create `service/api/beta_routes.py`; Modify `service/api/__init__.py`

- [ ] **Step 1: Implement the route** (authed; identity from the session, never the body — mirrors the `apost` usages in `service/api/__init__.py:230-257` and the sibling-route pattern of `feedback_routes.py`):

```python
"""Authenticated POST /beta-tester - onboarding beta opt-in.

Sibling module (imported at the bottom of service/api/__init__.py). The user is
signed in during onboarding; identity (email + person_id) comes from the
session via @apost, never the request body, so it cannot be spoofed. Records the
beta_signup row and, on a brand-new row, fires the confirmation email.
"""

from __future__ import annotations

import duotypes as t
from service.api.decorators import apost, limiter, _is_private_ip
from database import api_tx
from service.beta import register as register_beta
from emails.beta_welcome import send_beta_welcome_async

beta_limit = limiter.shared_limit(
    "10 per minute",
    scope="beta",
    exempt_when=_is_private_ip,
)


# expected_onboarding_status=None / expected_sign_in_status=None → any valid
# session is accepted (the opt-in fires right as the onboardee graduates into a
# person, so we don't pin a specific onboarding/sign-in state).
@apost(
    '/beta-tester',
    limiter=beta_limit,
    expected_onboarding_status=None,
    expected_sign_in_status=None,
)
def post_beta_tester(s: t.SessionInfo):
    with api_tx() as tx:
        is_new = register_beta(tx, s.email, s.person_id)
    if is_new:
        send_beta_welcome_async(s.email)
    return {'ok': True}
```

- [ ] **Step 2: Register the sibling route** — append to the bottom of `service/api/__init__.py`, after the `feedback_routes` import:

```python
# Beta-tester opt-in (2026-05-26) — onboarding completion screen. Sibling module.
import service.api.beta_routes  # noqa: E402,F401
```

- [ ] **Step 3: Verify import + route registration** (docker harness):

```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c 'import service.api; import service.beta; print(\"import ok\")'"
```
Expected: prints `import ok` (the DB-connection background errors from the harness are expected and unrelated).

- [ ] **Step 4: Commit, push, deploy**

```bash
git add service/api/beta_routes.py service/api/__init__.py
git commit -m "feat: authenticated POST /beta-tester opt-in route"
git push origin ahavah/main
# watch the droplet deploy:
rid=$(gh run list --branch ahavah/main --workflow "Deploy ahavah/main → droplet" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$rid" --exit-status
```
Expected: deploy succeeds (~5 min). The migration applies on deploy.

- [ ] **Step 5: Live smoke** — unauthenticated call is rejected (route is authed):

```bash
curl -s -o /dev/null -w "no-auth POST = %{http_code}\n" -X POST https://api.ahavah.app/beta-tester -H "Content-Type: application/json" -d '{}'
```
Expected: `400` (missing/malformed authorization header) — confirms the route exists and requires a session. (An authenticated end-to-end opt-in is exercised via the web flow in Part B.)

---

## PART B — Frontend (`ahavah-web`, branch `master`)

### Task 5: beta client

**Files:** Create `src/lib/beta.ts`

- [ ] **Step 1: Implement the client** (mirrors `src/lib/feedback.ts`):

```ts
/**
 * Beta-tester opt-in client. POST /beta-tester is authenticated; identity comes
 * from the session on the server, so no body is needed (apiClient attaches the
 * bearer token automatically).
 */

import { apiClient } from "@/lib/api-client";

export async function registerBetaTester() {
  return apiClient.post<{ ok: boolean }>("/beta-tester", {});
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/beta.ts
git commit -m "feat: beta-tester opt-in client"
```

### Task 6: BetaTesterCard — design via /frontend-design, then implement

**Files:** Create `src/components/app/beta-tester-card.tsx`

- [ ] **Step 1: Invoke the `/frontend-design` skill** for the card. Inputs to give it:
  - Surface: a card on the dark/premium `/onboarding/complete` celebration screen (brand tokens: indigo/lime/lavender, `--ink`/`--card`/`--hairline`; Plus Jakarta Sans; Ultra is landing-only).
  - Purpose: a "special" but secondary affordance below the celebration, above the "Start matching" CTA — must not outshine the primary CTA.
  - Kit primitives ONLY: `Card`, `IconBadge`, `Button`, `sonner` toast (no hand-rolled atoms).
  - Three states: **idle** (heading "Become a beta tester" + subcopy "Get early access. We'll email your sign-in link on June 15." + opt-in Button "Count me in"), **loading** (spinner), **done** (confirmed "You're in" with a Check, button gone/disabled).
  - A `disabled` prop (true until onboarding `graduated`) that visibly de-emphasises the card + disables the button with a hint.
  Capture the design output (layout, tone, spacing, which kit components/variants).

- [ ] **Step 2: Implement `src/components/app/beta-tester-card.tsx`** per the design, kit primitives only. Baseline (frontend-design governs final visual details, but states/props/behaviour are fixed):

```tsx
"use client";

import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { registerBetaTester } from "@/lib/beta";

type BetaTesterCardProps = {
  /** Disabled until onboarding has graduated the user into an account. */
  disabled?: boolean;
};

export function BetaTesterCard({ disabled = false }: BetaTesterCardProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (status !== "idle" || disabled) return;
    setStatus("loading");
    setError(null);
    try {
      await registerBetaTester();
      setStatus("done");
      toast.success("You're in. We'll email your sign-in link on June 15.");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof ApiError && err.status === 429
          ? "Please try again in a moment."
          : "Couldn't register you. Please try again.",
      );
    }
  };

  return (
    <Card tone="elevated" className="w-full max-w-sm gap-3 p-5 text-left">
      <div className="flex items-start gap-3">
        <IconBadge tone={status === "done" ? "success" : "brand"} shape="circle">
          {status === "done" ? <Check /> : <Sparkles />}
        </IconBadge>
        <div className="flex flex-col gap-1">
          <p className="text-meta font-semibold text-(--ink)">
            {status === "done" ? "You're a beta tester" : "Become a beta tester"}
          </p>
          <p className="text-caption text-(--ink-2)">
            {status === "done"
              ? "We'll email your sign-in link on June 15."
              : "Get early access. We'll email your sign-in link on June 15."}
          </p>
        </div>
      </div>

      {status !== "done" ? (
        <Button
          size="tap"
          tone="brand"
          disabled={disabled || status === "loading"}
          onClick={() => void submit()}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="animate-spin" />
              Signing you up…
            </>
          ) : (
            "Count me in"
          )}
        </Button>
      ) : null}

      {disabled ? (
        <p className="text-caption text-(--ink-3)">Available once your profile is finalised.</p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="polite" className="text-caption font-semibold text-(--color-pink)">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 3: Verify the component renders in isolation** (the real `/onboarding/complete` needs an authed session, so render the card on a throwaway page for the screenshot, per `[[feedback_verify_rendered_pixels]]`):
  - Create a temp page `src/app/_beta-preview/page.tsx` that renders `<div className="bg-(--app) min-h-dvh grid place-items-center p-6"><BetaTesterCard /></div>` (and a second instance with `disabled`).
  - `npx next build` then `npx next start -p 3100`; headless-Chrome screenshot `http://localhost:3100/_beta-preview`; Read the PNG and confirm idle + disabled states look right.
  - **Delete** `src/app/_beta-preview/` and the PNG afterward.

- [ ] **Step 4: Typecheck + lint**

```bash
cd /d/Antigravity/ahavah-web && npx tsc --noEmit && npx eslint src/lib/beta.ts src/components/app/beta-tester-card.tsx
```
Expected: clean (no output).

- [ ] **Step 5: Commit**

```bash
git add src/components/app/beta-tester-card.tsx
git commit -m "feat: beta-tester opt-in card (designed via frontend-design)"
```

### Task 7: Mount on the completion screen

**Files:** Modify `src/app/onboarding/complete/page.tsx`

- [ ] **Step 1: Import the card** — add near the other component imports:

```tsx
import { BetaTesterCard } from "@/components/app/beta-tester-card";
```

- [ ] **Step 2: Mount it** — between the celebration copy `motion.div` (the one containing the `<h1>You're all set</h1>`) and the action `motion.div` (the one with the "Start matching" Button), add:

```tsx
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="flex w-full justify-center"
      >
        <BetaTesterCard disabled={!graduated} />
      </motion.div>
```

(`graduated` is the existing state on this page; the card is disabled until `finishOnboarding()` resolves.)

- [ ] **Step 3: Verify build**

```bash
cd /d/Antigravity/ahavah-web && npx tsc --noEmit && npx next build 2>&1 | grep -iE "error|Compiled successfully" | head -3
```
Expected: `✓ Compiled successfully`, no errors.

- [ ] **Step 4: Commit, push, confirm live**

```bash
git add src/app/onboarding/complete/page.tsx
git commit -m "feat: mount beta-tester card on onboarding complete"
git push origin master
# confirm Vercel Ready (token from [[vercel-token]]):
npx vercel ls --token <TOKEN> | grep -m1 Production   # ● Ready
```
Expected: latest Production `● Ready`. (Live end-to-end opt-in requires walking the authed onboarding flow; smoke at minimum that the page builds + deploys.)

---

## Self-Review

**1. Spec coverage:**
- `beta_signup` table → Task 1 ✓
- `service.beta` register/count → Task 2 ✓
- Confirmation email (June 15, 2026) → Task 3 ✓
- Authed `POST /beta-tester` (session identity) + registration → Task 4 ✓
- `registerBetaTester()` client → Task 5 ✓
- Card via `/frontend-design`, kit primitives, idle/loading/done + disabled-until-graduated → Task 6 ✓
- Mount on `/onboarding/complete` gated on `graduated` → Task 7 ✓
- Edge cases (repeat = idempotent no-email; disabled until graduated; email best-effort; 401/400 unauth; no body identity) → covered in Tasks 2/4/6 ✓
- Out of scope (June-15 batch) → not built ✓
No gaps.

**2. Placeholder scan:** No TBD/"handle errors"/"similar to". Every code step has complete code. The `/frontend-design` step (Task 6 Step 1) is a real skill invocation with concrete inputs, followed by a complete baseline implementation in Step 2 — not a placeholder.

**3. Type consistency:**
- `register(tx, email, person_id) -> bool` defined Task 2, called identically Task 4 ✓
- `count(tx)` defined Task 2, used in tests ✓
- `send_beta_welcome_async(email)` defined Task 3, called Task 4 ✓
- `registerBetaTester()` defined Task 5, called in `BetaTesterCard` Task 6 ✓
- `BetaTesterCard({ disabled })` defined Task 6, mounted with `disabled={!graduated}` Task 7 ✓
- `@apost(... expected_onboarding_status=None ...)` + handler `(s: t.SessionInfo)` matches the real decorator signature in `decorators.py` ✓

---

## Execution order
1. **Part A** (api) — Tasks 1–4, deploy to `ahavah/main` first.
2. **Part B** (web) — Tasks 5–7, deploy to `master` after the route is live.

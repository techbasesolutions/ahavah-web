# Beta-tester onboarding opt-in — Design

**Date:** 2026-05-26
**Status:** Shipped (see amendment) — `ahavah-api c2f7807`, `ahavah-web 6f033a8`
**Repos:** `ahavah-api` (branch `ahavah/main`) + `ahavah-web` (branch `master`)

> ## ⚠ Amendment (2026-05-26) — placement corrected after testing
>
> The original design below placed the opt-in on the **authed** app onboarding
> completion (`/onboarding/complete`) with an **authenticated** `POST /beta-tester`
> (identity from the session). Testing revealed the real public flow is the
> **waitlist wizard** (`/waitlist`), which is unauthenticated — so an authed route
> and an `/onboarding`-only card never reached real users. **As shipped:**
> - The opt-in card lives on the **`/waitlist` completion screen** ("You're on the
>   list"), below the share card, keyed by the **email the user just entered**.
> - `POST /beta-tester` is **public**: body `{ email }` (validated `PostBetaTester`,
>   rate-limited), records `beta_signup` with `person_id = NULL`, emails the June-15
>   confirmation on a new row. (`@example.com` addresses are skipped for the send.)
> - The card was **removed** from `/onboarding/complete`.
>
> Everything else (the `beta_signup` table, `service.beta`, `emails/beta_welcome.py`,
> the June-15 copy, edge cases) is unchanged. The sections below describe the
> original authed approach and are kept for history.

## Goal

During onboarding, give users a special option to register as a **beta tester**. On the
"You're all set" completion screen, an opt-in card lets them join. Opting in:

1. records them in a durable, queryable cohort, and
2. emails a branded confirmation promising a **sign-in link on June 15, 2026**.

The actual June-15 sign-in-link delivery is a **separate future batch send** and is
**out of scope** for this feature.

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| What opting in does | Flag the user for later **+** send a confirmation email |
| Message channel | Email via Resend (reuses the waitlist email infra) |
| Placement | Opt-in card on `/onboarding/complete`, before "Start matching" |
| Storage | Dedicated `beta_signup` table + `POST /beta-tester` route |
| Sign-in date in copy | June 15, 2026 |

## Context (existing code this builds on)

- Onboarding is a multi-step wizard; each step PATCHes the profile via `useProfile`.
  `/onboarding/complete` (`src/app/onboarding/complete/page.tsx`) calls `finishOnboarding()`
  **on mount**, which graduates the onboardee into a `person`. "Start matching" is gated on a
  local `graduated` flag until that completes.
- The backend uses raw-SQL service modules (`service/waitlist/__init__.py`), idempotent numbered
  migrations (`migrations/00NN_*.sql`, latest is `0019_feedback.sql` → next is `0020`), and
  sibling route modules registered at the bottom of `service/api/__init__.py`
  (`feedback_routes.py`, `waitlist_routes.py`).
- Branded email shell lives at `emails/base.py` (`render()` + tokens); `emails/waitlist_welcome.py`
  is the reference for a fire-and-forget send. A canonical **beta-invite** template (E9) exists in
  `emails/canonical/Ahavah-Email-Templates.html` and should guide the confirmation email's design.
- The API authenticates via bearer token → `duo_session` lookup, exposing `person_id` + `email`
  (see `service/api/decorators.py`). The web `apiClient` attaches the session token automatically.

## Architecture

### Backend (`ahavah-api`)

1. **Migration** `migrations/0020_beta_signup.sql` (idempotent, mirrors `0017_waitlist_signup.sql`):
   ```sql
   BEGIN;
   CREATE TABLE IF NOT EXISTS beta_signup (
     email       TEXT         PRIMARY KEY,
     person_id   BIGINT,
     created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
   );
   COMMIT;
   ```
   `email` PK dedupes repeat opt-ins; `person_id` links the account (nullable to tolerate timing).

2. **Service** `service/beta/__init__.py` (raw SQL, mirrors `service/waitlist`):
   - `register(tx, email, person_id) -> bool` — returns `is_new` so the email fires exactly once per
     email. Idempotency without an `updated_at`:
     ```sql
     INSERT INTO beta_signup (email, person_id)
     VALUES (%(email)s, %(person_id)s)
     ON CONFLICT (email) DO NOTHING
     RETURNING email
     ```
     `is_new = (fetchone() is not None)` — a returned row means the insert happened (new); no row
     means the email already existed (repeat opt-in, skip the email).
   - `count(tx) -> int` → `SELECT count(*) AS n FROM beta_signup`.

3. **Email** `emails/beta_welcome.py` (reference: `emails/waitlist_welcome.py`):
   - `SIGN_IN_DATE = "June 15, 2026"`, `SUBJECT = "You're an Ahavah beta tester"`.
   - Branded HTML via `emails.base.render(...)`, following the canonical E9 beta template,
     copy ≈ "You're in. We'll email your sign-in link on **June 15, 2026**."
   - `send_beta_welcome(email)` (sync, skips `@example.com`) + `send_beta_welcome_async(email)`
     (daemon thread, swallows failures + logs).

4. **Route** `service/api/beta_routes.py` — `POST /beta-tester`:
   - **Authenticated.** Identity (`email`, `person_id`) comes from the **session**, never the body
     (no spoofing). Returns 401 if unauthenticated.
   - Rate-limited via a dedicated shared limiter (mirror `feedback_limit`, e.g. `"10 per minute"`).
   - Body: none required (empty `{}`).
   - Effect: `register(tx, email, person_id)`; on `is_new`, `send_beta_welcome_async(email)`.
   - Returns `{ "ok": true }`.
   - Registered via `import service.api.beta_routes` at the bottom of `service/api/__init__.py`.

### Frontend (`ahavah-web`) — kit primitives only

1. **Client** `src/lib/beta.ts`: `registerBetaTester()` → `apiClient.post<{ ok: boolean }>("/beta-tester", {})`.

2. **Component** `src/components/app/beta-tester-card.tsx` (`"use client"`):
   - A kit `Card` (brand-glow surface) with an `IconBadge`, heading "Become a beta tester",
     subcopy "Get early access. We'll email your sign-in link on June 15.", and a `Button`
     ("Count me in").
   - Prop `disabled` (true until onboarding `graduated`) — disabled shows a hint.
   - On click → `registerBetaTester()`; success → flip to a confirmed "You're in" state (Check icon)
     + `toast.success`, and stays disabled. Error → inline pink message.
   - No new atoms; reuse `Card`, `IconBadge`, `Button`, `sonner` toast.

3. **Mount** in `src/app/onboarding/complete/page.tsx`: render `<BetaTesterCard disabled={!graduated} />`
   between the celebration copy block and the action-button block. No other change to that screen's
   existing graduation logic.

## Data flow

1. `/onboarding/complete` mounts → `finishOnboarding()` graduates onboardee → `person` (sets `graduated`).
2. User taps **Count me in** (enabled once `graduated`).
3. `POST /beta-tester` → server reads `email` + `person_id` from the session → `register(beta_signup)` →
   on new row, `send_beta_welcome_async(email)`.
4. Web shows toast + confirmed card.
5. Later: the cohort = `SELECT email, person_id, created_at FROM beta_signup ORDER BY created_at;`

## Edge cases

- **Repeat opt-in:** idempotent insert (`ON CONFLICT DO NOTHING`); `is_new=false` → no duplicate email; card shows confirmed.
- **Opt-in before graduation:** button disabled (with hint) until `graduated`, mirroring "Start matching".
- **Email send fails:** best-effort (swallowed); the `beta_signup` row is the source of truth, so the
  cohort stays correct and the user still sees success.
- **Unauthenticated call:** 401 (route requires a session).
- **Privacy:** only the session email + person_id are stored; no body-supplied identity.

## Testing & verification

- **Backend:** `import service.api` via the Windows docker harness (route registration); a pytest
  `tests/test_beta.py` for `service.beta` upsert/idempotency/count (runs in CI/droplet, not locally).
- **Frontend:** `tsc --noEmit` + `eslint` (changed files) + `next build`; a **rendered screenshot**
  of `/onboarding/complete` showing the card (default + confirmed state) per the verify-rendered-pixels rule.
- **Deploy:** api → push `ahavah/main` (droplet GHA); web → push `master` (Vercel). Live smoke:
  authenticated `POST /beta-tester` → row written + confirmation email received.

## Out of scope

- The actual **June-15 sign-in-link batch send** (separate future job/CLI, like the waitlist welcome batch).
- Any feature-gating / early-access behavior change for beta testers (purpose is "flag for later").

## Open items to lock during planning

- The authenticated-route helper/decorator used by existing authed routes (to read session
  `email`/`person_id`) — confirm the exact pattern in `service/api/decorators.py` and an authed route.
- Whether the canonical E9 template is a close enough copy match to port directly, or needs copy edits
  for the "link coming June 15" confirmation framing (vs an actual invite).

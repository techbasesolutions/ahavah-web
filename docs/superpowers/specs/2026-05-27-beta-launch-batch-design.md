# Beta launch-announcement batch — Design

**Date:** 2026-05-27
**Status:** Approved → next: writing-plans
**Repo:** `ahavah-api` (branch `ahavah/main`) only — no web, no DB, no routes, no new auth.

## Goal

A dry-run-able CLI to email the beta-tester cohort a "the beta is open" launch
announcement on June 15, 2026, linking to the existing sign-in page. The
operator runs `--all` manually once the launch is confirmed live. Fulfils the
promise in the beta confirmation email ("your sign-in link arrives by email on
June 15, 2026").

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| What the "sign-in link" is | A launch **announcement** linking to the normal sign-in page (`/auth/sign-in`, email → existing OTP code). **No** magic-link / new auth. |
| Trigger | **Manual CLI**, dry-run by default; a human runs `--all` on June 15. No auto-schedule. |
| Recipients | The `beta_signup` cohort (`SELECT email FROM beta_signup`). |

## Context

- Sign-in is **OTP-code based**: the web sign-in page is `src/app/auth/sign-in/page.tsx`
  → `https://ahavah.app/auth/sign-in`; it calls `POST /request-otp` (emails a code) then
  `POST /check-otp`. No magic-link mechanism exists. The announcement therefore links to that
  page; users enter their email there and get the existing one-time code.
- Reference pattern: `emails/send_waitlist_welcome.py` (dry-run default / `--only` / `--all`,
  reads `waitlist_signup`, skips `@example.com`) and `emails/waitlist_welcome.py` (branded shell
  via `emails/base.py`). The beta batch mirrors both.
- `beta_signup` is currently empty (test rows cleaned); it fills as users opt in before June 15.

## Architecture

Two new files in `ahavah-api`, no other changes.

### 1. `emails/beta_launch.py` — the announcement email

- Constants: `SIGN_IN_URL = "https://ahavah.app/auth/sign-in"`,
  `SUBJECT = "Ahavah beta is open"`, `FROM_ADDR = f"hello@{EMAIL_DOMAIN}"`, a preheader.
- `beta_launch_html()` → branded HTML via `emails.base.render(...)` using the existing helpers
  (`chip`, `button`, `callout`, tokens), copy: the beta has launched; **"Open Ahavah"** lime CTA
  (`button(..., SIGN_IN_URL, variant="lime")`) → the sign-in page; a line explaining the flow
  ("Enter your email and we'll send you a one-time code to sign in."). Canonical footer.
- `send_beta_launch(email)` — synchronous; early-returns for falsy / `@example.com`; calls
  `aws_smtp.send(subject=SUBJECT, body=beta_launch_html(), to_addr=email, from_addr=FROM_ADDR)`.
  (Best-effort: `aws_smtp` retries then gives up without raising.)
- No async helper needed (the CLI is synchronous/sequential).

### 2. `emails/send_beta_launch.py` — the CLI (mirrors `send_waitlist_welcome.py`)

- `recipients()` → `SELECT email FROM beta_signup ORDER BY created_at` (via `api_tx`).
- `main()` with argparse:
  - default (no args): **DRY RUN** — print the recipient list + count, send nothing.
  - `--only EMAIL`: send a single test.
  - `--all`: iterate recipients, skip `@example.com` (print "skip"), `send_beta_launch(e)` each,
    print a sent/skipped tally.
- Module docstring documents the `docker exec ahavah-api-api-1 python -m emails.send_beta_launch`
  invocations.

## Run procedure (June 15, after confirming the app is live)

```bash
docker exec ahavah-api-api-1 python -m emails.send_beta_launch                        # dry run
docker exec ahavah-api-api-1 python -m emails.send_beta_launch --only admin@techbaseltd.com  # test
docker exec ahavah-api-api-1 python -m emails.send_beta_launch --all                  # send to cohort
```

## Safety / error handling

- **Dry-run is the default** so an accidental invocation never sends mail.
- `@example.com` addresses are skipped (so leftover test rows can't be mailed).
- Sends are best-effort; a Resend failure prints a traceback line but does not abort the batch
  (the CLI continues to the next recipient — matches the waitlist batch behaviour).
- The irreversible bulk `--all` is entirely human-gated; nothing is scheduled or automated.

## Testing & verification

- Harness: `python -c "from emails.beta_launch import beta_launch_html; ..."` confirms the template
  renders + contains the sign-in URL; `import emails.send_beta_launch` confirms the CLI imports.
- A live `--only admin@techbaseltd.com` is the deliverability check (operator-run, optional).
- No automated test (one-off ops CLI; matches `send_waitlist_welcome.py`, which has none).

## Out of scope

- Magic-link / one-click auth (a separate, larger feature).
- Auto-scheduling the send; the launch itself; sign-in/launch readiness.
- Any web or DB change.

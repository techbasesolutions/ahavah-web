# Waitlist Capture Form — Design Spec

> **Status: APPROVED 2026-05-20.** Source: user request (adjusted from the
> earlier "waitlist magic-link" ask). Spans `ahavah-web` (landing + new
> `/waitlist` page) and `ahavah-api` (storage + endpoint).
>
> Original ask: "When users provide their email on the landing page, use it
> to prefill a form (email, gender, country+state, self-identification
> multi-select, looking-for multi-select [courtship & marriage / partner
> willing to relocate / additional wife (men) / join an existing household
> (women) / wants children / doesn't want children], ethnicity, nationality,
> referral source). Store as a partial onboarding (carry over fields that
> apply) so users can receive a magic link when the app is ready to launch."

## Scope (confirmed)

- **Form placement:** dedicated `/waitlist` page, email prefilled from the
  landing capture.
- **Storage:** new backend `waitlist_signup` table + `POST /waitlist`.
- **Magic-link:** capture + store NOW in onboarding-shaped form; the link
  send + redeem (+ onboarding prefill on signup) is DEFERRED to launch.
- **"Looking for" mapping:** the user's grouped list maps to THREE distinct
  onboarding fields (`intent`, `family`, relocation) so it carries over 1:1;
  the page may present them as one visually-grouped section.

## Current state

`src/app/page.tsx` already captures an email in a `#waitlist` section, but
the submit handler is a stub: a 400ms fake delay, `localStorage`/
`sessionStorage` write (`ahavah.waitlist.email`, `PENDING_EMAIL_KEY`), and a
success message. Nothing is persisted server-side and no extra fields are
collected. This feature replaces the stub behavior: persist to the backend
and route to the fuller form.

## Fields + onboarding mapping

All option sets reuse the canonical onboarding definitions (no new lists):

| Field | Type | Onboarding target | Option source |
|---|---|---|---|
| email | prefilled, editable, validated | waitlist key | landing |
| gender | single (male/female) | `sex` | drives conditional options |
| country | select | `country` | existing country step list |
| state/region | text | region | free text |
| self-identification | MULTI | `assembly` (array) | `IDENTIFICATION_TERMS` / `ASSEMBLIES` (12 terms) |
| looking for | MULTI, gender-conditional | `intent` | `intentOptionsForSex(sex)` — male: first-wife, additional-wife, courtship, marriage-only, long-distance-courtship, local-only; female: unmarried-man, married-man, courtship, marriage-only, open-to-relocation, local-only |
| partner willing to relocate | toggle | folds into intent | male `long-distance-courtship` / female `open-to-relocation` |
| children | single | `family` | `FAMILY_VIEWS` subset: wants-children, does-not-want, open-to-more, has-children |
| ethnicity | select | `ethnicity` | `ETHNICITIES` |
| nationality | select | `nationality` | `NATIONALITIES` |
| referral source | select + optional text | waitlist-only (no onboarding field) | small fixed list ("Friend or family", "Social media", "Search", "Assembly/congregation", "Other") |

Semantic notes:
- "Additional wife (men)" = male intent `additional-wife`. "Join an existing
  household (women)" = female intent `married-man`. "Courtship & marriage" =
  intent `courtship` + `marriage-only`.
- Gender is required and rendered before "looking for" so the conditional
  option set resolves. If gender changes, prune any selected intents not in
  the new gender's set.

## Backend (`ahavah-api`)

### Migration `migrations/0017_waitlist_signup.sql` (idempotent)
```sql
BEGIN;
CREATE TABLE IF NOT EXISTS waitlist_signup (
  email       TEXT         PRIMARY KEY,
  answers     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMIT;
```
`email` is the natural key (lower-cased, trimmed before insert). `answers`
holds the onboarding-shaped payload: `{sex, country, region, assembly: [],
intent: [], relocate_willing: bool, family, ethnicity, nationality,
referral_source, referral_other}`.

### Endpoint — new `service/api/waitlist_routes.py` (sibling-module pattern)
- `POST /waitlist` — public (no auth; pre-signup users). Body: `{email,
  answers}` (or flat fields). Validate email shape; lower-case + trim.
  Upsert: `INSERT ... ON CONFLICT (email) DO UPDATE SET answers = EXCLUDED.
  answers, updated_at = NOW()`. Returns `{ok: true}`. Rate-limit with the
  existing limiter infra (same pattern as `shared_otp_limit`) keyed by IP to
  deter abuse. Reject oversized payloads.
- Logic in `service/waitlist/__init__.py` (`upsert(tx, email, answers)`),
  route thin (mirrors the reactions/notifications split).

Register via `import service.api.waitlist_routes` at the bottom of
`service/api/__init__.py` (sibling pattern, avoids the brittle top import).

## Frontend (`ahavah-web`)

### Landing (`src/app/page.tsx`)
Replace the stub submit: on valid email, `POST /waitlist {email}` (creates
the row early so we capture even partial interest), persist email to
`sessionStorage` (`PENDING_EMAIL_KEY`, already used), then route to
`/waitlist`. Keep graceful failure (still route even if the pre-create POST
fails; the form submit will create the row).

### New page `src/app/waitlist/page.tsx`
- Reads prefilled email from `sessionStorage`/query; editable.
- Renders the fields above using KIT primitives only (reuse the onboarding
  field components / `Select`, multi-select pill pattern, `Input`). Mirror
  the onboarding option sets via the shared schema modules — do NOT hardcode
  lists.
- Gender-conditional "looking for" via `intentOptionsForSex`.
- On submit: `POST /waitlist {email, answers}` (full payload), show
  confirmation ("You're on the list. We'll email you a sign-in link when we
  launch."). No em-dashes in copy.
- Public route (no auth gate).

## Deferred to launch (NOT built now)
- Magic-link mint + email send (batch at launch).
- Link redeem -> account creation -> onboarding prefill from `answers`.
- Admin export/count of the waitlist.
The JSONB is intentionally onboarding-shaped so these are a clean follow-up.

## Verification
- Backend: `tests/test_waitlist.py` — insert, update-on-resubmit (upsert),
  email validation/normalization; migration 0017 idempotent. Run in the
  docker harness (see `reference_ahavah_windows_test_harness`).
- Frontend: `tsc` + `eslint` clean. The `/waitlist` page is PUBLIC (not
  auth-gated), so it can be loaded in a headless browser to confirm it
  renders + the gender-conditional options switch.

## Working-rule compliance
- Plan-before-code; kit primitives only; idempotent migration; stage files
  by name; no em-dashes in user copy; no fabricated option lists (reuse
  schema modules); deploy via push.

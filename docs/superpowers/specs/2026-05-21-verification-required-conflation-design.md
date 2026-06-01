# Fix: verification_required Conflation — Design Spec

> **Status: APPROVED 2026-05-21** ("Full fix"). Fixes a real, user-facing bug
> in `ahavah-api` + `ahavah-web`.

## The bug (root-caused)

`person.verification_required` (BOOLEAN) is **overloaded** with two unrelated
meanings:

1. **Anti-abuse / location flag** — set TRUE by the bot-report rule
   (`antiabuse/sql/__init__.py:250`) and the location rule
   (`service/person/__init__.py:1438`). Read by:
   - the **chat send-gate** (`service/chat/verification`): blocks a sender
     with `verification_required AND verification_level_id <= 1`.
   - the **global search hide** (`service/person/sql/__init__.py:3401`):
     `NOT prospect.verification_required OR verification_level_id > 1` hides
     flagged-unverified accounts from results.
   - moderation report severity (`service/moderation`).
2. **User privacy preference "Require verified matches"** — the
   `settings/privacy` toggle (`requireVerifiedMatches`) maps to the SAME
   column via `use-profile.ts` (`verification_required: "Yes"/"No"`), written
   by `service/person/__init__.py:1512`.

**Consequence:** a user who enables "Require verified matches" sets their own
`verification_required = TRUE`, which then (a) **blocks their own messaging**
(chat gate) and (b) **hides them from search** — neither is the intent. (This
is what blocked Ehud.)

**Note:** the feed filter itself is fine and unaffected — `verified_only` is
driven by a **query param** (`request.args.get('verified_only')`), which the
frontend sets from `filters.verifiedOnly || userProfile.requireVerifiedMatches`
(`discover/page.tsx`, `map/page.tsx`). So the preference correctly filters the
feed; it just must stop *also* writing the overloaded anti-abuse column.

## The fix (separate the preference from the flag)

Back the privacy preference with a NEW column; leave `verification_required`
as the anti-abuse/location flag only. **No change to the search-feed SQL, the
chat gate, the global hide, the location rule, or anti-abuse** — they keep
using `verification_required`.

### Backend (`ahavah-api`)
1. **Migration `0018_require_verified_prospects.sql`** (idempotent):
   `ALTER TABLE person ADD COLUMN IF NOT EXISTS require_verified_prospects
   BOOLEAN NOT NULL DEFAULT FALSE;`
2. **Profile setter** (`service/person/__init__.py:1512`, `field_name ==
   'verification_required'`): write `require_verified_prospects` instead of
   `verification_required` (keep the inbound field name for frontend
   compatibility; only the target column changes).
3. **Profile-info reads** that surface the privacy setting to the frontend
   (`service/person/sql/__init__.py` ~455 / ~484 — the person/profile-info
   reads, NOT the onboardee one) return `require_verified_prospects` AS the
   value the frontend consumes for `requireVerifiedMatches`. Confirm each of
   the three read sites (434/455/484) during implementation: repoint the
   one(s) feeding the live profile/settings read; leave any onboardee-only
   read as-is.
4. **Untouched:** `verification_required` stays the column for the chat gate,
   the global search hide (3401), the location rule (1438), anti-abuse (250),
   and the moderation read.

### Frontend (`ahavah-web`)
- No change required IF the backend keeps the inbound/outbound field name
  `verification_required` (the frontend's `requireVerifiedMatches` <->
  `verification_required` field mapping in `use-profile.ts` is preserved; only
  the backend column behind it changes). Verify the round-trip after the
  backend change; adjust only if a field name actually changed.

### Data
Pre-launch (waitlist phase; only test accounts exist), so **no backfill** —
`require_verified_prospects` starts FALSE (default). Test accounts re-toggle
if wanted. Existing `verification_required` flags stay intact for anti-abuse.
(Ehud's flag was already cleared during debugging.)

## Verification
- Backend: `tests/test_verification_pref.py` in the harness — the profile
  setter writes `require_verified_prospects` (not `verification_required`);
  toggling the preference leaves `verification_required` untouched (so the
  chat gate is NOT triggered). Migration 0018 idempotent. `import service.api`
  OK.
- Frontend: `tsc` + `eslint` + `next build`.
- Post-deploy: confirm an unverified account with the preference ON can still
  send a message (the original bug). Smoke `GET`/`PATCH` profile-info round-
  trips the setting.

## Working-rule compliance
Plan-before-code (this spec + plan, approved); idempotent migration; stage by
name; sibling-safe (no new top-level imports); deploy via push + verify;
no change to the high-risk search-feed SQL.

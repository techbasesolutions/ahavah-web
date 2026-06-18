# Truncated Profile for Hidden Members — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** When a stranger opens a profile hidden only by `hide_me_from_strangers`, show a truncated profile (primary photo, name + age, verified badge, "Looking for", Like) instead of the "unavailable" screen. Deactivated / passed-you / blocked / verification-gated stay "unavailable".

**Architecture:** Backend adds a fallback limited query so the profile-detail endpoint returns a small object with `limited: true` when (and only when) the sole barrier is `hide_me_from_strangers`. Frontend renders a dedicated truncated view on that flag.

**Tech Stack:** Flask + psycopg (ahavah-api); Next 16 + React 19 (ahavah-web).

---

## Confirmed spec (from user, 2026-06-18)

- **Show:** primary photo (single, no gallery), name + age (respect `show_my_age`), verified badge (if verified), "Looking for" intent.
- **Hide:** location, About/Languages/Faith/Doctrine/Lifestyle/Interests/Personality, compatibility, gallery, audio.
- **Banner:** "This member keeps a private profile. Full details unlock when you match."
- **Interactions:** Like allowed; Message disabled until matched (unchanged).
- **Scope:** `hide_me_from_strangers` ONLY. All other 404 causes keep the "unavailable" state (A).

---

## Task 1 — Backend: limited fallback query

**Files:**
- Modify: `service/person/sql/__init__.py` (add `Q_SELECT_PROSPECT_PROFILE_LIMITED`)
- Modify: `service/person/__init__.py` (`get_prospect_profile`)

- [ ] **Add `Q_SELECT_PROSPECT_PROFILE_LIMITED`** — returns a small `j` for a prospect that *would* be visible except for `hide_me_from_strangers`. WHERE: `uuid` match AND `activated` AND `hide_me_from_strangers` AND NOT messaged-the-viewer AND NOT EXISTS(skipped subject=prospect,object=viewer) AND `privacy_verification_level_id <= viewer level` AND viewer signed in. `j` keys: `uuid`, `name`, `age` (gated on `show_my_age`), `profile_photo_uuid` (position=1 approved photo), `verified` (match the field the full profile's Verified badge uses), `intent`/"looking for" (match the full profile's source field), `limited: true`.

- [ ] **In `get_prospect_profile`:** after the full query returns no usable row, run the limited query in the same `api_tx`. If it returns a row with `j`, return that object (already carries `limited: true`). Otherwise keep the existing `'', 404`. Do NOT run the limited fallback for anonymous viewers (`s is None`) — strangers-with-link stay 404 when logged out.

- [ ] **Verify:** the full-profile path is untouched (existing visible profiles still return full); only the previously-404 hide case now returns the limited object. Confirm columns exist by matching the full query's own field sources.

## Task 2 — Frontend: truncated profile view

**Files:**
- Create: `src/components/app/truncated-profile.tsx`
- Modify: `src/app/profile/[uuid]/page.tsx` (branch on `limited`)
- Modify: profile adapter (`adaptProspect`) to pass through `limited`

- [ ] **`adaptProspect`**: surface `limited?: boolean` on the adapted profile.

- [ ] **`TruncatedProfile` component** (kit primitives only): PhotoTile (single primary photo), name + age header, ShieldCheck verified pill if verified, a "Looking for" Pill/line, a private-profile banner (Card/Item with the confirmed copy), and the existing Like button (reuse the page's `decide('like')` path). No message button, no gallery, no detail sections.

- [ ] **Page branch:** in `ProfileDetailPage`, when `profile.limited` is true, render `<TruncatedProfile>` inside the normal `PageShell` (NOT `EdgeStateShell` — this is a real profile, not a dead-end). The `!profile` 404 branch keeps the A "unavailable" state.

- [ ] **Design pass:** run the truncated layout through frontend-design using existing tokens; it must read as a real (if sparse) profile, on-brand in light + dark.

## Task 3 — Verification

- [ ] **Render-verify** the truncated view via an isolated preview route: light + dark, mobile + desktop. Confirm only the four basics + banner + Like show.
- [ ] **Typecheck + lint** both repos clean.
- [ ] **Deploy** FE (push `master`) + BE (push `ahavah/main`); confirm BE health gate passes.
- [ ] **Prod sanity (requires user OK for a prod read):** as a non-matched viewer, the endpoint for a `hide_me_from_strangers` uuid returns `limited: true` with only the basic fields; a deactivated/passed-you uuid still 404s.

---

## Risk notes
- The backend change is additive (a fallback query), so the full-profile path and the other 404 causes are unchanged — lowest-risk way to soften only the hide case.
- Showing the primary photo to a link-holder is the user's explicit choice; location is deliberately excluded.

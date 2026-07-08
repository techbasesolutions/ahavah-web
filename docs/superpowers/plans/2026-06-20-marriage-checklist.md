# Biblical Marriage Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, multi-step "Biblical Marriage Checklist" web activity that emails a personalized summary to a respondent and their spouse, captures the respondent as a distinct non-dating lead, and stores no answers.

**Architecture:** `ahavah-api` (Flask + sync psycopg + PostgreSQL) gains an OTP source tag, a qualified `marriage_checklist` lead, a stateless send endpoint, and a results email template. `ahavah-web` (Next.js 16) gains an SSG SEO route with a client stepper that collects importance + stance per curated obligation and posts to the API. UI is transcribed from a Claude Design export.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 (web); Flask + psycopg + Resend via `aws_smtp` (api); existing email OTP; no new auth provider.

## Global Constraints

- **No em dashes in ANY customer-facing string** (obligations, verses, UI, emails, SEO metadata). Periods, commas, or restructure. Hard gate.
- **No answer persistence.** Checklist answers never touch a table or a log line. Emails masked in logs via `emails.base.mask_email`.
- **Read `node_modules/next/dist/docs/` before non-trivial Next 16 APIs** (route handlers, metadata, dynamic params). Per `ahavah-web/AGENTS.md`.
- **Web UI uses existing kit primitives + design tokens only.** No new visual system. Transcribe the Claude Design export; do not hand-roll.
- **Commits:** `admin@techbaseltd.com`, trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. api deploys on push to `ahavah/main`, web on push to `master`.
- **Curated copy is grounded** in scripture already referenced on the site. No new doctrine.

## File Structure

**ahavah-api**
- `migrations/00XX_add_person_lead_source.sql` (create) — `lead_source` column.
- `service/person/__init__.py` (modify) — OTP creation stamps `lead_source`; search/lifecycle exclusion helper.
- `service/search/sql/__init__.py` (modify) — exclude `marriage_checklist` leads from the candidate pool.
- `emails/marriage_checklist.py` (create) — results email template on `emails.base.render`.
- `service/api/__init__.py` (modify) — `POST /marriage-checklist/send` route.
- `service/marriage_checklist/__init__.py` (create) — send logic (compose + send, no storage).
- `test/` (create tests per task).

**ahavah-web**
- `src/app/marriage-checklist/page.tsx` (create) — server component, metadata + JSON-LD.
- `src/app/marriage-checklist/content.ts` (create) — typed curated obligations + shared types.
- `src/components/app/marriage-checklist/` (create) — client stepper + step components (transcribed).
- `src/lib/marriage-checklist.ts` (create) — client send helper + answer types.
- `src/app/sitemap.ts` (modify) — add the slug.
- `src/components/app/marketing-footer.tsx` (modify) — internal link.

---

## Phase A — ahavah-api (buildable now, independent of the design export)

### Task A1: Migration — `person.lead_source`

**Files:**
- Create: `ahavah-api/migrations/00XX_add_person_lead_source.sql` (use the next free migration number; check `ls migrations/`).

**Interfaces:**
- Produces: `person.lead_source TEXT NULL` — read/written by A2, A3.

- [ ] **Step 1: Write the migration**

```sql
-- Distinguishes acquisition source. NULL = existing/organic app leads.
-- 'marriage_checklist' = created by the public checklist activity (non-dating).
ALTER TABLE person ADD COLUMN IF NOT EXISTS lead_source TEXT;
CREATE INDEX IF NOT EXISTS person_lead_source_idx ON person (lead_source) WHERE lead_source IS NOT NULL;
```

- [ ] **Step 2: Verify idempotency** — re-running the file must not error (uses `IF NOT EXISTS`). Apply locally against `duo_api` and re-apply once.

Run: `docker exec ahavah-api-postgres-1 psql -U postgres -d duo_api -f /tmp/migration.sql` (twice)
Expected: `ALTER TABLE` / `CREATE INDEX` then no-op on the second run, no error.

- [ ] **Step 3: Commit**

```bash
git add migrations/00XX_add_person_lead_source.sql
git commit -m "feat(db): add person.lead_source for qualified leads"
```

### Task A2: OTP creation stamps `lead_source`

**Files:**
- Modify: `service/person/__init__.py` (the function that creates a person on OTP verify — find via `grep -n "def .*otp\|INSERT INTO person\|is_new_account" service/person/__init__.py`).
- Test: `ahavah-api/test/test_marriage_checklist_lead.py` (create).

**Interfaces:**
- Consumes: `person.lead_source` (A1).
- Produces: OTP verify accepts optional `source: str | None`; when it INSERTs a NEW person, sets `lead_source = source` (only 'marriage_checklist' is passed by this feature). Existing persons are never downgraded.

- [ ] **Step 1: Write the failing test** (behavioral: a new person created with source is tagged; an existing person is untouched)

```python
# test/test_marriage_checklist_lead.py
from service.person import create_or_get_person_for_otp  # adjust to the real symbol found by grep

def test_new_person_gets_lead_source(db):
    p = create_or_get_person_for_otp(email="new-mc@example.com", source="marriage_checklist")
    row = db.query("SELECT lead_source FROM person WHERE id=%s", [p.id])
    assert row["lead_source"] == "marriage_checklist"

def test_existing_person_source_not_overwritten(db):
    # seed an organic person (lead_source NULL)
    existing = create_or_get_person_for_otp(email="organic@example.com", source=None)
    again = create_or_get_person_for_otp(email="organic@example.com", source="marriage_checklist")
    row = db.query("SELECT lead_source FROM person WHERE id=%s", [again.id])
    assert row["lead_source"] is None  # not downgraded
```

- [ ] **Step 2: Run it, confirm it fails** (`source` param does not exist yet).

Run: `docker exec ahavah-api-api-1 python -m pytest test/test_marriage_checklist_lead.py -v`
Expected: FAIL (unexpected kwarg `source` or column unset).

- [ ] **Step 3: Implement** — read the person-creation function, thread an optional `source` param through `request-otp` / `check-otp` to it, and set `lead_source` ONLY in the INSERT branch (new person), not the UPDATE/return-existing branch. Keep the existing signature backward compatible (`source=None` default).

- [ ] **Step 4: Run tests, confirm pass.**

- [ ] **Step 5: Commit** — `feat(otp): thread lead source into person creation`.

### Task A3: Exclude `marriage_checklist` leads from dating surfaces

**Files:**
- Modify: `service/search/sql/__init__.py` (the `Q_UNCACHED_SEARCH_2` / `Q_CACHED_SEARCH` candidate queries).
- Modify: the dating lifecycle/re-engagement email selection SQL (find via `grep -rn "reengagement\|lifecycle" service --include=*.py` and `emails/base.py suppressed_sql_pattern`).
- Test: `test/test_marriage_checklist_lead.py` (extend).

**Interfaces:**
- Consumes: `person.lead_source` (A1).
- Produces: candidate + lifecycle SELECTs gain `AND (p.lead_source IS DISTINCT FROM 'marriage_checklist')`.

- [ ] **Step 1: Write the failing test** — a `marriage_checklist` person does not appear in search candidates.

```python
def test_checklist_lead_excluded_from_search(db, search):
    create_or_get_person_for_otp(email="mc-search@example.com", source="marriage_checklist")
    results = search.candidates(for_viewer=some_viewer)  # adjust to the real search entrypoint
    assert not any(r.email == "mc-search@example.com" for r in results)
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement** — add `AND (p.lead_source IS DISTINCT FROM 'marriage_checklist')` to the candidate queries (both cached + uncached, mirroring the existing `activated` / `hide_me_from_strangers` lines) and to the dating lifecycle-email selection.

- [ ] **Step 4: Run tests, confirm pass.**

- [ ] **Step 5: Commit** — `feat(search): exclude marriage_checklist leads from the dating pool`.

### Task A4: Results email template

**Files:**
- Create: `emails/marriage_checklist.py` (mirror `emails/reengagement.py` structure: `render`, `button`, `chip`, `callout` from `emails.base`).
- Test: `test/test_marriage_checklist_email.py` (create).

**Interfaces:**
- Consumes: `emails.base.render`, `chip`, `button`, `callout`, tokens.
- Produces: `checklist_results_html(name: str | None, answers: list[Answer]) -> str` and `send_checklist_results(to_email: str, name: str | None, answers: list[Answer], is_spouse_copy: bool) -> str | None`. `Answer` is a dict: `{section, role, title, verse, importance, stance, comment}`.

- [ ] **Step 1: Write the failing test** — the HTML contains the brand shell, groups answers by section, shows importance + stance, and has NO em dash.

```python
from emails.marriage_checklist import checklist_results_html

def test_results_html_brand_and_no_emdash():
    answers = [{"section":"biblical","role":"husband","title":"Provide for the household",
                "verse":"1 Timothy 5:8","importance":5,"stance":"agree","comment":""}]
    html = checklist_results_html("Ruth", answers)
    assert "logo-horizontal.png" in html          # canonical brand shell
    assert "Provide for the household" in html
    assert "—" not in html                    # NO em dash anywhere
    assert "5" in html and "Agree" in html
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement** — build `checklist_results_html` on `emails.base.render` (header logo, sectioned summary rows of title + importance + stance + comment, the referral CTA button to `https://ahavah.app`, footer). Add `send_checklist_results` using `aws_smtp.send(subject="Your marriage checklist results", body=..., to_addr=..., reply_to="admin@ahavah.app")`. Suppress sample addresses via `is_suppressed_send`. Zero em dashes in all strings.

- [ ] **Step 4: Run tests, confirm pass.**

- [ ] **Step 5: Commit** — `feat(email): marriage checklist results template`.

### Task A5: `POST /marriage-checklist/send` endpoint (stateless)

**Files:**
- Create: `service/marriage_checklist/__init__.py` — `send(session, spouse_email, answers)` compose + dispatch, NO DB write.
- Modify: `service/api/__init__.py` — add the authenticated route (mirror an existing `@apost` route).
- Test: `test/test_marriage_checklist_send.py` (create).

**Interfaces:**
- Consumes: A4 `send_checklist_results`; the auth/session decorator used by other `@apost` routes.
- Produces: `POST /marriage-checklist/send { spouse_email: str, answers: Answer[] }` -> `{ sent: true }`; sends to the authed user's email AND `spouse_email`; validates `spouse_email`; rate-limited; persists nothing.

- [ ] **Step 1: Write the failing test** — posting valid answers sends two emails and writes no row.

```python
def test_send_emails_both_and_stores_nothing(client, authed_session, monkeypatch):
    sent = []
    monkeypatch.setattr("service.marriage_checklist.send_checklist_results",
                        lambda **kw: sent.append(kw))
    resp = client.post("/marriage-checklist/send", json={
        "spouse_email": "spouse@example.com",
        "answers": [{"section":"biblical","title":"x","importance":3,"stance":"agree"}],
    }, headers=authed_session)
    assert resp.status_code == 200 and resp.json["sent"] is True
    assert {s["to_email"] for s in sent} == {authed_session_email, "spouse@example.com"}
    # no answers table exists -> nothing to assert stored; assert no INSERT was issued (spy the tx)
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Implement** — the route reads the authed user's email from the session, validates `spouse_email` (basic RFC check), caps `answers` length, calls `send_checklist_results` for both recipients (fire the spouse copy with `is_spouse_copy=True`), returns `{sent: true}`. No table touched. Fire-and-forget threading acceptable per the existing email dispatch pattern.

- [ ] **Step 4: Run tests, confirm pass.**

- [ ] **Step 5: Commit** — `feat(api): stateless marriage-checklist send endpoint`.

### Task A6: Deploy + verify backend

- [ ] Push `ahavah/main`; watch GHA green (force-recreate is in the pipeline).
- [ ] Verify migration applied: `docker exec ahavah-api-postgres-1 psql -U postgres -d duo_api -c "\d person" | grep lead_source`.
- [ ] Container reflects new code: `docker exec ahavah-api-api-1 python -c "from emails.marriage_checklist import checklist_results_html; print('ok')"`.
- [ ] Send a test to a real inbox (with authorization) and view the rendered email (no em dash, on-brand).

---

## Phase B — ahavah-web (content/logic now; UI transcription gated on the Claude Design export)

### Task B1: Content model + curated obligations

**Files:**
- Create: `src/app/marriage-checklist/content.ts`.

**Interfaces:**
- Produces: `type Obligation`, `type Answer`, `type Stance`, and `OBLIGATIONS: Obligation[]` (curated, grounded, no em dashes). Consumed by B2, B3, B4, B7.

- [ ] **Step 1: Write the types + curated set**

```ts
export type Stance = "agree" | "disagree" | "other";
export type Section = "biblical" | "nice-to-have" | "challenge";
export type Obligation = {
  id: string; section: Section; role?: "husband" | "wife";
  title: string; verse?: string; explanation: string; example?: string;
  suggestedFrequency?: "daily" | "weekly" | "monthly" | "yearly";
};
export type Answer = {
  obligationId: string; title: string; section: Section; role?: "husband" | "wife";
  verse?: string; importance: 1 | 2 | 3 | 4 | 5; stance: Stance; comment?: string;
};
export const OBLIGATIONS: Obligation[] = [ /* 4-6 per role + nice-to-haves + challenges, drafted, no em dashes */ ];
```

- [ ] **Step 2: Draft the curated obligations** — husband + wife biblical obligations with verse + one-line explanation + practical example (grounded in scripture already on the site), plus a handful of nice-to-haves and challenges prompts. Re-read every string for em dashes.

- [ ] **Step 3: `tsc` clean.** Run: `npx tsc --noEmit`.

- [ ] **Step 4: Commit** — `feat(marriage-checklist): content model + curated obligations`.

### Task B2: SEO route (server component)

**Files:**
- Create: `src/app/marriage-checklist/page.tsx`.

**Interfaces:**
- Consumes: B1 `OBLIGATIONS`, the client stepper (B3). Produces: the public route with `metadata`, `WebPage` + `BreadcrumbList` + `HowTo` JSON-LD.

- [ ] **Step 1: Read** `node_modules/next/dist/docs/` for metadata + JSON-LD patterns; mirror an existing SEO landing page (`src/app/messianic-matchmaking/page.tsx` if present, else `src/app/faq/page.tsx`).
- [ ] **Step 2: Implement** the server component: `export const metadata` (unique title/description, `alternates.canonical: "/marriage-checklist"`, openGraph), inline JSON-LD scripts (WebPage/BreadcrumbList/HowTo), then render the client stepper. No em dashes in metadata.
- [ ] **Step 3: `tsc` + `next build` clean.**
- [ ] **Step 4: Commit** — `feat(marriage-checklist): SEO route + JSON-LD`.

### Task B3: Client stepper shell + state

**Files:**
- Create: `src/components/app/marriage-checklist/checklist-stepper.tsx` (client).
- Create: `src/lib/marriage-checklist.ts` — `sendResults(spouseEmail, answers)` posting to the API; re-export `Answer`.

**Interfaces:**
- Consumes: B1 types + `OBLIGATIONS`, A5 endpoint.
- Produces: `<ChecklistStepper />` owning step index + `answers` map in React state (never persisted), progress, and the send call.

- [ ] **Step 1: Implement** the state machine (intro -> obligations per section -> add-your-own -> summary -> gate -> done), `answers` in `useState`, progress derived. `sendResults` POSTs `{spouse_email, answers}` to `${NEXT_PUBLIC_API_BASE_URL}/marriage-checklist/send` with the OTP session.
- [ ] **Step 2: `tsc` clean.**
- [ ] **Step 3: Commit** — `feat(marriage-checklist): stepper state + send helper`.

### Task B4: Obligation step UI (transcribe from export)

**Files:**
- Create: `src/components/app/marriage-checklist/obligation-step.tsx` (client).

**Interfaces:** Consumes B1 `Obligation`, reports an `Answer` up to B3.

- [ ] **Step 1:** When the Claude Design export lands, transcribe the "obligation step" surface into kit primitives + tokens: verse + explanation + example callout, the 1-to-5 importance control, the Agree/Disagree/Other pills, the comment field, progress, Back/Next. No raw arbitrary Tailwind values (respect the design-system eslint rule); no hand-rolled markup.
- [ ] **Step 2: Verify by rendered screenshot** at 390 and desktop, matched against the export frame (per verify-rendered-pixels). No em dashes.
- [ ] **Step 3: `tsc` + `eslint` clean. Commit** — `feat(marriage-checklist): obligation step UI`.

### Task B5: Section transitions + add-your-own (transcribe)

**Files:** Create `.../section-transition.tsx`, `.../add-your-own.tsx`.

- [ ] Transcribe both surfaces from the export; wire add-your-own to append a custom `Answer`. Screenshot-verify. `tsc`/`eslint` clean. Commit.

### Task B6: Summary card (transcribe)

**Files:** Create `.../summary-card.tsx`.

- [ ] Transcribe the summary/keepsake surface; render top-importance items + stances by section from `answers`. Screenshot-verify. Commit.

### Task B7: Gate (OTP + spouse email) + send

**Files:** Create `.../gate.tsx`.

**Interfaces:** Consumes existing OTP (`src/lib/auth-otp.ts` `requestEmailOtp`/`checkOtp`, `CodeInput`), passing `source: "marriage_checklist"`; then B3 `sendResults`.

- [ ] **Step 1: Implement** email input -> `requestEmailOtp(email, {source:"marriage_checklist"})` -> `CodeInput` -> `checkOtp` -> spouse email input -> `sendResults`. Reuse the verify-email error handling patterns. Transcribe the visual from the export.
- [ ] **Step 2: Verify** the OTP verify creates a `marriage_checklist`-tagged lead (direct DB check), and both emails arrive.
- [ ] **Step 3:** Screenshot-verify, `tsc`/`eslint` clean. Commit — `feat(marriage-checklist): OTP gate + send`.

### Task B8: Done + referral CTA (transcribe)

**Files:** Create `.../done.tsx`.

- [ ] Transcribe the confirmation surface; referral CTA ("Know someone seeking a Torah-observant spouse? Share Ahavah"), NOT a dating signup CTA. No em dashes. Screenshot-verify. Commit.

### Task B9: SEO plumbing

**Files:** Modify `src/app/sitemap.ts`, `src/components/app/marketing-footer.tsx`.

- [ ] Add `/marriage-checklist` to `sitemap.ts` (priority 0.7, monthly). Add a footer link. Note the resources hub started, in the Phase-2 SEO plan doc. `tsc`/`build` clean. Commit.

### Task B10: End-to-end verification (gate before done)

- [ ] `tsc` + `next build` clean (rerun `tsc` after build).
- [ ] Full walk on a preview/live: complete the activity, OTP verify with a test email, confirm BOTH emails arrive, render on-brand, no em dashes.
- [ ] DB check: the lead exists with `lead_source = 'marriage_checklist'` and is absent from discover/search.
- [ ] Live curl of `/marriage-checklist`: unique title, canonical, JSON-LD present; sitemap lists it; footer link resolves.

---

## Self-Review

- **Spec coverage:** OTP gate (B7/A2), qualified lead (A2/A3), no-storage send (A5), results email (A4), curated content + importance + stance (B1/B4), multi-step flow (B3-B8), SEO (B2/B9), no-em-dash rule (Global + per-task), spouse email (A5/B7). Covered.
- **Placeholder scan:** UI tasks (B4-B6, B8) reference the export rather than final JSX; this is a real external dependency, not a placeholder. Their logic contracts (Answer in/out) are fixed by B1/B3. Backend tasks carry real code/tests.
- **Type consistency:** `Answer` shape is identical in B1 (TS), A4/A5 (dict), and the send contract. `lead_source` value `'marriage_checklist'` is identical across A2/A3/B7.

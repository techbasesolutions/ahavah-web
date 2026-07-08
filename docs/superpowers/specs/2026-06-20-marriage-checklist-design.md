# Marriage Checklist — Interactive Activity + Qualified Lead Capture

Date: 2026-06-20
Status: Approved (design)
Scope owner: ahavah-web (activity UI + SEO) and ahavah-api (OTP source tag, qualified lead, results email)
Source content: `C:\Users\Ehud\Documents\Marriage Checklist.pdf` — a 3-section couple's obligation worksheet.
Builds on: the Phase-2 SEO content plan (`2026-05-27-seo-content-landing-pages-design.md`). This is the first asset of the "resources hub" (Sub-project B) that plan reserved for later.

## Context

The source PDF is a printable worksheet where a couple works through obligations together. For each obligation there is a verse, an explanation, a practical example, an expectation frequency (Daily / Weekly / Monthly / Yearly), and the spouse's response (Agree / Disagree / Other, with a comment for "Other"). It has three sections:

1. Biblical Obligations (Husband and Wife)
2. Nice-to-Haves
3. Challenges / Obstacles

We are turning this static worksheet into a fun, guided, multi-step web activity that also captures a qualified lead and funnels awareness of Ahavah. It targets high-intent faith-marriage search queries and is shareable between spouses.

## Goals

- A public, server-rendered, SEO-optimized activity at `/marriage-checklist` that ranks for biblical / Torah marriage queries.
- A fun, multi-step interactive flow over curated obligations, where the respondent rates each item's importance and records a stance, with an optional add-your-own.
- Email a clean personalized summary to the respondent AND their spouse.
- Capture the respondent as a lead via the existing OTP, but tagged as a distinct "marriage_checklist" lead, kept out of the dating pool and dating emails.
- Never store the checklist answers.

## Non-goals

- No two-sided realtime sync between spouses. One respondent completes it; both get the email; the spouse can complete their own separately via the same public URL.
- No compatibility percentage / alignment score (the chosen rating is per-item importance, not an aggregate score).
- No new dating-account onboarding inside this flow. The lead stays a non-dating activity lead unless the user later chooses to onboard.
- No new auth provider. We reuse the existing email OTP; no Google OAuth.

## Architecture

### ahavah-web

- **Route:** `/marriage-checklist` as a **server component** so it exports `metadata` directly and emits JSON-LD (mirrors the existing SEO landing pages). It renders a client stepper.
- **`src/app/marriage-checklist/content.ts`:** typed constant holding the curated obligations (the content model below). Copy is drafted here, grounded in already-referenced scripture, no new doctrine.
- **`src/components/app/marriage-checklist/` (client):** the stepper and its steps (intro, obligation card, section transitions, add-your-own, summary, gate, done). Built on existing kit primitives and design tokens. No new visual system.
- **OTP gate UI:** reuse the existing OTP components/flow (`src/lib/auth-otp.ts` `requestEmailOtp` / `checkOtp`, `CodeInput`), extended to pass a `source` marker.
- **Send:** after OTP verification, POST the answers + spouse email to `ahavah-api`.

### ahavah-api

- **OTP source tag:** `request-otp` / `check-otp` accept an optional `source`. When the OTP verification **creates a new person**, stamp `person.lead_source = 'marriage_checklist'`. Never downgrade an existing regular lead's source.
- **Qualified-lead exclusion:** persons with `lead_source = 'marriage_checklist'` are excluded from the discover/matching pool and from dating re-engagement/lifecycle emails, the same way `activated`/`hide_me_from_strangers` filters already work in the search SQL. They become a normal lead only if they later onboard.
- **`/marriage-checklist/send` endpoint (authenticated):** receives the answers + spouse email, composes the results email, sends to respondent + spouse via `aws_smtp` (Resend), and **does not persist the answers**.
- **`emails/marriage_checklist.py`:** the results email template, built on the canonical brand shell (`emails.base.render`).

### Data flow

Public page loads (static content) -> user steps through curated obligations, setting importance + stance + optional comment (held in client state only) -> summary -> OTP gate (email -> code -> verified, lead tagged) -> spouse email -> POST answers to `ahavah-api` -> email sent to both -> answers discarded. No answer persistence at any layer.

## The multi-step flow

0. **Intro** — what it is, the "we do not store your answers" note, Start.
1. **Section 1: Biblical Obligations** (Husband and Wife) — one obligation per step. Shows verse + explanation. User sets **importance (1 to 5)**, **stance (Agree / Disagree / Other)**, optional comment. Progress bar, smooth transitions.
2. **Section 2: Nice-to-Haves** and **Section 3: Challenges / Obstacles** — same interaction, lighter framing.
3. **Add-your-own** — optional custom items within each section.
4. **Summary** — the respondent's top priorities (highest-importance items) and stances, in a shareable card.
5. **Gate + send** — OTP sign-in (creates the tagged lead), enter spouse's email, send to both.
6. **Done** — confirmation plus a referral-flavored CTA ("Know someone seeking a Torah-observant spouse? Share Ahavah"), NOT a "sign up to date" CTA, since some respondents are married.

## Content model

```ts
type Obligation = {
  id: string;
  section: "biblical" | "nice-to-have" | "challenge";
  role?: "husband" | "wife";        // biblical section only
  title: string;                     // the obligation
  verse?: string;                    // scripture reference
  explanation: string;               // short, grounded, no new doctrine
  example?: string;                  // practical example
  suggestedFrequency?: "daily" | "weekly" | "monthly" | "yearly";
};

type Answer = {
  obligationId: string;              // or a custom item id
  importance: 1 | 2 | 3 | 4 | 5;
  stance: "agree" | "disagree" | "other";
  comment?: string;
};
```

Curated set: roughly 4 to 6 obligations per role in Section 1, plus a handful of Nice-to-Haves and Challenges prompts. I draft all copy, grounded in scripture already referenced on the site.

## Rating

Per-item **importance 1 to 5**. Surfaced in the summary and the email as "what matters most to you," so when both spouses complete it the two emails are easy to compare. No aggregate score.

## Gate and qualified lead

- Reuse the existing OTP (`request-otp` / `check-otp`), passing `source: "marriage_checklist"`.
- On new-person creation via this flow, set `person.lead_source = "marriage_checklist"`.
- Exclude these leads from the dating pool and dating emails (SQL filter alongside the existing filters).
- Add the `lead_source` column to `person` via a migration if it does not exist (nullable, default null).
- Existing app users who happen to complete the checklist keep their existing `lead_source`; we do not overwrite.

## Send, email, and no-storage

- `/marriage-checklist/send` is authenticated (the OTP session) and rate-limited.
- The results email is composed in-request from the posted answers, sent to respondent + spouse, then the payload is discarded. No table write, no logging of answer contents (mask emails in logs per `emails.base.mask_email`).
- Email content: a branded summary of the respondent's importance ratings + stances by section, plus the same referral CTA. Reply-To a monitored inbox.

## SEO fold-in

- Register `/marriage-checklist` as an SEO content asset: unique `<title>` / description / canonical, `WebPage` + `BreadcrumbList` JSON-LD, and `HowTo` (or `Quiz`) JSON-LD for the activity.
- Add the slug to `src/app/sitemap.ts` (priority 0.7, monthly).
- Internal-link it from `MarketingFooter` and the relevant landing pages so it receives link equity.
- Note in the Phase-2 SEO plan that the resources hub has started with this asset.

## Copy rules

- **No em dashes anywhere customer-facing.** Every string the respondent or spouse sees (obligations, verses, explanations, UI copy, the emails, the CTA, the SEO metadata) uses periods, commas, or restructured sentences. This is a hard gate on the copy.
- Service-and-scripture framing, no new doctrinal or scriptural assertions invented; stay grounded in what the site already publishes.
- Avoid "dating app"; use matchmaking / find a spouse / courtship, consistent with the site.

## Error handling

- OTP send/verify failures: inline recoverable errors (reuse the existing verify-email error handling patterns).
- Send-endpoint failure (Resend down): show a retry; the client still holds the answers in memory so nothing is lost mid-session.
- Invalid spouse email: client-side validation before send.
- Static content route: bad sub-paths fall through to the Next 404.

## Testing and verification (gate before done)

1. `tsc` clean and `next build` clean (rerun `tsc` after build).
2. Rendered screenshots of each step at mobile (390) and desktop, actually viewed in headless Chrome, per the verify-rendered-pixels rule. Includes the emailed result rendered (per the email render-verify recipe).
3. A real end-to-end walk: complete the activity, OTP verify with a test email, confirm both emails arrive and render on-brand with no em dashes.
4. Confirm the tagged lead is created with `lead_source = "marriage_checklist"` and does not appear in discover/search (direct DB check).
5. Post-deploy live curl of `/marriage-checklist`: unique title, canonical, JSON-LD present; sitemap lists the URL; footer link resolves (no 404).

## Deploy

- `ahavah-web`: push `master`, Vercel builds and deploys.
- `ahavah-api`: push `ahavah/main`, GHA deploy (force-recreate is in the pipeline now).
- Migration for `person.lead_source` applied by the deploy's idempotent migration step.

## Decomposition note

This is one cohesive activity but spans two repos. If the implementation plan gets unwieldy, split into: (A) ahavah-web activity UI + SEO, (B) ahavah-api OTP tag + qualified lead + send endpoint + email template. They share the content model and the send contract.

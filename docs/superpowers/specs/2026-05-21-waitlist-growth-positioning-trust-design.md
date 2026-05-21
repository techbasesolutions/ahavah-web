# Waitlist Growth, Torah-Observant Positioning & Trust Messaging — Design Spec

**Date:** 2026-05-21
**Surface:** `ahavah-web` (landing, waitlist completion, photos, community guidelines) + `ahavah-api` (waitlist count)
**Status:** Awaiting user review

## Goal

Turn the marketing feedback into concrete work across four cohesive workstreams that share one voice: grow the waitlist (real count + an in-app Instagram share moment), sharpen the Torah-observant positioning, add modesty guidance, and reassure on privacy/verification in light of recent dating-app breaches.

## Decisions (from brainstorming)

- **IG template** = in-app share card on the waitlist completion screen (not a brand-account Canva asset).
- **Count** = live `COUNT(*)` with a display floor (hide the number below the threshold).
- **Scope** = all four workstreams in one spec/plan.
- **Modesty** = guidance copy only (no automated rejection).

## Open flag for review

The provided taglines use the word **"dating"** ("Torah-observant dating for serious believers", "Not mainstream Christian dating. Not secular dating."). The current site deliberately avoids "dating" in favour of "matchmaking / find a spouse". This spec uses the taglines **verbatim** as provided. If you want "dating" softened to match the spouse/marriage framing in body copy, say so at review and the strings below change accordingly.

All user-facing strings avoid the em-dash character per project rule. Kit primitives only.

---

## Workstream 1 — Live waitlist count (with floor)

### Backend (`ahavah-api`)

- `service/waitlist/__init__.py`: add `count(tx) -> int` running `SELECT COUNT(*) AS n FROM waitlist_signup`.
- `service/api/waitlist_routes.py`: add `GET /waitlist/count` (public, unauthenticated, rate-limited by the shared limiter like `POST /waitlist`). Returns `{ "count": <int> }`.
- `tests/test_waitlist.py`: add a test that the endpoint returns the row count and increments after an upsert.

### Frontend (`ahavah-web`)

- `lib/waitlist.ts`: add `getWaitlistCount(): Promise<{ count: number }>` using `apiClient.get("/waitlist/count")`.
- New `components/app/waitlist-count.tsx` — a `useWaitlistCount()` hook (fetch on mount, swallow errors) plus a presentational `<WaitlistCount>`.
- **Floor constant** `WAITLIST_COUNT_FLOOR = 50`. Display logic:
  - `count >= FLOOR` → "Join **{count.toLocaleString()}** believers already on the list".
  - `count < FLOOR` or fetch failed → fallback copy "Be among the first." (no number shown).
- **Hero stats fix** ([`src/app/page.tsx`](../../../src/app/page.tsx) ~line 261-286): the hardcoded `"12,400+"` "on the waitlist" stat is replaced by the live count (fabricated placeholder removed). The other two stats ("63 countries", "100+ languages") stay for now but get a `// TODO`-free honest treatment: keep as aspirational copy reframed ("100+ languages", "Worldwide") OR sourced; default plan keeps "100+ languages" and changes "63 countries" to "Worldwide" to avoid a second fabricated precise number. (Confirm at review if you want all three live.)
- `/waitlist` completion screen: show the member's position as "You're **#{count}**" (the count fetched right after submit), feeding into the share card (Workstream 2).

---

## Workstream 2 — In-app Instagram share card

On the `/waitlist` completion screen ("You're on the list"), add a branded share moment. New `components/app/waitlist-share-card.tsx`.

### Visual

A story-aspect (9:16) preview card built from kit primitives: brand mark, "I'm on the Ahavah waitlist.", the member `#N`, and a short tagline ("Torah-observant matchmaking for serious believers."). Brand gradient background consistent with the completion screen.

### Image generation — Canvas API, no new dependency

- A hidden `<canvas>` (1080×1920) is drawn on demand: brand gradient fill, the Ahavah logomark (loaded from an existing `/public` brand PNG), the headline, the `#N`, and `ahavah.app`.
- `canvas.toBlob()` produces a PNG `File`.
- **Buttons (kit `Button`):**
  - **Save image** — triggers a download of the PNG (anchor with `download`).
  - **Share** — `navigator.share({ files:[png], title, text, url })` where `navigator.canShare({files})` is true (mobile); otherwise falls back to `navigator.share({ title, text, url })`; otherwise hidden.
  - **Copy caption** — writes a prefilled IG caption to the clipboard (`navigator.clipboard.writeText`), with a "Copied" confirmation.
- Instruction line: "Post it to your story and tag @ahavah."

### Caption text (clipboard)

> I just joined the Ahavah waitlist. Torah-observant matchmaking for serious believers, aligned in Torah, faith, family, and covenant. Join me: ahavah.app

### Landing inline-form success

After the landing hero email form succeeds ([`src/app/page.tsx`](../../../src/app/page.tsx) `handleSubmit` success state), add a compact "Share Ahavah" `Button` that deep-links to `/waitlist?shared=1` (or the completion share), reusing the same share affordance. Keep the existing success message.

---

## Workstream 3 — Torah-observant positioning copy

A new **"Who it's for"** band on the landing, inserted after the hero (`#waitlist`) and before `#features`. Uses `SectionHead` + kit `Card`/`Pill`. Strings (verbatim taglines woven in):

- **Overline:** "Who it's for"
- **Headline (display):** "Built for believers who take it seriously."
- **Positioning chips / lines:**
  - "Torah-observant dating for serious believers."
  - "Built for Messianic Torah-observant singles."
  - "Not mainstream Christian dating. Not secular dating."
  - "Find someone aligned in Torah, faith, family, and covenant values."
  - "For believers who take Torah, marriage, and family seriously."
- **Body (the exclusivity / legacy / covenant message):**
  > Ahavah is a set-apart space for people seriously seeking marriage. We are here to grow legacy, build covenant love, raise families in the truth, and strengthen Torah-based communities and family structures. Not a numbers game. A remnant.
- **Modesty line (single, links to guidelines):** "Modesty matters here, in conduct and in photos."

Hero eyebrow: **default is to leave the hero as-is** (the `Pill "Pre-launch" + "Spring 2026"` row and the existing "Find a spouse across borders." headline stay). All new positioning lives in the new "Who it's for" band so the hero is not cluttered. Change only if you ask at review.

---

## Workstream 4 — Modesty guidance

Guidance copy only; no automated rejection.

- **Photo upload screen** ([`src/app/onboarding/photos/page.tsx`](../../../src/app/onboarding/photos/page.tsx)) and the profile photo edit surface: add a modest-imagery guideline block. Text:
  > **Photo guidelines.** Dress modestly. No cleavage, no revealing or tight clothing, nothing suggestive, and keep yourself fully covered (no exposed midriff or crotch). Your face must be clearly visible. Solo photos only for your main shot.
- **Community guidelines** ([`src/app/legal/community-guidelines/page.tsx`](../../../src/app/legal/community-guidelines/page.tsx)): add a **"Be modest"** section alongside Be kind / Be real / Be safe:
  > **Be modest.** Dress and present yourself modestly, in line with Torah values. No revealing clothing, cleavage, or suggestive imagery. Photos that do not meet these standards will be removed.
- The single landing modesty line (Workstream 3).

---

## Workstream 5 — Privacy & verification trust messaging

Augment the existing `#verified` (verification tiers) section in [`src/app/page.tsx`](../../../src/app/page.tsx) with a short privacy-principles block (kit `Card` + `IconBadge`). Framed as our principles; the Tea-app breach is the rationale recorded here, **not** named in public copy.

- **Verification is for safety, not surveillance.** We confirm real people to keep predators and catfish out. Nothing more.
- **Minimal data retention.** ID and selfie checks are processed, not stockpiled. Your government ID stays with our verification provider (Stripe Identity); we keep only the pass/fail result.
- **Never public.** Your verification photos and ID are never shown to other users and never posted anywhere. Sensitive data is not exposed.

(Rationale, for the team: a 2025 breach at the "Tea" dating-adjacent app exposed user images including ID/selfie verification photos, a reputational disaster. Our messaging and architecture must make clear we do not retain or expose that data.)

---

## File structure

**`ahavah-api`:**
- Modify `service/waitlist/__init__.py` — add `count(tx)`.
- Modify `service/api/waitlist_routes.py` — add `GET /waitlist/count`.
- Modify `tests/test_waitlist.py` — count test.

**`ahavah-web`:**
- Create `src/components/app/waitlist-count.tsx` — hook + display, floor logic.
- Create `src/components/app/waitlist-share-card.tsx` — canvas image + Save/Share/Copy.
- Modify `src/lib/waitlist.ts` — `getWaitlistCount()`.
- Modify `src/app/page.tsx` — live count in hero stats, new "Who it's for" band, privacy-principles block in `#verified`, modesty line, inline-success share button.
- Modify `src/app/waitlist/page.tsx` — fetch count post-submit, render `#N` + `<WaitlistShareCard>` on completion.
- Modify `src/app/onboarding/photos/page.tsx` — modesty guideline block.
- Modify `src/app/legal/community-guidelines/page.tsx` — "Be modest" section.

## Error handling

- Count fetch failure → fallback copy, never an error UI (it is decorative social proof).
- `navigator.share` / `clipboard` unsupported → feature-detect and hide/degrade gracefully; Save-image always works.
- Canvas image load (logo) failure → still render text-only card.

## Testing

- Backend: pytest for `/waitlist/count` (harness per `reference_ahavah_windows_test_harness`).
- Frontend: `tsc --noEmit`, `next build` (catch Suspense/prerender issues), lint-staged eslint. Manual: count floor behaviour, share buttons feature-detection, copy renders with no em-dashes.

## Out of scope

- Automated modesty enforcement / AI image moderation.
- Brand-account Canva templates.
- Magic-link launch flow (already separate).
- Real "countries" telemetry (kept aspirational unless you ask for live).

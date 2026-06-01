# Billing Portal Rebuild — Plan Stub

> **Status: STUB — awaiting architecture decision + spec.** Spawned from the 2026-05-19 Changes Document (item under /Profile, "billing portal" paragraph). This plan needs an architecture decision and detailed task breakdown before execution. Do NOT execute as-is.

**Source request (PDF 2026-05-19, /Profile section):**
> The /billing-portal pages auto-redirects the user to Stripe, never allowing the user to switch plans, cancel or pause subscriptions, download invoices, update payment method, nor do I think any or all of the options available on that page are actually wired.

---

## Current state (verified)

- [src/app/billing-portal/page.tsx](src/app/billing-portal/page.tsx) renders a card with an explicit "Open billing portal" button (the auto-redirect-on-mount was removed in commit `77dd0f0` per memory). The button POSTs `/billing-portal` on the backend.
- Backend `/billing-portal` (Stripe API): `stripe.billing_portal.Session.create(...)` returns a hosted-portal URL on `billing.stripe.com`. The user then leaves Ahavah entirely and manages billing on Stripe's domain.
- This is **functional but coarse** — every billing action is a full-page redirect. No native in-app affordances.

## What the PDF is asking for

Native in-app surfaces for each billing action:

1. **Switch plans** (monthly / quarterly / yearly)
2. **Cancel subscription** (with grace period or immediate)
3. **Pause subscription** (Stripe supports `pause_collection`)
4. **Download invoices** (PDF list per period)
5. **Update payment method** (re-card, manage saved cards)

## Architecture decision required FIRST

Three options, ordered by ambition:

### Option A — Keep Stripe Customer Portal, just polish the entry
**Effort: 2 hours.** Add explicit copy explaining what the portal lets you do. Add a section listing the actions Stripe will offer once they click through. Configure Stripe Customer Portal settings to enable plan switching, cancellation, etc. (Stripe Dashboard → Settings → Billing → Customer portal).

Pros: Minimal code work. Stripe maintains the UI.
Cons: User leaves Ahavah's domain. Per PDF, this is essentially what we have today — the user is asking for MORE.

### Option B — Embed Stripe Pricing Table + Stripe Customer Portal iframe
**Effort: ~1 day.** Use Stripe's `<stripe-pricing-table>` web component for plan switching, embed the Customer Portal in an iframe.

Pros: Some native feel. Stripe handles the heavy lifting.
Cons: iframes break theme + PWA install flow on iOS. Some features (pause) may not be in the embedded portal.

### Option C — Native in-app UI proxying Stripe API
**Effort: 3-5 days.** Build the surfaces ourselves; each calls our backend, which proxies Stripe.

Pros: Full theme + design integration. Best user experience. Matches the rest of the app's polish.
Cons: All Stripe error states, edge cases, webhook timing — we own them. Requires careful work.

**Recommendation: Option C.** The user's PDF feedback implies they want a polished in-app surface, not a redirect. The other backend changes have already invested in native polish. Splitting the difference (Option B) tends to be visually awkward.

## If Option C is chosen — sketch of phases

### Phase 1 — Backend endpoints (proxy Stripe)
- `GET /billing/subscription` — current plan, status, period dates
- `POST /billing/subscription/change` — switch plan (with proration handling)
- `POST /billing/subscription/cancel` — cancel at period end OR immediately
- `POST /billing/subscription/pause` — set `pause_collection: { behavior: 'mark_uncollectible' }` or similar
- `POST /billing/subscription/resume` — clear pause
- `GET /billing/invoices` — list invoices with hosted PDF URLs
- `POST /billing/payment-method/setup-intent` — return client secret for Stripe Elements card update

### Phase 2 — Frontend page structure
Replace `/billing-portal/page.tsx` with a sectioned native surface:

- Section 1: Current plan card (name, price, next-bill date)
- Section 2: Plan switcher (3 cards: month / quarter / year) using kit `Card` + `Button`
- Section 3: Subscription controls (Pause / Cancel) with kit `AlertDialog` confirmations
- Section 4: Invoice list (table or stacked rows) with download links
- Section 5: Payment method (display masked card + "Update card" button → opens kit `Dialog` with Stripe Elements)

### Phase 3 — Stripe Elements integration
- Install `@stripe/stripe-js` + `@stripe/react-stripe-js`
- Mount Stripe Elements inside a kit Dialog for card updates
- Theme via the project's CSS tokens (Stripe Elements supports custom theming)

### Phase 4 — Webhook event handling
- Audit current Stripe webhook handler for the events this flow generates: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Ensure each updates the local state

### Phase 5 — Edge cases + tests
- What happens when a user with no subscription visits? (Show paywall instead.)
- Mid-period plan changes — show proration preview
- Card declined — surface error + retry
- Cancellation with refund — out of scope or in? (Decision needed)

---

## Open questions that gate the plan

1. **Architecture: A, B, or C?** (See above; recommend C.)
2. **Cancellation policy:** Immediate or end-of-period? Refund any prorated amount?
3. **Pause policy:** Max pause duration? Stripe supports indefinite or until-date.
4. **Plan switching proration:** Show preview ("You'll be charged $X today") or just confirm?
5. **Payment method:** Multiple saved cards (Stripe supports), or just one primary?
6. **Test mode vs production:** This work needs test-mode Stripe to validate; user has confirmed Stripe is in test mode currently.

## Next step before this plan can be executed

1. User chooses architecture (A / B / C).
2. Run `superpowers:brainstorming` skill with the answers to the 6 questions above.
3. Replace this stub with the chosen architecture's full task plan.

## Estimated work after architecture is chosen

- Option A: half-day
- Option B: 1-1.5 days
- Option C: 3-5 days

Either A or B can stay inline in a future Wave 2 plan. C warrants its own full planning cycle.

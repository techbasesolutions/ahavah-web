# Billing Portal Rebuild — Design Spec

> **Status: APPROVED autonomously 2026-05-20** (user granted full autonomy +
> stepped away). Decisions below are conservative, money-safe defaults;
> flagged for user review before the billing deploy. Supersedes the stub
> `docs/superpowers/plans/2026-05-19-billing-portal-rebuild.md`.
>
> Source (PDF 2026-05-19, /Profile): "The /billing-portal page auto-redirects
> to Stripe, never allowing the user to switch plans, cancel or pause
> subscriptions, download invoices, update payment method, nor do I think any
> of the options are actually wired."

## Architecture decision: conservative hybrid (not raw Option C)

**Why not raw Option C (native Stripe Elements + native mutations):** it
requires (a) capturing card data via Stripe Elements — a browser-only,
PCI-scoped flow I cannot verify without a browser/test-mode interaction, and
(b) refund/cancellation/proration POLICY decisions that are business calls,
not engineering defaults. Shipping unverifiable money-mutation code while the
user is away is irresponsible.

**Chosen hybrid:**
1. **Read-side, fully native + verifiable.** New backend read endpoints feed
   the page REAL data (replacing `PLACEHOLDER_SUBSCRIPTION`):
   - `GET /billing/subscription` -> `{ status, plan_label, price_label,
     current_period_end, cancel_at_period_end, card_brand, card_last4 }` or
     `{ status: "none" }`.
   - `GET /billing/invoices` -> `[{ id, created, amount_label, status,
     hosted_invoice_url, invoice_pdf }]`.
2. **Action-side, per-action Stripe deep-links.** Replace the single generic
   "Open billing portal" button with explicit wired buttons that deep-link
   straight into the matching Stripe Customer Portal FLOW via `flow_data`
   (stripe>=11 supports this):
   - "Switch plan" -> `flow_data.type = subscription_update`
   - "Cancel subscription" -> `flow_data.type = subscription_cancel`
   - "Update payment method" -> `flow_data.type = payment_method_update`
   - "More billing options" -> generic portal (covers pause + anything else;
     `flow_data` has no pause type).

   This fixes the PDF complaint (each action is now a distinct WIRED entry
   point, no blind auto-redirect) while keeping money mutations + card
   capture on Stripe's verified, secure, PCI-compliant surface.

### Policy defaults (conservative; documented for user override)
- **Cancellation:** end-of-period via Stripe's cancel flow (Stripe's own UI
  asks the user; no refund logic on our side).
- **Pause:** via generic portal "More options" (no native pause; Stripe
  config dependent).
- **Proration on switch:** Stripe's update flow shows it; we don't compute.
- **Payment method:** single primary, managed in Stripe's flow.
- **Refunds:** out of scope.

## Backend (`ahavah-api`)

New endpoints in `service/checkout/__init__.py` (the existing Stripe module —
same `_stripe()`, `STRIPE_SECRET_KEY`, `person.stripe_customer_id`,
`AHAVAH_WEB_BASE_URL` patterns):

- `get_subscription(s)` -> reads `stripe_customer_id`; if none -> `{status:
  "none"}`. Else `stripe.Subscription.list(customer=..., status='all',
  limit=1, expand=['data.default_payment_method', 'data.items.data.price'])`;
  map to the read shape. Card brand/last4 from
  `default_payment_method.card`. 503 if Stripe unconfigured.
- `get_invoices(s)` -> `stripe.Invoice.list(customer=..., limit=12)`; map to
  the read shape (amount in dollars, `hosted_invoice_url`, `invoice_pdf`).
- Extend `get_billing_portal(s, flow=None)` -> when `flow` in
  {`subscription_update`, `subscription_cancel`, `payment_method_update`},
  pass `flow_data={'type': flow}` to `billing_portal.Session.create`. Unknown/
  None flow -> generic portal (current behavior, unchanged default).

Routes in `service/api/__init__.py` (extend, near the existing
`/billing-portal`):
- `@aget('/billing/subscription')` -> `checkout.get_subscription(s)`
- `@aget('/billing/invoices')` -> `checkout.get_invoices(s)`
- `@aget('/billing-portal')` reads optional `?flow=` -> passes to
  `get_billing_portal`.

Tests `tests/test_billing_read.py` (mock `_stripe()` via monkeypatch — the
conftest already mocks Stripe-style objects): subscription mapping with/
without a customer; invoice mapping; flow passthrough builds `flow_data`.

## Frontend (`ahavah-web`)

Rebuild `src/app/billing-portal/page.tsx`:
- Fetch `GET /billing/subscription` + `GET /billing/invoices` on mount.
- **Current plan card** (kit `Card`): real status, plan, price, next-bill
  date, masked card (`Visa . 4242`), a "Cancels on <date>" notice when
  `cancel_at_period_end`.
- **Actions** (kit `Button`s, each calls `GET /billing-portal?flow=<type>` ->
  `window.location.assign(url)`): Switch plan / Update card / Cancel /
  More options. Keep existing error handling (401/400/503).
- **Invoices** (kit rows): date, amount, status, "Download" link
  (`invoice_pdf`) + "View" (`hosted_invoice_url`). Empty state when none.
- **No subscription** (`status: "none"`): show a "You're on the free plan"
  card + CTA to `/paywall` instead of plan controls.
- Kit primitives only; no em-dashes in user-facing copy; preserve the
  desktop sidebar shell + mobile header already in the file.

## Verification
- Backend: `tests/test_billing_read.py` via the docker test harness (mocked
  Stripe) + `python -c "import service.api"` import check (harness).
- Frontend: `tsc --noEmit` + `eslint` clean. Cannot visually verify the
  auth-gated page or the live Stripe redirects without a browser.
- **Deploy: HOLD for user.** Billing touches real money; the Stripe deep-link
  flows + the real read data must be eyeballed in test mode by the user
  before shipping. Commit locally only.

## Out of scope (deferred, needs user-validated test-mode work)
- Native in-app card capture (Stripe Elements).
- Native plan-switch / cancel / pause UIs (raw Option C).
- Refund handling, multi-card management, proration previews computed by us.

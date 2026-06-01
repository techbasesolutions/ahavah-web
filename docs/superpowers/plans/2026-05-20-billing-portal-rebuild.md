# Billing Portal Rebuild Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Replace the placeholder/redirect-only billing page with real subscription + invoice data and explicit per-action Stripe deep-link buttons.

**Architecture:** Conservative hybrid (see `docs/superpowers/specs/2026-05-20-billing-portal-design.md`). Read-side native (new GET endpoints feed real data); action-side per-action Stripe Customer Portal deep-links via `flow_data`. No native card capture, no money-mutation code we own.

**Spec:** `docs/superpowers/specs/2026-05-20-billing-portal-design.md`

**Two repos.** api `ahavah/main`, web `master`. Stage by name; trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. DEPLOY HELD for user (money-sensitive).

---

## BACKEND (ahavah-api)

### Task 1: Read endpoints + flow deep-link in `service/checkout`

**Files:**
- Modify: `service/checkout/__init__.py` (add `get_subscription`, `get_invoices`; extend `get_billing_portal` with `flow`)
- Test: `tests/test_billing_read.py`

- [ ] **Step 1: Write failing tests** (mock `_stripe()` with MagicMock; assert mapping shapes + flow_data passthrough).
- [ ] **Step 2: Run** `./tests/run.sh tests/test_billing_read.py` -> FAIL (functions missing).
- [ ] **Step 3: Implement** `get_subscription`, `get_invoices`, extend `get_billing_portal(s, flow=None)`:
  - `get_subscription`: read `stripe_customer_id`; none -> `{'status':'none'}`. Else `stripe.Subscription.list(customer=cid, status='all', limit=1, expand=['data.default_payment_method','data.items.data.price'])`; map first to `{status, plan_label, price_label, current_period_end, cancel_at_period_end, card_brand, card_last4}`. 503 if `_stripe()` None, 401 if no person.
  - `get_invoices`: `stripe.Invoice.list(customer=cid, limit=12)`; map to `[{id, created, amount_label, status, hosted_invoice_url, invoice_pdf}]`. Empty list if no customer.
  - `get_billing_portal(s, flow=None)`: if `flow in {'subscription_update','subscription_cancel','payment_method_update'}` add `flow_data={'type': flow}` to `Session.create`. Else unchanged.
- [ ] **Step 4: Run** tests -> PASS.
- [ ] **Step 5: Commit** `git add service/checkout/__init__.py tests/test_billing_read.py`.

### Task 2: Routes

**Files:** Modify `service/api/__init__.py` (near existing `/billing-portal` at line 600).
- [ ] Add `@aget('/billing/subscription')` -> `checkout.get_subscription(s)`; `@aget('/billing/invoices')` -> `checkout.get_invoices(s)`; change `get_billing_portal` route to read `request.args.get('flow')` and pass it through.
- [ ] Import check (harness) `python -c "import service.api"`.
- [ ] Commit.

---

## FRONTEND (ahavah-web)

### Task 3: Rebuild billing-portal page

**Files:** Modify `src/app/billing-portal/page.tsx`.
- [ ] Fetch `GET /billing/subscription` + `GET /billing/invoices` on mount (apiClient, loading + error states).
- [ ] Current-plan Card with real fields; "Cancels on <date>" when `cancel_at_period_end`; free-plan card + `/paywall` CTA when `status==='none'`.
- [ ] Action buttons (kit Button): Switch plan / Update card / Cancel -> `GET /billing-portal?flow=<type>` then `window.location.assign(url)`; "More options" -> no flow. Preserve 401/400/503 handling.
- [ ] Invoice rows: date, amount, status, Download (`invoice_pdf`) + View (`hosted_invoice_url`); empty state.
- [ ] Kit primitives only; no em-dashes; keep desktop sidebar shell + mobile header.
- [ ] `npx tsc --noEmit` + `npx eslint src/app/billing-portal/page.tsx` clean.
- [ ] Commit.

### Task 4: Verify + HOLD deploy
- [ ] Backend tests pass in harness; frontend tsc/lint clean.
- [ ] Do NOT push. Report to user: billing is money-sensitive; needs test-mode eyeball before deploy.

## Self-Review
- Spec read-endpoints -> Task 1; routes -> Task 2; page -> Task 3; deploy hold -> Task 4. Covered.
- Types: `get_billing_portal(s, flow=None)` defined Task 1, called Task 2. Read shapes defined Task 1, consumed Task 3.

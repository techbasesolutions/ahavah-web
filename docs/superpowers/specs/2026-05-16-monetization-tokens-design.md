# Monetization: Subscriptions × Tokens — Design Spec

**Date:** 2026-05-16
**Status:** Approved by user (sections 1–6); ready for implementation plan
**Scope:** Server-side ledger + Stripe Checkout for tokens + 4 token-spendable actions + monthly token stipend on existing subscription tiers + free-user daily like quota

---

## 1. Goal

Add a tokenization layer that runs alongside the existing 3-duration Premium subscription. Tokens unlock micro-purchases for users who don't want a recurring commitment; subscriptions retain ongoing-value framing and now include a monthly token stipend so subscribers feel they're getting tangible extras beyond "see who liked you."

Expand the paywall surface beyond the single existing entitlement (incoming-likes visibility) with a daily like quota for free users.

**Non-goal:** restrict free users so heavily that the product loses utility. The free experience must stay viable — daily quota, blurred-liker visibility, and full chat access are preserved.

---

## 2. Current state (pre-design)

- 3 subscription tiers (durations of the SAME `premium` entitlement):
  - 1mo $4.99 — `tier_key: 'month'`
  - 3mo $11.99 ($4.00/mo) — `tier_key: 'quart'`
  - 1yr $34.99 ($2.92/mo) — `tier_key: 'year'`
- One entitlement: `entitlements: ['premium']` on the profile; auto-revoke via `subscriptionExpiresAt`
- One premium-gated feature: incoming-likes visibility on `/matches > Liked you` and the `/discover` empty-state grid
- Stripe Checkout (test keys, Stripe Products created 2026-05-15); webhook handler in `service/checkout`
- `/billing-portal` for subscription management
- **No** token economy, **no** like quota, **no** boost/super-like/rewind features

---

## 3. Economic decisions

### 3.1 Token denomination

| Item | Price | Notes |
|---|---|---|
| **Token (bundle rate, effective)** | $0.50 | Hit at the smallest bundle ($4.99 / 10) |
| **Token (single purchase)** | $0.99 | A la carte; covers Stripe fees + margin |

### 3.2 Token bundle SKUs

| SKU | Stripe product key | Price | Tokens | Effective per-token |
|---|---|---|---|---|
| Single | `tokens_single` | $0.99 | 1 | $0.99 |
| Starter | `tokens_starter` | $4.99 | 10 | $0.50 |
| Plus | `tokens_plus` | $9.99 | 22 | $0.45 (10% bonus) |
| Pro | `tokens_pro` | $19.99 | 50 | $0.40 (20% bonus) |

Bundles + single purchase coexist (hybrid pricing). User self-selects: low-volume → single; commit → bundle.

### 3.3 Token-spendable actions

| Action | Cost | Notes |
|---|---|---|
| Reveal hidden liker | 1 token | Unblur one specific person on `/matches > Liked you`. Permanent for that viewer/liker pair. |
| Super-like | 2 tokens | Sent from `/discover` action row. Recipient sees the like jump to top of deck with lime ring + "Super liked you" pill. |
| Day-pass (unlimited likes 24h) | 3 tokens | For free users who hit the daily like quota. 24h rolling window from purchase. |
| Boost (30-min spotlight) | 5 tokens | Surfaces user first in nearby decks for 30 minutes. Recipient cards get a "Boosted" badge. One active boost per user max. |

### 3.4 Subscription tier matrix

| Item | Free | 1mo Premium ($4.99) | 3mo Premium ($11.99) | 1yr Premium ($34.99) |
|---|---|---|---|---|
| Daily like quota | 10 / day | Unlimited | Unlimited | Unlimited |
| See incoming likers (count) | ✓ | ✓ | ✓ | ✓ |
| See incoming likers (faces) | Blurred | ✓ | ✓ | ✓ |
| Reveal liker (token cost) | 1 token | — (already visible) | — | — |
| Super-like (token cost) | 2 tokens | 2 tokens | 2 tokens | 2 tokens |
| Day-pass (token cost) | 3 tokens | — (already unlimited) | — | — |
| Boost (token cost) | 5 tokens | 5 tokens | 5 tokens | 5 tokens |
| **Monthly token stipend** | — | **10 / mo** | **12 / mo** (36 total) | **15 / mo** (180 total) |
| Chat, photo upload, verification, filters | ✓ | ✓ | ✓ | ✓ |

**Loyalty-bonus rationale:** longer-term commitments earn proportionally more tokens per month (10 → 12 → 15). Yearly subscribers come out best per-dollar, reinforcing the value of the long commit.

### 3.5 Entitlements model

- `entitlements` array stays the canonical paywall truth. Still only `['premium']` after this change.
- Token balance is a separate scalar value (derived from ledger sum) — NOT an entitlement.
- Token actions don't grant ongoing entitlements; they perform a one-shot backend write (reveal, super-like, day-pass, boost) AND debit the ledger.

---

## 4. Feature behavior (UX)

### 4.1 Reveal hidden liker
- `/matches > Liked you` tab + `/discover` "no candidates" empty-state already render a blurred grid for non-premium users with a count.
- Tap a blurred card → Sheet (`<Sheet side="bottom">`): title "Reveal `{firstName}, {age}`?", body "Costs 1 token (you have N)", footer Buttons `[Reveal · 1 token]` (primary, lime) and `[Cancel]` (ghost).
- On confirm: backend debits 1 token + inserts `revealed_likers` row + responds with the unblurred profile photo URL. Frontend unblurs + opens profile preview.
- Subscribers skip the confirmation entirely — clicking a liker opens the profile sheet directly.

### 4.2 Super-like
- New circular Button between Skip and Like on `/discover` action row. Icon: lime `Sparkles`. Label below the circle: "Super".
- Tap → confirmation Sheet (same kit pattern): "Send a super-like to `{firstName}`? Costs 2 tokens." `[Send · 2 tokens]` / `[Cancel]`.
- On confirm: card flies up with lime trail (motion.div exit), advances to next candidate.
- Recipient's `/discover` deck: super-liked profiles are sorted to the top with a lime ring around the card + a small "Super liked you" pill pinned to the top-left of the photo.

### 4.3 Day-pass (free users out of likes)
- When a free user hits 10/day, Like button greys + Tooltip shows "Resets in HH:MM".
- Inline `Card tone="profile-section"` slides in below the deck: title "Out of likes for today", description, two side-by-side Buttons:
  - `[Upgrade for unlimited]` (`variant="default"`, links to `/paywall`)
  - `[Day pass · 3 tokens]` (`variant="outlineSubtle"`, spends 3 tokens → 24h unlimited)

### 4.4 Boost
- "Boost your profile" Card on `/profile` (self). Shows current boost state:
  - **No active boost:** "Get more views — boost for 30 min." + `[Boost · 5 tokens]` Button.
  - **Active boost:** Lime pill "Boosted · 23 min left" + countdown.
- Tap → confirmation Sheet: "Boost for 30 minutes? Costs 5 tokens. Your profile will be shown first in nearby decks." `[Boost · 5 tokens]` / `[Cancel]`.
- During boost: lime ring around the user's avatar in the sidebar bottom user-block; recipient `/discover` decks render a "Boosted" badge on the user's card.

### 4.5 Token balance UI
- Persistent small Pill in the sidebar bottom row near the user-block: lime circle icon + tabular number (e.g. "⊙ 12"). Tooltip: "Tokens · tap to buy more". Click navigates to `/profile/tokens` (or `/tokens`).
- After any token spend or purchase, the Pill re-renders with the new balance.

### 4.6 Token store page (`/profile/tokens` or `/tokens`)
- Top section: current balance display + "How tokens work" expandable Accordion.
- 4-up Choicebox grid of the 4 SKUs (Single / Starter / Plus / Pro) with per-token rates and bonus highlights.
- Tap a SKU → `[Get tokens · $X.XX]` Button → Stripe Checkout redirect.
- Below the bundles: subscription cross-sell Card ("Subscribers get tokens monthly + unlimited likes — see plans") linking to `/paywall`.

---

## 5. Backend data model

### 5.1 `token_ledger` (immutable, append-only)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `person_id` | UUID FK | Whose balance changes |
| `delta` | INTEGER | Positive (credit) or negative (debit) |
| `reason` | TEXT | Enum: `purchase`, `subscription_stipend`, `reveal_liker`, `super_like`, `day_pass`, `boost`, `refund` |
| `metadata` | JSONB | Per-action context (see below) |
| `created_at` | TIMESTAMPTZ | `DEFAULT NOW()` |

Index `(person_id, created_at)`.

**Metadata shapes:**
- `purchase`: `{stripe_session_id, sku, amount_cents}`
- `subscription_stipend`: `{tier_key, period_start, period_end}`
- `reveal_liker`: `{revealed_liker_id}`
- `super_like`: `{super_liked_person_id, liked_row_id}`
- `day_pass`: `{expires_at}` (ISO-8601 UTC)
- `boost`: `{boost_row_id, expires_at}`
- `refund`: `{stripe_refund_id, original_ledger_id}`

**Balance query:** `SELECT COALESCE(SUM(delta), 0) FROM token_ledger WHERE person_id = $1`.

Balance is always derived from the ledger sum. No denormalized counter (single source of truth, audit trail comes for free).

### 5.2 `revealed_likers`

| Column | Type | Notes |
|---|---|---|
| `viewer_id` | UUID FK | The user who paid the token |
| `liker_id` | UUID FK | The person revealed |
| `revealed_at` | TIMESTAMPTZ | `DEFAULT NOW()` |

PK is composite `(viewer_id, liker_id)`. Guarantees re-clicking the same liker doesn't cost twice.

### 5.3 `active_boosts`

| Column | Type | Notes |
|---|---|---|
| `person_id` | UUID PK | One active boost per user max |
| `started_at` | TIMESTAMPTZ | When the boost was purchased |
| `expires_at` | TIMESTAMPTZ | `started_at + INTERVAL '30 minutes'` |

`/search` (`Q_CACHED_SEARCH` / `Q_UNCACHED_SEARCH`) joins `LEFT JOIN active_boosts ab ON ab.person_id = candidate.id AND ab.expires_at > NOW()` and orders boosted candidates first.

A cron deletes expired rows nightly, but the join filter handles staleness safely.

### 5.4 `liked` table modification

ADD column `is_super BOOLEAN NOT NULL DEFAULT FALSE`. Set TRUE when the like is super; sorted-first on incoming-likes queries.

### 5.5 Quota enforcement

- 24h rolling window: `SELECT COUNT(*) FROM liked WHERE liker_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`.
- Decision rule on `POST /decisions`:
  1. If `entitlements @> ARRAY['premium']` → allow.
  2. Else check active day-pass: `SELECT 1 FROM token_ledger WHERE person_id = $1 AND reason = 'day_pass' AND (metadata->>'expires_at')::timestamptz > NOW() LIMIT 1`. If row exists → allow.
  3. Else check window count. If count < 10 → allow. Else respond 429 with `{error: 'quota_exceeded', resets_at: <ISO-8601>}` where `resets_at` is the timestamp 24h after the oldest like in the window.

### 5.6 Spend-token transactional integrity

Every token spend (reveal-liker, super-like, day-pass, boost) runs as a single SQL transaction:

```sql
BEGIN;
  -- Lock balance computation against concurrent spends
  SELECT COALESCE(SUM(delta), 0) AS balance
    FROM token_ledger
    WHERE person_id = $1
    FOR UPDATE;
  -- Application code: if balance < cost, ROLLBACK and respond 402.
  INSERT INTO token_ledger (person_id, delta, reason, metadata)
    VALUES ($1, -<cost>, '<reason>', $2::jsonb);
  -- Action-specific writes:
  --   reveal_liker: INSERT INTO revealed_likers
  --   super_like:   UPDATE liked SET is_super = TRUE
  --   day_pass:     (no other writes; metadata.expires_at holds TTL)
  --   boost:        INSERT INTO active_boosts ON CONFLICT (person_id) DO UPDATE
COMMIT;
```

The `FOR UPDATE` lock prevents double-spend when a user double-taps the confirm Button.

---

## 6. Stripe integration

### 6.1 Existing — subscriptions
Unchanged. `POST /checkout/web { tier_key }` → Stripe Checkout URL → webhook `checkout.session.completed` flips `entitlements`.

**NEW webhook behavior:** on `checkout.session.completed` for a subscription, also insert the first `subscription_stipend` ledger row (10/12/15 tokens based on `tier_key`).

**NEW webhook handler:** `customer.subscription.updated` (renewal cycle). Inserts the next month's stipend ledger row.

**NEW webhook handler:** `customer.subscription.deleted` (cancellation). Removes `'premium'` from `entitlements`. **Token balance is preserved** — tokens are property; canceling subscription doesn't void unspent stipend tokens.

### 6.2 New — token bundle purchases

Use Stripe Checkout (same pattern as subs for code reuse + Apple Pay / Link / Stripe-managed PCI).

- 4 new Stripe Products created in dashboard:
  - `tokens_single` — $0.99 — metadata `{token_count: 1}`
  - `tokens_starter` — $4.99 — metadata `{token_count: 10}`
  - `tokens_plus` — $9.99 — metadata `{token_count: 22}`
  - `tokens_pro` — $19.99 — metadata `{token_count: 50}`
- `POST /checkout/tokens { sku }` returns a Checkout session URL with `mode: 'payment'` and `success_url: <app>/profile/tokens?purchased=true`.
- Same webhook endpoint as subscriptions; discriminate by `session.mode`:
  - `subscription` → existing subs path
  - `payment` → new token-purchase path: read `token_count` from product metadata, insert ledger row `{delta: <count>, reason: 'purchase', metadata: {stripe_session_id, sku, amount_cents}}`.

### 6.3 Refund handling

Tokens are non-refundable by default (atomic digital goods consumed at action time).

Manual Stripe refunds via dashboard work: webhook listens for `charge.refunded` → insert negative ledger row `{delta: -<original_count>, reason: 'refund', metadata: {stripe_refund_id, original_ledger_id}}`. Balance can briefly go negative if the user already spent the tokens; the next purchase or stipend pushes it positive again.

Subscription pro-rata refunds: handled by Stripe per its defaults. The deleted-subscription webhook revokes `premium` entitlement.

---

## 7. Frontend surfaces touched

| Surface | Change |
|---|---|
| `/discover` | Add Super-like Button (3-circle action row → 4 circles); add "Out of likes" inline Card on quota-exceeded; remove or grey Like button on quota cap |
| `/discover` empty state | Existing blurred-grid stays; each card becomes tappable → reveal Sheet |
| `/matches > Liked you` tab | Each blurred card tappable → reveal Sheet |
| `/profile` (self) | New "Boost your profile" Card; active-boost state shows countdown |
| `/profile/tokens` (new route) | Token store: balance + 4 SKU Choicebox + cross-sell to /paywall |
| Sidebar bottom user block | Token balance Pill (lime, tabular, tap → /profile/tokens) |
| Sidebar avatar | Lime ring overlay when boost active |
| `/paywall` | FEATURES list expanded to include "Monthly tokens (10–15 by tier)" + unlimited likes |

---

## 8. Phasing (v1 implementation order, single coordinated release)

| Phase | Work |
|---|---|
| 1 | DB migrations: `token_ledger`, `revealed_likers`, `active_boosts`, `liked.is_super` |
| 2 | Stripe Products created in dashboard; `POST /checkout/tokens`; webhook extended for `session.mode = payment` |
| 3 | Token balance API endpoint; sidebar Pill UI; `/profile/tokens` store page |
| 4 | Reveal-liker spend path: confirmation Sheet, backend handler, `revealed_likers` write |
| 5 | Quota enforcement: 429 response, "Out of likes" Card on /discover, day-pass spend path |
| 6 | Super-like spend path: new action button, `is_super` write, recipient deck sort + lime ring |
| 7 | Boost spend path: /profile Card, `active_boosts` write, /search join, recipient "Boosted" badge |
| 8 | Subscription stipend: webhook handlers for first-month + renewal credit; backfill for existing subs (one-time script) |

v1 ships phases 1–8 as ONE merged stack (not separate releases). The economy is interdependent; partial rollouts would leave dead-end UX (e.g. quota enforcement without day-pass leaves free users stuck).

---

## 9. Explicitly out of scope (v2+)

- Read receipts in chat (token action; not selected for v1)
- Rewind / undo a swipe (not selected)
- Travel mode / location override
- Voice or video profile intro
- A separate Premium+ tier
- Loyalty / referral / promo codes
- Multi-currency or geographic pricing
- A/B testing the price points
- iOS in-app purchase parity (PWA-only for v1; native iOS would need its own design per Apple IAP rules)
- Analytics events / conversion funnel instrumentation (Sentry/PostHog wiring is its own roadmap item)

---

## 10. Open implementation questions

These don't block the design but will need resolution during plan-writing:

1. **Daily quota reset timezone** — user-local midnight, or rolling 24h from oldest like in window? Recommend rolling 24h (simpler backend, fairer to users in non-UTC).
2. **Boost cron cadence** — nightly cleanup vs hourly. Recommend hourly (lower table cardinality, no boost ever stays >1h past expiry).
3. **Stipend timing for renewals** — credit on `customer.subscription.updated` invoice paid, or on calendar month boundary? Recommend invoice-paid (matches Stripe's billing cycle, no timezone math).
4. **Token store route path** — `/tokens` (root-level) or `/profile/tokens` (nested)? Recommend `/profile/tokens` (it's part of the user's account surface area, sidebar nav unchanged).
5. **Boost visual on recipient deck** — solid lime ring, lime-bordered Pill, sparkle animation? Recommend small lime pill in top-left corner of the candidate card (consistent with existing badge vocab).
6. **Backfill stipend for existing subscribers** — when this ships, do existing subscribers get retroactive tokens? Recommend yes, one-time backfill grant matching their tier (10/12/15) on the date of deploy.
7. **Cancellation prompts** — when a subscriber cancels, do we show "Your N stipend tokens stay yours" reassurance? Recommend yes, in the /billing-portal cancellation flow.

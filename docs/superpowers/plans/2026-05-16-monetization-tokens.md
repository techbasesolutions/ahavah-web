# Monetization: Subscriptions × Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a token economy alongside existing subscriptions: free users get 10 likes/day + can spend tokens to reveal hidden likers, send super-likes, day-pass past their quota, or boost their profile; premium subscribers get unlimited likes + see all likers + a monthly token stipend.

**Architecture:** Append-only `token_ledger` table is the single source of truth for balance (computed as `SUM(delta)` per user, no denormalized counter). Two new aux tables (`revealed_likers` for reveal idempotency, `active_boosts` for boost TTL) plus an `is_super BOOLEAN` column added to existing `liked`. Stripe Checkout handles both subscription renewals (already in place) and one-shot token bundle purchases (new), discriminated in the webhook by `session.mode`. Frontend gets a sidebar token Pill, a `/profile/tokens` store, a reusable spend-confirmation Sheet, and new spend Buttons across `/discover`, `/matches`, and `/profile`.

**Tech Stack:** Backend = Python 3.12 + asyncpg + the existing `service/` package layout (`ahavah-api` repo at `d:/Antigravity/ahavah-api`). Frontend = Next.js 16 + React 19 + Tailwind v4 + shadcn/Base UI + Kibo UI + Vitest (`ahavah-web` repo at `d:/Antigravity/ahavah-web`). Stripe Checkout (test mode `sk_test_3o33...`). Database = PostgreSQL.

**Spec:** [`docs/superpowers/specs/2026-05-16-monetization-tokens-design.md`](../specs/2026-05-16-monetization-tokens-design.md)

---

## Phase 1 — Backend foundation (DB + ledger module)

### Task 1.1: Create migration 0014 — token_ledger, revealed_likers, active_boosts, is_super

**Files:**
- Create: `d:/Antigravity/ahavah-api/migrations/0014_token_economy.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0014_token_economy.sql
-- Token economy: append-only ledger + reveal idempotency + boost TTL.
-- The ledger is the single source of truth for balance — compute via
-- SUM(delta) per person_id. No denormalized counter column.

BEGIN;

CREATE TABLE token_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID NOT NULL REFERENCES person(uuid) ON DELETE CASCADE,
  delta       INTEGER NOT NULL CHECK (delta <> 0),
  reason      TEXT NOT NULL CHECK (reason IN (
                'purchase',
                'subscription_stipend',
                'reveal_liker',
                'super_like',
                'day_pass',
                'boost',
                'refund'
              )),
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX token_ledger_person_created_idx
  ON token_ledger (person_id, created_at DESC);

CREATE TABLE revealed_likers (
  viewer_id    UUID NOT NULL REFERENCES person(uuid) ON DELETE CASCADE,
  liker_id     UUID NOT NULL REFERENCES person(uuid) ON DELETE CASCADE,
  revealed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (viewer_id, liker_id)
);

CREATE TABLE active_boosts (
  person_id    UUID PRIMARY KEY REFERENCES person(uuid) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX active_boosts_expires_idx ON active_boosts (expires_at);

ALTER TABLE liked
  ADD COLUMN is_super BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
```

- [ ] **Step 2: Apply the migration locally**

```bash
cd d:/Antigravity/ahavah-api
psql "$DATABASE_URL" -f migrations/0014_token_economy.sql
```
Expected: four `CREATE` notices + one `ALTER` notice, no errors.

- [ ] **Step 3: Verify schema**

```bash
psql "$DATABASE_URL" -c "\dt token_ledger revealed_likers active_boosts" \
  && psql "$DATABASE_URL" -c "\d+ liked" | grep is_super
```
Expected: three tables listed, plus `is_super | boolean | not null default false` in `liked`.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add migrations/0014_token_economy.sql
git commit -m "feat(db): token economy — ledger + revealed_likers + active_boosts + liked.is_super"
```

---

### Task 1.2: Token balance helper (`service/tokens/__init__.py`)

**Files:**
- Create: `d:/Antigravity/ahavah-api/service/tokens/__init__.py`
- Create: `d:/Antigravity/ahavah-api/service/tokens/sql.py`
- Create: `d:/Antigravity/ahavah-api/tests/test_tokens.py`

- [ ] **Step 1: Write the failing test**

```python
# d:/Antigravity/ahavah-api/tests/test_tokens.py
import pytest
from uuid import uuid4
from service.tokens import get_balance, credit, debit, InsufficientTokens

pytestmark = pytest.mark.asyncio

async def test_balance_zero_when_no_ledger(db, person):
    assert await get_balance(db, person["uuid"]) == 0

async def test_credit_increases_balance(db, person):
    await credit(db, person["uuid"], 10, reason="purchase",
                 metadata={"stripe_session_id": "cs_test_xyz"})
    assert await get_balance(db, person["uuid"]) == 10

async def test_debit_reduces_balance(db, person):
    await credit(db, person["uuid"], 5, reason="purchase", metadata={})
    await debit(db, person["uuid"], 2, reason="reveal_liker",
                metadata={"revealed_liker_id": str(uuid4())})
    assert await get_balance(db, person["uuid"]) == 3

async def test_debit_raises_when_insufficient(db, person):
    await credit(db, person["uuid"], 1, reason="purchase", metadata={})
    with pytest.raises(InsufficientTokens):
        await debit(db, person["uuid"], 5, reason="boost", metadata={})
    assert await get_balance(db, person["uuid"]) == 1  # unchanged
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd d:/Antigravity/ahavah-api
pytest tests/test_tokens.py -v
```
Expected: `ImportError: cannot import name 'get_balance' from 'service.tokens'`.

- [ ] **Step 3: Implement the module**

```python
# d:/Antigravity/ahavah-api/service/tokens/sql.py
Q_BALANCE = """
  SELECT COALESCE(SUM(delta), 0) FROM token_ledger WHERE person_id = $1
"""

Q_BALANCE_FOR_UPDATE = """
  SELECT COALESCE(SUM(delta), 0) FROM token_ledger
   WHERE person_id = $1
   FOR UPDATE
"""

Q_INSERT_LEDGER = """
  INSERT INTO token_ledger (person_id, delta, reason, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
"""
```

```python
# d:/Antigravity/ahavah-api/service/tokens/__init__.py
"""
Token ledger — the single source of truth for per-user token balance.

Balance is always SUM(delta) over token_ledger for the user. No
denormalized counter. Spends are wrapped in a FOR UPDATE transaction
to prevent double-spend on concurrent requests.
"""
import json
from uuid import UUID
from typing import Any
from service.tokens.sql import Q_BALANCE, Q_BALANCE_FOR_UPDATE, Q_INSERT_LEDGER


class InsufficientTokens(Exception):
    """Raised when a debit would drive the balance negative."""


async def get_balance(db, person_id: UUID | str) -> int:
    """Current token balance for the user. Cheap (single SUM)."""
    return await db.fetchval(Q_BALANCE, person_id) or 0


async def credit(db, person_id: UUID | str, amount: int, *,
                 reason: str, metadata: dict[str, Any]) -> None:
    """Append a positive ledger row (purchase, stipend, refund-reverse)."""
    if amount <= 0:
        raise ValueError(f"credit amount must be positive, got {amount}")
    await db.execute(
        Q_INSERT_LEDGER, person_id, amount, reason, json.dumps(metadata)
    )


async def debit(db, person_id: UUID | str, amount: int, *,
                reason: str, metadata: dict[str, Any]) -> None:
    """Append a negative ledger row inside a FOR UPDATE transaction.

    Raises InsufficientTokens if balance < amount. The transaction must
    be held open by the CALLER so subsequent writes (revealed_likers,
    active_boosts, liked.is_super, etc.) are committed atomically with
    the debit.
    """
    if amount <= 0:
        raise ValueError(f"debit amount must be positive, got {amount}")
    balance = await db.fetchval(Q_BALANCE_FOR_UPDATE, person_id) or 0
    if balance < amount:
        raise InsufficientTokens(f"have {balance}, need {amount}")
    await db.execute(
        Q_INSERT_LEDGER, person_id, -amount, reason, json.dumps(metadata)
    )
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd d:/Antigravity/ahavah-api
pytest tests/test_tokens.py -v
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/tokens/ tests/test_tokens.py
git commit -m "feat(tokens): ledger module — get_balance, credit, debit with FOR UPDATE"
```

---

### Task 1.3: Balance API endpoint (`GET /tokens/balance`)

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_tokens.py`

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_tokens.py
async def test_balance_endpoint_returns_current_value(http, db, person, session_token):
    await credit(db, person["uuid"], 7, reason="purchase", metadata={})
    res = await http.get("/tokens/balance",
                         headers={"x-session-token": session_token})
    assert res.status_code == 200
    assert res.json() == {"balance": 7}

async def test_balance_endpoint_requires_auth(http):
    res = await http.get("/tokens/balance")
    assert res.status_code == 401
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pytest tests/test_tokens.py::test_balance_endpoint_returns_current_value -v
```
Expected: 404 (route not registered).

- [ ] **Step 3: Add the route**

```python
# Append to service/api/__init__.py (inside the route registration block;
# match the surrounding @aget(...) pattern)
from service.tokens import get_balance

@aget("/tokens/balance")
async def get_tokens_balance(s):
    """Returns {balance: int} for the authenticated user."""
    return {"balance": await get_balance(s.db, s.person_uuid)}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_tokens.py -v
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/api/__init__.py tests/test_tokens.py
git commit -m "feat(api): GET /tokens/balance endpoint"
```

---

## Phase 2 — Stripe Checkout for token bundles

### Task 2.1: Create 4 Stripe Products in dashboard (manual)

**Files:** none (dashboard step)

- [ ] **Step 1: Create products via Stripe CLI**

```bash
# Run with STRIPE_API_KEY set to the test secret key.
cd d:/Antigravity/ahavah-api
stripe products create --name "Tokens — Single" \
  --metadata token_count=1 \
  --default-price-data.currency=usd \
  --default-price-data.unit_amount=99
stripe products create --name "Tokens — Starter (10)" \
  --metadata token_count=10 \
  --default-price-data.currency=usd \
  --default-price-data.unit_amount=499
stripe products create --name "Tokens — Plus (22)" \
  --metadata token_count=22 \
  --default-price-data.currency=usd \
  --default-price-data.unit_amount=999
stripe products create --name "Tokens — Pro (50)" \
  --metadata token_count=50 \
  --default-price-data.currency=usd \
  --default-price-data.unit_amount=1999
```
Expected: 4 JSON product objects printed. Note the `default_price` IDs (`price_xxx`) — they go in `.env.production`.

- [ ] **Step 2: Add the 4 price IDs to env**

Edit `d:/Antigravity/ahavah-api/.env.local` and `.env.production`:
```
STRIPE_PRICE_TOKENS_SINGLE=price_xxx
STRIPE_PRICE_TOKENS_STARTER=price_xxx
STRIPE_PRICE_TOKENS_PLUS=price_xxx
STRIPE_PRICE_TOKENS_PRO=price_xxx
```

- [ ] **Step 3: Commit env example**

```bash
cd d:/Antigravity/ahavah-api
# Add the 4 new variable names (no values) to the example file
# Then:
git add .env.example
git commit -m "feat(stripe): document token-bundle price env vars"
```

---

### Task 2.2: `POST /checkout/tokens { sku }` endpoint

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/checkout/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_checkout.py` (or create if missing)

- [ ] **Step 1: Write the failing test**

```python
# d:/Antigravity/ahavah-api/tests/test_checkout.py (append or create)
import pytest
pytestmark = pytest.mark.asyncio

async def test_checkout_tokens_returns_session_url(http, person, session_token,
                                                   stripe_mock):
    stripe_mock.checkout.Session.create.return_value = {
        "url": "https://checkout.stripe.com/c/pay/test_xyz"
    }
    res = await http.post("/checkout/tokens",
                          json={"sku": "starter"},
                          headers={"x-session-token": session_token})
    assert res.status_code == 200
    body = res.json()
    assert body["url"].startswith("https://checkout.stripe.com/")

async def test_checkout_tokens_rejects_unknown_sku(http, session_token):
    res = await http.post("/checkout/tokens",
                          json={"sku": "garbage"},
                          headers={"x-session-token": session_token})
    assert res.status_code == 400
    assert res.json()["error"] == "unknown_sku"
```

- [ ] **Step 2: Run — verify it fails**

```bash
pytest tests/test_checkout.py::test_checkout_tokens_returns_session_url -v
```
Expected: 404 route not found.

- [ ] **Step 3: Implement the endpoint**

```python
# Append to service/checkout/__init__.py
import os
import stripe

_TOKEN_SKU_ENV = {
    "single":  "STRIPE_PRICE_TOKENS_SINGLE",
    "starter": "STRIPE_PRICE_TOKENS_STARTER",
    "plus":    "STRIPE_PRICE_TOKENS_PLUS",
    "pro":     "STRIPE_PRICE_TOKENS_PRO",
}

@apost("/checkout/tokens")
async def post_checkout_tokens(s, payload):
    """Create a Stripe Checkout session for a token bundle SKU.

    payload: {"sku": "single" | "starter" | "plus" | "pro"}
    Returns: {"url": "<stripe checkout url>"}
    """
    sku = (payload or {}).get("sku")
    env_var = _TOKEN_SKU_ENV.get(sku)
    if not env_var:
        return {"error": "unknown_sku"}, 400
    price_id = os.environ[env_var]
    base_url = os.environ["FRONTEND_BASE_URL"]
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{base_url}/profile/tokens?purchased=1",
        cancel_url=f"{base_url}/profile/tokens?cancelled=1",
        client_reference_id=str(s.person_uuid),
        metadata={"sku": sku, "person_uuid": str(s.person_uuid)},
    )
    return {"url": session.url}
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_checkout.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/checkout/__init__.py tests/test_checkout.py
git commit -m "feat(checkout): POST /checkout/tokens — Stripe session for bundle SKU"
```

---

### Task 2.3: Webhook handler — credit tokens on `session.mode = payment`

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/checkout/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_checkout.py`

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_checkout.py
async def test_webhook_token_purchase_credits_balance(http, db, person):
    payload = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "mode": "payment",
            "client_reference_id": str(person["uuid"]),
            "id": "cs_test_xyz",
            "amount_total": 499,
            "metadata": {"sku": "starter", "person_uuid": str(person["uuid"])},
        }},
    }
    res = await http.post("/checkout/webhook",
                          json=payload,
                          headers={"stripe-signature": "test_sig_bypass"})
    assert res.status_code == 200
    from service.tokens import get_balance
    assert await get_balance(db, person["uuid"]) == 10
    # idempotency — re-delivery of the same session should not double-credit
    await http.post("/checkout/webhook", json=payload,
                    headers={"stripe-signature": "test_sig_bypass"})
    assert await get_balance(db, person["uuid"]) == 10
```

- [ ] **Step 2: Run — verify it fails**

```bash
pytest tests/test_checkout.py::test_webhook_token_purchase_credits_balance -v
```
Expected: balance is 0, not 10.

- [ ] **Step 3: Extend the webhook handler**

In `service/checkout/__init__.py`, find the existing `@apost("/checkout/webhook")` handler. Inside the `checkout.session.completed` branch, add a discriminator on `mode`:

```python
# Inside the handler, after parsing event["data"]["object"] as `session`:
SKU_TO_COUNT = {"single": 1, "starter": 10, "plus": 22, "pro": 50}

if session["mode"] == "payment":
    # Token bundle purchase
    person_uuid = session["client_reference_id"]
    sku = session["metadata"]["sku"]
    token_count = SKU_TO_COUNT[sku]
    session_id = session["id"]
    amount_cents = session["amount_total"]

    # Idempotency: check whether this Stripe session is already credited
    existing = await s.db.fetchval(
        "SELECT 1 FROM token_ledger WHERE metadata->>'stripe_session_id' = $1",
        session_id,
    )
    if existing:
        return {"ok": True}  # silent no-op on re-delivery

    from service.tokens import credit
    await credit(
        s.db, person_uuid, token_count,
        reason="purchase",
        metadata={
            "stripe_session_id": session_id,
            "sku": sku,
            "amount_cents": amount_cents,
        },
    )
elif session["mode"] == "subscription":
    # ...existing subscription code...
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_checkout.py -v
```
Expected: 3 passed (including the new one).

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/checkout/__init__.py tests/test_checkout.py
git commit -m "feat(checkout): webhook credits tokens on session.mode=payment (idempotent)"
```

---

## Phase 3 — Frontend: token balance Pill + store page

### Task 3.1: `useTokenBalance` hook + typed API

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/lib/use-token-balance.ts`
- Modify: `d:/Antigravity/ahavah-web/src/lib/api-types.ts`
- Create: `d:/Antigravity/ahavah-web/tests/lib/use-token-balance.test.ts`

- [ ] **Step 1: Add API type**

```typescript
// Append to src/lib/api-types.ts
export type TokenBalanceResponse = { balance: number };
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/lib/use-token-balance.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTokenBalance } from "@/lib/use-token-balance";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("useTokenBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns loading then balance", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ balance: 12 });
    const { result } = renderHook(() => useTokenBalance());
    expect(result.current.state).toBe("loading");
    await waitFor(() => expect(result.current.state).toBe("happy"));
    expect(result.current.balance).toBe(12);
  });

  it("returns 0 when unauthenticated (no session token)", async () => {
    // getSessionToken returns null; hook short-circuits with 0
    vi.mocked(apiClient.get).mockClear();
    const { result } = renderHook(() => useTokenBalance());
    await waitFor(() => expect(result.current.state).toBe("happy"));
    expect(result.current.balance).toBe(0);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("refresh() refetches", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ balance: 5 })
      .mockResolvedValueOnce({ balance: 8 });
    const { result } = renderHook(() => useTokenBalance());
    await waitFor(() => expect(result.current.balance).toBe(5));
    await result.current.refresh();
    await waitFor(() => expect(result.current.balance).toBe(8));
  });
});
```

Add a `getSessionToken` mock to the vi.mock block (look at existing `tests/lib/use-incoming-likes.test.ts` for the pattern; mirror it).

- [ ] **Step 3: Run — verify it fails**

```bash
cd d:/Antigravity/ahavah-web
pnpm test tests/lib/use-token-balance.test.ts
```
Expected: cannot resolve `@/lib/use-token-balance`.

- [ ] **Step 4: Implement the hook**

```typescript
// src/lib/use-token-balance.ts
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, getSessionToken } from "@/lib/api-client";
import type { TokenBalanceResponse } from "@/lib/api-types";

export type TokenBalanceState =
  | { state: "loading"; balance: 0 }
  | { state: "happy"; balance: number }
  | { state: "error"; balance: 0; message: string };

export function useTokenBalance(): TokenBalanceState & {
  refresh: () => Promise<void>;
} {
  const [s, setS] = useState<TokenBalanceState>({
    state: "loading",
    balance: 0,
  });

  const refresh = useCallback(async () => {
    if (!getSessionToken()) {
      setS({ state: "happy", balance: 0 });
      return;
    }
    setS({ state: "loading", balance: 0 });
    try {
      const res = await apiClient.get<TokenBalanceResponse>("/tokens/balance");
      setS({ state: "happy", balance: res.balance });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't load tokens.";
      setS({ state: "error", balance: 0, message: msg });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...s, refresh };
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test tests/lib/use-token-balance.test.ts
```
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
cd d:/Antigravity/ahavah-web
git add src/lib/api-types.ts src/lib/use-token-balance.ts tests/lib/use-token-balance.test.ts
git commit -m "feat(tokens): useTokenBalance hook + TokenBalanceResponse type"
```

---

### Task 3.2: `TokenBalancePill` sidebar component

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/components/app/token-balance-pill.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/components/app/sidebar.tsx`

- [ ] **Step 1: Implement the Pill**

```tsx
// src/components/app/token-balance-pill.tsx
"use client";

import Link from "next/link";
import { Circle } from "lucide-react";

import { Pill } from "@/components/kibo-ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useTokenBalance } from "@/lib/use-token-balance";

/**
 * TokenBalancePill — small lime Pill showing the user's current token
 * balance. Renders in the Sidebar bottom row (below the user-block).
 * Tap navigates to the token store at /profile/tokens.
 *
 * Hidden when unauthenticated (balance hook returns 0 + skips fetch).
 */
export function TokenBalancePill() {
  const { state, balance } = useTokenBalance();
  if (state === "loading") return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/profile/tokens" prefetch={false}>
          <Pill variant="lime" size="sm" aria-label={`${balance} tokens`}>
            <Circle className="size-3 fill-current" aria-hidden />
            <span className="tabular-nums">{balance}</span>
          </Pill>
        </Link>
      </TooltipTrigger>
      <TooltipContent>Tokens · tap to buy more</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Wire into Sidebar**

In `src/components/app/sidebar.tsx`, find the bottom user-block region (the one that renders the user avatar + name). Insert `<TokenBalancePill />` immediately above the user-block:

```tsx
// At top of sidebar.tsx:
import { TokenBalancePill } from "@/components/app/token-balance-pill";

// Inside the bottom region, before the user-block render:
<div className="flex items-center gap-2 px-3 pb-2">
  <TokenBalancePill />
</div>
```

- [ ] **Step 3: Typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/token-balance-pill.tsx src/components/app/sidebar.tsx
git commit -m "feat(tokens): TokenBalancePill in sidebar bottom row"
```

---

### Task 3.3: `/profile/tokens` store page

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/app/profile/tokens/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
// src/app/profile/tokens/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Circle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Choicebox,
  ChoiceboxIndicator,
  ChoiceboxItem,
  ChoiceboxItemDescription,
  ChoiceboxItemHeader,
  ChoiceboxItemTitle,
} from "@/components/kibo-ui/choicebox";

import { apiClient } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { PageHeader, PageHeaderTitle, PageShell } from "@/components/app/page-shell";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const SKUS = [
  { key: "single",  label: "Single",  price: "$0.99",  tokens: 1,
    per: "$0.99 / token", badge: null },
  { key: "starter", label: "Starter", price: "$4.99",  tokens: 10,
    per: "$0.50 / token", badge: null },
  { key: "plus",    label: "Plus",    price: "$9.99",  tokens: 22,
    per: "$0.45 / token", badge: "10% BONUS" },
  { key: "pro",     label: "Pro",     price: "$19.99", tokens: 50,
    per: "$0.40 / token", badge: "20% BONUS" },
];

export default function TokensPage() {
  const { balance } = useTokenBalance();
  const [selected, setSelected] = useState("starter");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuy = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.post<{ url?: string | null }>(
        "/checkout/tokens",
        { sku: selected },
      );
      if (res.url) {
        window.location.assign(res.url);
        return;
      }
      setErrorMessage("Stripe didn't return a checkout URL. Try again.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBusy(false);
    }
  };

  const activeSku = SKUS.find((s) => s.key === selected)!;

  return (
    <PageShell bottomPad="nav">
      <PageHeader>
        <PageHeaderTitle>Tokens</PageHeaderTitle>
      </PageHeader>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3 }}
        className="mt-2 px-5"
      >
        <Card tone="profile-section">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-meta uppercase tracking-wide text-text-secondary">
                Your balance
              </p>
              <p className="mt-1 flex items-center gap-2 text-display text-lime tabular-nums">
                <Circle className="size-6 fill-current" aria-hidden />
                {balance}
              </p>
            </div>
            <Sparkles className="size-8 text-lavender" aria-hidden />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="mt-6 px-5"
      >
        <h2 className="text-h3 text-white">Get more tokens</h2>
        <p className="mt-1 text-meta text-text-secondary">
          Use tokens for reveals, super-likes, day passes, and boosts.
        </p>
        <Choicebox
          value={selected}
          onValueChange={(v) => setSelected(v ?? "starter")}
          className="mt-4 grid gap-3"
        >
          {SKUS.map((s) => (
            <ChoiceboxItem key={s.key} value={s.key} id={`sku-${s.key}`}>
              <ChoiceboxIndicator variant="brand" />
              <ChoiceboxItemHeader>
                <ChoiceboxItemTitle className="text-body text-white">
                  {s.label} — {s.price}
                </ChoiceboxItemTitle>
                <ChoiceboxItemDescription className="text-meta text-text-secondary">
                  {s.tokens} {s.tokens === 1 ? "token" : "tokens"} · {s.per}
                </ChoiceboxItemDescription>
              </ChoiceboxItemHeader>
              {s.badge ? (
                <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-caption font-bold text-black">
                  {s.badge}
                </span>
              ) : null}
            </ChoiceboxItem>
          ))}
        </Choicebox>

        <Button
          size="cta"
          lift="float"
          className="mt-6"
          onClick={handleBuy}
          disabled={busy}
        >
          {busy ? "Opening checkout…" : `Get ${activeSku.tokens} tokens · ${activeSku.price}`}
        </Button>
        {errorMessage ? (
          <p className="mt-3 text-meta text-pink" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ duration: 0.3, delay: 0.16 }}
        className="mt-8 px-5 pb-12"
      >
        <Card tone="profile-section">
          <CardContent className="flex flex-col gap-2">
            <p className="text-meta font-semibold text-white">
              Want unlimited likes + see all who liked you?
            </p>
            <p className="text-caption text-text-secondary">
              Premium subscribers also get monthly tokens.
            </p>
            <Link
              href="/paywall"
              prefetch={false}
              className="mt-1 text-meta text-lavender underline"
            >
              See subscription plans →
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit && pnpm lint
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/tokens/page.tsx
git commit -m "feat(tokens): /profile/tokens store page with 4 SKU Choicebox"
```

---

## Phase 4 — Reveal-liker spend path

### Task 4.1: Backend `POST /tokens/reveal { liker_id }`

**Files:**
- Create: `d:/Antigravity/ahavah-api/service/tokens/actions/reveal.py`
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py`
- Create: `d:/Antigravity/ahavah-api/tests/test_token_reveal.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_token_reveal.py
import pytest
from service.tokens import credit, get_balance

pytestmark = pytest.mark.asyncio

async def test_reveal_debits_token_and_records_pair(
    http, db, person, liker, session_token
):
    await credit(db, person["uuid"], 3, reason="purchase", metadata={})
    res = await http.post(
        "/tokens/reveal",
        json={"liker_id": str(liker["uuid"])},
        headers={"x-session-token": session_token},
    )
    assert res.status_code == 200
    assert await get_balance(db, person["uuid"]) == 2
    row = await db.fetchrow(
        "SELECT 1 FROM revealed_likers WHERE viewer_id=$1 AND liker_id=$2",
        person["uuid"], liker["uuid"],
    )
    assert row is not None

async def test_reveal_is_idempotent_no_double_debit(
    http, db, person, liker, session_token
):
    await credit(db, person["uuid"], 3, reason="purchase", metadata={})
    headers = {"x-session-token": session_token}
    body = {"liker_id": str(liker["uuid"])}
    await http.post("/tokens/reveal", json=body, headers=headers)
    await http.post("/tokens/reveal", json=body, headers=headers)
    # Second call should NOT debit again (already revealed)
    assert await get_balance(db, person["uuid"]) == 2

async def test_reveal_402_when_insufficient(http, db, person, liker, session_token):
    res = await http.post(
        "/tokens/reveal",
        json={"liker_id": str(liker["uuid"])},
        headers={"x-session-token": session_token},
    )
    assert res.status_code == 402
    assert res.json()["error"] == "insufficient_tokens"
```

- [ ] **Step 2: Run — verify it fails**

```bash
pytest tests/test_token_reveal.py -v
```
Expected: 404 (route not registered).

- [ ] **Step 3: Implement the handler**

```python
# service/tokens/actions/reveal.py
"""Reveal a hidden liker for 1 token (idempotent per viewer/liker pair)."""

from uuid import UUID
from service.tokens import debit, InsufficientTokens

COST = 1

_Q_ALREADY_REVEALED = """
  SELECT 1 FROM revealed_likers
   WHERE viewer_id = $1 AND liker_id = $2
"""

_Q_INSERT_REVEAL = """
  INSERT INTO revealed_likers (viewer_id, liker_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
"""


async def perform(db, viewer_uuid: UUID | str, liker_uuid: UUID | str) -> dict:
    """Spend 1 token to reveal a liker.

    Idempotent: if already revealed, no debit + no error. Returns
    {"revealed": True}.
    """
    async with db.transaction():
        already = await db.fetchval(_Q_ALREADY_REVEALED, viewer_uuid, liker_uuid)
        if already:
            return {"revealed": True}
        await debit(
            db, viewer_uuid, COST,
            reason="reveal_liker",
            metadata={"revealed_liker_id": str(liker_uuid)},
        )
        await db.execute(_Q_INSERT_REVEAL, viewer_uuid, liker_uuid)
        return {"revealed": True}
```

Append to `service/api/__init__.py`:

```python
from service.tokens.actions.reveal import perform as perform_reveal
from service.tokens import InsufficientTokens

@apost("/tokens/reveal")
async def post_tokens_reveal(s, payload):
    liker_id = (payload or {}).get("liker_id")
    if not liker_id:
        return {"error": "missing_liker_id"}, 400
    try:
        return await perform_reveal(s.db, s.person_uuid, liker_id)
    except InsufficientTokens:
        return {"error": "insufficient_tokens"}, 402
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_token_reveal.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/tokens/actions/reveal.py service/api/__init__.py tests/test_token_reveal.py
git commit -m "feat(tokens): POST /tokens/reveal — spend 1 token, idempotent per viewer/liker"
```

---

### Task 4.2: `/likes/incoming` returns photo URLs for revealed likers

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/decisions/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_decisions.py` (or create new test file)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_decisions.py (append)
async def test_incoming_likes_includes_revealed_photos_for_non_premium(
    http, db, person, liker, session_token
):
    # Simulate the liker has liked `person`
    await db.execute(
        "INSERT INTO liked (liker_id, liked_id) VALUES ($1, $2)",
        liker["uuid"], person["uuid"],
    )
    # Without reveal: person sees the count but no photos in the array
    res = await http.get("/likes/incoming",
                         headers={"x-session-token": session_token})
    assert res.status_code == 200
    assert res.json()["count"] == 1
    assert res.json()["premium"] is False
    assert res.json()["likes"] == []

    # After reveal: the liker's photo URL appears
    from service.tokens import credit
    await credit(db, person["uuid"], 3, reason="purchase", metadata={})
    await http.post("/tokens/reveal",
                    json={"liker_id": str(liker["uuid"])},
                    headers={"x-session-token": session_token})
    res = await http.get("/likes/incoming",
                         headers={"x-session-token": session_token})
    body = res.json()
    assert body["count"] == 1
    assert len(body["likes"]) == 1
    assert body["likes"][0]["with_profile"]["id"] == str(liker["uuid"])
```

- [ ] **Step 2: Run — verify it fails**

```bash
pytest tests/test_decisions.py::test_incoming_likes_includes_revealed_photos_for_non_premium -v
```
Expected: second assertion fails (likes still empty post-reveal).

- [ ] **Step 3: Modify the `get_incoming_likes` handler**

In `service/decisions/__init__.py`, locate `get_incoming_likes(s)`. Replace its existing logic with:

```python
_Q_REVEALED_IDS = """
  SELECT liker_id FROM revealed_likers WHERE viewer_id = $1
"""

_Q_LIST_INCOMING = """
  SELECT l.liker_id, peer.uuid, peer.name, peer.date_of_birth,
         peer.photo_uuids, l.created_at
    FROM liked l
    JOIN person peer ON peer.uuid = l.liker_id
   WHERE l.liked_id = $1
     AND NOT EXISTS (
       SELECT 1 FROM liked rl
        WHERE rl.liker_id = $1 AND rl.liked_id = l.liker_id
     )
   ORDER BY l.created_at DESC
   LIMIT 100
"""

async def get_incoming_likes(s):
    rows = await s.db.fetch(_Q_LIST_INCOMING, s.person_uuid)
    is_premium = "premium" in (s.entitlements or [])
    revealed_ids = {
        r["liker_id"] for r in await s.db.fetch(_Q_REVEALED_IDS, s.person_uuid)
    }

    def visible(r):
        return is_premium or r["liker_id"] in revealed_ids

    return {
        "count": len(rows),
        "premium": is_premium,
        "likes": [
            {
                "with_profile": {
                    "id": str(r["uuid"]),
                    "firstName": r["name"],
                    "age": _years_since(r["date_of_birth"]),
                    "photo_uuids": list(r["photo_uuids"] or []),
                },
                "liked_at": r["created_at"].isoformat(),
            }
            for r in rows if visible(r)
        ],
    }
```

(Keep the existing `_years_since` helper if present, or import it from where it lives.)

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_decisions.py -v
```
Expected: pass.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/decisions/__init__.py tests/test_decisions.py
git commit -m "feat(decisions): /likes/incoming includes revealed likers for non-premium"
```

---

### Task 4.3: Frontend `TokenSpendSheet` reusable confirmation

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/components/app/token-spend-sheet.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/app/token-spend-sheet.tsx
"use client";

import { Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * TokenSpendSheet — reusable bottom-Sheet confirmation for any token
 * spend (reveal, super-like, day-pass, boost). Caller controls open
 * state + provides the action title, cost, current balance, and the
 * confirm handler.
 *
 * If `currentBalance < cost`, the confirm Button is replaced with a
 * "Get tokens" Link to /profile/tokens.
 */
export function TokenSpendSheet({
  open,
  onOpenChange,
  title,
  description,
  cost,
  currentBalance,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  cost: number;
  currentBalance: number;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  const insufficient = currentBalance < cost;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-bg-indigo"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-text-secondary">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-bg-elevated px-4 py-3">
          <span className="text-meta text-white">Cost</span>
          <span className="flex items-center gap-1 text-meta font-semibold text-lime tabular-nums">
            <Circle className="size-3 fill-current" aria-hidden />
            {cost} {cost === 1 ? "token" : "tokens"}
          </span>
        </div>
        <p className="mt-2 text-caption text-text-muted">
          Your balance: <span className="tabular-nums">{currentBalance}</span>
          {insufficient ? " — not enough to confirm" : ""}
        </p>

        <SheetFooter className="mt-4 flex-col gap-2">
          {insufficient ? (
            <Button
              size="cta"
              variant="default"
              onClick={() => {
                onOpenChange(false);
                window.location.assign("/profile/tokens");
              }}
            >
              Get tokens
            </Button>
          ) : (
            <Button
              size="cta"
              lift="float"
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              {busy ? "Working…" : `Confirm · ${cost} ${cost === 1 ? "token" : "tokens"}`}
            </Button>
          )}
          <Button
            variant="link"
            size="tap"
            className="self-center text-text-muted"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/app/token-spend-sheet.tsx
git commit -m "feat(tokens): TokenSpendSheet — reusable spend-confirmation kit composition"
```

---

### Task 4.4: Wire reveal into `/matches > Liked you` tab

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/matches/page.tsx`

- [ ] **Step 1: Add reveal state + Sheet**

Locate the `LikesLockedState` or equivalent render block where blurred liker cards are mapped (search for `kind: "locked"` or the blurred-grid section).

Before the return: add state at the top of the component:

```tsx
import { useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";

// inside the component:
const [revealing, setRevealing] = useState<{ id: string; name: string } | null>(null);
const [revealBusy, setRevealBusy] = useState(false);
const { balance, refresh: refreshBalance } = useTokenBalance();

const confirmReveal = async () => {
  if (!revealing) return;
  setRevealBusy(true);
  try {
    await apiClient.post("/tokens/reveal", { liker_id: revealing.id });
    await refreshBalance();
    // Refetch likes so the now-revealed card renders unblurred
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      // insufficient — Sheet already shows the Get-tokens fallback
    }
  } finally {
    setRevealBusy(false);
    setRevealing(null);
  }
};
```

Where each blurred card is rendered (inside the `.map((like) => ...)`), make the card tappable:

```tsx
<button
  type="button"
  onClick={() => setRevealing({
    id: like.with_profile.id,
    name: like.with_profile.firstName ?? "Someone",
  })}
  className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-lavender"
>
  {/* existing blurred card content */}
</button>
```

After the return's closing tag (still inside the page JSX):

```tsx
<TokenSpendSheet
  open={revealing !== null}
  onOpenChange={(o) => { if (!o) setRevealing(null); }}
  title={`Reveal ${revealing?.name ?? "this person"}?`}
  description="Costs 1 token. Their photo will be unblurred for you."
  cost={1}
  currentBalance={balance}
  onConfirm={confirmReveal}
  busy={revealBusy}
/>
```

- [ ] **Step 2: Typecheck**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/matches/page.tsx
git commit -m "feat(tokens): /matches > Liked you cards tap to reveal via TokenSpendSheet"
```

---

## Phase 5 — Quota enforcement + day-pass

### Task 5.1: Backend quota helper + 429 on `POST /decisions`

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/decisions/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_decisions.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_decisions.py (append)
async def test_quota_enforced_for_free_user(http, db, person, candidates, session_token):
    # candidates is a fixture giving us 11 candidate UUIDs
    headers = {"x-session-token": session_token}
    for c in candidates[:10]:
        res = await http.post("/decisions",
                              json={"candidate_id": str(c), "decision": "like"},
                              headers=headers)
        assert res.status_code == 200
    res = await http.post("/decisions",
                          json={"candidate_id": str(candidates[10]), "decision": "like"},
                          headers=headers)
    assert res.status_code == 429
    body = res.json()
    assert body["error"] == "quota_exceeded"
    assert "resets_at" in body

async def test_quota_bypassed_for_premium(http, db, premium_person, candidates, premium_token):
    headers = {"x-session-token": premium_token}
    for c in candidates[:11]:
        res = await http.post("/decisions",
                              json={"candidate_id": str(c), "decision": "like"},
                              headers=headers)
        assert res.status_code == 200

async def test_quota_bypassed_with_active_day_pass(
    http, db, person, candidates, session_token
):
    # Insert an active day-pass ledger row directly
    from datetime import datetime, timedelta, timezone
    expires = (datetime.now(tz=timezone.utc) + timedelta(hours=24)).isoformat()
    await db.execute(
        """INSERT INTO token_ledger (person_id, delta, reason, metadata)
           VALUES ($1, 5, 'purchase', '{}'::jsonb)""",
        person["uuid"],
    )
    await db.execute(
        """INSERT INTO token_ledger (person_id, delta, reason, metadata)
           VALUES ($1, -3, 'day_pass', $2::jsonb)""",
        person["uuid"], '{"expires_at":"' + expires + '"}',
    )
    headers = {"x-session-token": session_token}
    for c in candidates[:11]:
        res = await http.post("/decisions",
                              json={"candidate_id": str(c), "decision": "like"},
                              headers=headers)
        assert res.status_code == 200
```

- [ ] **Step 2: Run — verify it fails**

```bash
pytest tests/test_decisions.py -v -k quota
```
Expected: first test fails — 11th like returns 200, not 429.

- [ ] **Step 3: Add quota enforcement**

Append to `service/decisions/__init__.py`:

```python
DAILY_LIKE_QUOTA = 10
QUOTA_WINDOW = "INTERVAL '24 hours'"

_Q_COUNT_RECENT_LIKES = """
  SELECT COUNT(*) FROM liked
   WHERE liker_id = $1
     AND created_at > NOW() - INTERVAL '24 hours'
"""

_Q_OLDEST_LIKE_IN_WINDOW = """
  SELECT MIN(created_at) FROM liked
   WHERE liker_id = $1
     AND created_at > NOW() - INTERVAL '24 hours'
"""

_Q_HAS_ACTIVE_DAY_PASS = """
  SELECT 1 FROM token_ledger
   WHERE person_id = $1
     AND reason = 'day_pass'
     AND (metadata->>'expires_at')::timestamptz > NOW()
   LIMIT 1
"""


async def _check_like_quota(s):
    """Returns None if allowed, or (status, body) tuple if blocked.

    Premium → allowed. Active day-pass → allowed. Otherwise count
    likes in last 24h; if >= DAILY_LIKE_QUOTA, return 429.
    """
    if "premium" in (s.entitlements or []):
        return None
    if await s.db.fetchval(_Q_HAS_ACTIVE_DAY_PASS, s.person_uuid):
        return None
    count = await s.db.fetchval(_Q_COUNT_RECENT_LIKES, s.person_uuid) or 0
    if count < DAILY_LIKE_QUOTA:
        return None
    oldest = await s.db.fetchval(_Q_OLDEST_LIKE_IN_WINDOW, s.person_uuid)
    from datetime import timedelta
    resets_at = (oldest + timedelta(hours=24)).isoformat() if oldest else None
    return (429, {"error": "quota_exceeded", "resets_at": resets_at})
```

Find the existing `@apost("/decisions")` handler. Near the top, before the existing decision-processing code, add:

```python
if payload.get("decision") == "like":
    blocked = await _check_like_quota(s)
    if blocked:
        status, body = blocked
        return body, status
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_decisions.py -v -k quota
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/decisions/__init__.py tests/test_decisions.py
git commit -m "feat(decisions): enforce 10/day like quota for free users (429 + resets_at)"
```

---

### Task 5.2: Backend `POST /tokens/day-pass`

**Files:**
- Create: `d:/Antigravity/ahavah-api/service/tokens/actions/day_pass.py`
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py`
- Create: `d:/Antigravity/ahavah-api/tests/test_token_day_pass.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_token_day_pass.py
import pytest
from datetime import datetime, timezone
from service.tokens import credit, get_balance

pytestmark = pytest.mark.asyncio

async def test_day_pass_debits_3_and_writes_expires_at(
    http, db, person, session_token
):
    await credit(db, person["uuid"], 5, reason="purchase", metadata={})
    res = await http.post("/tokens/day-pass",
                          headers={"x-session-token": session_token})
    assert res.status_code == 200
    assert await get_balance(db, person["uuid"]) == 2
    row = await db.fetchrow(
        """SELECT metadata->>'expires_at' AS exp FROM token_ledger
            WHERE person_id=$1 AND reason='day_pass'
            ORDER BY created_at DESC LIMIT 1""",
        person["uuid"],
    )
    exp = datetime.fromisoformat(row["exp"])
    delta = (exp - datetime.now(tz=timezone.utc)).total_seconds()
    assert 23 * 3600 < delta <= 24 * 3600

async def test_day_pass_402_when_insufficient(http, db, person, session_token):
    res = await http.post("/tokens/day-pass",
                          headers={"x-session-token": session_token})
    assert res.status_code == 402
```

- [ ] **Step 2: Run — fails**

```bash
pytest tests/test_token_day_pass.py -v
```
Expected: 404.

- [ ] **Step 3: Implement**

```python
# service/tokens/actions/day_pass.py
"""Spend 3 tokens to bypass the like quota for 24 hours."""
from datetime import datetime, timedelta, timezone
from service.tokens import debit

COST = 3
DURATION = timedelta(hours=24)


async def perform(db, person_uuid) -> dict:
    expires = (datetime.now(tz=timezone.utc) + DURATION).isoformat()
    async with db.transaction():
        await debit(
            db, person_uuid, COST,
            reason="day_pass",
            metadata={"expires_at": expires},
        )
    return {"day_pass": {"expires_at": expires}}
```

Append to `service/api/__init__.py`:

```python
from service.tokens.actions.day_pass import perform as perform_day_pass

@apost("/tokens/day-pass")
async def post_tokens_day_pass(s, payload):
    try:
        return await perform_day_pass(s.db, s.person_uuid)
    except InsufficientTokens:
        return {"error": "insufficient_tokens"}, 402
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_token_day_pass.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/tokens/actions/day_pass.py service/api/__init__.py tests/test_token_day_pass.py
git commit -m "feat(tokens): POST /tokens/day-pass — 3 tokens for 24h quota bypass"
```

---

### Task 5.3: Frontend `QuotaExceededCard` + day-pass spend

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/components/app/quota-exceeded-card.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/app/discover/page.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/lib/use-decisions.ts` (or wherever `decide()` is defined)

- [ ] **Step 1: Surface 429 from `decide()`**

In `src/lib/use-decisions.ts` (or wherever the decision POST happens), the existing `decide()` function throws on non-200. Catch the 429 case and return a typed result:

```typescript
export type DecideResult =
  | { kind: "ok"; matchId: string | null }
  | { kind: "quota_exceeded"; resetsAt: string | null };

// Inside decide():
try {
  const res = await apiClient.post<{ match_id?: string | null }>(...);
  return { kind: "ok", matchId: res.match_id ?? null };
} catch (e) {
  if (e instanceof ApiError && e.status === 429) {
    const data = e.body as { resets_at?: string | null } | undefined;
    return { kind: "quota_exceeded", resetsAt: data?.resets_at ?? null };
  }
  throw e;
}
```

- [ ] **Step 2: Implement the Card**

```tsx
// src/components/app/quota-exceeded-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";

/**
 * QuotaExceededCard — shown on /discover when the user hits the 10/day
 * cap. Offers two paths forward: subscribe to /paywall for unlimited,
 * or spend 3 tokens for a 24h day-pass. Resets-at timestamp shown so
 * users know exactly when they'll be back to free likes.
 */
export function QuotaExceededCard({
  resetsAt,
  onDayPassActivated,
}: {
  resetsAt: string | null;
  onDayPassActivated: () => void;
}) {
  const { balance, refresh } = useTokenBalance();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const resetsLabel = (() => {
    if (!resetsAt) return null;
    const ms = new Date(resetsAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  const handleDayPass = async () => {
    setBusy(true);
    try {
      await apiClient.post("/tokens/day-pass", {});
      await refresh();
      setSheetOpen(false);
      onDayPassActivated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        // insufficient — Sheet shows Get-tokens fallback
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card tone="profile-section">
        <CardContent className="flex flex-col gap-3 text-center">
          <h2 className="text-h2 text-white">Out of likes for today</h2>
          {resetsLabel ? (
            <p className="text-meta text-text-secondary">
              Resets in {resetsLabel}.
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              size="cta"
              variant="default"
              render={<Link href="/paywall" prefetch={false} />}
            >
              Upgrade for unlimited
            </Button>
            <Button
              size="cta"
              variant="outlineSubtle"
              onClick={() => setSheetOpen(true)}
            >
              Day pass · 3 tokens
            </Button>
          </div>
        </CardContent>
      </Card>

      <TokenSpendSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Day pass — unlimited likes for 24 hours"
        description="Bypass today's like quota. The pass expires 24 hours after purchase."
        cost={3}
        currentBalance={balance}
        onConfirm={handleDayPass}
        busy={busy}
      />
    </>
  );
}
```

- [ ] **Step 3: Wire into `/discover`**

In `src/app/discover/page.tsx`:

```tsx
import { QuotaExceededCard } from "@/components/app/quota-exceeded-card";

// inside component:
const [quotaState, setQuotaState] = useState<{ resetsAt: string | null } | null>(null);

// inside advance() where decide() is called, switch to the new DecideResult shape:
const result = await decide(candidateId, decision);
if (result.kind === "quota_exceeded") {
  setQuotaState({ resetsAt: result.resetsAt });
  setDecidedIds(/* ... rollback the optimistic remove ... */);
  return;
}
if (result.kind === "ok" && decision === "like" && result.matchId) {
  router.push(`/match?matchId=${encodeURIComponent(result.matchId)}`);
  return;
}

// In the render block, replace the empty-state section with conditional render:
{quotaState ? (
  <QuotaExceededCard
    resetsAt={quotaState.resetsAt}
    onDayPassActivated={() => setQuotaState(null)}
  />
) : candidate ? (
  /* existing card render */
) : (
  /* existing empty state */
)}
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit && pnpm lint
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-decisions.ts src/components/app/quota-exceeded-card.tsx src/app/discover/page.tsx
git commit -m "feat(tokens): /discover surfaces QuotaExceededCard with day-pass spend"
```

---

## Phase 6 — Super-like spend path

### Task 6.1: Backend `POST /tokens/super-like`

**Files:**
- Create: `d:/Antigravity/ahavah-api/service/tokens/actions/super_like.py`
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py`
- Create: `d:/Antigravity/ahavah-api/tests/test_token_super_like.py`

- [ ] **Step 1: Test**

```python
# tests/test_token_super_like.py
import pytest
from service.tokens import credit, get_balance

pytestmark = pytest.mark.asyncio

async def test_super_like_debits_2_and_inserts_liked_is_super(
    http, db, person, candidate, session_token
):
    await credit(db, person["uuid"], 5, reason="purchase", metadata={})
    res = await http.post(
        "/tokens/super-like",
        json={"person_id": str(candidate["uuid"])},
        headers={"x-session-token": session_token},
    )
    assert res.status_code == 200
    assert await get_balance(db, person["uuid"]) == 3
    row = await db.fetchrow(
        "SELECT is_super FROM liked WHERE liker_id=$1 AND liked_id=$2",
        person["uuid"], candidate["uuid"],
    )
    assert row["is_super"] is True

async def test_super_like_402_when_insufficient(http, db, person, candidate, session_token):
    res = await http.post("/tokens/super-like",
                          json={"person_id": str(candidate["uuid"])},
                          headers={"x-session-token": session_token})
    assert res.status_code == 402
```

- [ ] **Step 2: Implement**

```python
# service/tokens/actions/super_like.py
"""Spend 2 tokens to send a super-like (priority + visual signal)."""
from service.tokens import debit

COST = 2

_Q_INSERT_LIKED = """
  INSERT INTO liked (liker_id, liked_id, is_super)
       VALUES ($1, $2, TRUE)
  ON CONFLICT (liker_id, liked_id) DO UPDATE SET is_super = TRUE
  RETURNING id
"""

_Q_MATCH_CHECK = """
  SELECT 1 FROM liked WHERE liker_id = $1 AND liked_id = $2
"""


async def perform(db, viewer_uuid, person_uuid) -> dict:
    async with db.transaction():
        await debit(
            db, viewer_uuid, COST,
            reason="super_like",
            metadata={"super_liked_person_id": str(person_uuid)},
        )
        liked_id = await db.fetchval(_Q_INSERT_LIKED, viewer_uuid, person_uuid)
        # Match check — if the target already liked us, this is a mutual.
        is_match = await db.fetchval(_Q_MATCH_CHECK, person_uuid, viewer_uuid) is not None
    return {"super_liked": True, "match_id": str(liked_id) if is_match else None}
```

Append to `service/api/__init__.py`:

```python
from service.tokens.actions.super_like import perform as perform_super_like

@apost("/tokens/super-like")
async def post_tokens_super_like(s, payload):
    person_id = (payload or {}).get("person_id")
    if not person_id:
        return {"error": "missing_person_id"}, 400
    try:
        return await perform_super_like(s.db, s.person_uuid, person_id)
    except InsufficientTokens:
        return {"error": "insufficient_tokens"}, 402
```

- [ ] **Step 3: Run tests** — expect 2 passed.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/tokens/actions/super_like.py service/api/__init__.py tests/test_token_super_like.py
git commit -m "feat(tokens): POST /tokens/super-like — 2 tokens, sets liked.is_super=TRUE"
```

---

### Task 6.2: `/likes/incoming` sorts super-likes first

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/decisions/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_decisions.py`

- [ ] **Step 1: Test**

```python
async def test_incoming_likes_super_first(http, db, person, liker, liker2, session_token):
    # regular like from liker
    await db.execute("INSERT INTO liked (liker_id, liked_id) VALUES ($1, $2)",
                     liker["uuid"], person["uuid"])
    # super-like from liker2
    await db.execute(
        "INSERT INTO liked (liker_id, liked_id, is_super) VALUES ($1, $2, TRUE)",
        liker2["uuid"], person["uuid"],
    )
    # make person premium so all likes visible
    await db.execute("UPDATE person SET entitlements = ARRAY['premium'] WHERE uuid=$1",
                     person["uuid"])
    res = await http.get("/likes/incoming",
                         headers={"x-session-token": session_token})
    likes = res.json()["likes"]
    assert likes[0]["with_profile"]["id"] == str(liker2["uuid"])  # super first
    assert likes[1]["with_profile"]["id"] == str(liker["uuid"])
    assert likes[0]["is_super"] is True
    assert likes[1]["is_super"] is False
```

- [ ] **Step 2: Update the query + response**

In `service/decisions/__init__.py` modify `_Q_LIST_INCOMING`:

```python
_Q_LIST_INCOMING = """
  SELECT l.liker_id, l.is_super, peer.uuid, peer.name, peer.date_of_birth,
         peer.photo_uuids, l.created_at
    FROM liked l
    JOIN person peer ON peer.uuid = l.liker_id
   WHERE l.liked_id = $1
     AND NOT EXISTS (
       SELECT 1 FROM liked rl
        WHERE rl.liker_id = $1 AND rl.liked_id = l.liker_id
     )
   ORDER BY l.is_super DESC, l.created_at DESC
   LIMIT 100
"""
```

And in the response dict for each like, add:

```python
"is_super": bool(r["is_super"]),
```

- [ ] **Step 3: Update the frontend type**

Edit `src/lib/use-incoming-likes.ts` `IncomingLike` type:

```typescript
export type IncomingLike = {
  with_profile: { ... };
  liked_at: string;
  is_super: boolean;
};
```

- [ ] **Step 4: Run tests + typecheck**

```bash
cd d:/Antigravity/ahavah-api && pytest tests/test_decisions.py -v -k super_first
cd d:/Antigravity/ahavah-web && npx tsc --noEmit
```

- [ ] **Step 5: Commit (both repos)**

```bash
cd d:/Antigravity/ahavah-api
git add service/decisions/__init__.py tests/test_decisions.py
git commit -m "feat(decisions): /likes/incoming sorts is_super=TRUE first, exposes flag"

cd d:/Antigravity/ahavah-web
git add src/lib/use-incoming-likes.ts
git commit -m "feat(types): IncomingLike.is_super boolean"
```

---

### Task 6.3: Super-like Button on `/discover` + recipient ring on cards

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/discover/page.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/app/matches/page.tsx`

- [ ] **Step 1: Add Super-like Button to /discover action row**

In `/discover/page.tsx` action row, between Skip and Like, add a circle Button. Wire it to a `TokenSpendSheet` for the 2-token confirmation. On confirm, call `apiClient.post("/tokens/super-like", { person_id: candidate.id })` and advance the deck via the same `advance("like")` flow plus a one-off setExitDirection.

```tsx
import { Sparkles } from "lucide-react";
// state:
const [superLiking, setSuperLiking] = useState(false);
const [superSheetOpen, setSuperSheetOpen] = useState(false);
const { balance: tokenBalance, refresh: refreshTokens } = useTokenBalance();

const handleSuperLike = async () => {
  if (!candidate) return;
  setSuperLiking(true);
  try {
    const r = await apiClient.post<{ match_id?: string | null }>(
      "/tokens/super-like",
      { person_id: candidate.id },
    );
    await refreshTokens();
    setSuperSheetOpen(false);
    if (r.match_id) {
      router.push(`/match?matchId=${encodeURIComponent(r.match_id)}`);
      return;
    }
    // advance to next card without re-POSTing /decisions
    setDecidedIds((prev) => new Set(prev).add(candidate.id));
    setExitDirection("right");
  } finally {
    setSuperLiking(false);
  }
};

// Action row JSX — insert between Skip and Like:
<div className="flex flex-col items-center gap-2">
  <Button
    size="circle"
    tone="cta"
    lift="float"
    aria-label="Super-like"
    onClick={() => setSuperSheetOpen(true)}
  >
    <Sparkles className="text-black" />
  </Button>
  <span className="hidden text-meta font-medium text-text-secondary lg:inline">
    Super
  </span>
</div>

// After the page return body:
<TokenSpendSheet
  open={superSheetOpen}
  onOpenChange={setSuperSheetOpen}
  title={`Super-like ${candidate?.firstName ?? "this person"}?`}
  description="They'll see your like at the top of their deck with a lime ring."
  cost={2}
  currentBalance={tokenBalance}
  onConfirm={handleSuperLike}
  busy={superLiking}
/>
```

- [ ] **Step 2: Add super-like visual on /matches > Liked you**

Where each `IncomingLike` is rendered in the grid, conditionally add a lime ring + small "Super liked you" pill if `like.is_super`:

```tsx
<div className={cn(
  "relative rounded-2xl",
  like.is_super && "ring-2 ring-lime ring-offset-2 ring-offset-bg-canvas",
)}>
  {like.is_super ? (
    <Pill
      variant="lime"
      size="sm"
      className="absolute top-2 left-2 z-10"
    >
      <Sparkles className="size-3" /> Super
    </Pill>
  ) : null}
  {/* existing card content */}
</div>
```

- [ ] **Step 3: Typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/discover/page.tsx src/app/matches/page.tsx
git commit -m "feat(tokens): super-like Button on /discover + lime-ring signal on /matches"
```

---

## Phase 7 — Boost spend path

### Task 7.1: Backend `POST /tokens/boost`

**Files:**
- Create: `d:/Antigravity/ahavah-api/service/tokens/actions/boost.py`
- Modify: `d:/Antigravity/ahavah-api/service/api/__init__.py`
- Create: `d:/Antigravity/ahavah-api/tests/test_token_boost.py`

- [ ] **Step 1: Test**

```python
# tests/test_token_boost.py
import pytest
from datetime import datetime, timedelta, timezone
from service.tokens import credit, get_balance

pytestmark = pytest.mark.asyncio

async def test_boost_debits_5_and_inserts_active_boost(
    http, db, person, session_token
):
    await credit(db, person["uuid"], 10, reason="purchase", metadata={})
    res = await http.post("/tokens/boost",
                          headers={"x-session-token": session_token})
    assert res.status_code == 200
    assert await get_balance(db, person["uuid"]) == 5
    row = await db.fetchrow(
        "SELECT started_at, expires_at FROM active_boosts WHERE person_id=$1",
        person["uuid"],
    )
    delta = (row["expires_at"] - row["started_at"]).total_seconds()
    assert 29 * 60 < delta <= 30 * 60 + 1

async def test_boost_replaces_existing_active(http, db, person, session_token):
    await credit(db, person["uuid"], 20, reason="purchase", metadata={})
    headers = {"x-session-token": session_token}
    await http.post("/tokens/boost", headers=headers)
    await http.post("/tokens/boost", headers=headers)
    # Both calls debit 5 each
    assert await get_balance(db, person["uuid"]) == 10
    # Only one active row
    n = await db.fetchval("SELECT COUNT(*) FROM active_boosts WHERE person_id=$1",
                          person["uuid"])
    assert n == 1
```

- [ ] **Step 2: Implement**

```python
# service/tokens/actions/boost.py
"""Spend 5 tokens for a 30-minute profile spotlight in nearby decks."""
from datetime import datetime, timedelta, timezone
from service.tokens import debit

COST = 5
DURATION = timedelta(minutes=30)

_Q_UPSERT_BOOST = """
  INSERT INTO active_boosts (person_id, started_at, expires_at)
       VALUES ($1, NOW(), NOW() + INTERVAL '30 minutes')
  ON CONFLICT (person_id) DO UPDATE
     SET started_at = EXCLUDED.started_at,
         expires_at = EXCLUDED.expires_at
  RETURNING started_at, expires_at
"""


async def perform(db, person_uuid) -> dict:
    async with db.transaction():
        await debit(
            db, person_uuid, COST,
            reason="boost",
            metadata={},  # boost_row_id filled below
        )
        row = await db.fetchrow(_Q_UPSERT_BOOST, person_uuid)
    return {
        "boost": {
            "started_at": row["started_at"].isoformat(),
            "expires_at": row["expires_at"].isoformat(),
        }
    }
```

Append to `service/api/__init__.py`:

```python
from service.tokens.actions.boost import perform as perform_boost

@apost("/tokens/boost")
async def post_tokens_boost(s, payload):
    try:
        return await perform_boost(s.db, s.person_uuid)
    except InsufficientTokens:
        return {"error": "insufficient_tokens"}, 402

@aget("/tokens/active-boost")
async def get_active_boost(s):
    row = await s.db.fetchrow(
        "SELECT started_at, expires_at FROM active_boosts "
        "WHERE person_id=$1 AND expires_at > NOW()",
        s.person_uuid,
    )
    if not row:
        return {"active": False}
    return {
        "active": True,
        "started_at": row["started_at"].isoformat(),
        "expires_at": row["expires_at"].isoformat(),
    }
```

- [ ] **Step 3: Run tests** — expect 2 passed.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/tokens/actions/boost.py service/api/__init__.py tests/test_token_boost.py
git commit -m "feat(tokens): POST /tokens/boost + GET /tokens/active-boost (30-min spotlight)"
```

---

### Task 7.2: `/search` joins `active_boosts` and sorts boosted candidates first

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/person/sql/__init__.py` (or wherever `Q_CACHED_SEARCH` / `Q_UNCACHED_SEARCH` live)
- Modify: `d:/Antigravity/ahavah-api/tests/test_search.py` (or create)

- [ ] **Step 1: Test**

```python
async def test_search_orders_boosted_first(http, db, person, candidates, session_token):
    # candidates[3] is boosted (active row in active_boosts)
    boosted_uuid = candidates[3]
    await db.execute(
        "INSERT INTO active_boosts (person_id, started_at, expires_at) "
        "VALUES ($1, NOW(), NOW() + INTERVAL '30 minutes')",
        boosted_uuid,
    )
    res = await http.get("/search?limit=10",
                         headers={"x-session-token": session_token})
    body = res.json()
    # boosted candidate should be the first returned
    assert body["candidates"][0]["id"] == str(boosted_uuid)
```

- [ ] **Step 2: Modify the search query**

Locate the SQL in `service/person/sql/__init__.py` (`Q_CACHED_SEARCH` / `Q_UNCACHED_SEARCH_2` or similar). Add to the SELECT clause:

```sql
LEFT JOIN active_boosts ab
       ON ab.person_id = p.uuid
      AND ab.expires_at > NOW()
```

In the ORDER BY clause, prepend:

```sql
ORDER BY (ab.person_id IS NOT NULL) DESC, /* existing ordering */
```

- [ ] **Step 3: Run tests** — expect pass.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/person/sql/__init__.py tests/test_search.py
git commit -m "feat(search): boosted candidates sorted first via active_boosts join"
```

---

### Task 7.3: Frontend `BoostCard` on `/profile`

**Files:**
- Create: `d:/Antigravity/ahavah-web/src/components/app/boost-card.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/app/profile/page.tsx`

- [ ] **Step 1: Implement BoostCard**

```tsx
// src/components/app/boost-card.tsx
"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { apiClient, ApiError } from "@/lib/api-client";
import { useTokenBalance } from "@/lib/use-token-balance";
import { TokenSpendSheet } from "@/components/app/token-spend-sheet";

type ActiveBoost = { active: boolean; expires_at?: string };

export function BoostCard() {
  const { balance, refresh: refreshBalance } = useTokenBalance();
  const [active, setActive] = useState<ActiveBoost | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void apiClient.get<ActiveBoost>("/tokens/active-boost").then(setActive);
  }, [tick]);

  useEffect(() => {
    if (!active?.active) return;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [active?.active]);

  const remaining = (() => {
    if (!active?.active || !active.expires_at) return null;
    const ms = new Date(active.expires_at).getTime() - Date.now();
    if (ms <= 0) return null;
    const m = Math.ceil(ms / 60_000);
    return `${m} min left`;
  })();

  const handleBoost = async () => {
    setBusy(true);
    try {
      await apiClient.post("/tokens/boost", {});
      await refreshBalance();
      setSheetOpen(false);
      setTick((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        // insufficient
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card tone="profile-section">
        <CardContent className="flex items-center gap-4">
          <Zap className="size-8 text-lime" aria-hidden />
          <div className="flex-1">
            <p className="text-meta font-semibold text-white">
              {active?.active ? `Boost active — ${remaining}` : "Boost your profile"}
            </p>
            <p className="text-caption text-text-secondary">
              {active?.active
                ? "You're appearing first in nearby decks."
                : "Get seen first in nearby decks for 30 minutes."}
            </p>
          </div>
          {!active?.active ? (
            <Button
              size="tap"
              variant="default"
              onClick={() => setSheetOpen(true)}
            >
              Boost · 5
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TokenSpendSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Boost for 30 minutes?"
        description="Your profile will be shown first in nearby decks for 30 minutes."
        cost={5}
        currentBalance={balance}
        onConfirm={handleBoost}
        busy={busy}
      />
    </>
  );
}
```

- [ ] **Step 2: Wire into /profile**

In `src/app/profile/page.tsx`, near the other Cards in the page body, add:

```tsx
import { BoostCard } from "@/components/app/boost-card";

// somewhere in the page body, near Identity / Settings cards:
<BoostCard />
```

- [ ] **Step 3: Typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/app/boost-card.tsx src/app/profile/page.tsx
git commit -m "feat(tokens): BoostCard on /profile with active-state countdown"
```

---

## Phase 8 — Subscription stipend + final wiring

### Task 8.1: Webhook credits stipend on subscription create + renewal

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/checkout/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_checkout.py`

- [ ] **Step 1: Test**

```python
# tests/test_checkout.py (append)
TIER_TO_STIPEND = {"month": 10, "quart": 12, "year": 15}

@pytest.mark.parametrize("tier,expected", list(TIER_TO_STIPEND.items()))
async def test_subscription_create_credits_stipend(http, db, person, tier, expected):
    payload = {
        "type": "checkout.session.completed",
        "data": {"object": {
            "mode": "subscription",
            "client_reference_id": str(person["uuid"]),
            "id": f"cs_test_{tier}",
            "metadata": {"tier_key": tier, "person_uuid": str(person["uuid"])},
            "subscription": "sub_test_xyz",
        }},
    }
    await http.post("/checkout/webhook", json=payload,
                    headers={"stripe-signature": "test_sig_bypass"})
    from service.tokens import get_balance
    assert await get_balance(db, person["uuid"]) == expected
```

- [ ] **Step 2: Extend the subscription branch of the webhook**

In the `mode == "subscription"` block of the webhook handler (after the existing entitlements-flip code), insert:

```python
SUBSCRIPTION_TIER_TO_STIPEND = {"month": 10, "quart": 12, "year": 15}

tier_key = session["metadata"]["tier_key"]
stipend = SUBSCRIPTION_TIER_TO_STIPEND[tier_key]
session_id = session["id"]

# Idempotency: same session shouldn't double-credit
existing = await s.db.fetchval(
    """SELECT 1 FROM token_ledger
        WHERE reason='subscription_stipend'
          AND metadata->>'stripe_session_id' = $1""",
    session_id,
)
if not existing:
    from service.tokens import credit
    await credit(
        s.db, person_uuid, stipend,
        reason="subscription_stipend",
        metadata={
            "tier_key": tier_key,
            "stripe_session_id": session_id,
        },
    )
```

- [ ] **Step 3: Renewal stipend on `customer.subscription.updated`**

Add a new event branch in the webhook (alongside `checkout.session.completed`):

```python
elif event["type"] == "invoice.payment_succeeded":
    invoice = event["data"]["object"]
    # Only act on subscription renewal invoices (billing_reason)
    if invoice.get("billing_reason") != "subscription_cycle":
        return {"ok": True}
    sub_id = invoice["subscription"]
    # Look up tier_key from the stripe subscription metadata
    import stripe
    sub = stripe.Subscription.retrieve(sub_id)
    tier_key = sub["metadata"]["tier_key"]
    person_uuid = sub["metadata"]["person_uuid"]
    stipend = SUBSCRIPTION_TIER_TO_STIPEND[tier_key]
    invoice_id = invoice["id"]
    existing = await s.db.fetchval(
        """SELECT 1 FROM token_ledger
            WHERE reason='subscription_stipend'
              AND metadata->>'stripe_invoice_id' = $1""",
        invoice_id,
    )
    if not existing:
        from service.tokens import credit
        await credit(
            s.db, person_uuid, stipend,
            reason="subscription_stipend",
            metadata={
                "tier_key": tier_key,
                "stripe_invoice_id": invoice_id,
            },
        )
```

- [ ] **Step 4: Run tests** — expect 3 parameterized passing.

- [ ] **Step 5: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/checkout/__init__.py tests/test_checkout.py
git commit -m "feat(checkout): credit subscription stipend on create + renewal (10/12/15)"
```

---

### Task 8.2: Subscription cancellation preserves token balance

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/checkout/__init__.py`
- Modify: `d:/Antigravity/ahavah-api/tests/test_checkout.py`

- [ ] **Step 1: Test**

```python
async def test_subscription_cancel_revokes_premium_keeps_tokens(
    http, db, premium_person
):
    from service.tokens import credit, get_balance
    await credit(db, premium_person["uuid"], 5, reason="subscription_stipend",
                 metadata={"tier_key": "month"})
    payload = {
        "type": "customer.subscription.deleted",
        "data": {"object": {
            "id": "sub_test_xyz",
            "metadata": {"person_uuid": str(premium_person["uuid"])},
        }},
    }
    await http.post("/checkout/webhook", json=payload,
                    headers={"stripe-signature": "test_sig_bypass"})
    row = await db.fetchrow(
        "SELECT entitlements FROM person WHERE uuid=$1",
        premium_person["uuid"],
    )
    assert "premium" not in (row["entitlements"] or [])
    # Tokens preserved
    assert await get_balance(db, premium_person["uuid"]) == 5
```

- [ ] **Step 2: Add the handler branch**

```python
elif event["type"] == "customer.subscription.deleted":
    sub = event["data"]["object"]
    person_uuid = sub["metadata"]["person_uuid"]
    await s.db.execute(
        """UPDATE person
              SET entitlements = array_remove(entitlements, 'premium'),
                  subscription_expires_at = NULL
            WHERE uuid = $1""",
        person_uuid,
    )
    # NOTE: token_ledger is intentionally NOT modified. Stipend tokens
    # already credited stay with the user (digital goods).
```

- [ ] **Step 3: Run tests** — expect pass.

- [ ] **Step 4: Commit**

```bash
cd d:/Antigravity/ahavah-api
git add service/checkout/__init__.py tests/test_checkout.py
git commit -m "feat(checkout): subscription cancel revokes premium, preserves token balance"
```

---

### Task 8.3: Backfill stipend for existing subscribers

**Files:**
- Create: `d:/Antigravity/ahavah-api/scripts/backfill_subscription_stipend.py`

- [ ] **Step 1: Implement**

```python
"""
One-time backfill: every existing subscriber gets their tier's stipend
credited as if a renewal cycle just ran. Idempotent — re-runnable.

Usage:
  cd ahavah-api
  python -m scripts.backfill_subscription_stipend [--dry-run]
"""
import asyncio
import sys
from service.config import get_db_pool
from service.tokens import credit

TIER_TO_STIPEND = {"month": 10, "quart": 12, "year": 15}
BACKFILL_TAG = "v1-2026-05-16"


async def main(dry_run: bool):
    pool = await get_db_pool()
    async with pool.acquire() as db:
        subs = await db.fetch(
            """SELECT uuid, stripe_customer_id, subscription_tier_key
                 FROM person
                WHERE 'premium' = ANY(entitlements)
                  AND subscription_tier_key IS NOT NULL"""
        )
        for row in subs:
            existing = await db.fetchval(
                """SELECT 1 FROM token_ledger
                    WHERE person_id = $1
                      AND reason = 'subscription_stipend'
                      AND metadata->>'backfill_tag' = $2""",
                row["uuid"], BACKFILL_TAG,
            )
            if existing:
                print(f"SKIP {row['uuid']} — already backfilled")
                continue
            tier = row["subscription_tier_key"]
            amount = TIER_TO_STIPEND.get(tier)
            if not amount:
                print(f"SKIP {row['uuid']} — unknown tier {tier!r}")
                continue
            if dry_run:
                print(f"DRY {row['uuid']} +{amount} ({tier})")
                continue
            await credit(
                db, row["uuid"], amount,
                reason="subscription_stipend",
                metadata={"tier_key": tier, "backfill_tag": BACKFILL_TAG},
            )
            print(f"OK  {row['uuid']} +{amount} ({tier})")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(main(dry))
```

- [ ] **Step 2: Dry-run + execute** (manual at deploy time)

```bash
cd d:/Antigravity/ahavah-api
python -m scripts.backfill_subscription_stipend --dry-run
# Review output, then:
python -m scripts.backfill_subscription_stipend
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill_subscription_stipend.py
git commit -m "feat(scripts): one-time backfill stipend for existing subscribers"
```

---

### Task 8.4: Update `/paywall` FEATURES + Sidebar boost-active ring

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/app/paywall/page.tsx`
- Modify: `d:/Antigravity/ahavah-web/src/components/app/sidebar.tsx`

- [ ] **Step 1: Refresh paywall FEATURES list**

Replace the `FEATURES` array in `paywall/page.tsx`:

```typescript
const FEATURES = [
  "Unlimited daily likes",
  "See everyone who liked you (full list, not just the count)",
  "10 / 12 / 15 tokens per month (1mo / 3mo / 1yr)",
  "Use tokens for super-likes, boosts, and extra reveals",
  "Cancel anytime from the billing portal",
];
```

- [ ] **Step 2: Sidebar avatar ring when boost active**

In `src/components/app/sidebar.tsx`, fetch `/tokens/active-boost` (use a new `useActiveBoost` hook OR call directly in the sidebar). When active, add `ring-2 ring-lime` to the user-avatar element.

```tsx
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

// inside SidebarUserBlock:
const [boostActive, setBoostActive] = useState(false);
useEffect(() => {
  void apiClient.get<{ active: boolean }>("/tokens/active-boost")
    .then((r) => setBoostActive(r.active));
}, []);

// On the Avatar:
<Avatar className={boostActive ? "ring-2 ring-lime" : ""} ...>
```

- [ ] **Step 3: Typecheck + lint**

```bash
cd d:/Antigravity/ahavah-web
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/paywall/page.tsx src/components/app/sidebar.tsx
git commit -m "feat(tokens): paywall FEATURES include stipend + sidebar avatar lime ring when boost active"
```

---

### Task 8.5: End-to-end smoke test (manual)

- [ ] **Step 1: Full economy walkthrough**

In a browser with two test accounts (one free, one premium):

1. **Free user:** /discover → like 10 candidates → hit quota → see QuotaExceededCard → spend 3 tokens for day-pass → confirm next 5 likes work → /matches > Liked you tab → tap a blurred card → confirm Sheet → spend 1 token → unblur. Buy 10 tokens via /profile/tokens → spend 2 tokens on super-like → recipient (test premium account) sees super-liked card top of deck with lime ring.
2. **Premium user:** /discover unlimited likes work → /matches > Liked you tab shows all photos without spend → /profile → Boost → spend 5 tokens → sidebar avatar gets lime ring → countdown ticks → boost expires after 30 min.
3. **Subscription create:** new test account subscribes via Stripe Checkout → after webhook fires, /tokens/balance shows the tier's stipend (10/12/15).
4. **Subscription cancel:** existing test premium user cancels via /billing-portal → entitlement removes → token balance unchanged.

- [ ] **Step 2: Commit**

```bash
# No code change; just confirms phases 1–8 work end-to-end before merging the stack to master.
```

---

## Verification checklist (before merge)

- [ ] All backend pytests pass (`pytest tests/ -v`)
- [ ] All frontend vitest tests pass (`pnpm test`)
- [ ] `npx tsc --noEmit` clean (frontend)
- [ ] `pnpm lint` clean (frontend)
- [ ] `pnpm build` clean (frontend)
- [ ] Stripe test-mode end-to-end: buy a Starter bundle → ledger row created with correct amount
- [ ] Stripe test-mode end-to-end: subscribe to 1mo → stipend ledger row of 10 created
- [ ] Manual E2E (Task 8.5) confirmed in browser

## Open implementation decisions (apply during execution)

These were the open questions in spec §10. Applied defaults:

1. **Quota window:** Rolling 24h from the user's oldest like (the SQL is already that). No timezone math.
2. **Boost cleanup cadence:** Cron NOT required — `/search` join already filters expired rows. Skip the cron.
3. **Stipend timing:** On `invoice.payment_succeeded` with `billing_reason='subscription_cycle'`. Matches Stripe's billing.
4. **Token store route:** `/profile/tokens` (as written above).
5. **Boost visual on recipient deck:** Tiny lime "Boosted" Pill in top-left corner of the candidate card (consistent with /matches super-liked Pill). Add this rendering to `discover-card-face.tsx` if it isn't already done by Phase 7's existing changes — if missed, add a follow-up commit.
6. **Backfill for existing subscribers:** Task 8.3 covers it.
7. **Cancellation UX:** Out of scope here (would land in `/billing-portal` redesign). Note for follow-up.

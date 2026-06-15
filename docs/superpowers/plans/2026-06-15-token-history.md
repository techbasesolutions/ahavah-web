# Token Transaction History — Implementation Plan

**Goal:** Replace the fabricated `PLACEHOLDER_HISTORY` on `/profile/tokens` with the real token ledger, surfaced on BOTH mobile and desktop, including token-purchase receipts (paid amounts).

**Approved scope:** Option A — real token ledger, mobile + desktop. Subscription invoices stay in `/billing-portal` (linked, not duplicated).

**Design spec:** produced by the frontend-designer agent (this session). Build the FE strictly from it via `/ui-implementer`.

---

## Backend — `GET /tokens/history`

**File:** `service/api/__init__.py` (new route beside the existing `@aget('/tokens/balance')` at ~line 923) + a small reader in `service/tokens/__init__.py` (mirrors `get_balance`).

**Contract:**
```
GET /tokens/history?limit=20&offset=0      (auth required; keyed on s.person_uuid)
200 → {
  "items": [
    { "id": "<uuid>", "date": "<created_at ISO8601>", "reason": "purchase",
      "delta": 10, "amountLabel": "$4.99" },        // amountLabel ONLY on purchase rows
    { "id": "...", "date": "...", "reason": "super_like", "delta": -1 }
  ],
  "nextCursor": "20" | null        // string offset for the next page, null when no more
}
401 → not authorized
```

**Rules:**
- Query: `SELECT id, delta, reason, metadata, created_at FROM token_ledger WHERE person_id = %(uuid)s ORDER BY created_at DESC, id DESC LIMIT %(limit_plus_1)s OFFSET %(offset)s`. Fetch `limit + 1`; if the extra row exists, `nextCursor = str(offset + limit)` and return only `limit` items; else `nextCursor = null`.
- `limit` clamped to `[1, 50]`, default 20. `offset` >= 0, default 0.
- `amountLabel`: only for `reason == 'purchase'` with integer `metadata.amount_cents` → `f"${cents/100:.2f}"` (USD; the SKU catalog is USD). No currency stored in metadata, so assume USD.
- Reason→label mapping stays in the FRONTEND (i18n/wording lives there); the API returns the raw `reason` + `delta`. Sign is derived FE from `delta`, never from `reason`.
- `date` returned as ISO8601 (`created_at.isoformat()`); FE formats relative.

**Verify:** after deploy, `GET /tokens/history` for the Ghana test user (id 15) returns its real rows incl. any purchase receipt; `api.ahavah.app/health` 200 (boot).

---

## Frontend (build via /ui-implementer, from the design spec)

**New files:**
- `src/lib/use-token-history.ts` — hook mirroring `use-token-balance.ts`; fetches page 0 on mount via `apiClient.get('/tokens/history')`, exposes `{ items, loading, error, loadMore, hasMore }`. Re-fetches on mount so a buyer returning from Stripe sees the new row.
- `src/components/app/token-history.tsx` — unified `<TokenHistory variant="mobile" | "desktop" />`: header ("History"), semantic list, row renderer (delta chip + label + date, purchase receipt inline), empty / loading-skeleton / error states, "Load more". Reason→label map (identity-blind) + local `formatRelative()` helper live here.

**Modified file:**
- `src/app/profile/tokens/page.tsx` — delete `PLACEHOLDER_HISTORY` (70–81); insert `<TokenHistory variant="mobile" />` as a 3rd `motion.div` (delay 0.16) after the mobile buy block (after line 256); replace the desktop placeholder rail body (424–465) with `<TokenHistory variant="desktop" />`, preserving the `flex-1 min-h-0` + inner `overflow-y-auto` rail scroll. Do NOT touch the "Manage payment methods" Card.

**Resolved design open-questions:**
1. amountLabel format → backend `$X.XX` USD, rendered verbatim. ✅
2. Pagination → offset cursor, `{items, nextCursor}`, limit 20. ✅
3. `subscription_stipend` label → "Premium tokens". ✅
4. Error copy → "Couldn't load your history. Try again." (drop pull-to-refresh). ✅
5. Re-fetch on mount → yes. ✅
6. `formatRelative` local helper (the one sanctioned non-primitive) → approved (pure fn, no visual atom). ✅

---

## Task sequence

1. Backend reader + route (`service/tokens` + `service/api`) → verify import-clean structure (manual; no local python).
2. Deploy backend (push `ahavah/main`) → verify `/tokens/history` returns real data for id 15 + health 200.
3. FE hook + component + page wiring via `/ui-implementer` (kit primitives only, from the spec).
4. Verify rendered pixels at 360px + desktop (real screenshot, per `feedback_verify_rendered_pixels`).
5. Deploy web (push `master`) → verify on the Ghana test session.

**Each push to a default branch requires explicit go-ahead (prod deploy gate).**

# Meta Pixel + CompleteRegistration Event — Implementation Plan

**Date:** 2026-06-11 (v2, corrected against current Meta docs) · **Status:** awaiting approval · **Scope:** Pixel + Conversions API dual setup with event_id deduplication

> v2 changes after reading current Meta docs: (1) client-only pixel is no longer the recommended setup — Meta's 2026 guidance is Pixel + Conversions API together with `eventID` dedup; pixel-only setups reportedly miss 30-60% of conversions under current privacy regimes. CAPI added as Phase 2. (2) Dating ads REQUIRE prior written permission from Meta (confirmed current policy, not legacy) — the active campaign needs the Dating Advertiser Application submitted; see Action Items.

## Goal

Meta delivery optimization needs a conversion signal from ahavah.app. Ship the smallest change that gets (a) PageView on every page, (b) one `CompleteRegistration` standard event when a new user finishes onboarding.

## Assumptions (stated per Karpathy guidelines)

1. **No pixel exists** (verified via MCP: zero datasets on ad account 17409285 and Ahavah portfolio 1017035620748378). The MCP cannot create datasets, so the USER creates one in Events Manager (business.facebook.com/events_manager → Connect data source → Web), owned by the Ahavah portfolio. I verify and pull the ID via the MCP afterward.
2. **"Sign-up" = onboarding graduation**, i.e. successful `finishOnboarding()` in `src/app/onboarding/complete/page.tsx` (line ~49) — a complete usable profile. NOT the earlier OTP account-row creation. Better-quality signal; fires once thanks to the existing `readOnboarded()` idempotence guard. If you want the earlier/looser signal instead, say so now.
3. **Pixel + Conversions API together** (corrected from v1 "client-only"). Phase 1 ships the browser pixel; Phase 2 sends the same `CompleteRegistration` server-side from ahavah-api's `/finish-onboarding` handler (POST `graph.facebook.com/v23.0/{dataset_id}/events`), sharing one `event_id` so Meta deduplicates. Server-side needs a CAPI access token generated in Events Manager settings (user step, same visit as pixel creation). Browser call signature: `fbq('track','CompleteRegistration',{},{eventID})` — verified current in Meta's pixel reference.
4. **Vercel env var:** pixel ID ships as `NEXT_PUBLIC_META_PIXEL_ID` (set with `printf '%s' | vercel env add`, never echo).

## Changes (4 files, all in ahavah-web)

| File | Change |
|---|---|
| `src/lib/meta-pixel.ts` (new) | Tiny typed wrapper: `pixelPageView()`, `pixelCompleteRegistration()`; no-ops when env var absent |
| `src/app/layout.tsx` | Pixel base snippet via `next/script` (afterInteractive) + noscript img fallback, alongside existing Vercel `<Analytics />` |
| `next.config.ts` CSP (lines ~49-66) | `script-src` += `https://connect.facebook.net`; `img-src` += `https://www.facebook.com`; `connect-src` += `https://www.facebook.com`. (NB: the exploration subagent suggested `t.facebook.com`/`graph.instagram.com` — those are wrong; fbevents.js loads from connect.facebook.net and events POST to www.facebook.com/tr. CSP here is port-strict and has bitten before, so domains verified against the actual network calls during local testing.) |
| `src/app/onboarding/complete/page.tsx` | Fire `pixelCompleteRegistration()` only on the fresh-graduation path after `finishOnboarding()` resolves |

Before writing code: read the ahavah trio (CLAUDE.md → BUILD-PLAN.md → PROJECT-STATUS.md) per project rule.

## Verification (success criteria)

1. Local: `pnpm dev` → complete a test onboarding → DevTools network shows `www.facebook.com/tr` requests with `ev=PageView` and `ev=CompleteRegistration`; zero CSP violations in console.
2. Deploy via git push (Vercel auto-deploy per [[feedback_ahavah_deploy_via_git]]) after env var set.
3. Live: Events Manager Test Events shows both events from ahavah.app; confirm via MCP `ads_get_dataset_stats` within 24h.

## Action items (user)

1. Create the dataset/pixel in Events Manager (Ahavah portfolio) and generate a Conversions API access token in the same settings screen.
2. **Submit Meta's Dating Advertiser Application** — written permission is required BEFORE running dating ads (current policy: https://www.facebook.com/business/help/765622867361201). The campaign is already delivering; unapproved dating ads risk rejection or account flags, and this account's business already has two flagged ad accounts.

## Explicitly out of scope

Advanced Matching (email hashing — note: "automatic advanced matching" is a no-code toggle in Events Manager worth enabling), switching ad sets to conversion optimization (needs ~50 events/week first), custom audiences/lookalikes (blocked on user-email export + privacy-policy confirmation).

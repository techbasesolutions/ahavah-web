# Phase W — Web Wiring (Ahavah goes live)

**Plan written:** 2026-05-12
**Plan author:** Claude (orchestrator)
**Format:** Quad-agent — per [`d:/Antigravity/loprofile-backend-v2/docs/quad-agent-protocol.md`](../../loprofile-backend-v2/docs/quad-agent-protocol.md)
**Status of plan:** Drafted, awaiting user sign-off on hosting + domain decisions before foundation work begins.

---

## 1 · What this phase is for

Take Ahavah from "high-fidelity visual prototype on localStorage" to "online dating app with real users on real infrastructure." Phase W replaces every mock with the real thing.

The previous 26 sub-plans (SP10 → SP26) shipped UI + pure logic against `SAMPLE_PROFILES` and `useProfile`-backed-by-localStorage. There is no backend wiring, no auth, no real photos, no real chat, no real verification, no real payments. There is also no SwipeCard — `/discover` is a static tap card. Phase W closes all of these gaps in one coordinated wave.

The backend repo exists at `d:/Antigravity/ahavah-api` — it's a fork of Duolicious's open-source Python ASGI backend (`techbasesolutions/duolicious-backend` on GitHub, last pull `179a204`). It already has 57 HTTP endpoints, WebSocket chat (XMPP-XML over port 5443), 72 Postgres tables, photo moderation (210MB ONNX classifier), antispam/antirude/CSAM hooks, Stripe Identity webhook wiring, and RevenueCat webhook wiring. **It has never been rebranded** (375 references to "duolicious" across 44 files) and **has never been deployed to production.**

The decision to fork Duolicious rather than build green-field is locked. Phase W honours that — we rebrand and ship the fork, not rewrite it.

---

## 2 · Outcome (what "done" looks like)

A user opens `https://ahavah.app` on their phone. They:

1. Tap "Get started" on the welcome page.
2. Enter their email and password. The backend creates a `person` record, returns an OTP to their inbox.
3. Enter the OTP. The backend issues a `duo_session` token, stored as an httpOnly cookie.
4. Walk through onboarding (name, DOB, gender, marital status, children, looking-for, photos, country, languages, bio, polygyny, assembly, relocation).
5. Photos upload to the backend, get NSFW-classified by the ONNX pipeline, and approved photos resolve to real CDN URLs.
6. Land on `/discover`. The page fetches real candidates from `GET /search` (which the backend already implements with country/language/age filters that map exactly to `discover-engine.ts`'s filter shape). Other real users appear — initially staff seed accounts, then real signups.
7. Swipe right on someone (SwipeCard + SwipeDeck must be built — this is part of Agent B). The frontend POSTs to `/skip/by-uuid` (the existing backend like/pass endpoint, despite the name). If both users have swiped right, the backend creates a match.
8. Tap into chat. The frontend connects to `wss://chat.ahavah.app:5443` with the session token, parses XMPP-XML stanzas, and renders real messages. Send a message; it persists in `mam_message` and the recipient's `inbox`.
9. Tap "Verify with government ID" on `/verify/gold`. The frontend POSTs to `/verification/start-id-flow`, gets a Stripe Identity session URL, and redirects. After verification, the Stripe webhook fires; the user's verification tier updates.
10. Tap "Subscribe" on `/paywall`. The frontend POSTs to a new `/checkout/web` endpoint (which Agent A + Orchestrator-Cutover wire as part of Phase W; backend already has RevenueCat-webhook plumbing the entitlement record can mount on), gets a Stripe Checkout URL, completes payment, returns with subscription active.

That's the whole user journey, end-to-end, real. Plus admin paths still work (the backend's `/admin/*` token-link endpoints stay as-is for moderation).

---

## 3 · Decisions baked into this plan (please confirm)

These are the orchestrator's recommended decisions. **Before foundation work starts, please confirm or override.**

| Decision | Recommendation | Rationale |
|---|---|---|
| **Production hosting** | DigitalOcean Droplet (s-2vcpu-4gb to start, ≈$24/month) running `docker compose` directly | Backend is dockerized end-to-end (api + chat + cron + postgres + redis + s3mock + smtp). DO is the simplest fit, you already have `mcp__digitalocean` access in your env, and the master plan §0.10 mentions DO. Render/Railway/Fly.io would also work but force more refactoring (split services, replace docker-compose, etc.). |
| **Frontend hosting** | Vercel (already used for other Techbase projects per memory) | Next.js 16 is first-class on Vercel; deploys via `vercel --prod` from `d:/Antigravity/ahavah-web`. |
| **Database hosting** | Postgres on the same DO Droplet via docker-compose initially; can graduate to DO Managed Postgres later when scale demands it | Keeps Phase W lean. Managed DB adds $15/month + migration effort; defer. |
| **Domain** | `ahavah.app` for the PWA, `api.ahavah.app` for the API, `chat.ahavah.app` for the WebSocket | Apex for frontend, subdomains for services. **You need to register `ahavah.app` if not already owned.** |
| **Email** | Resend (already used for CAPP/SFL LMS per memory) → `noreply@ahavah.app` for OTP + transactional | Backend currently uses MailHog (dev) — replace SMTP env vars with Resend SMTP. Resend has SPF/DKIM already proven on your other domains. |
| **File storage** | DO Spaces (S3-compatible, already used per memory for Loprofile) | Backend uses `s3mock` in dev. Swap to DO Spaces in prod via env vars. ~$5/month for first 250GB. |
| **Payments — verification** | Stripe Identity (already wired backend-side) | Backend endpoint `/verification/start-id-flow` (service/api/__init__.py:400) and `/webhooks/stripe-identity` already exist. Need Stripe live keys. |
| **Payments — subscriptions** | Stripe Checkout (web), not RevenueCat | RevenueCat is iOS/Android IAP-focused; for a web PWA, Stripe Checkout is direct and cheaper. Backend's `/webhooks/revenuecat` stays for future native apps; we add a parallel `/checkout/web` endpoint in Cutover. |
| **OTP provider** | Twilio (master plan §0.8 spec) for SMS, Resend for email | Backend supports both — email via SMTP, SMS via Twilio Verify. |
| **Chat client library** | Custom (no npm package exists for duolicious's flavor of XMPP) | Backend talks XMPP-style XML; we write a thin `chat-client.ts` wrapper. ~300 lines, no deps beyond DOMParser. |
| **Frontend HTTP client** | Native `fetch` + a thin `api-client.ts` wrapper | No `@tanstack/react-query`, `swr`, `axios`, or `ky` installed today; adding one is optional. Recommend skipping — vanilla fetch + a 100-line wrapper covers our needs. |
| **CI/CD** | GitHub Actions for backend deploy via SSH-to-Droplet; Vercel auto-deploy for frontend (existing) | Backend's existing `.github/workflows/publish.yml` pushes to **GCP Artifact Registry** — irrelevant for DO. Replace with a simple SSH+docker-compose pull workflow. |
| **Monitoring** | Sentry (master plan §0.5 already spec'd) for both frontend + backend | Sentry SDKs in both. Free tier covers MVP. |
| **Analytics** | PostHog (master plan §0.5 already spec'd) | Self-hostable later; cloud tier for now. |

**One open question for you:** which Stripe account does this live on? Recommend creating a fresh Stripe account specifically for Ahavah (separate from your CAPP / CSS / Loprofile accounts) so the books and webhooks stay isolated.

---

## 4 · Workstream decomposition (the why behind 4 agents)

Per the [quad-agent protocol](../../loprofile-backend-v2/docs/quad-agent-protocol.md) §Planning, I ask: what work is genuinely independent, and how many agents does that justify?

After the orchestrator's solo Foundation work (§5 below), the remaining frontend work decomposes into **four file-disjoint workstreams**:

| Workstream | Why it's its own agent | Why it can run in parallel with the others |
|---|---|---|
| **A — Auth + Profile wiring** | Owns the most-shared code path: `use-profile-storage.ts`. Every other agent reads `useProfile`, so this must land — but its WRITE-path is self-contained. | A's writes touch `src/lib/use-profile-storage.ts`, `src/app/auth/sign-up/page.tsx`, `src/app/page.tsx`, `src/app/onboarding/verify-{email,phone}/page.tsx`. No overlap with B/C/D. |
| **B — Discovery deck + likes + SwipeCard** | Owns the dating-app's central interaction. SwipeCard + SwipeDeck have never been built; they're a substantial component build on top of API wiring. | B's writes touch `src/app/discover/page.tsx`, `src/app/match/page.tsx`, new SwipeCard / SwipeDeck components in `src/components/app/`, new `use-discover-deck.ts` + `use-decisions.ts` hooks. No overlap. |
| **C — Photos pipeline** | The photo flow is the highest-friction part (binary uploads, multipart, NSFW moderation feedback, real CDN URLs replacing base64). Wholly independent of A/B/D. | C's writes touch `src/lib/photo-storage.ts`, `src/app/onboarding/photos/page.tsx`, `src/components/app/photo-slot.tsx`, `src/components/profile-edit/section-photos.tsx`. No overlap. |
| **D — Chat WebSocket** | XMPP-XML protocol is the most unusual surface; needs a dedicated agent who can focus on the wire format without distraction. Touches chat-only routes. | D's writes touch `src/lib/chat-client.ts` (new), `src/lib/use-chat-thread.ts` (new), `src/app/chat/[id]/page.tsx`, `src/app/inbox/page.tsx`. No overlap. |

Verification and paywall wiring are **deliberately not their own agents**. Both are small, mostly UI-state changes plus a single new HTTP call each. They fit in orchestrator cutover after the four parallel agents merge.

The Widened 12-axis audit and Legal pages stay in the carry-forward queue — not in Phase W. Those are post-launch.

---

## 5 · Foundation (Orchestrator solo, before any agent dispatch)

**Estimated duration:** 2 focused work sessions (4–6 hours each).

Five sub-tasks, sequential. The orchestrator (Claude in IDE) drives these directly — no agent dispatch. When all five complete, the four agent briefs get a "Wave 1 Foundation — files now live" postscript with concrete URLs, paths, and env var values, and only then are the agents dispatched.

### F.1 · Backend rebrand pass

`ahavah-api` has 375 "duolicious" references across 44 files plus a hardcoded `LSERVER = 'duolicious.app'` in chat. Do a careful find-replace pass with these guardrails:

- **Code identifiers stay** (`DUO_ENV`, `duo_session` table name, `duo_api` schema). Renaming them costs more than it gains — they're internal, never user-visible. Document in the README that "duo_*" is a legacy prefix from the Duolicious fork.
- **User-visible strings change** (email "from" addresses, support email, email template headers).
- **Hardcoded URLs become env vars.** All 26 hardcoded `https://api.duolicious.app` / `https://get.duolicious.app` / `https://email-assets.duolicious.app` references get replaced with `os.environ['AHAVAH_API_BASE_URL']` etc. The XMPP `LSERVER` becomes an env var too.
- **README + DEVELOPER.md + CONTRIBUTING.md** get rewritten to say "Ahavah Backend, forked from Duolicious." Keep the Duolicious license + attribution.

Commit pattern: one commit per concern (`rebrand: email from-addresses`, `rebrand: hardcoded URLs to env vars`, etc.) so the diff is auditable.

**Verification:** `grep -ri "duolicious" --include="*.py" service/ antiabuse/ database/ | grep -v "^#"` should return only license/attribution mentions.

### F.2 · Production hosting setup

If user confirms DO Droplet:

1. Provision droplet via `mcp__digitalocean__droplet-create`: name `ahavah-api-prod-01`, region `nyc3` (closest to Caribbean userbase per memory's Caribbean Export / CSS context), size `s-2vcpu-4gb`, image `docker-20-04`, SSH key (use existing Techbase key).
2. Provision DO Spaces bucket `ahavah-photos-prod` (private; signed URLs for reads).
3. Set up DNS: A records for `api.ahavah.app` + `chat.ahavah.app` pointing to droplet IP; CNAME `ahavah.app` → Vercel.
4. SSH into droplet, install `docker`, `docker-compose`, `nginx`, `certbot`. Use Let's Encrypt for SSL.
5. Clone the rebranded `ahavah-api` repo to `/opt/ahavah-api`. Create `/opt/ahavah-api/.env.production` with: domain env vars from F.1, Resend SMTP creds, Twilio Verify creds, Stripe live keys (Identity + Checkout), DO Spaces creds, Postgres password, Redis password, session-token secret.
6. `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d`. (May need to create `docker-compose.production.yml` overriding the `s3mock` + `smtp` services with external endpoints. Document this in a new `DEPLOY.md`.)
7. Nginx config: reverse-proxy `api.ahavah.app:443 → 127.0.0.1:5000`, `chat.ahavah.app:443 → 127.0.0.1:5443` (with WebSocket upgrade), TLS termination via certbot.
8. Smoke-test from your laptop: `curl https://api.ahavah.app/health` should return `200 OK`.

### F.3 · API types + client (shared, used by all four agents)

Create three files in `ahavah-web` that all agents will import:

- `src/lib/api-types.ts` — TypeScript types matching every endpoint's request + response shape. Derive these by reading the Python endpoint signatures in `service/api/__init__.py` and translating each one. Don't auto-generate — hand-write so the types are clean.
- `src/lib/api-client.ts` — A `~150-line` wrapper around `fetch` providing: base URL from `process.env.NEXT_PUBLIC_API_BASE_URL`, automatic `credentials: 'include'` for cookies, JSON serialization, error normalization (`ApiError` class with `.status` + `.message` + `.body`), and method shortcuts (`apiClient.get/post/patch/delete`). No retry logic, no caching — keep it thin.
- `src/lib/storage-keys.ts` — Re-export every existing localStorage key as a typed constant (`PROFILE_KEY = "ahavah.profile.v1"` etc.) so the 3 hardcoded magic strings scattered across the codebase become a single source of truth. Agents will reduce localStorage to "ephemeral cache only"; the constants survive but are read by fewer files post-Phase W.

These three files are **orchestrator-owned** — agents read them, never modify them. If an agent needs a new endpoint added to `api-client.ts`, they BLOCKER and the orchestrator extends.

### F.4 · Backend smoke data + dev account

Seed the production database with 10 staff accounts (you, partners, beta testers) using the existing OTP flow — visit `api.ahavah.app/request-otp` with each email, then check the inbox. This gives the first real users so agents can test against a non-empty DB.

Document the seed accounts in `d:/Antigravity/ahavah-web/docs/seed-accounts.md` (gitignored) so agents know who to test against.

### F.5 · Worktree setup for the four agents

Per the quad-agent protocol §File Ownership: when multiple agents touch the same codebase, use git worktrees so they don't merge-conflict. Four parallel worktrees:

```bash
cd d:/Antigravity/ahavah-web
git worktree add ../ahavah-web-phase-w-a phase-w-agent-a
git worktree add ../ahavah-web-phase-w-b phase-w-agent-b
git worktree add ../ahavah-web-phase-w-c phase-w-agent-c
git worktree add ../ahavah-web-phase-w-d phase-w-agent-d
```

Each agent commits to their own branch in their own worktree. Orchestrator merges all four to master after Wave 1 completes (see §8).

The Foundation files from F.3 must be committed to `master` BEFORE the worktrees are created, so all four worktrees start from a commit that includes `api-client.ts`, `api-types.ts`, and `storage-keys.ts`.

---

## 6 · Wave 1 — Four parallel agents (after Foundation completes)

Per the quad-agent protocol §Dispatch: dispatch via the `Agent` tool in one message with four parallel calls, `subagent_type: "general-purpose"`, `run_in_background: true`. Each agent's brief is the full content of its `.md` prompt file.

| Agent | Brief file | Worktree | Primary scope |
|---|---|---|---|
| **A** | [`docs/agent-prompts/phase-w-agent-a-auth-profile.md`](agent-prompts/phase-w-agent-a-auth-profile.md) | `../ahavah-web-phase-w-a` | Auth signup → OTP → onboarding pipeline; `useProfile` reads/writes go HTTP |
| **B** | [`docs/agent-prompts/phase-w-agent-b-discovery-likes.md`](agent-prompts/phase-w-agent-b-discovery-likes.md) | `../ahavah-web-phase-w-b` | Real `/search` deck; SwipeCard + SwipeDeck build; like/pass POSTs; match creation |
| **C** | [`docs/agent-prompts/phase-w-agent-c-photos.md`](agent-prompts/phase-w-agent-c-photos.md) | `../ahavah-web-phase-w-c` | Real photo uploads; NSFW feedback; CDN URLs replacing base64 |
| **D** | [`docs/agent-prompts/phase-w-agent-d-chat.md`](agent-prompts/phase-w-agent-d-chat.md) | `../ahavah-web-phase-w-d` | XMPP-XML WebSocket client; real send/receive; inbox unread counts |

### File ownership map (no overlaps)

#### Agent A — Auth + Profile (writes)
- `src/lib/use-profile-storage.ts` — rewrite from localStorage to HTTP
- `src/lib/use-profile.ts` — extend with `signOut()` + `refreshProfile()`
- `src/app/auth/sign-up/page.tsx` — wire real POST `/request-otp`
- `src/app/auth/sign-in/page.tsx` — new file, mirrors signup but for returning users
- `src/app/page.tsx` — welcome page: real "Sign in" + "Get started" handlers
- `src/app/onboarding/verify-email/page.tsx` — wire real POST `/check-otp`
- `src/app/onboarding/verify-phone/page.tsx` — wire real POST `/check-otp` (phone variant)
- `src/app/onboarding/complete/page.tsx` — write-through final profile commit to backend before nav to `/discover`

#### Agent B — Discovery + Likes + SwipeCard (writes)
- `src/components/app/swipe-card.tsx` — new: single card with pan + rotation + LIKE/NOPE opacity ramp
- `src/components/app/swipe-deck.tsx` — new: stack of N visible cards with reveal/commit transitions
- `src/lib/use-discover-deck.ts` — new: hook wrapping `/search` with cursor pagination
- `src/lib/use-decisions.ts` — new: hook for like/pass with optimistic updates + rollback on 4xx
- `src/app/discover/page.tsx` — rewire to use new hook + SwipeDeck instead of SAMPLE_PROFILES + static card
- `src/app/match/page.tsx` — wire to real match record from backend (passed via search param)
- `src/app/matches/page.tsx` — replace fixtures with GET `/matches`

#### Agent C — Photos (writes)
- `src/lib/photo-storage.ts` — rewrite: POST multipart to `/photos`, GET `/photos/quota`, DELETE `/photos/<uuid>`
- `src/lib/use-photo-upload.ts` — new: optimistic upload with progress, NSFW-rejection recovery
- `src/app/onboarding/photos/page.tsx` — wire real upload, show moderation states (uploading / approved / rejected / under-review)
- `src/components/app/photo-slot.tsx` — add `loading` + `moderation-pending` + `rejected` visual states (cva variants)
- `src/components/profile-edit/section-photos.tsx` — same upload pipeline, add reorder/delete

#### Agent D — Chat WebSocket (writes)
- `src/lib/chat-client.ts` — new: WebSocket wrapper, XMPP-XML stanza encoder/decoder, reconnect logic, session-token auth handshake
- `src/lib/use-chat-thread.ts` — new: hook for one thread (subscribe / send / unread count / typing indicator)
- `src/lib/use-inbox.ts` — new: hook for inbox list (recent threads + unread counts)
- `src/app/chat/[id]/page.tsx` — rewire to use real client, replace seeded bubbles
- `src/app/inbox/page.tsx` — replace fixtures with `use-inbox` hook

#### Shared read-only (all four agents)
- `src/lib/api-client.ts` (orchestrator-owned)
- `src/lib/api-types.ts` (orchestrator-owned)
- `src/lib/storage-keys.ts` (orchestrator-owned)
- `src/components/ui/*` (shadcn kit primitives — extend, don't reinvent)
- `src/components/kibo-ui/*` (Kibo primitives)
- `src/lib/profile-schema.ts` (locked; if a type extension is needed, BLOCKER)
- `src/lib/discover-engine.ts` (legacy local-only filter logic; kept for SAMPLE_PROFILES fallback in tests but not used in production after Phase W)
- All onboarding pages NOT in any agent's write list

### Communication protocol (per [quad-agent §Execution](../../loprofile-backend-v2/docs/quad-agent-protocol.md))

- **Logging:** each agent maintains `d:/Antigravity/ahavah-web/logs/phase-w-agent-{a,b,c,d}.md` (append-only) with timestamped entries before/after each step.
- **BLOCKER format:** if an agent hits 2 failed attempts on the same step, they stop and emit a `BLOCKER:` block. Orchestrator decides: fix, reassign, or skip.
- **COMPLETE format:** when done, the agent emits a `COMPLETE:` block listing files changed, tests run, smoke-walk performed.

---

## 7 · Wave 1 dispatch command

Once Foundation §5 is complete and worktrees are set up, the orchestrator dispatches all four in one message:

```
[Single message with 4 Agent tool calls, all run_in_background: true]
  Agent({ description: "Phase W Agent A — Auth + Profile", subagent_type: "general-purpose",
          prompt: <full contents of phase-w-agent-a-auth-profile.md> })
  Agent({ description: "Phase W Agent B — Discovery + Likes + SwipeCard", subagent_type: "general-purpose",
          prompt: <full contents of phase-w-agent-b-discovery-likes.md> })
  Agent({ description: "Phase W Agent C — Photos", subagent_type: "general-purpose",
          prompt: <full contents of phase-w-agent-c-photos.md> })
  Agent({ description: "Phase W Agent D — Chat WebSocket", subagent_type: "general-purpose",
          prompt: <full contents of phase-w-agent-d-chat.md> })
```

Orchestrator concurrently works on §8 cutover prep while the four agents run.

---

## 8 · Cutover (Orchestrator solo, after all 4 COMPLETE)

When all four agents emit `COMPLETE:`, the orchestrator:

### C.1 · Merge the four worktrees to master

```bash
cd d:/Antigravity/ahavah-web
git checkout master
git merge --no-ff phase-w-agent-a -m "Merge Phase W Agent A: auth + profile wiring"
# (typecheck + lint + test gate after each merge)
git merge --no-ff phase-w-agent-b -m "Merge Phase W Agent B: discovery + likes + SwipeCard"
git merge --no-ff phase-w-agent-c -m "Merge Phase W Agent C: photos pipeline"
git merge --no-ff phase-w-agent-d -m "Merge Phase W Agent D: chat WebSocket"
```

Resolve any merge conflicts surgically. There SHOULDN'T be any (file ownership is disjoint) but `package.json` may pick up additions from multiple agents.

### C.2 · Verification + paywall wiring

Small enough to do inline post-merge, no agent dispatch needed:

- `src/app/verify/[tier]/page.tsx` — wire each tier's CTA to POST `/verification/start-id-flow` with `{ tier }`. On success, server returns `{ stripe_session_url }`. Frontend does `window.location.assign(stripe_session_url)`. On return from Stripe (querystring `?verification=success`), refresh profile from backend; the Stripe webhook will have updated `verification_level`.
- `src/app/paywall/page.tsx` — add `onClick` handler to the Subscribe CTA: POST to a new `/checkout/web` endpoint (orchestrator adds this endpoint to backend as part of Cutover) returning `{ stripe_checkout_url }`. Redirect to Stripe. Webhook `/webhooks/stripe-checkout` (new — orchestrator adds; mirror existing `/webhooks/revenuecat` pattern) creates a subscription entitlement.
- Estimated effort: 1 work session.

### C.3 · Production smoke walk

Open a fresh Chrome incognito window. Execute every step of §2's outcome script. If any step fails, halt and fix before continuing.

### C.4 · DNS cutover

If you've been running the frontend on `ahavah-staging.vercel.app` during development, this is the moment to point `ahavah.app` (the apex domain) at the production Vercel deployment. Vercel handles this with one click.

### C.5 · Monitoring + on-call

- Confirm Sentry is recording events on both frontend (Next.js wrapper) and backend (Sentry Python SDK in api/chat/cron containers).
- Confirm PostHog is recording page views + key events (`signup`, `match`, `subscription_started`).
- Set up an uptime monitor (DigitalOcean Uptime, free tier) on `https://api.ahavah.app/health`.

### C.6 · Soft launch announcement

Send announcement to the 10 seed accounts. Ask them to invite ≤3 friends each. Watch Sentry, PostHog, and logs for 48 hours.

---

## 9 · What's deliberately NOT in Phase W

Keep scope honest. These are real product needs, but they happen AFTER Phase W ships:

- **Legal pages** (Terms, Privacy, Community Guidelines). Awaiting copy. Stub pages with "We are finalising our legal copy. Reach us at admin@ahavah.app." for launch — replace within 14 days.
- **i18n / translation.** Backend has DeepL plumbing in master plan §2 but not implemented yet. English-only for soft launch.
- **Personality stepper** (master plan A16). Defer.
- **Permission prompts** (A17–A19 — notifications / camera / location). Web has a different permission model; spec out separately.
- **Recently-swiped** (B6, premium feature). Behind paywall — defer until paywall has actual subscribers.
- **Help / About / contact pages** (G1–G5). Stub with single-page contact email.
- **Force-update / maintenance** edge states. UI exists; backend trigger not wired. Add as a follow-up sprint.
- **Native iOS / Android.** PWA-only ships. Native is Phase 8+, master plan.
- **Q&A matcher** (Duolicious's core feature we're NOT using). Backend has it; frontend ignores it. Leave the backend tables in place but never read them.

---

## 10 · Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rebrand misses a hardcoded URL → production emails link to wrong domain | Medium | High (looks unprofessional) | Foundation F.1 verification: grep -ri "duolicious" returning only attribution mentions. Plus: send test signup email + click every link before launching. |
| XMPP-XML wire format has undocumented quirks (e.g. namespace handling) Agent D can't reverse-engineer | Medium | High (chat broken) | Agent D's brief includes a "fallback to read the duolicious test harness (`tests/chat/`) for wire-format examples" step. If still stuck after 2 attempts → BLOCKER, orchestrator extends api-client.ts with a JSON-bridge endpoint added to the backend. |
| Photo uploads stall on the 210MB ONNX classifier in production | Low | High (signup blocked) | Backend already uses a synchronous moderation pipeline; staff testers will catch performance issues. If 95th-percentile latency >3s → move ONNX to a separate cron container, queue uploads. |
| Stripe Identity verification flow returns a tier the backend doesn't recognize | Low | Medium (verification stuck) | Backend's existing webhook already maps Stripe's responses to internal `verification_level`. Test all 3 tiers end-to-end with Stripe test mode before flipping to live keys. |
| One agent hits context limits mid-task | Medium | Medium (partial work) | Per quad-agent protocol §Operational Notes: scope each agent's brief to fit in one session. If a brief is too large, split. The drafts in this plan are sized conservatively. |
| `useProfile` API change breaks 37 consuming files | High | Low (mechanical fix) | Agent A's brief explicitly preserves the existing `{profile, setProfile, update, loaded}` external surface; only the storage layer underneath changes. Lint + typecheck will catch any signature drift. |
| Verification tier reverse-mapping vs Bronze/Silver/Gold UI labelling diverges | Low | Low (cosmetic) | The backend's `verification_level` enum maps to bronze/silver/gold per master plan §3. Orchestrator confirms the mapping in Foundation F.3 and bakes it into `api-types.ts`. |
| Stripe Checkout returns user to wrong URL after payment | Low | Medium (user lands in error page) | Orchestrator's Cutover C.2 adds a `/checkout/return` route that handles both success + cancel querystrings. |

---

## 11 · Success criteria (Phase W complete when…)

- [ ] `https://api.ahavah.app/health` returns 200 from a public network.
- [ ] `https://ahavah.app` resolves to the Vercel deployment with valid TLS.
- [ ] A fresh user can sign up, complete onboarding, see other real users, swipe, match, chat, verify, and subscribe — all without errors in browser console or Sentry.
- [ ] 10 seed accounts active, ≥2 mutual matches recorded, ≥1 real chat thread with persisted messages, ≥1 Stripe Identity verification approved, ≥1 Stripe Checkout subscription completed.
- [ ] Sentry shows zero unhandled errors across the smoke-walk session.
- [ ] PostHog records the funnel (visit → signup → onboard → match → subscribe).
- [ ] `grep -ri "duolicious" service/ antiabuse/ database/ --include="*.py" | grep -v "license\|attribution\|fork"` returns nothing in `ahavah-api`.
- [ ] `grep -r "SAMPLE_PROFILES" src/app/` returns nothing in `ahavah-web` (the constant is preserved in `src/lib/profile-sample.ts` for unit tests, but no app route reads it).
- [ ] `grep -r "localStorage.getItem.*ahavah.profile" src/` returns only `use-profile-storage.ts` (which itself only uses localStorage as ephemeral cache, not source of truth).

---

## 12 · Out-of-band orchestrator notes

- The user has explicitly requested no clarifying-question loops where possible (per session memory). Where decisions are needed (hosting, Stripe account, domain), the orchestrator recommends + the user can override at sign-off time.
- Memory rules to honour: no em-dashes in user-facing copy (`feedback_no_em_dashes`), no decorative SparkleMarks (`feedback_ahavah_no_stickers`), gender binary is Woman/Man-only at the UI label level (`feedback_ahavah_gender_binary`).
- The backend has its own coding conventions (Python, mypy strict, gunicorn). Phase W does not refactor those — F.1 rebrand only.
- After soft launch, the Widened 12-axis audit and Legal pages (from the SP20 carry-forward queue) become the next sprint.

---

**Sign-off needed before Foundation §5 begins:**

1. Confirm or override the §3 decisions (hosting, domain, Stripe, etc.).
2. Confirm budget acceptance: ~$30/month (DO Droplet + Spaces) + Stripe transaction fees + Twilio Verify per-OTP + Resend Free tier (or $20/month at scale).
3. Confirm you can dedicate ~2 work sessions to Foundation before agents dispatch.

Once signed off, the orchestrator begins F.1.

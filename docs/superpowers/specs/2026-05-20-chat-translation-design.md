# Chat Translation (tap-to-translate) — Design Spec

> **Status: APPROVED 2026-05-20.** Re-introduces chat translation (the DeepL
> feature removed 2026-05-15 in commit 2e798e2), but on-demand + OpenAI.
> Spans `ahavah-api` (translate endpoint) + `ahavah-web` (tap affordance).

## Decisions (confirmed)

- **Provider:** OpenAI, reusing the existing `OPENAI_API_KEY` (already wired
  for the verification classifier). No new vendor.
- **UX model:** TAP-TO-TRANSLATE (opt-in). Messages show as-sent; a small
  affordance under incoming bubbles translates on demand. Cost scales with
  taps, not message volume.
- **Target language:** the reader's **browser locale** (`navigator.language`).
- **Affordance:** incoming (them) bubbles only. Translations persist
  **per-session** (in thread state), not stored in the DB.

## Non-goals (v1)

Auto/live translation, send-side preview, profile-language targeting,
translating outgoing messages. (Separately: the landing copy in
`src/app/page.tsx` says "live translation in chat" / "Translation built in" —
that overstates tap-to-translate and should be softened in a separate change.)

## Backend (`ahavah-api`)

### `service/translation/__init__.py` (new; adapted from the deleted DeepL one)
`translate(text: str, target: str) -> TranslateResult` where
`TranslateResult = {translated: str, detected_source: str | None, cached: bool}`.

- **Client:** sync `from openai import OpenAI` (the Flask API is sync;
  verification's `AsyncOpenAI` is for the async cron, do not reuse that
  instance). Instantiate lazily, same `OPENAI_API_KEY` env.
- **Model:** a small/cheap chat model (gpt-4.1-mini / gpt-4o-mini tier).
  Confirm the exact model id available on the account during implementation;
  do not hardcode an unverified name.
- **Prompt:** system message instructing "Translate the user's message to
  <target language>. Return ONLY the translation, no quotes or notes. If it
  is already in <target>, return it unchanged." Temperature 0.
- **detected_source:** ask the model to also report the source language, OR
  leave `None` for v1 (the UI doesn't strictly need it). Keep `None` unless
  cheap to include. (Decision: include a best-effort source via a second
  short field is NOT worth it; return `None` in v1.)
- **Cache:** Redis keyed by `f"tx:{target}:{md5(text)}"` (reuse the chat
  server's Redis host/port env). Cache hit -> `cached: True`. TTL ~30 days.
- **Guards (never error the chat):**
  - empty/whitespace -> passthrough (`translated == text`, not cached).
  - `OPENAI_API_KEY` unset -> passthrough (dev mode).
  - text length > 1000 chars -> 413 (bounds cost; chat messages are short).
  - any OpenAI/Redis exception -> passthrough (return original text).

### `POST /translate` — new `service/api/translation_routes.py` (sibling module)
- Authed (`@apost`, `SessionInfo`), rate-limited (`shared_otp_limit`-style or
  the existing account limiter). Body `{text, target}`.
- Validate: `text` non-empty string; `target` non-empty string. 401 if no
  session; 413 if text too long.
- Returns `{translated, detected_source, cached}`.
- Registered via `import service.api.translation_routes` at the bottom of
  `service/api/__init__.py` (sibling pattern, same as reactions/waitlist).

## Frontend (`ahavah-web`)

### `src/lib/translate.ts`
`translateText(text: string, target: string)` -> `POST /translate` via
`apiClient`; returns `{translated, detected_source, cached}`.

### `src/lib/use-chat-thread.ts` (or a small `useTranslate` hook)
Per-message translation state: `Map<messageId, { state: "idle"|"loading"|
"done"|"error"; translated?: string; showing: "original"|"translation" }>`.
`translate(messageId, text)` -> sets loading -> calls `translateText(text,
navigator.language)` -> stores result. `toggle(messageId)` flips
original/translation. State lives in the hook (per-session; lost on reload,
which is fine for v1).

### `src/components/app/chat-bubble.tsx` (extend `TextBubble`)
Incoming (`side="them"`) bubbles gain (kit primitives / Button only):
- A small "Translate" text Button under the bubble when not yet translated.
- While loading: "Translating…" (disabled).
- When done: show the translated text in the bubble body (or beneath) + a
  "Show original" / "Show translation" toggle Button.
- On error: "Couldn't translate" + retry.
- If `detected_source` is None and the translation equals the original,
  treat as already-in-language (show "Already in your language", no toggle).

### `src/components/app/chat-thread-view.tsx`
Wire the per-message translation state + `translate`/`toggle` from the hook
into each incoming `TextBubble` (same wiring shape as the reactions props).

## Cost controls (all in)
On-demand only + Redis cache + 1000-char cap + same-language no-op. A
cross-language message costs nothing until the reader taps Translate, and
never re-bills once cached.

## Verification
- Backend: `tests/test_translation.py` in the harness, **mocking the OpenAI
  client** (no live calls): passthrough when key unset, cache hit/miss,
  length cap (413), whitespace passthrough. Plus `import service.api` OK.
- Frontend: `npx tsc --noEmit` + `npx eslint` clean, and `next build` (the
  real gate) before any web deploy is called live. The chat UI is auth-gated
  (no browser here) so the tap flow is eyeballed by the user post-deploy.

## Working-rule compliance
Plan-before-code; kit primitives only (extend `TextBubble`, Button); sibling
route module (no brittle top-import); stage files by name; no em-dashes in
user copy; no fabricated model id (confirm at implementation); deploy via
push + verify Vercel build Ready.

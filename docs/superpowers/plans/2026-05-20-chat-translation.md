# Chat Translation (tap-to-translate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a chat reader tap an incoming foreign-language message to translate it to their browser locale, on demand, via OpenAI.

**Architecture:** New `service/translation` (sync OpenAI + Redis cache + passthrough-on-failure) behind an authed `POST /translate`. Frontend: a per-message translation state in the chat hook + a "Translate"/"Show original" affordance on incoming `TextBubble`s. On-demand only; never errors the chat.

**Tech Stack:** Backend Flask + sync `openai` + Redis (pytest in docker harness). Frontend Next.js 16 + React 19 (tsc/eslint/`next build`).

**Spec:** `docs/superpowers/specs/2026-05-20-chat-translation-design.md`

**Two repos.** api `ahavah/main`, web `master`. Stage by name; trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. No em-dashes in user copy. Verify backend in harness (`reference_ahavah_windows_test_harness`); run `next build` before deploy. **Deploy both repos when verified** (user tests in live chat — can't test auth-gated chat locally).

---

## File Structure

**Backend (`ahavah-api`):**
- Create `service/translation/__init__.py` — `translate(text, target)` (OpenAI + Redis cache + guards).
- Create `service/api/translation_routes.py` — authed `POST /translate` (sibling module).
- Modify `service/api/__init__.py` — register import at bottom.
- Create `tests/test_translation.py`.

**Frontend (`ahavah-web`):**
- Create `src/lib/translate.ts` — `translateText(text, target)` client.
- Modify `src/lib/use-chat-thread.ts` — per-message translation state + `translate()` + `toggleTranslation()`.
- Modify `src/components/app/chat-bubble.tsx` — translate affordance on incoming `TextBubble`.
- Modify `src/components/app/chat-thread-view.tsx` — wire translation into bubbles.

---

# BACKEND (ahavah-api)

### Task 1: translation service

**Files:**
- Create: `service/translation/__init__.py`
- Test: `tests/test_translation.py`

- [ ] **Step 1: Write the failing tests** (mock the OpenAI client + Redis; no live calls)

```python
# tests/test_translation.py
"""Chat translation (2026-05-20) - service.translation.translate tests."""
from __future__ import annotations

import service.translation as tr


def test_passthrough_when_key_unset(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(tr, "_redis", lambda: None)
    out = tr.translate("hola", "en-US")
    assert out["translated"] == "hola"
    assert out["cached"] is False


def test_whitespace_passthrough(monkeypatch):
    monkeypatch.setattr(tr, "_redis", lambda: None)
    out = tr.translate("   ", "en-US")
    assert out["translated"] == "   "


def test_cache_hit(monkeypatch):
    class FakeRedis:
        def __init__(self): self.store = {}
        def get(self, k): return self.store.get(k)
        def setex(self, k, ttl, v): self.store[k] = v
    fake = FakeRedis()
    monkeypatch.setattr(tr, "_redis", lambda: fake)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    calls = {"n": 0}
    def fake_call(text, target, model):
        calls["n"] += 1
        return "hello"
    monkeypatch.setattr(tr, "_openai_translate", fake_call)
    first = tr.translate("hola", "en-US")
    assert first["translated"] == "hello" and first["cached"] is False
    second = tr.translate("hola", "en-US")
    assert second["translated"] == "hello" and second["cached"] is True
    assert calls["n"] == 1  # second served from cache


def test_openai_failure_passthrough(monkeypatch):
    monkeypatch.setattr(tr, "_redis", lambda: None)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    def boom(text, target, model): raise RuntimeError("api down")
    monkeypatch.setattr(tr, "_openai_translate", boom)
    out = tr.translate("hola", "en-US")
    assert out["translated"] == "hola"  # never errors the chat
```

- [ ] **Step 2: Run -> FAIL** (`No module named 'service.translation'`):
  `pytest tests/test_translation.py -v`

- [ ] **Step 3: Implement the service**

```python
# service/translation/__init__.py
"""On-demand chat translation via OpenAI. Never errors the chat: every
failure path (no key, OpenAI/Redis down, over length) passes the original
text through. Redis-cached by (target, md5(text)).
"""
from __future__ import annotations

import hashlib
import os

MAX_CHARS = 1000
_CACHE_TTL = 60 * 60 * 24 * 30  # 30 days
_MODEL = os.environ.get("OPENAI_TRANSLATE_MODEL", "gpt-4.1-mini-2025-04-14")

_REDIS_HOST = os.environ.get("DUO_REDIS_HOST", "redis")
_REDIS_PORT = int(os.environ.get("DUO_REDIS_PORT", 6379))
_redis_client = None


def _redis():
    """Lazily build a sync redis client; None if redis is unavailable."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis(
                host=_REDIS_HOST, port=_REDIS_PORT, decode_responses=True
            )
        except Exception:
            return None
    return _redis_client


def _cache_key(text: str, target: str) -> str:
    return f"tx:{target}:{hashlib.md5(text.encode('utf-8')).hexdigest()}"


def _openai_translate(text: str, target: str, model: str) -> str:
    """One sync OpenAI chat call. Returns the translation text."""
    from openai import OpenAI
    client = OpenAI()  # reads OPENAI_API_KEY
    resp = client.chat.completions.create(
        model=model,
        temperature=0.0,
        messages=[
            {
                "role": "system",
                "content": (
                    f"Translate the user's message to {target}. Return ONLY "
                    f"the translation, with no quotes, labels, or notes. If it "
                    f"is already in {target}, return it unchanged."
                ),
            },
            {"role": "user", "content": text},
        ],
    )
    return (resp.choices[0].message.content or "").strip()


def translate(text: str, target: str) -> dict:
    """Returns {translated, detected_source, cached}. Passthrough on any
    failure. Raises ValueError only for over-length (route maps to 413)."""
    if not text or not text.strip():
        return {"translated": text, "detected_source": None, "cached": False}
    if len(text) > MAX_CHARS:
        raise ValueError("too_long")
    if not os.environ.get("OPENAI_API_KEY"):
        return {"translated": text, "detected_source": None, "cached": False}

    r = _redis()
    key = _cache_key(text, target)
    if r is not None:
        try:
            hit = r.get(key)
            if hit is not None:
                return {"translated": hit, "detected_source": None, "cached": True}
        except Exception:
            pass

    try:
        translated = _openai_translate(text, target, _MODEL)
    except Exception:
        return {"translated": text, "detected_source": None, "cached": False}

    if r is not None and translated:
        try:
            r.setex(key, _CACHE_TTL, translated)
        except Exception:
            pass

    return {"translated": translated or text, "detected_source": None, "cached": False}
```

- [ ] **Step 4: Run -> PASS** (4 tests): `pytest tests/test_translation.py -v`
- [ ] **Step 5: Commit** `git add service/translation/__init__.py tests/test_translation.py && git commit -m "feat(translation): OpenAI translate service (cached, passthrough-on-failure)"`

### Task 2: POST /translate route

**Files:**
- Create: `service/api/translation_routes.py`
- Modify: `service/api/__init__.py` (register at bottom, after waitlist import)

- [ ] **Step 1: Create the route module**

```python
# service/api/translation_routes.py
"""Authed POST /translate - on-demand chat message translation. Sibling
module (imported at the bottom of service/api/__init__.py)."""
from __future__ import annotations

from flask import request

import duotypes as t
from service.api.decorators import apost
from service.translation import translate, MAX_CHARS


@apost('/translate')
def post_translate(s: t.SessionInfo):
    assert s.person_id is not None
    body = request.get_json(silent=True) or {}
    text = body.get('text')
    target = body.get('target')
    if not isinstance(text, str) or not isinstance(target, str) or not target.strip():
        return {'error': 'bad_request'}, 400
    if len(text) > MAX_CHARS:
        return {'error': 'too_long'}, 413
    result = translate(text, target)
    return result, 200
```

- [ ] **Step 2: Register** at the bottom of `service/api/__init__.py` (after the waitlist import):

```python
# Chat translation (2026-05-20) - on-demand tap-to-translate. Sibling module.
import service.api.translation_routes  # noqa: E402,F401
```

- [ ] **Step 3: Import check** (harness): `python -c "import service.api"` -> exits 0.
- [ ] **Step 4: Commit** `git add service/api/translation_routes.py service/api/__init__.py && git commit -m "feat(translation): authed POST /translate"`

---

# FRONTEND (ahavah-web)

### Task 3: translate client

**Files:** Create `src/lib/translate.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/translate.ts
import { apiClient } from "@/lib/api-client";

export type TranslateResult = {
  translated: string;
  detected_source: string | null;
  cached: boolean;
};

export async function translateText(text: string, target: string) {
  return apiClient.post<TranslateResult>("/translate", { text, target });
}
```

- [ ] **Step 2:** `npx tsc --noEmit` -> clean. **Commit.**

### Task 4: per-message translation state in the chat hook

**Files:** Modify `src/lib/use-chat-thread.ts`

- [ ] **Step 1: Add the import + state type.** Add import:

```ts
import { translateText } from "@/lib/translate";
```

Add to the result type (`UseChatThreadResult`):

```ts
  /** messageId -> translation state. */
  translations: Map<string, {
    state: "loading" | "done" | "error";
    text?: string;
    showing: "original" | "translation";
  }>;
  /** Translate a message to the reader's browser locale (on demand). */
  translate: (messageId: string, text: string) => void;
  /** Flip a translated message between original + translation. */
  toggleTranslation: (messageId: string) => void;
```

- [ ] **Step 2: Add state + handlers** inside `useChatThread` (near `reactions`):

```ts
  const [translations, setTranslations] = useState<
    Map<string, { state: "loading" | "done" | "error"; text?: string; showing: "original" | "translation" }>
  >(new Map());

  const translate = useCallback((messageId: string, text: string) => {
    setTranslations((prev) => {
      const next = new Map(prev);
      next.set(messageId, { state: "loading", showing: "translation" });
      return next;
    });
    const target = typeof navigator !== "undefined" ? navigator.language : "en-US";
    void translateText(text, target)
      .then((res) => {
        setTranslations((prev) => {
          const next = new Map(prev);
          next.set(messageId, { state: "done", text: res.translated, showing: "translation" });
          return next;
        });
      })
      .catch(() => {
        setTranslations((prev) => {
          const next = new Map(prev);
          next.set(messageId, { state: "error", showing: "original" });
          return next;
        });
      });
  }, []);

  const toggleTranslation = useCallback((messageId: string) => {
    setTranslations((prev) => {
      const next = new Map(prev);
      const cur = next.get(messageId);
      if (!cur || cur.state !== "done") return prev;
      next.set(messageId, {
        ...cur,
        showing: cur.showing === "translation" ? "original" : "translation",
      });
      return next;
    });
  }, []);
```

- [ ] **Step 3: Return them** in the final `useMemo` (add `translations, translate, toggleTranslation` to both the object and the deps array).
- [ ] **Step 4:** `npx tsc --noEmit` -> clean. **Commit.**

### Task 5: translate affordance on `TextBubble`

**Files:** Modify `src/components/app/chat-bubble.tsx`

- [ ] **Step 1: Extend `TextBubbleProps`** (add after the reaction props):

```ts
  /** Incoming bubbles only: enables the Translate affordance. */
  translatable?: boolean;
  /** Translation state for this message (from the chat hook). */
  translation?: { state: "loading" | "done" | "error"; text?: string; showing: "original" | "translation" };
  /** Trigger an on-demand translation. */
  onTranslate?: () => void;
  /** Flip original/translation. */
  onToggleTranslation?: () => void;
```

- [ ] **Step 2: Render the affordance + translated body.** In `TextBubble`, destructure the new props, and inside the bubble-content wrapper (the `<div className="group relative">` block from the reactions work), replace the message body so it shows the translation when active, and add the affordance below. Use this structure for the bubble surface + affordance (keep the existing reaction chip/button siblings):

```tsx
        <div className={bubbleSurfaceVariants({ side })} {...(canReact ? gesture : {})}>
          {translation?.state === "done" && translation.showing === "translation"
            ? translation.text
            : children}
        </div>

        {translatable ? (
          <div className="mt-1 flex items-center gap-2">
            {!translation || translation.state === "error" ? (
              <button
                type="button"
                onClick={onTranslate}
                className="text-caption text-(--ink-3) underline underline-offset-2 hover:text-(--ink-2)"
              >
                {translation?.state === "error" ? "Couldn't translate, retry" : "Translate"}
              </button>
            ) : translation.state === "loading" ? (
              <span className="text-caption text-(--ink-3)">Translating…</span>
            ) : (
              <button
                type="button"
                onClick={onToggleTranslation}
                className="text-caption text-(--ink-3) underline underline-offset-2 hover:text-(--ink-2)"
              >
                {translation.showing === "translation" ? "Show original" : "Show translation"}
              </button>
            )}
          </div>
        ) : null}
```

(The `<button>` here is a low-emphasis text link, not a primary control; if eslint's no-restricted-syntax flags it, wrap with the kit `Button variant="link" size="xs"` instead. Confirm at implementation.)

- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint src/components/app/chat-bubble.tsx` -> clean. **Commit.**

### Task 6: wire translation into the thread view

**Files:** Modify `src/components/app/chat-thread-view.tsx`

- [ ] **Step 1: Pull from the hook.** Update the `useChatThread` destructure to also take `translations, translate, toggleTranslation`.
- [ ] **Step 2: Pass into each incoming `TextBubble`** (the `messages.map`):

```tsx
              translatable={m.fromUserId !== myUuid}
              translation={translations.get(m.id)}
              onTranslate={() => translate(m.id, m.body)}
              onToggleTranslation={() => toggleTranslation(m.id)}
```

- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint src/components/app/chat-thread-view.tsx` -> clean. **Commit.**

### Task 7: verify + deploy

- [ ] **Step 1: Backend** — `pytest tests/test_translation.py -v` (4 pass) + `python -c "import service.api"` in the harness.
- [ ] **Step 2: Frontend** — `npx tsc --noEmit` + `npx eslint <changed files>` clean, then **`pnpm run build`** (the real gate; confirm it compiles).
- [ ] **Step 3: Deploy backend** — push `ahavah/main`, watch the deploy, curl-smoke `POST /translate` (expect 400 on empty body / 401 unauth, not 404).
- [ ] **Step 4: Deploy frontend** — push `master`, then **verify the Vercel build reaches Ready** (`vercel ls --token`) before calling it live.
- [ ] **Step 5:** Tell the user to test the tap-to-translate in live chat. Note: if translations come back identical to the source, set `OPENAI_TRANSLATE_MODEL` (the default id may need adjusting); passthrough keeps chat working meanwhile.

---

## Self-Review

**Spec coverage:** service (OpenAI + cache + guards) -> Task 1; `POST /translate` -> Task 2; `translateText` client -> Task 3; per-message hook state -> Task 4; `TextBubble` affordance -> Task 5; thread-view wiring -> Task 6; verify + deploy -> Task 7. Non-goals (auto/send-side) not built. Covered.

**Placeholder scan:** the eslint `<button>`-vs-`Button` note in Task 5 is a verify-at-implementation instruction (a known fallback given the repo's no-restricted-syntax rule), not a TODO. All code blocks complete.

**Type consistency:** `translate(text, target)` service returns `{translated, detected_source, cached}` (Task 1), consumed identically by the route (Task 2) and `TranslateResult` (Task 3). The hook's `translations` map shape `{state, text?, showing}` (Task 4) matches the `TextBubble` `translation` prop (Task 5) and the thread-view wiring (Task 6). `translate(messageId, text)` / `toggleTranslation(messageId)` signatures match across Tasks 4 and 6. `_redis`, `_openai_translate`, `MAX_CHARS` defined in Task 1 are referenced by the tests (Task 1) and route (Task 2).

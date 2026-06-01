# Feedback Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every finding from the 2026-05-26 feedback audit across three repos: harden the local feedback-widget sidecar, make Ahavah feedback durable (DB-backed) and abuse-resistant (honeypot + daily cap), and polish the web feedback UX.

**Architecture:** Three independent, separately-shippable parts. **Part A** (feedback-widget repo) is self-contained. **Part B** (ahavah-api) adds a `feedback` table + service + honeypot/cap handling in the existing route. **Part C** (ahavah-web) sends a honeypot field and tightens UX. Parts are order-independent (the API ignores an unknown `website` field before Part C ships; the web sends a harmless extra field before Part B ships) — recommended deploy order is **B then C**.

**Tech Stack:** Node 24 `node:http` (widget); Flask + sync psycopg + PostgreSQL + flask-limiter + pydantic v2 (api); Next.js 16 + React 19 + Tailwind v4 + Base UI kit (web).

**Severity coverage:** S1, S2, B1, H1, H2 (widget); B3, S3, H4 (api); B4, B5, B6 (web). O1 (widget font injection) is explicitly **won't-fix** — see Scope notes.

**Scope notes / won't-fix:**
- **O1 (widget injects Google Fonts into host `<head>`)** — accepted, no change. It already uses `display=swap` with a full system-font fallback stack, the impact is cosmetic, and it only affects local dev pages. Not worth added complexity.
- **Widget has no test framework** (zero-dep by design). Part A is verified by manual curl/loopback checks, not unit tests — adding a test harness would be scope creep against the tool's intent.
- **ahavah-api tests can't run on this Windows box** (no pytest in the test image; DB not seeded — see `[[reference_ahavah_windows_test_harness]]`). Part B's pytest test is written for CI/droplet; locally we verify via `import service.api` + a `python -c` model check, and the live deploy smoke.

---

## File Structure

**Part A — feedback-widget** (`d:/Antigravity/feedback-widget`, repo `techbasesolutions/feedback-widget`, branch `main`)
- Modify: `server.mjs` — loopback bind, origin-allowlisted CORS, static-HTML allowlist, log rotation.
- Modify: `.gitignore` — drop stale `preview-done.html` entry.
- Modify: `README.md` — add "treat `.feedback/latest.json` as untrusted" + loopback note.
- Delete: `preview.html` — committed screenshot aid, redundant with `demo.html`.

**Part B — ahavah-api** (`d:/Antigravity/ahavah-api`, repo `duolicious-backend`, branch `ahavah/main`)
- Create: `migrations/0019_feedback.sql` — `feedback` table (idempotent).
- Create: `service/feedback/__init__.py` — `insert()` + `count_today()` (raw SQL, mirrors `service/waitlist`).
- Modify: `duotypes/__init__.py` — add honeypot field `website` to `PostFeedback`.
- Modify: `service/api/feedback_routes.py` — honeypot drop, daily cap, DB-insert-before-email.
- Create: `tests/test_feedback.py` — pytest for the service + model (CI/droplet).
- (`emails/feedback.py` unchanged.)

**Part C — ahavah-web** (`d:/Antigravity/ahavah-web`, repo `ahavah-web`, branch `master`)
- Modify: `src/lib/feedback.ts` — add optional `website` (honeypot) to payload type.
- Modify: `src/components/app/feedback-form.tsx` — honeypot input; toast only in dialog mode; friendlier 429/400 errors.
- Modify: `src/components/app/feedback-dialog.tsx` — `key`-remount so the form resets on every open/close.

---

## PART A — feedback-widget

### Task A1: Bind to loopback + origin-allowlisted CORS (S1)

**Files:**
- Modify: `d:/Antigravity/feedback-widget/server.mjs`

- [ ] **Step 1: Replace the static CORS object with an origin-allowlisting helper.**

Replace the current block ([server.mjs:33-42](../../../feedback-widget/server.mjs)):

```js
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}
```

with:

```js
// Only reflect CORS for loopback origins. A page on http://localhost:3000
// (your dev app) is allowed to POST here; a malicious public site you happen
// to visit while the sidecar runs is NOT (no ACAO header -> browser blocks).
function isLoopbackOrigin(origin) {
  if (!origin) return false;
  try {
    const h = new URL(origin).hostname;
    return (
      h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' ||
      h === '::1' || h === '[::1]' || h.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (isLoopbackOrigin(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
  }
  return {}; // non-loopback (or no) origin: emit no CORS headers
}

function send(res, status, body, headers = {}, req = null) {
  const cors = req ? corsHeaders(req) : {};
  res.writeHead(status, { ...cors, ...headers });
  res.end(body);
}
```

- [ ] **Step 2: Thread `req` into every `send(...)` call.** In the request handler, pass `req` as the 5th arg to each `send(...)`. The OPTIONS preflight and all responses must carry the right CORS headers:

```js
  if (method === 'OPTIONS') return send(res, 204, '', {}, req);
```

Apply the same `, req)` final argument to the `/widget.js`, `/health`, static-HTML, `/feedback` success/error, and the final 404 `send(...)` calls.

- [ ] **Step 3: Bind to loopback only.** Change ([server.mjs:126](../../../feedback-widget/server.mjs)):

```js
server.listen(PORT, () => {
```

to:

```js
server.listen(PORT, '127.0.0.1', () => {
```

- [ ] **Step 4: Verify loopback bind + CORS allowlist.**

Run (from the widget folder):
```bash
node server.mjs &
sleep 1
# loopback origin -> reflected:
curl -s -D - -o /dev/null -H "Origin: http://localhost:3000" -X OPTIONS http://localhost:7331/feedback | grep -i access-control-allow-origin
# malicious origin -> NO allow-origin header:
curl -s -D - -o /dev/null -H "Origin: https://evil.example" -X OPTIONS http://localhost:7331/feedback | grep -i access-control-allow-origin || echo "(no ACAO for evil — correct)"
# bound to loopback only (LAN IP should refuse):
node -e "require('http').get({host:'127.0.0.1',port:7331,path:'/health'},r=>{console.log('loopback',r.statusCode)})"
```
Expected: first prints `Access-Control-Allow-Origin: http://localhost:3000`; second prints `(no ACAO for evil — correct)`; loopback health = 200.

- [ ] **Step 5: Commit.**
```bash
git add server.mjs
git commit -m "fix(security): bind sidecar to loopback + allowlist CORS to loopback origins"
```

### Task A2: Restrict static-HTML serving to an allowlist + delete preview.html (S2, H1)

**Files:**
- Modify: `d:/Antigravity/feedback-widget/server.mjs`
- Delete: `d:/Antigravity/feedback-widget/preview.html`

- [ ] **Step 1: Replace the regex static route with an explicit allowlist.** Change ([server.mjs:83-90](../../../feedback-widget/server.mjs)):

```js
  if (method === 'GET' && /^\/[\w-]+\.html$/.test(route)) {
    try {
      const html = await fs.readFile(path.join(__dirname, route.slice(1)), 'utf8');
      return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    } catch {
      return send(res, 404, 'not found', { 'Content-Type': 'text/plain' });
    }
  }
```

to:

```js
  // Only the demo page is served (so the widget can be tried without a project).
  const STATIC_HTML = new Set(['/demo.html']);
  if (method === 'GET' && STATIC_HTML.has(route)) {
    try {
      const html = await fs.readFile(path.join(__dirname, route.slice(1)), 'utf8');
      return send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, req);
    } catch {
      return send(res, 404, 'not found', { 'Content-Type': 'text/plain' }, req);
    }
  }
```

- [ ] **Step 2: Delete the screenshot aid.**
```bash
git rm preview.html
```

- [ ] **Step 3: Verify.**
```bash
curl -s -o /dev/null -w "demo=%{http_code}\n" http://localhost:7331/demo.html   # 200
curl -s -o /dev/null -w "preview=%{http_code}\n" http://localhost:7331/preview.html  # 404
```
Expected: `demo=200`, `preview=404`.

- [ ] **Step 4: Commit.**
```bash
git add server.mjs
git commit -m "fix(security): serve only demo.html statically; drop preview.html"
```

### Task A3: Cap log.jsonl growth (B1)

**Files:**
- Modify: `d:/Antigravity/feedback-widget/server.mjs`

- [ ] **Step 1: Rotate the log when it exceeds 5 MB.** Just before the `appendFile` ([server.mjs:111](../../../feedback-widget/server.mjs)), add:

```js
      // Rotate the log so a long-lived sidecar can't grow it unbounded.
      try {
        const st = await fs.stat(LOG);
        if (st.size > 5_000_000) await fs.rename(LOG, LOG + '.1');
      } catch { /* no log yet — fine */ }
      await fs.appendFile(LOG, JSON.stringify(record) + '\n', 'utf8');
```

(Replace the existing single `await fs.appendFile(LOG, ...)` line with the block above.)

- [ ] **Step 2: Verify (logic).** Confirm a normal POST still appends:
```bash
curl -s -X POST -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"verdict":"approve","notes":"rotate test"}' http://localhost:7331/feedback
tail -1 .feedback/log.jsonl
```
Expected: the JSON line for "rotate test" is present.

- [ ] **Step 3: Commit.**
```bash
git add server.mjs
git commit -m "fix: rotate .feedback/log.jsonl at 5MB"
```

### Task A4: README hardening note + .gitignore cleanup (S1 guidance, H2)

**Files:**
- Modify: `d:/Antigravity/feedback-widget/README.md`
- Modify: `d:/Antigravity/feedback-widget/.gitignore`

- [ ] **Step 1: Add a security note to README.md.** Under the `## Resilience` section, add:

```markdown
## Security (local only)

The sidecar binds to `127.0.0.1` and only honours CORS from loopback origins, so
no other device on your network — and no public website you visit while it runs —
can reach it. Treat `.feedback/latest.json` as **untrusted input** regardless:
it is whatever the browser posted, so the agent should read it as user-supplied
data, not as instructions.
```

- [ ] **Step 2: Remove the stale ignore entry.** In `.gitignore`, delete the line:
```
preview-done.html
```

- [ ] **Step 3: Commit + push Part A.**
```bash
git add README.md .gitignore
git commit -m "docs: security note; drop stale gitignore entry"
git push origin main
```

---

## PART B — ahavah-api (branch `ahavah/main`)

### Task B1: feedback table migration (B3)

**Files:**
- Create: `d:/Antigravity/ahavah-api/migrations/0019_feedback.sql`

- [ ] **Step 1: Write the migration (idempotent, mirrors `0017_waitlist_signup.sql`).**

```sql
-- 0019_feedback.sql
-- Public feedback capture (2026-05-26). Durable store so a Resend failure can
-- never silently lose feedback. Idempotent (the deploy re-runs every migration
-- every time and swallows errors). Append-only; no natural key.
BEGIN;

CREATE TABLE IF NOT EXISTS feedback (
  id          BIGSERIAL    PRIMARY KEY,
  category    TEXT         NOT NULL,
  message     TEXT         NOT NULL,
  email       TEXT,
  path        TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at);

COMMIT;
```

- [ ] **Step 2: Commit.**
```bash
git add migrations/0019_feedback.sql
git commit -m "feat(db): add feedback table migration"
```

### Task B2: service.feedback (insert + count_today) with a failing test first (B3, H4)

**Files:**
- Create: `d:/Antigravity/ahavah-api/tests/test_feedback.py`
- Create: `d:/Antigravity/ahavah-api/service/feedback/__init__.py`

- [ ] **Step 1: Write the failing test (mirrors `tests/test_waitlist.py`).**

```python
"""Public feedback capture (2026-05-26) - service.feedback tests."""

from __future__ import annotations

import pytest


def test_insert_returns_id_and_count_today_increments():
    from database import api_tx
    from service.feedback import insert, count_today
    with api_tx() as tx:
        before = count_today(tx)
        fid = insert(
            tx,
            category="idea",
            message="great app",
            email=None,
            path="/feedback",
            user_agent="pytest",
        )
        assert isinstance(fid, int)
        assert count_today(tx) == before + 1
        # cleanup
        tx.execute("DELETE FROM feedback WHERE id = %(id)s", dict(id=fid))


def test_postfeedback_strips_message_and_normalizes_email():
    import duotypes as t
    m = t.PostFeedback(category="idea", message="  hi  ", email="")
    assert m.message == "hi"
    assert m.email is None
    assert not m.website  # honeypot defaults empty


def test_postfeedback_rejects_bad_category_and_empty_message():
    import duotypes as t
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        t.PostFeedback(category="spam", message="x")
    with pytest.raises(ValidationError):
        t.PostFeedback(category="idea", message="   ")
```

- [ ] **Step 2: Run it to verify it fails.**

Run (CI/droplet — see Scope notes; locally this import fails because `service.feedback` doesn't exist yet):
```bash
pytest tests/test_feedback.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'service.feedback'`.

- [ ] **Step 3: Implement `service/feedback/__init__.py` (raw SQL, mirrors `service/waitlist`).**

```python
"""Public feedback capture. Caller owns the api_tx.

Append-only store written BEFORE the notification email fires, so a Resend
failure can never silently lose a submission (the row is the source of truth).
"""

from __future__ import annotations


_Q_INSERT = """
  INSERT INTO feedback (category, message, email, path, user_agent)
  VALUES (%(category)s, %(message)s, %(email)s, %(path)s, %(user_agent)s)
  RETURNING id
"""

_Q_COUNT_TODAY = """
  SELECT count(*) AS n FROM feedback
   WHERE created_at >= date_trunc('day', NOW())
"""


def insert(tx, *, category, message, email=None, path=None, user_agent=None) -> int:
    row = tx.execute(_Q_INSERT, dict(
        category=category,
        message=message,
        email=email,
        path=path,
        user_agent=user_agent,
    )).fetchone()
    return int(row["id"])


def count_today(tx) -> int:
    """Rows inserted since midnight UTC — drives the global daily abuse cap."""
    return tx.execute(_Q_COUNT_TODAY).fetchone()["n"]
```

- [ ] **Step 4: Run the test to verify it passes** (CI/droplet, against the seeded DB).
```bash
pytest tests/test_feedback.py -v
```
Expected: PASS (3 tests). Note: `test_postfeedback_*` pass only after Task B3 adds the `website` field — run Task B3 before relying on them.

- [ ] **Step 5: Commit.**
```bash
git add tests/test_feedback.py service/feedback/__init__.py
git commit -m "feat: service.feedback insert + count_today (+ tests)"
```

### Task B3: honeypot field on PostFeedback (S3)

**Files:**
- Modify: `d:/Antigravity/ahavah-api/duotypes/__init__.py`

- [ ] **Step 1: Add the honeypot field.** In the `PostFeedback` model, add `website` after `user_agent`:

```python
class PostFeedback(BaseModel):
    """Public POST /feedback body. Emailed to admin + stored. Email is optional
    (anonymous-friendly); category is constrained; message is required."""
    category: str = Field(pattern=r'^(idea|problem|praise|other)$')
    message: str = Field(min_length=1, max_length=2000)
    email: Optional[EmailStr] = None
    path: Optional[str] = Field(default=None, max_length=512)
    user_agent: Optional[str] = Field(default=None, max_length=2048)
    # Honeypot: a hidden field real users never fill. Bots that fill it get
    # silently dropped by the route. Capped so it can't be used to bloat input.
    website: Optional[str] = Field(default=None, max_length=256)

    @field_validator('message', mode='before')
    def strip_message(cls, value):
        return str(value or '').strip()

    @field_validator('email', mode='before')
    def normalize_email(cls, value):
        if value is None or not str(value).strip():
            return None
        return EmailStr._validate(str(value).lower().strip())
```

- [ ] **Step 2: Verify the model locally (no DB needed).**
```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c \"import duotypes as t; m=t.PostFeedback(category='idea', message=' hi ', website='x'); print('hp=', m.website, 'msg=', repr(m.message))\""
```
Expected: `hp= x msg= 'hi'`.

- [ ] **Step 3: Commit.**
```bash
git add duotypes/__init__.py
git commit -m "feat: honeypot field on PostFeedback"
```

### Task B4: route — honeypot drop, daily cap, DB-insert-before-email (B3, S3)

**Files:**
- Modify: `d:/Antigravity/ahavah-api/service/api/feedback_routes.py`

- [ ] **Step 1: Replace the route body.** Full new file content:

```python
"""Public POST /feedback - general user feedback, stored + emailed to admin.

Sibling module (imported at the bottom of service/api/__init__.py).
Unauthenticated and anonymous-friendly (email is optional). Defence in depth:
  - per-IP rate limit (5/min) via the dedicated shared limiter,
  - a hidden honeypot field (`website`) — bots that fill it are silently dropped,
  - a global daily cap so a distributed flood can't spam the inbox indefinitely.
The submission is written to the `feedback` table BEFORE the email fires, so a
Resend failure never loses it.
"""

from __future__ import annotations

import duotypes as t
from service.api.decorators import post, validate, limiter, _is_private_ip
from database import api_tx
from service.feedback import insert as insert_feedback, count_today
from emails.feedback import send_feedback_async

# Global daily cap (all IPs). Generous for a real product, tight enough that a
# botnet can't bury the admin inbox. Tune as traffic grows.
DAILY_CAP = 300

feedback_limit = limiter.shared_limit(
    "5 per minute",
    scope="feedback",
    exempt_when=_is_private_ip,
)


@post('/feedback', limiter=feedback_limit)
@validate(t.PostFeedback)
def post_feedback(req: t.PostFeedback):
    # Honeypot: real users never fill `website`. Pretend success, do nothing.
    if req.website:
        return {'ok': True}

    with api_tx() as tx:
        if count_today(tx) >= DAILY_CAP:
            return {'ok': False, 'error': 'daily_limit'}, 429
        insert_feedback(
            tx,
            category=req.category,
            message=req.message,
            email=req.email,
            path=req.path,
            user_agent=req.user_agent,
        )

    # Row is durable now; the email is best-effort notification on top.
    send_feedback_async(
        category=req.category,
        message=req.message,
        email=req.email,
        path=req.path,
        user_agent=req.user_agent,
    )
    return {'ok': True}
```

- [ ] **Step 2: Verify route registration still imports cleanly.**
```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c 'import service.api; print(\"import ok\")'"
```
Expected: prints `import ok` (DB-connection background errors from the harness are expected and unrelated — see Scope notes).

- [ ] **Step 3: Commit + push Part B.**
```bash
git add service/api/feedback_routes.py
git commit -m "feat(security): honeypot + daily cap; persist feedback before emailing"
git push origin ahavah/main
```

- [ ] **Step 4: Watch the droplet deploy + live-smoke.** After `gh run watch` succeeds:
```bash
# valid submission persists + 200:
curl -s -X POST https://api.ahavah.app/feedback -H "Content-Type: application/json" \
  -d '{"category":"idea","message":"post-hardening smoke","email":"admin@techbaseltd.com","path":"/feedback"}' -w "\nHTTP %{http_code}\n"
# honeypot filled -> silently accepted, NOT stored/emailed:
curl -s -X POST https://api.ahavah.app/feedback -H "Content-Type: application/json" \
  -d '{"category":"idea","message":"bot","website":"http://spam"}' -w "\nHTTP %{http_code}\n"
```
Expected: both return `{"ok":true}` HTTP 200; the first lands an email + a row, the second does neither. Confirm the row count via:
```bash
ssh -i C:/Users/Ehud/.ssh/id_ed25519_ahavah -o BatchMode=yes -o StrictHostKeyChecking=accept-new root@167.71.93.27 \
  'docker exec ahavah-api-api-1 python -c "from database import api_tx; from service.feedback import count_today; \
   import sys; \
   exec(\"with api_tx() as tx: print(\\\"today=\\\", count_today(tx))\")"'
```
Expected: `today=` reflects only the non-honeypot submissions.

---

## PART C — ahavah-web (branch `master`)

### Task C1: honeypot in the payload type (S3)

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/lib/feedback.ts`

- [ ] **Step 1: Add `website` to `FeedbackPayload`.**

```ts
export type FeedbackPayload = {
  category: FeedbackCategory;
  message: string;
  email?: string;
  path?: string;
  user_agent?: string;
  /** Honeypot — always empty for real users; bots fill it. */
  website?: string;
};
```

- [ ] **Step 2: Commit.**
```bash
git add src/lib/feedback.ts
git commit -m "feat: add honeypot field to feedback payload type"
```

### Task C2: honeypot input + toast-only-in-dialog + friendlier errors (S3, B5, B6)

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/components/app/feedback-form.tsx`

- [ ] **Step 1: Add honeypot state + import ApiError.** At the top imports add:

```ts
import { ApiError } from "@/lib/api-client";
```

Inside `FeedbackForm`, add state alongside the others:

```ts
  const [website, setWebsite] = useState(""); // honeypot
```

- [ ] **Step 2: Send the honeypot and only toast in dialog mode; map errors.** Replace the `handleSubmit` body's `try/catch`:

```ts
    try {
      await postFeedback({
        category,
        message: trimmed,
        email: email.trim() || undefined,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        website: website || undefined,
      });
      if (onSuccess) {
        // Dialog mode: toast + close (no inline panel space).
        toast.success("Thank you. Your feedback is on its way.");
        reset();
        onSuccess();
      } else {
        // Page mode: inline confirmation panel (no toast — avoids double "thank you").
        setSent(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setErrorMessage("We've had a lot of feedback today. Please try again later.");
      } else {
        setErrorMessage("Something went wrong. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
```

(Remove the old unconditional `toast.success(...)` that ran before the `if (onSuccess)` branch.)

- [ ] **Step 3: Render the honeypot field.** Inside the returned form `<div className="flex flex-col gap-5">`, add as the FIRST child (before the Category block):

```tsx
        {/* Honeypot — hidden from people, catches bots. Not announced to AT. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
```

Also clear it in `reset()`:

```ts
  const reset = () => {
    setCategory("");
    setMessage("");
    setEmail("");
    setWebsite("");
    setErrorMessage(null);
    setSent(false);
  };
```

- [ ] **Step 4: Verify (typecheck + lint).**
```bash
cd /d/Antigravity/ahavah-web && npx tsc --noEmit && npx eslint src/components/app/feedback-form.tsx src/lib/feedback.ts
```
Expected: no output (clean).

- [ ] **Step 5: Commit.**
```bash
git add src/components/app/feedback-form.tsx src/lib/feedback.ts
git commit -m "feat: honeypot input; toast only in dialog; friendlier 429 error"
```

### Task C3: reset the form on every dialog open/close (B4)

**Files:**
- Modify: `d:/Antigravity/ahavah-web/src/components/app/feedback-dialog.tsx`

- [ ] **Step 1: Remount the form via `key` so state never persists across opens.** Change the `<FeedbackForm .../>` usage:

```tsx
        <FeedbackForm key={open ? "open" : "closed"} onSuccess={() => onOpenChange(false)} />
```

(When `open` flips, the `key` changes, React remounts `FeedbackForm`, and its `useState` re-initialises — a clean slate regardless of Base UI mount semantics.)

- [ ] **Step 2: Verify build + render.**
```bash
cd /d/Antigravity/ahavah-web && npx tsc --noEmit && npx next build 2>&1 | grep -iE "feedback|error|Compiled successfully" | head
```
Expected: `✓ Compiled successfully`, `/feedback` route listed, no errors.

- [ ] **Step 3: Screenshot /feedback to confirm the honeypot is invisible** (per `[[feedback_verify_rendered_pixels]]`). Start the server, screenshot, and view:
```bash
(npx next start -p 3100 >/tmp/ns.log 2>&1 &) ; sleep 6
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=560,940 --virtual-time-budget=4000 \
  --screenshot=.fb.png "http://localhost:3100/feedback"
```
Then Read `.fb.png`. Expected: the form looks identical to before (no visible "website" field). Clean up: `rm .fb.png` and stop the server (`Get-NetTCPConnection -LocalPort 3100 ... Stop-Process`).

- [ ] **Step 4: Commit + push Part C.**
```bash
git add src/components/app/feedback-dialog.tsx
git commit -m "fix: reset feedback form on every dialog open via key remount"
git push origin master
```

- [ ] **Step 5: Confirm Vercel Ready + live route.**
```bash
npx vercel ls --token <[[vercel-token]]> | grep -m1 Production   # ● Ready
curl -s -o /dev/null -w "live /feedback = %{http_code}\n" https://ahavah.app/feedback
```
Expected: latest Production `● Ready`; `live /feedback = 200`.

---

## Self-Review

**1. Spec coverage:**
- S1 → A1 (loopback bind + CORS allowlist) ✓
- S2 → A2 (static allowlist) ✓
- B1 → A3 (log rotation) ✓
- H1 → A2 (delete preview.html) ✓
- H2 → A4 (.gitignore) ✓
- O1 → Scope notes (won't-fix, rationale) ✓
- B3 → B1 (table) + B2 (service) + B4 (insert-before-email) ✓
- S3 → B3 (honeypot field) + B4 (honeypot drop + daily cap) + C1/C2 (send honeypot) ✓
- H4 → B2 (pytest) ✓
- B4 (dialog reset) → C3 ✓
- B5 (double thank-you) → C2 (toast only in dialog) ✓
- B6 (error clarity) → C2 (429/400 mapping) ✓
No gaps.

**2. Placeholder scan:** No TBD/“handle errors”/“similar to”. Every code step shows complete code. ✓

**3. Type consistency:**
- `insert(tx, *, category, message, email, path, user_agent) -> int` defined in B2, called identically in B4. ✓
- `count_today(tx) -> int` defined B2, called B4. ✓
- `PostFeedback.website: Optional[str]` added B3, read as `req.website` in B4, sent as `website?` from C1/C2. ✓
- `corsHeaders(req)` / `send(res, status, body, headers, req)` defined A1, used in A2. ✓
- `FeedbackPayload.website?` (C1) matches the `website` posted in C2. ✓

---

## Execution order & rollout
1. **Part A** (widget) — independent; ship anytime.
2. **Part B** (api) — deploy first of the Ahavah pair (adds table + honeypot/cap handling; tolerates web not yet sending `website`).
3. **Part C** (web) — deploy after B (starts sending the honeypot; tolerates B not yet shipped since the field is harmlessly ignored).

# Beta Launch-Announcement Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dry-run-able CLI that emails the `beta_signup` cohort a "the beta is open" launch announcement (linking to the existing `/auth/sign-in` page), to be run manually with `--all` on June 15.

**Architecture:** Two new files in `ahavah-api`, mirroring `emails/waitlist_welcome.py` (branded email on the `emails/base.py` shell) and `emails/send_waitlist_welcome.py` (dry-run CLI). No web, DB, route, or auth changes. Files must be committed + deployed so they exist in the api container for the June-15 run; **nothing is sent at implementation time.**

**Tech Stack:** Python, `emails/base.py` brand shell, `aws_smtp` (Resend), `database.api_tx`, argparse. Spec: `docs/superpowers/specs/2026-05-27-beta-launch-batch-design.md`.

---

## File Structure
- Create: `ahavah-api/emails/beta_launch.py` — the announcement email (`beta_launch_html()` + `send_beta_launch()`).
- Create: `ahavah-api/emails/send_beta_launch.py` — the dry-run CLI (`recipients()` + `main()`).

---

### Task 1: beta_launch.py — the announcement email

**Files:** Create `ahavah-api/emails/beta_launch.py`

- [ ] **Step 1: Write the email module** (mirrors `emails/waitlist_welcome.py`; uses the real `emails/base.py` helpers — `render`, `chip`, `button`, `callout`, tokens):

```python
"""Beta launch announcement email.

Sent (via the emails/send_beta_launch.py CLI) to the beta_signup cohort when the
beta opens. Links to the existing sign-in page; sign-in is OTP-code based, so the
copy explains "enter your email, we'll send a one-time code". Inline-styled +
dark-mode aware via emails.base. Best-effort send (aws_smtp retries then gives up
without raising)."""
from __future__ import annotations

from service.config import EMAIL_DOMAIN
from emails.base import (
    render,
    button,
    chip,
    callout,
    INK,
    INK_SOFT,
    INDIGO,
    MUTED,
    SERIF,
    SANS,
)

SIGN_IN_URL = "https://ahavah.app/auth/sign-in"
SUBJECT = "Ahavah beta is open"
FROM_ADDR = f"hello@{EMAIL_DOMAIN}"
PREHEADER = "The Ahavah beta is open. Sign in with your email to get started."

_BODY = f"""
{chip("Beta is live")}

<h1 class="e-title" style="margin:18px 0 14px;font-family:{SERIF};font-size:44px;line-height:1.0;letter-spacing:-0.022em;font-weight:400;color:{INK};">
  The beta is <span style="color:{INDIGO};">open</span>.
</h1>

<p class="e-text" style="margin:0 0 16px;font-family:{SANS};font-size:17px;line-height:1.55;color:{INK_SOFT};">
  You signed up to test Ahavah, Torah-observant matchmaking for serious
  believers, and it's ready for you. Welcome in.
</p>

{callout("Sign in with the email you used to join. We'll send you a one-time code, no password.")}

{button("Open Ahavah &rarr;", SIGN_IN_URL, variant="lime", full=True)}

<p class="e-text" style="margin:16px 0 0;font-family:{SANS};font-size:13px;line-height:1.5;color:{MUTED};text-align:center;">
  Or go to ahavah.app/auth/sign-in
</p>
"""

_FOOTER = f"""
Ahavah &middot; Torah-observant matchmaking for the diaspora.<br/>
You're receiving this because you joined the Ahavah beta at
<a href="https://ahavah.app" style="color:{INDIGO};font-weight:600;text-decoration:none;">ahavah.app</a>.
"""


def beta_launch_html() -> str:
    return render(title=SUBJECT, preheader=PREHEADER, body_html=_BODY, footer_html=_FOOTER)


def send_beta_launch(email: str) -> None:
    """Synchronous send. Skips sample addresses. Best-effort (aws_smtp retries
    then gives up without raising)."""
    if not email or email.endswith("@example.com"):
        return
    from smtp import aws_smtp

    aws_smtp.send(
        subject=SUBJECT,
        body=beta_launch_html(),
        to_addr=email,
        from_addr=FROM_ADDR,
    )
```

- [ ] **Step 2: Verify it renders + links correctly** (docker harness):

```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c \"from emails.beta_launch import beta_launch_html; h=beta_launch_html(); print('len', len(h), 'has_url', 'https://ahavah.app/auth/sign-in' in h)\""
```
Expected: `len <n> has_url True`.

- [ ] **Step 3: Commit**

```bash
git add emails/beta_launch.py
git commit -m "feat: beta launch announcement email"
```

### Task 2: send_beta_launch.py — the dry-run CLI

**Files:** Create `ahavah-api/emails/send_beta_launch.py`

- [ ] **Step 1: Write the CLI** (mirrors `emails/send_waitlist_welcome.py`):

```python
"""One-off: email the beta launch announcement to the beta_signup cohort.

Run inside the api container on the droplet (it needs DB + SMTP env):

    python -m emails.send_beta_launch                 # DRY RUN — lists recipients, sends nothing
    python -m emails.send_beta_launch --only a@b.com  # send to one address (test)
    python -m emails.send_beta_launch --all           # send to every beta_signup row

Dry-run is the default so an accidental invocation never sends mail. Intended
for June 15, after the launch is confirmed live.
"""
from __future__ import annotations

import argparse

from database import api_tx
from emails.beta_launch import send_beta_launch, SUBJECT, FROM_ADDR


def recipients() -> list[str]:
    with api_tx() as tx:
        rows = tx.execute(
            "SELECT email FROM beta_signup ORDER BY created_at"
        ).fetchall()
    return [r["email"] for r in rows]


def main() -> None:
    ap = argparse.ArgumentParser(description="Send the Ahavah beta launch announcement.")
    ap.add_argument("--only", metavar="EMAIL", help="send to a single address (test)")
    ap.add_argument("--all", action="store_true", help="send to all beta_signup rows")
    args = ap.parse_args()

    print(f"Subject: {SUBJECT!r}  From: {FROM_ADDR!r}")

    if args.only:
        print(f"Sending single test to {args.only} ...")
        send_beta_launch(args.only)
        print("done (check the inbox; aws_smtp is best-effort).")
        return

    rs = recipients()
    if not args.all:
        print(f"DRY RUN — {len(rs)} beta recipient(s):")
        for e in rs:
            print(f"   - {e}")
        print("\nRe-run with --only EMAIL to test one, or --all to send to everyone.")
        return

    sent = skipped = 0
    print(f"Sending to {len(rs)} recipient(s)...")
    for e in rs:
        if e.endswith("@example.com"):
            print(f"   skip (sample) {e}")
            skipped += 1
            continue
        send_beta_launch(e)
        print(f"   sent {e}")
        sent += 1
    print(f"done — {sent} sent, {skipped} skipped.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify it imports + dry-runs** (docker harness; the DB isn't seeded so `recipients()` may error, but import + arg parsing must work):

```bash
cd /d/Antigravity/ahavah-api && MSYS_NO_PATHCONV=1 docker compose -f docker-compose.test.yml \
  run --rm -v /d/Antigravity/ahavah-api:/app --entrypoint bash api \
  -lc "cd /app && python -c \"import emails.send_beta_launch as m; print('import ok', hasattr(m,'recipients'), hasattr(m,'main'))\""
```
Expected: `import ok True True`.

- [ ] **Step 3: Commit**

```bash
git add emails/send_beta_launch.py
git commit -m "feat: beta launch batch CLI (dry-run default)"
```

### Task 3: Deploy (make the CLI available in the container — no send)

- [ ] **Step 1: Push + deploy**

```bash
git push origin ahavah/main
rid=$(gh run list --branch ahavah/main --workflow "Deploy ahavah/main → droplet" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$rid" --exit-status
```
Expected: deploy succeeds (~5 min); the new modules are now in the running `ahavah-api-api-1` container.

- [ ] **Step 2: Confirm the CLI is present + dry-runs on the droplet** (lists the live beta cohort, sends nothing):

```bash
ssh -i C:/Users/Ehud/.ssh/id_ed25519_ahavah root@167.71.93.27 \
  'docker exec ahavah-api-api-1 python -m emails.send_beta_launch'
```
Expected: prints `DRY RUN — N beta recipient(s):` and the (currently empty) list. **No mail is sent.**

---

## Self-Review

**1. Spec coverage:**
- Announcement email → sign-in page → Task 1 (`beta_launch.py`, `SIGN_IN_URL = /auth/sign-in`) ✓
- Dry-run CLI (default / `--only` / `--all`, reads `beta_signup`, skips `@example.com`) → Task 2 ✓
- Files deployed to the container for the June-15 run, no send now → Task 3 ✓
- Safety (dry-run default, `@example.com` skip, best-effort, human-gated `--all`) → Tasks 1-2 ✓
- Out of scope (magic link / scheduling / web / DB) → none added ✓
No gaps.

**2. Placeholder scan:** No TBD/vague steps; complete file contents in both create steps; exact commands.

**3. Type consistency:**
- `send_beta_launch(email)`, `SUBJECT`, `FROM_ADDR` defined in Task 1, imported in Task 2 ✓
- `recipients()` / `main()` defined Task 2, referenced in Task 3 verify ✓
- `beta_launch_html()` defined Task 1, used by `send_beta_launch` + verified Task 1 Step 2 ✓
- `emails.base` helpers (`render`/`chip`/`button`/`callout` + tokens) match the real signatures in `emails/base.py` ✓

---

## Execution note
Run order: Task 1 → 2 → 3. The June-15 `--only`/`--all` send is **operator-run later**, not part of this implementation.

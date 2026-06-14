# QA Backlog — found-while-testing UI issues

Running list of concrete UI bugs found during testing, with exact code locations,
root cause, and fix direction. Append new findings here; check off when shipped.

---

## Tokens screen (`src/app/profile/tokens/page.tsx`)

### [x] 1. "How tokens work" link does nothing — FIXED 2026-06-14
- **Symptom:** the desktop header "How tokens work" link/button is inert — clicking it does nothing.
- **Location:** [profile/tokens/page.tsx:131-138](../src/app/profile/tokens/page.tsx#L131-L138) — the `topBarActions` `<Button variant="outline" size="sm">` has **no `onClick` and no `href`**. A real "How tokens work" explainer Card already exists lower on the page at [profile/tokens/page.tsx:344](../src/app/profile/tokens/page.tsx#L344).
- **Root cause:** missing click behavior on the header button.
- **Fix direction:** give the explainer `<Card>` section an `id` (e.g. `how-tokens-work`) and add an `onClick` that `scrollIntoView({ behavior: "smooth" })` to it (or open it in a dialog/sheet). Keep it keyboard-accessible.

### [x] 2. Single (1) and Starter (10) packs have invisible buttons — FIXED 2026-06-14
- **Symptom:** the Plus/Pro cards show filled lime "Buy now" buttons, but Single and Starter show "Select" with no visible button — reads as plain text, no tappable affordance.
- **Location:** [profile/tokens/page.tsx:316-328](../src/app/profile/tokens/page.tsx#L316-L328) — pack-card `<Button size="tap" tone={s.featured ? "cta" : "elevated"}>`. Featured (Plus/Pro) → `tone="cta"` (lime). Non-featured (Single/Starter) → `tone="elevated"`.
- **Root cause:** `tone="elevated"` has insufficient contrast against the white pack-card background, so the Single/Starter buttons render with no visible fill/border and look like inert text.
- **Fix direction:** give non-featured packs a visibly bordered/tappable treatment (e.g. `tone="outline"` or a brand-outline variant) so "Select" reads as a button, while keeping Plus/Pro as the filled lime CTA. Verify contrast with a rendered screenshot, not just class names.
- **Note:** likely a shared symptom anywhere `tone="elevated"` buttons sit on a white/PANEL surface — worth a quick audit per the "generalize the fix" rule.

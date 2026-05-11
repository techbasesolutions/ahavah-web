# Claude session entry point — Ahavah PWA

## Reading order (mandatory before any task)

1. **[`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md)** — what we're building, the anti-improvisation rules, atom + screen inventories, ranked roadmap. Web-scoped, supersedes the master plan for `ahavah-web` work.
2. **[`PROJECT-STATUS.md`](PROJECT-STATUS.md)** — current progress, gaps, R1–R12 rubric pass rate, the 8 documented recurring failure patterns + corrections.
3. **[`docs/dateasy-rules.md`](docs/dateasy-rules.md)** — design rules per Dateasy reference image (Phase D Task D.0 catch-up). 4 of 16 images visually inspected; the rest have seed rules from the master plan and need direct inspection before being relied on for screen builds.
4. **[`AGENTS.md`](AGENTS.md)** — one hard rule that I keep ignoring: read `node_modules/next/dist/docs/` before non-trivial Next 16 API usage.

## What NOT to re-read every session

- The 3,350-line master plan at `d:/Antigravity/docs/superpowers/plans/2026-05-08-bumpy-style-dating-app.md` — it covers backend / Expo / monetization / 6 months of phases. The web-scoped subset is in `docs/BUILD-PLAN.md`. Open the master plan only when starting a backend or auth phase.
- The 126-line web pivot plan at the same path, dated 2026-05-09 — fully absorbed into `docs/BUILD-PLAN.md`.
- The 5,000+ lines of specs at `d:/Antigravity/docs/specs/` — historical context. Open only if a specific question (e.g. duolicious internals, scam-detection extension surface) requires it.
- `SESSION-SUMMARY.md` — SUPERSEDED 2026-05-10. Snapshot of an earlier optimistic state. Kept for history.

## Anti-failure-pattern checklist (8 patterns documented in PROJECT-STATUS.md §9)

Quick recap; read PROJECT-STATUS.md §9 for the full quotes + corrections:

1. Don't mark done before observing verification (typecheck output, build output, browser screenshot)
2. Don't write raw className when a primitive could cover it — extend the primitive instead
3. Confirm "fix it" scope (refactor / visual change / functionality) before acting
4. "Read X" means I called Read on X with a citable offset/limit; don't pretend
5. Read `node_modules/next/dist/docs/` before non-trivial Next 16 APIs
6. Plan's `[R]/[W]/[B]` tag is source of truth for atom origin
7. UI changes require browser observation, not just typecheck pass
8. PROJECT-STATUS.md + BUILD-PLAN.md + memory entry IS the always-load context — no need to re-discover docs

@AGENTS.md

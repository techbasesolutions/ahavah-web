# Ahavah PWA

Bumpy-style international dating PWA. Mobile-first, dark-only, 414px-max-width column. Persian Indigo / Mindaro lime / Lavender / Pinkish Red on dark canvas.

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Base UI variant) + Kibo UI + Plus Jakarta Sans.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000 (or 3001 if 3000 is taken)
pnpm build        # production build, all 19 routes
pnpm lint         # ESLint with design-system enforcement
```

## Routes (19 currently)

`/` welcome · `/onboarding/*` (intro + name + dob + gender + photos + country + bio) · `/discover` swipe deck · `/matches` mutual likes · `/inbox` chat list · `/chat/[id]` thread · `/match` celebration · `/profile` own profile · `/profile/[uuid]` other profile · `/paywall` premium upsell · `/verify` 3-tier verification · `/design-system` Dateasy reproductions + primitives notes.

Bottom-nav links 4 main tabs: Discover / Matches / Inbox / Profile.

Plan target is ~40 screens; see [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) §6 for the full inventory.

## Reading order for new contributors / agents

1. **[`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md)** — what we're building, anti-improvisation rules, atom + screen inventories, ranked roadmap. Web-scoped; supersedes the master plan for `ahavah-web` work.
2. **[`PROJECT-STATUS.md`](PROJECT-STATUS.md)** — current progress, gaps, R1–R12 rubric pass rate, recurring failure patterns + corrections.
3. **[`docs/dateasy-rules.md`](docs/dateasy-rules.md)** — design rules per reference image (Phase D Task D.0 catch-up; 4 of 16 visually inspected so far).
4. **[`AGENTS.md`](AGENTS.md)** — one hard rule: read `node_modules/next/dist/docs/` before non-trivial Next 16 API usage.

For backend / Expo / monetization context, see the historical master plan at `d:/Antigravity/docs/superpowers/plans/2026-05-08-bumpy-style-dating-app.md` (3,350 lines, all phases).

## Brand tokens

Defined in [`src/app/globals.css`](src/app/globals.css):

- Colors (oklch on dark canvas): `--color-indigo` `--color-lime` `--color-lavender` `--color-pink` `--color-bg-canvas` `--color-bg-indigo` `--color-bg-elevated` `--color-text-secondary` `--color-text-muted`
- Typography pairings: `text-display` (30/1.1/-0.02em/800), `text-h1` (24/1.2/-0.015em/800), `text-h2`, `text-h3`, `text-body`, `text-meta`, `text-caption`, `text-overline`
- Tap targets: `--spacing-tap` 44px / `tap-lg` 48 / `tap-xl` 56 / `tap-2xl` 64; component slots `--spacing-input` `--spacing-cta` `--spacing-row` 56px
- Shadows: `--shadow-card-overlap`, `--shadow-card-floating`, `--shadow-tier-active`/`tier-inactive`

ESLint design-system layer ([`eslint.config.mjs`](eslint.config.mjs)) bans arbitrary `text-[N]` / `size-[N]` / inline width/height/padding styles in app code. Primitives in `src/components/ui/**` and `kibo-ui/**` are exempt.

## Component primitives

- **shadcn (29):** in [`src/components/ui/`](src/components/ui/)
- **Kibo (9):** in [`src/components/kibo-ui/`](src/components/kibo-ui/) — avatar-stack, comparison, kanban, list, marquee, pill, relative-time, status, stories
- **App-level (8):** in [`src/components/app/`](src/components/app/) — bottom-nav, list-row (with slot API), onboarding-shell, page-shell, photo-caption, progress-dots, stories-rail, story-avatar
- **Brand (1):** in [`src/components/brand/`](src/components/brand/) — sparkle-mark (the documented Phase D exception)
- **Reproductions (7):** in [`src/components/reproductions/`](src/components/reproductions/) — Dateasy case-study slides shown at `/design-system`

Per-atom status: see PROJECT-STATUS.md §4. ~25 of 50 plan-mandated atoms built.

## Honest disclaimers

- The `/discover` screen is **visual only** — no actual swipe gesture, no card stack, no LIKE/NOPE overlays. The dating-app's central interaction is missing. See BUILD-PLAN §7 Tier 0.
- No screen has all 4 states (happy / loading / empty / error) per the R5 rubric.
- 17 of ~40 plan screens built (43%).
- Phase D (design lockdown) was not actually completed before building started — see BUILD-PLAN §3 + PROJECT-STATUS §6.
- The abandoned `ahavah-frontend/` (Expo + RN) repo is left in place but not extended.

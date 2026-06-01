# Mid-breakpoint responsive pass — landing + app

**Status:** awaiting approval
**Date:** 2026-05-19
**Scope:** the 640–1023px "tablet / large phone landscape / small laptop" band where layouts currently break down

## Problem

User report (2026-05-19):
> mobile is good, desktop is good but in between that the first suffers greatly

The landing was canonical-ported from a desktop design and patched mobile-first today, but the in-between range was never audited. The same gap likely exists across app routes that share the kit primitives.

### Current breakpoint map (landing.css)

| Width | Hero | Features | How-it-works | Tiers | Section padding | Nav links |
|------|------|---------|--------------|-------|-----------------|-----------|
| <640 | 1-col | 1-col | 1-col | 1-col | 60px | hidden |
| 640 | 1-col | **2-col** | 1-col | 1-col | 80px | hidden |
| 768 | 1-col | 2-col | 1-col | **3-col** | 80px | **visible** |
| 1024 | **2-col** | **3-col** | **3-col** | 3-col | 120px | visible |

The pain points cluster at **640–1023**: hero stays 1-col (phone mockup awkwardly below copy at 800px wide), how-it-works steps are full-width slabs, features are 2-col with very wide cards, and at 768+ the nav suddenly fills with links while the rest of the page still reads as "mobile big".

### Type scale gap

Hero title `clamp(56px, 9vw, 132px)`: at 800px viewport that's 72px — too large for the available column width when the hero is still 1-col. User explicitly asked for hero to be 4–6px smaller on the live size today.

Section h2 `clamp(40px, 5.4vw, 76px)`: at 800px = 43px, fine. At 1000px = 54px which still reads as desktop-scale while the layout is awkwardly transitional.

## Approach

**Non-goal:** redesigning the canonical. We keep the same visual language; we just add a tablet tier so the layout doesn't sit awkwardly in 1-col-mobile-stretched mode from 640–1023.

**Goal:** introduce a `md` breakpoint at **768px** (matches Tailwind) and a `lg-narrow` step at **900px** that smooths the transition. Use `clamp()` proportional sizing where possible to avoid hard jumps.

## Tasks

### T1 — Landing hero (`landing.css`)
- Reduce hero title clamp: `clamp(36px, 10.5vw, 54px)` → `clamp(32px, 10vw, 48px)` on <640px (the 4–6px reduction user asked for, applied to the mobile bucket)
- Reduce desktop hero title: `clamp(56px, 9vw, 132px)` → `clamp(48px, 8vw, 120px)` (gentler curve through the mid-band)
- Hero grid: introduce `@media (min-width: 768px)` rule that goes 2-col with **smaller phone column** (1.3fr 0.9fr) so the phone mockup doesn't dominate at 800–1000px width before the canonical 1024+ kicks in
- Phone-stack max-width: scale via clamp `clamp(280px, 40vw, 480px)` so it shrinks naturally in the mid-band

### T2 — Landing sections (`landing.css`)
- Section padding-block: replace hard breakpoints with `clamp(60px, 8vw, 120px)` so it transitions smoothly instead of jumping 80→120 at 1024
- Section h2: replace clamp formula to round down faster in mid-band — `clamp(30px, 4.8vw, 68px)`
- Features grid: keep 2-col at 640 but bump to 3-col at **900px** (not 1024) — 2-col cards at 900px are too wide
- How-it-works: bump to 3-col at **768px** (not 1024) — the 3 steps are short and read fine in narrow columns
- Container max-width: tighten to `min(1200px, 100% - 48px)` so 1024–1200px viewports get gutters and don't look edge-to-edge

### T3 — Landing nav (`landing.css`)
- Nav links currently appear at 768; keep that, but cap their gap to 20px (currently 28px) so they don't crowd the right cluster at 768–900px
- Sign-in pill: tighten padding at 480–768 band so it doesn't dominate next to the logo

### T4 — Landing CTA band (`landing.css`)
- Padding clamp: `clamp(48px, 6vw, 80px) clamp(24px, 4vw, 64px)` — smooth transition instead of 48→64→80 jumps
- CTA mark size: clamp `width: clamp(220px, 40vw, 450px)` so it scales with viewport instead of jumping at breakpoints

### T5 — Landing footer (`landing.css`)
- Footer grid currently jumps 1-col → 4-col at 768. Add intermediate **2-col at 640px** so the brand column doesn't read as a wall of text on tablets

### T6 — App-wide audit (kit primitives)
Survey kit primitives + page shells used across the app for the same mid-band gap:
- `PageShell` / `DesktopSidebar` — desktop sidebar currently shows at `lg:` (1024). Check whether 768–1023 should get a collapsed-icon sidebar, or stay mobile-style with bottom-nav
- `Card` grids in `/matches`, `/discover`, `/inbox` — same 1→2→3 column gap likely exists
- `/profile/edit` form columns — single column on mobile, should they go 2-col at 768?
- `/admin/reports`, `/billing-portal`, `/help`, `/legal/*` — the 8 stretched pages — verify behavior at 800px

Don't fix in this plan; produce a written audit identifying which routes need follow-up tasks.

### T7 — Manual verification
Test viewport widths at: 360 / 414 / 640 / 768 / 900 / 1024 / 1280 in both themes. Document any leftover gaps as follow-ups, not blockers.

## Out of scope (separate work)

- **OTP not sending + slow load** — backend/auth infra issue. Need to inspect Vercel function logs + Ahavah backend (`POST /auth/otp/request`). Separate investigation, separate plan.
- **Marketing landing as RSC** — the code-review flagged the 650-line `'use client'` page. Splitting it improves LCP/payload and likely helps the "slow load" complaint, but it's a structural refactor and belongs in its own plan.

## Risk

- Changing the 1024px hero breakpoint to 768px adds a new visual state that didn't exist in the canonical. Mitigation: keep the canonical 1024 layout intact and only add a transitional 768–1023 form that uses tighter type + smaller phone.
- Replacing fixed breakpoints with `clamp()` can cause subpixel layout shifts during resize. Mitigation: only use clamp on type and padding, not on grid track sizing.

## Approval gates

- [ ] User approves the breakpoint table + clamp strategy
- [ ] User confirms whether T6 (app-wide audit) is in scope now or follow-up
- [ ] User confirms OTP/slow-load are tracked separately

## Estimated effort

- T1–T5 (landing): ~45 min CSS + manual viewport verification
- T6 (audit): ~30 min, produces a follow-up task list
- T7: ~15 min

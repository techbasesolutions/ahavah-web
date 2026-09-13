# Design brief: Community Spotlight (Growth tab, consent surfaces, email titles, spotlight cards)

Date: 2026-09-13. Repo targets: `ahavah-admin` (admin.ahavah.app), `ahavah-web` (ahavah.app), `ahavah-api` emails. Parent spec: `ahavah-api/docs/superpowers/specs/2026-09-13-community-spotlight-design.md` (Phase A plan: `docs/superpowers/plans/2026-09-13-community-spotlight-phase-a.md`).

## Goal

Spotlight lets members who opt in be featured on the Ahavah Facebook page, Instagram and the weekly community email: a welcome when they join, a member of the week, occasional highlights. This brief covers every new surface the feature needs in one round-trip: the admin Growth tab, the member consent surfaces, three email title images, and the social card template that Phase B renders automatically.

## Scope, stated against the parent spec

Included here: spec sections 3.1 (consent surfaces), 3.5 (email titles for E1 and E3; E2 reuses the existing community title), 3.7 (card template, square only), 3.8 (Growth tab, all five sections so Phase B does not need a second brief).

Deliberately dropped from this brief: Instagram story and reel formats (spec 7 rules them out), the member card approval page E4 and the card-live email E5 (Phase B; they reuse the confirm page pattern designed here plus the card), any change to Discover or the landing page.

## Existing design sources to reuse (already in this project, reference by path)

- Admin system and screens: `Ahavah Admin Dashboard.html`, `admin/admin-shell.jsx`, `admin/admin-parts.jsx`, `admin/admin-overview.jsx`, `admin/admin-users.jsx`, `admin/admin.css`. Match their density, card grid, KPI tiles, table rows, drawer and chip styles exactly.
- Member app system: `Ahavah Design System and Screens.html`, `handoff/tokens.css`, `handoff/screens/13-settings.md`.
- Email system: `Ahavah Email Templates.html` (the canonical shell; title images are Ultra display renders on transparent background, one indigo and one white variant, around 751 by 85 px at the 460 to 512 px email width).
- Brand: `assets/brand/logo-mark-lime.svg`, `assets/brand/logo-horizontal.png`, `assets/brand/logo-horizontal-wht.png`. Fonts: Ultra (display), Plus Jakarta Sans (body) from `assets/fonts/embed.css` and `assets/fonts/ultra-embed.css`.
- Approved photography for card mockups: `assets/stock/woman-portrait-scarf.jpg`, `assets/stock/man-portrait.jpg`, `assets/stock/woman-portrait-warm.jpg`, `assets/stock/couple-african.jpg` (roundup collage).

Evidence staged alongside this brief: `briefs/assets/privacy-dark-390.png` and `privacy-light-390.png`, the current member privacy settings page where the new switch row goes.

## What to design

### 1. Growth tab (admin.ahavah.app), desktop 1440 governing, plus a 390 read-only frame

An eighth tab in the existing sidebar, label "Growth". Five stacked sections on the admin card grid:

1. Stats. KPI tiles in the existing tile style: members by gender (two columns, Men and Women, with members, joined 7 days, joined 30 days, acted 14 days, stale 30 days, never acted, with photo, Premium, opted in), then totals: matches, matches 30 days, likes 7 days, messages 7 days, messages 30 days, opted in, approved cards waiting. Numbers to mock: Men 17, Women 8, joined 7 days 5, acted 14 days 12, stale 30 days 7, matches 4, likes 7 days 4, messages 30 days 0, opted in 9.
2. Spotlight queue. A table: thumbnail (square card), kind chip (Welcome, Roundup, Member of the week, Highlight), member first name, platform chips (Facebook, Instagram), scheduled time in Barbados time, status chip (Awaiting member, Review, Scheduled, Processing, Published, Failed, Cancelled), clicks and sign-ups columns, and a row actions menu: Approve, Post now, Reschedule, Cancel, Copy caption and open post. Above the table: a token health chip (green "Token OK, 212 days", amber "Expires in 9 days", red "Token invalid") and a small manual-task list titled "Remove by hand" for Instagram removals with a Done checkbox per item. Show one failed row with its error text inline.
3. Member of the week. A suggested member card (photo, first name, age, country, reason line "Least recently featured, verified, complete profile"), two alternative picks as small cards, a caption editor (2200 character cap counter), and a schedule control defaulting to Monday 12:00 UTC with the Barbados equivalent shown.
4. Emails. Five rows: Spotlight announcement, Weekly community email, Re-invite, Card ready, Card live. Each row: recipient count, last sent, last campaign id, buttons Preview, Dry run, Send. Send opens a confirmation dialog showing the recipient count and the campaign id, with a single confirm button. Card ready and Card live are system-sent, so their rows show counts only and no Send button.
5. Controls. Scheduler on or off switch, per-kind auto flags (Welcome, Roundup), a Purge queue button with a confirmation that names how many rows it cancels.

Mobile 390: read-only, destructive controls hidden, matching the existing admin mobile rule.

States needed: loading skeletons for stats and queue, empty queue, failed row, token invalid banner, send confirmation dialog, purge confirmation dialog.

### 2. Spotlight confirmation page (ahavah.app), 390 governing plus 1440

Route `/spotlight/confirm/<token>`. A single-purpose page on the member app shell without the bottom nav. Content: chip "Spotlight", Ultra headline "Feature me in Spotlight.", one paragraph stating exactly what is shared: "We will show your first name, age, country and one photo you choose on the Ahavah Facebook page, Instagram and the weekly community email. You approve every card before it goes out. Turn it off any time in Settings, Privacy.", the masked email the link was sent to, one lime pill button "Feature me in Spotlight". No other links. This button submits a POST; the page must never look like it acted on load.

States: default, already opted in ("You are already in Spotlight." with a secondary link to settings), success ("You are in. We will email you before anything is posted."), invalid link, expired link ("This link has expired. Turn on Spotlight in Settings, Privacy instead." with a button to settings).

### 3. Privacy settings switch row (ahavah.app), 390 dark and light

In the existing privacy settings list (see the staged screenshots), add a row after the map visibility controls: title "Feature me in Spotlight", helper text "Your first name, age, country and one photo you choose, on our Facebook page, Instagram and the weekly email. You approve each card first.", a switch in the existing style. Off by default.

### 4. Email title images

Three Ultra display title renders in the exact style and size of the existing `title-community.png` pair (indigo on transparent, and white on transparent):

- `title-spotlight.png` and `title-spotlight-wht.png`: "Meet Spotlight."
- `title-reinvite.png` and `title-reinvite-wht.png`: "New faces since you were away."
- `title-card-ready.png` and `title-card-ready-wht.png`: "Your Spotlight card is ready."

Export as PNG at 2x with transparent background, trimmed to the text, matching the letter height of the existing titles.

### 5. Spotlight card template, square 1080 by 1080

Three variants on the brand system, designed so a code renderer can reproduce them from a photo and four text fields (first name, age, country, one caption line):

- Photo card (welcome and highlight): full-bleed member photo with a dark gradient foot, the lime logo mark top left, a lavender chip top right reading "New on Ahavah" or "Spotlight", and at the foot the first name and age in Ultra ("Rivka, 27") with the country beneath in Plus Jakarta Sans, and one caption line. Provide the exact positions, sizes, and the gradient stops.
- Member of the week: same structure, chip reads "Member of the week", with a thin lime rule above the name.
- Roundup collage: up to four approved newcomer photos in a two by two grid with first names on each tile, headline "New this week" in Ultra, and a count line "and 3 more across 4 countries". Also a no-photo fallback of the same card with the count line only and a map-dot motif from the brand.

Include a version of the photo card with a Hebrew first name and one with a Yoruba name with diacritics so glyph coverage is visible.

## Copy rules

Sentence case. Never an em dash. Short lines. No exclamation marks except none.

## Definition of done

- Growth tab at 1440 with all five sections and the listed states; a 390 read-only frame.
- Confirmation page at 390 and 1440 with all five states.
- Privacy switch row at 390 in dark and light.
- Six title PNGs exported at 2x, transparent, named exactly as listed.
- Card template with three variants plus the no-photo fallback, with measurements, exported as HTML in this project so Phase B can transcribe it into a JSX renderer.
- All copy from this brief used verbatim.

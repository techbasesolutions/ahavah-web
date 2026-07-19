# Claude Design Brief — Ahavah "Map lens" (viewport-driven discovery)

Hand this to claude.ai/design (project "Ahavah"). It adds two SMALL
atoms to existing, shipped surfaces: a toggle row in the discover
filter sheet, and a dismissible status chip on the Discover deck. No
new pages, no map redesign. This is a light brief; the surrounding
chrome is fixed.

## The feature (context for the designer)

Members can pan and zoom the Map page freely; the app already
remembers their last viewport (position and zoom) between visits. New
behavior: when the member turns the lens ON, the area they were last
looking at on the map becomes a soft geographic preference for the
Discover deck. People inside that area appear first; people outside
still appear, ranked after (nobody is ever hidden, and an empty deck
is never possible). The lens updates itself when they leave the map
page, silently. Default is OFF.

Two things need design:

## 1. Filter-sheet toggle row

- Lives in the existing discover filter sheet, alongside the current
  "Verified only" row, which is the exact pattern to match: a
  full-width section row, hairline-bordered, with an overline-size
  title + one-line caption on the left and the standard switch on the
  right.
- Proposed copy (adjust freely within the rules below):
  - Title: "Use my map view"
  - Caption: "People in the area you last viewed on the map appear
    first."
- Decide whether the row needs anything beyond title + caption +
  switch (for example a tiny map-pin glyph before the title, matching
  the rounded line-icon set). Keep it quiet; this is a preference, not
  a promotion.

## 2. Discover status chip

- Shown on the Discover deck only while the lens is ON, so the
  ranking is never a mystery filter. Sits above the deck, below the
  page header, in the same slot family as the existing dismissible
  banners (install prompt, city nudge).
- Content: a map-pin glyph, a short label such as "Showing people
  near where you looked", and a dismiss affordance (x). Dismissing
  turns the lens OFF (same as the sheet switch).
- Design the chip so it reads as an ACTIVE STATE indicator, not an
  alert: compact, pill or hairline-card shaped, muted surface with a
  lavender or lime accent — decide which reads best against the dark
  deck without competing with the profile card below it.
- States: default, and a pressed/hover treatment for the dismiss.

## Brand system (use exactly, matches the app)

- Dark app theme: deep indigo surfaces (#0F0B1F ink, #1A1340 panels),
  hairline borders rgba(255,255,255,0.08), rounded 16 to 28px radii.
- Accents: Persian Indigo #5524F5, Mindaro lime #D7FF81, Lavender
  #BC96FF. Lime is the "act on this" color; the chip is informational,
  so lean lavender/muted unless a lime accent genuinely reads better.
- Type: Plus Jakarta Sans (400 to 800). Overline size for the toggle
  title, caption size for helper text.
- Iconography: rounded line icons (map pin, x).

## States to include

- Toggle row: off, on, and inside the sheet context (show at least a
  sliver of the neighboring rows so spacing reads correctly).
- Chip: present on the deck at mobile width (390) with a profile card
  behind it; include the dismiss affordance clearly.
- Optional, flag if included: the chip's appearance at desktop deck
  width.

## Copy rules (hard requirements)

- NO em dashes anywhere. Periods, commas, or restructure.
- Sentence case. Avoid "dating app"; this is matchmaking for
  marriage.
- Never imply people are being hidden. The lens re-orders; it does
  not exclude. Copy must not say "only show" or "filter out".

## Deliverable

One self-contained HTML export, mobile-first at 390 wide, same
handoff format as the other Ahavah exports ("Ahavah You Liked Tab
(standalone).html" is the reference). Show: the filter sheet with the
new row in place (on and off), and the Discover deck with the chip
active. Include a short design-decisions note like the You Liked
export had.

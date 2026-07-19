# Claude Design Brief — Ahavah locked profile, desktop layout

Hand this to claude.ai/design (project "Ahavah"). It extends an existing,
shipped surface: the locked/private profile. The MOBILE design is done and
live (project file "Ahavah Profile Locked.html"); this brief is ONLY the
missing desktop treatment. Keep every content element and all copy from the
mobile version; re-compose them for a wide viewport.

## Context

A member with "Hide me from strangers" enabled (a Gold feature) appears to
non-matches as a locked profile: primary photo, first name, "Looking for"
label, verification trust card, a redacted teaser of what unlocks on match,
and Like / Pass actions. On mobile this is a single column and it works.
On desktop it currently renders that same narrow mobile column inside the
app's sidebar shell, floating in empty space. Design the desktop layout.

## Where it lives (fixed chrome, do not redesign)

- Left: the app sidebar (Discover, Map, Matches, Inbox, Profile), dark
  indigo, with the Ahavah lockup. Exists already; leave as is.
- The route body renders inside that shell at >= 768px wide, commonly
  1280 to 1600px viewports.

## Consistency anchor

The UNLOCKED profile detail already has a desktop layout: a two-column grid,
photo column left (minmax 380px to 520px), detail content right, roughly
`grid-cols-[minmax(380px,520px)_1fr]` with 32px gap and 32px page padding.
The locked profile should feel like the same family: same grid skeleton,
same rhythm, so locked vs unlocked reads as one system with less revealed.

## Content inventory (all existing, from the mobile version)

1. Hero photo (the member's primary photo) with a "Private profile" lock
   chip overlaid; brand-gradient + initial fallback when no photo.
2. Back affordance and an overflow (report/block) affordance.
3. Name (display size), "Verified member" line when verified.
4. "Looking for" label (e.g. Marriage).
5. Verification trust card: "Identity confirmed", per-check rows (Video
   selfie verified, Government ID verified) with green checks.
6. Locked teaser block: "The rest unlocks when you match" + the line
   "{Name} keeps photos and details private until there's mutual interest.
   Like to start that conversation."
7. Redacted rows: About / Work / Photos as blurred bars with lock icons,
   footed by "Photos and full profile unlock when you match".
8. Actions: Pass (circular X) + "Like {Name}" (primary, pink heart CTA).

## Desktop composition to design

- Two-column grid per the anchor: photo left, everything else right.
- LEFT column: the hero photo as a tall rounded card (not edge-to-edge),
  lock chip on the photo, back + overflow floating on the photo corners.
  Fallback gradient + initial glyph must also be designed at this size.
- RIGHT column: name row (name + verified line left, Looking-for right),
  then the trust card, then the locked teaser + redacted rows.
- ACTIONS: place Pass + Like deliberately for desktop. Options to explore:
  docked at the bottom of the right column after the content, or a sticky
  action row. Must not dangle in dead space; must read as the page's
  primary action.
- The composition should fill the viewport purposefully at 1280 and 1600
  wide without stretching content into unreadable line lengths. Use the
  empty space with intent (generous margins are fine; a floating phone
  column is not).

## Brand system (use exactly, matches the app)

- Dark app theme: deep indigo surfaces (#0F0B1F ink, #1A1340 panels),
  hairline borders, rounded 16 to 28px radii, soft shadows.
- Accents: Persian Indigo #5524F5, Mindaro lime #D7FF81 (verification
  greens stay green), Lavender #BC96FF, Pink #FF4566 for the Like CTA.
- Type: Plus Jakarta Sans throughout (400 to 800). Display size for the
  name.
- Iconography: rounded line icons (lock, shield, check, heart, X).

## States to include

- With photo vs no-photo (gradient + initial) hero.
- Verified (trust card present) vs unverified (trust card absent; the
  right column re-flows without a gap).
- Like disabled state (insufficient tokens) on the CTA.
- Report/block sheet trigger visible (the sheet itself exists already).

## Copy rules (hard requirements)

- NO em dashes anywhere. Periods, commas, or restructure.
- Keep the existing mobile copy verbatim unless a line genuinely needs a
  desktop variant; flag any change you make.
- Sentence case. Avoid "dating app"; this is matchmaking for marriage.

## Deliverable

One self-contained HTML export at a desktop viewport (1440 wide reference,
must also read at 1280 and 1600), same handoff format as "Ahavah Profile
Locked.html". Mobile is DONE; do not re-export it. Include the states above
as variants or clearly toggleable sections.

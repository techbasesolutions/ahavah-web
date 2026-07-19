# Claude Design Brief — Ahavah "You liked" tab (outgoing likes)

Hand this to claude.ai/design (project "Ahavah"). It extends an existing,
shipped surface: the Matches page (`/matches`). Today it has two tabs,
Matches and Liked you. This brief adds a THIRD tab, "You liked", where a
member sees everyone THEY have liked or super-liked who has not matched
back yet. This is a light brief: the page chrome, tab strip, and card
grid already exist and must be reused; what needs design judgment is the
card's status treatment, the super-like presentation, and the empty state.

## Context

Members currently have no way to review who they liked. Likes leave the
discover deck and vanish. The new tab closes that loop: a record of your
outgoing interest, so you can revisit a profile, remember who you
super-liked (a 2-token spend), and understand why someone is not in your
deck anymore. When one of these people likes back, they become a match
and LEAVE this tab (they move to the Matches tab). So every card here is
by definition "pending".

## Where it lives (fixed chrome, do not redesign)

- The Matches page: mobile has a page header + tab strip below it;
  desktop puts the tab strip in the top bar beside the "Matches" title,
  inside the app sidebar shell (Discover, Map, Matches, Inbox, Profile).
- Tab strip: brand-variant segmented tabs. New order:
  Matches | Liked you | You liked. "Liked you" keeps its lime count
  pill. Decide whether "You liked" carries a count pill too (recommend:
  no pill, or a muted neutral pill; lime is the "act on this" signal and
  outgoing likes need no action).
- Card grid: 2 columns mobile, 3 at lg, 4 at xl, gap 16px. Cards are
  4/5 photo tiles, 18px radius, name + age + online dot row, location
  row with a map pin. Reuse this exactly.

## Consistency anchors (existing, in the app today)

- Matches tab card: photo, name row, location row, single full-width
  "Message" pill button (pink CTA).
- Liked you tab card: same card, NO action button; tapping the photo
  opens the profile. Super-likers get a lime ring around the card plus
  a small lime "Super" pill (star icon) pinned top-left of the photo.
- The "You liked" card should read as the same family. Tap opens the
  profile, no message button (you cannot message before matching).

## What to design

1. The "You liked" card status treatment. Each card needs a quiet
   "waiting" signal that distinguishes it from a match without shaming
   the member. Options to explore: a muted caption line under the
   location (e.g. "Liked 3 days ago"), a subtle chip, or nothing but
   the tab context. Avoid anything that reads as rejection.
2. Your OWN super-likes: you spent 2 tokens on this person; the card
   should honor that. Explore reusing the lime ring + "Super" pill from
   Liked you, or a variant that reads "you super-liked them" rather
   than "they super-liked you". Both tabs may be seen seconds apart, so
   if the treatment is identical, the tab label must carry the
   direction alone; decide deliberately.
3. Empty state: first-run members land here with zero outgoing likes.
   Copy direction: this is where people you like will wait for you,
   go to Discover to start. Include a CTA to Discover. Same empty-state
   pattern as the other tabs (icon in a soft circle, title, short body,
   optional button).
4. Optional, flag if you include it: a card affordance to UNDO a like
   (take back the like so they reappear in your deck). If designed, it
   must be secondary and low-emphasis (overflow or long-press, not a
   primary button). If omitted, note it as out of scope.

## Brand system (use exactly, matches the app)

- Dark app theme: deep indigo surfaces (#0F0B1F ink, #1A1340 panels),
  hairline borders, rounded 16 to 28px radii, soft shadows.
- Accents: Persian Indigo #5524F5, Mindaro lime #D7FF81, Lavender
  #BC96FF, Pink #FF4566 (reserved for the primary Like/Message CTAs).
- Type: Plus Jakarta Sans throughout (400 to 800).
- Iconography: rounded line icons (star for super-like, map pin, heart).

## States to include

- Happy grid with a mix of regular likes and at least one super-like.
- A card whose person has no photo (brand-gradient + initial fallback,
  exists already).
- Empty state (zero outgoing likes) with the Discover CTA.
- Loading and error states exist already (skeleton grid, retry card);
  do not redesign them.

## Copy rules (hard requirements)

- NO em dashes anywhere. Periods, commas, or restructure.
- Sentence case. Avoid "dating app"; this is matchmaking for marriage.
- Keep card metadata identical to the other tabs (name, age, location).

## Deliverable

One self-contained HTML export, mobile-first at 390 wide with the
desktop grid variant included (1280 reference), same handoff format as
the other Ahavah exports. Show the tab strip with all three tabs, the
happy grid, and the empty state.

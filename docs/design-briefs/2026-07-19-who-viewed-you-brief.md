# Claude Design Brief — Ahavah "Who viewed you" (profile views)

Hand this to claude.ai/design (project "Ahavah"). New surface: a
profile-views page plus its entry point. The backend for this has
existed since launch (GET /visitors, inherited from the upstream fork,
already recording every profile view); only the member-facing surface
is missing. Medium brief: one new page, one entry row, one badge.

## What the backend already provides (design to THIS contract)

GET /visitors returns TWO lists, up to 150 rows each:

- **visited_you** — people who viewed the member's profile.
- **you_visited** — profiles the member viewed (their own browsing
  trail).

Each row carries: first name, age (only if that person shows their
age), gender, location (only if shown), primary photo + a blurhash
placeholder, verified flag, when the visit happened, and for
visited_you rows an **is_new** flag (visits since the member last
opened this surface; opening it resets the clock via a companion
endpoint).

Privacy semantics already enforced server-side (copy must not
contradict them):
- Members who browse invisibly or have private profiles NEVER appear
  in anyone's visited_you list. Nobody is exposed against their will.
- If a viewer's privacy requires a verification level the member
  lacks, the row arrives WITHOUT a photo, flagged as needing
  verification ('basics' or 'photos'). Design this state: a
  placeholder tile (blurhash or gradient) with a small lock/shield
  cue and a "Verify to see" affordance leading to /verify.
- There is NO compatibility percentage. Do not design match-score
  elements.

## Where it lives

1. **The page** — a full app route (working name /views), same shell
   as other pages (mobile: page header + bottom nav; desktop: the
   sidebar shell). Two lists: "Viewed you" and "You viewed". Decide
   the switch pattern; the app's existing precedent is the /matches
   tab strip (full-bleed underline tabs, lime active text, brand
   variant). "Viewed you" is the default and carries the new-count
   pill when is_new rows exist.
2. **The entry point** — a row/card on the member's own Profile page
   alongside its existing management rows: an eye icon, "Who viewed
   you", and a lime count pill for new views since last check.
   Match the Profile page's existing row anatomy exactly.

## Content and card treatment

- Rows are PEOPLE with a timestamp: photo, name + age, verified tick
  where applicable, location when shared, and a relative time ("2
  hours ago", "yesterday", "last week"). Same relative-time voice as
  the You liked tab's captions.
- NEW visits (is_new) need a quiet distinguisher: explore a lime dot,
  a subtle "New" pill, or a grouped "New" section header. Never loud.
- Tap opens the person's profile (or their locked profile if they are
  private; that surface exists).
- Decide list density: the matches-style 2-column photo grid vs a
  compact list rows pattern. Views are a LOG, not a deck; lean toward
  compact rows unless the grid genuinely reads better, and show your
  choice in the design-decisions note.
- Empty states, both tabs: "Viewed you" empty needs warmth ("When
  someone views your profile, you will see them here"); "You viewed"
  empty can point to Discover. Same empty-state family as the rest of
  the app (icon in soft circle, title, short body, optional CTA).

## Premium variant (include, flagged)

"See who viewed you" is a natural Premium hook, and the app already
has a blur-and-reveal pattern on the Liked you tab (blurred silhouette
tiles + count headline + upgrade CTA). Include ONE variant frame:
visited_you for a non-premium member, showing the count ("N people
viewed your profile") with blurred rows and an upgrade CTA to
/paywall. Flag it clearly as a variant; the beta currently grants
everyone Premium, so the unlocked view is the primary design.

## Brand system (use exactly, matches the app)

- Dark app theme: deep indigo surfaces (#0F0B1F ink, #1A1340 panels),
  hairline borders rgba(255,255,255,0.08), rounded 16 to 28px radii.
- Accents: Persian Indigo #5524F5, Mindaro lime #D7FF81 (act-on-this
  and new-count signals), Lavender #BC96FF, Pink #FF4566 (reserved
  for primary like/message CTAs; unlikely needed here).
- Type: Plus Jakarta Sans (400 to 800).
- Iconography: rounded line icons (eye, shield, lock, map pin).

## States to include

- Viewed-you list with a mix of: normal rows, a new (is_new) row, a
  verification-locked row (no photo, verify cue), and a private-ish
  row without location/age.
- You-viewed list (plain rows, no is_new concept).
- Both empty states.
- The Profile entry row with and without the new-count pill.
- The premium-locked variant frame (flagged).
- Mobile 390 primary; include the desktop treatment of the page in
  the sidebar shell at 1280.

## Copy rules (hard requirements)

- NO em dashes anywhere. Periods, commas, or restructure.
- Sentence case. Avoid "dating app"; this is matchmaking for
  marriage.
- Never imply surveillance. Voice is "interest finds you", not
  tracking. Do not use the word "visitors" in member-facing copy;
  "views" or "viewed" reads warmer.

## Deliverable

One self-contained HTML export, mobile-first at 390 with the desktop
frame at 1280, same handoff format as "Ahavah You Liked Tab
(standalone).html", including a short design-decisions note.

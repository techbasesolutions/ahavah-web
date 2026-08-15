# Design brief: in-app referral surface ("Invite")

For Claude Design. Scope written 2026-08-12. Owner: Ehud (Techbase).

## Why this exists

The referral engine is fully live on the backend but has zero presence
in the app: every member has a personal invite link
(`ahavah.app/i/<code>`), an invited friend gets 6 months of Premium
free, and each successful referral gives the inviter 30 days of
Premium plus 5 tokens. Today members only ever see their link if they
dig up an old email. Clicks since launch: 42. This surface is the
product's main organic growth loop; treat it as a first-class feature,
not a settings row.

## Product facts the design must state (copy is part of the design)

- Your link: `ahavah.app/i/<CODE>` (7-character code, e.g. `242W67K`).
- Friend gets: 6 months of Ahavah Premium, free, automatically.
- You get: 30 days of Premium and 5 tokens per friend who joins AND
  completes their profile (not per click).
- No cap: every friend extends your Premium another month.
- Copy rules: sentence case, warm and direct, NO em dashes anywhere.

## Brand kit

Use the existing Ahavah app kit (dark-first): deep navy surfaces
(#14102B family), primary violet #5524F5, lime accent #D7FF81, Ultra
for display headlines, the app's existing sans for body, pill buttons
(never wrapping), existing chip/callout/card idioms. Match the deck,
map, and tokens screens for spacing and card language. Mobile-first at
390px; light mode variant follows the app's existing token mapping.

## Scope (MVP, one screen + two entry points)

1. **Invite screen** (route `/invite`):
   - Ultra display headline (suggested: "Every friend adds a month.").
   - The reward explainer, both sides (friend gets / you get), as two
     compact cards or one split card.
   - The member's link in a copy field: tap-to-copy with confirmation
     state, plus a primary Share button (Web Share API on mobile;
     copy fallback on desktop).
   - Referral status list ("Your invites"): rows with friend state
     only, no emails of invitees shown pre-signup. States: Joined and
     completed (credited: show +30 days +5 tokens earned), Joined,
     still onboarding (graduated/pending), and a zero state with an
     encouraging line.
   - Lifetime tally strip: friends joined, Premium months earned,
     tokens earned.
2. **Entry points:**
   - Profile screen: a full-width card row "Invite friends, earn
     Premium" with the lime accent (place per kit patterns).
   - Tokens sheet/wallet: a secondary row "Earn 5 tokens per friend".
3. **States:** default, link-copied confirmation, share-sheet fallback,
   empty invites list, loading, error (link always renders even if the
   status list fails; the code is client-known).

## Out of scope (do not design)

Contact-list import, SMS invites, QR codes, leaderboards, referral
tiers, admin views.

## Data contract (for implementation reference; design may assume it)

Client already holds the member's referral code. A new
`GET /referrals/me` endpoint will supply: list of referrals with state
(pending / graduated / credited) and created dates, plus totals
(count credited, premium days earned, tokens earned). Invitee emails
are NEVER returned for pending rows; display names only after the
invitee completes onboarding and only if they are visible to the
inviter under normal visibility rules; otherwise show "A friend".

## Acceptance criteria for the export

- Screens at 390px (primary) and a desktop pass.
- All states listed above as separate frames.
- Real copy in frames (no lorem), following the copy rules.
- Component reuse annotated against the existing kit where applicable.

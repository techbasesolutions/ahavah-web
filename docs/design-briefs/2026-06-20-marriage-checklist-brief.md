# Claude Design Brief — Ahavah "Biblical Marriage Checklist" activity

Hand this to claude.ai/design. It produces the screens; I implement them faithfully in `ahavah-web`.

## What this is

A public, fun, multi-step web activity for Ahavah (Torah-observant matchmaking). A couple works through a guided checklist of biblical marriage obligations. For each item the respondent rates its importance and records a stance, then signs in with an email code, adds their spouse's email, and both receive a personalized summary. Answers are never stored. It doubles as an SEO landing page and a soft acquisition funnel.

Tone: warm, celebratory, faith-rooted, playful but reverent. It is about biblical marriage, so joyful and inviting, never flippant. Think "a meaningful conversation starter for two people who take their walk seriously," made delightful.

## Brand system (use exactly)

- **Colors:** Persian Indigo `#5524F5` (primary), Mindaro lime `#D7FF81` (accent/energy), Lavender `#BC96FF` (soft accent), Pink `#FF4566` (warmth/love, sparingly), deep bg indigo `#1A1340` / `#0E0930`, ink `#0F0B1F`, cream canvas `#ECE9E0` / `#FBF9F4`.
- **Type:** Plus Jakarta Sans for everything (400 to 800). Big, confident headlines; comfortable body.
- **Feel:** rounded (cards 16 to 24px radius), generous spacing, soft shadows, lime and lavender accents on indigo or cream. Matches the Ahavah app + email system already in place.
- **Logo:** the Ahavah mark (rounded-square heart-A) + wordmark. Provided assets exist.

## Surfaces to design (each at mobile 390px AND desktop)

Design these as a cohesive set. Mobile-first; the app renders in a centered column, desktop can use more width for the intro/summary.

1. **Intro / hero** (also the SEO page top)
   - Eyebrow, big headline ("Biblical Marriage Checklist" or similar), one-line subhead, a warm supporting line.
   - A small reassurance chip: "We do not store your answers."
   - Primary CTA: "Start the checklist."
   - Light illustration or motif (faith + marriage; keep it tasteful, not literal wedding clip-art).

2. **Obligation step** (the core repeated screen, Section 1 Biblical)
   - Progress bar / step counter at top ("Husband obligations", "3 of 6").
   - The obligation title (bold), the verse reference, a short explanation, an optional practical example in a soft callout.
   - **Importance rating:** a delightful 1 to 5 control (stars, hearts, or a segmented scale). Make this the fun centerpiece.
   - **Stance toggle:** Agree / Disagree / Other as three clear pill buttons.
   - **Comment field** (appears when "Other" is chosen, or always available, collapsed).
   - Back / Next controls. Smooth card transition between items.

3. **Section transition** (between Section 1 Biblical, Section 2 Nice-to-Haves, Section 3 Challenges)
   - A celebratory interstitial: section name, a one-line intro, a "keep going" feel (progress, a light animation moment).

4. **Add-your-own** (optional, within a section)
   - A simple form to add a custom obligation (title, optional verse, importance, stance). Feels additive, not a chore.

5. **Summary / results card**
   - The respondent's "what matters most" (top-importance items) grouped by section, plus their stances.
   - Designed to feel like a keepsake / shareable card. This same layout informs the email.

6. **Gate + send**
   - Step A: email input ("Enter your email to get your results").
   - Step B: 6-digit code input (verify).
   - Step C: spouse's email input ("Send a copy to your spouse").
   - Reassurance: "We email your summary to both of you. We do not store your answers."
   - Send button.

7. **Done / confirmation**
   - "Sent to you and [spouse]." A warm closing.
   - Referral-flavored CTA (NOT "sign up to date"): "Know someone seeking a Torah-observant spouse? Share Ahavah." with a share affordance and a subtle link to ahavah.app.

8. **Results email** (600px, light + dark, on the existing Ahavah email shell)
   - Header with the Ahavah logo.
   - A friendly intro line, then the summary: importance + stance per item, grouped by section.
   - The same referral CTA. Footer per the existing email system.

## States to include

- Rating empty vs set; stance unselected vs selected; comment empty vs filled.
- Progress at start, mid, and near-complete.
- Gate: pre-send, code error ("that code did not match"), sending, sent.
- Loading and disabled states for the primary buttons.

## Interactions and motion (make it fun)

- Satisfying feedback when setting importance (fill/pop on the scale).
- Smooth horizontal or fade transitions between obligation cards.
- A progress bar that visibly advances and a small celebratory beat at each section change and at the summary.
- Respect reduced-motion: the static end-state must read fully without animation.

## Copy rules (hard requirements)

- **No em dashes anywhere.** Every visible string uses periods, commas, or restructured sentences. This is non-negotiable across all screens and the email.
- Faith-and-service framing. No invented doctrine. Grounded in scripture already referenced by Ahavah.
- Avoid "dating app." Use matchmaking, find a spouse, courtship.
- Sentence case for headings and buttons, consistent with the Ahavah app.

## Deliverables

Export each of the 8 surfaces above at mobile (390px) and, where it adds value, desktop. Provide the HTML/CSS export so I can transcribe it faithfully into the `ahavah-web` kit primitives and design tokens. Keep it self-contained (inline styles, embedded assets) per the usual handoff.

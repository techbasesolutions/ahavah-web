# Design brief: landing first-viewport + signed-in next-action (P01)

Date: 2026-09-07. Source: Ahavah system review (2026-09-07), proposal P01.
Target project: Ahavah (claude.ai/design). For Claude Design.

## Goal

Two related jobs, both about making the FIRST thing a person sees do useful
work instead of showing a large decorative asset first.

1. **Public landing, first viewport.** A visitor on a phone must, without
   scrolling, understand who Ahavah is for and be able to act.
2. **Signed-in home, next action.** A returning member must be led to one
   clear next step, not a stack of competing prompts.

## The problem (observed, evidence staged alongside this brief)

At 390 x 844 the entire first viewport is: header (logo, theme toggle, Log in,
Sign up) + a "Now live / FREE TO JOIN" chip + a large phone mockup. The
headline "Find a spouse across borders" is cut off at the very bottom edge, and
there is no value-proposition sentence and no primary call to action in view.
The only actionable element above the fold is the small header "Sign up" link.
See `assets/landing-dark-390-firstview.png` (plus 360, 430, and light).

## Scope

IN scope (this brief):
- The public landing page `/` first viewport (hero region) on mobile.
- The signed-in home / next-action surface (the prompt area a member lands on).

NOT in scope, and deliberately deferred to their own later briefs (flagged so
nothing is silently dropped): P02 "why this match" compatibility breakdown,
P03 map/deck distinction and empty-deck reasons, P04 verification and
commercial promise clarity, P05 admin resolution queue. Do not redesign
navigation, the deck, or any authenticated feature screen here.

## Who Ahavah serves (must be legible in the first viewport)

Ahavah is international matchmaking for Messianic, Torah-observant people
seeking a spouse, built for the diaspora (cross-border matching is the norm).
The first viewport should make that audience and purpose unmistakable to the
right person and equally clear to the wrong person that this is a
marriage-intent, faith-specific service, not casual dating.

## What to design

### 1. Landing hero, mobile-first

- A first viewport that leads with a short headline + one value sentence + a
  primary action (sign up / join free), with the phone mockup either reduced
  in height, moved below that block, or partially cropped so it never pushes
  the proposition and action off-screen.
- Keep the existing visual identity, the approved photography and phone-mockup
  imagery, the token system, and both dark and light themes. This is a
  re-composition of the existing hero, not a new art direction.
- The "Now live" and "Free to join" signals stay, but must not be the only
  copy above the fold.
- Provide the desktop hero too, but mobile is the governing case.

### 2. Signed-in next-action

- A single prioritized next-action surface. When several conditions are true
  at once (incomplete profile, pending verification, a new mutual match, a
  failed-to-send message, premium/city/completeness nudges), show ONE primary
  next action, not a stack of competing cards.
- Design the priority order as a visible hierarchy: a new mutual match and a
  failed message are time-sensitive and outrank evergreen upsells (premium,
  city, completeness). Secondary items may collapse into a quieter list or a
  single "and 2 more" affordance.
- Cover these states as separate frames: brand-new member (profile incomplete),
  verification pending, one new mutual match waiting, a message that failed to
  send, and the steady state (nothing urgent -> gentle single suggestion).

## Copy rules

Sentence case. No em dashes anywhere. Warm, plain, marriage-intent. Name the
audience without jargon a newcomer would not know.

## Brand and tokens

Use the Ahavah design system already in this project
("Ahavah Design System and Screens.html") for color, type (Ultra display +
the app sans), spacing, pill buttons (never wrapping), chips, and cards.
Do not introduce new tokens or a new type scale.

## States and breakpoints

Mobile 360 / 390 / 430 as separate frames for the landing hero. Dark and light
both. Show an enlarged-text pass (roughly 200 percent) proving the primary
action stays visible and reachable. Provide one desktop landing frame.

## Assets provided alongside this brief

- `assets/landing-dark-390-firstview.png`, `-light-390-`, `-dark-360-`,
  `-dark-430-` — current live first-viewport captures (the problem).
- The approved hero photography and phone mockup already live in the project's
  design-system and screen files; reuse them, do not regenerate faces.

## Definition of done

- Landing first viewport at 360/390/430, dark and light, each showing headline
  + value sentence + primary action WITHOUT scrolling; phone mockup present but
  no longer displacing the proposition.
- Enlarged-text frame proves the action stays on-screen.
- Signed-in next-action frames for the five states above, with one primary
  action each and a clear priority hierarchy.
- Real copy in every frame (no lorem), following the copy rules.
- Component and token reuse annotated against the existing design system.

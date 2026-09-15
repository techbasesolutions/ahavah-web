/**
 * Community Spotlight member-facing copy, in one place.
 *
 * Wave 3 adds Spotlight surfaces across several pages (the Settings, Privacy
 * switch row here; the opt-in confirm dialog and card previews in later
 * tasks). Keeping every string in one module means the four/five surfaces
 * that describe the same consent can't drift out of sync with each other or
 * with the legal copy in `legal-spotlight-copy.ts`. Edit the copy here,
 * never inline in a page.
 */

export const SPOTLIGHT_COPY = {
  privacy: {
    sectionLabel: "Spotlight",
    title: "Feature me in Spotlight",
    description:
      "Your first name, age, country and one photo you choose, on our Facebook page, Instagram and the weekly email. You approve each card first.",
  },
  confirm: {
    chip: "Spotlight",
    default: {
      headlineBefore: "Feature me in ",
      headlineEm: "Spotlight",
      headlineAfter: ".",
      paragraph:
        "We will show your first name, age, country and one photo you choose on the Ahavah Facebook page, Instagram and the weekly community email. You approve every card before it goes out. Turn it off any time in Settings, Privacy.",
      mailLabel: "Sent to",
      button: "Feature me in Spotlight",
      footer: "This page has not changed anything yet.",
    },
    already: {
      heading: "You are already in Spotlight.",
      paragraph:
        "Nothing more to do here. We will email you before anything is posted, and you can turn Spotlight off any time in Settings, Privacy.",
      link: "Open Settings, Privacy",
    },
    success: {
      heading: "You are in. We will email you before anything is posted.",
      paragraph:
        "Your first name, age, country and one photo you choose can now appear on the Ahavah Facebook page, Instagram and the weekly community email. Every card comes to you for approval first.",
      link: "Open Settings, Privacy",
    },
    invalid: {
      heading: "This link is not valid.",
      paragraph:
        "It may have been copied incompletely. Turn on Spotlight in Settings, Privacy instead.",
      button: "Open Settings, Privacy",
    },
    expired: {
      heading: "This link has expired.",
      paragraph: "Turn on Spotlight in Settings, Privacy instead.",
      button: "Open Settings, Privacy",
    },
    // Network failure, not in the SOT export, so this reuses the invalid
    // frame's layout (AlertCircle badge, ghost button) with its own copy
    // and a retry action instead of a settings link (there is nothing to
    // turn on until the connection recovers).
    error: {
      heading: "We could not reach Ahavah.",
      paragraph: "Check your connection and open the link again.",
      button: "Try again",
    },
  },
  card: {
    chip: "Spotlight",
    default: {
      headline: "Your Spotlight card is ready.",
      paragraph:
        "This is the card we will post on the Ahavah Facebook page and Instagram, with your first name, age and country. Approve it and we schedule it. Skip it and nothing is posted.",
      imageAlt: "Your Spotlight card",
      approveButton: "Approve this card",
      skipButton: "Skip this card",
      footer: "This page has not changed anything yet.",
      // POST result 'new_revision': the server made a different card
      // instead of recording a decision, so the page reloads and asks
      // again. Shown above the buttons on that second pass only.
      changedNotice:
        "This card changed, so nothing has been approved yet. Look at the new one and approve it if you are happy with it.",
    },
    approved: {
      heading: "Approved. We will email you when it is live.",
      paragraph:
        "Your card is on its way to the queue. You can turn Spotlight off any time in Settings, Privacy.",
      link: "Open Settings, Privacy",
    },
    skipped: {
      heading: "Skipped. Nothing will be posted.",
      paragraph:
        "You can still be featured later. Turn Spotlight off in Settings, Privacy if you would rather not.",
      link: "Open Settings, Privacy",
    },
    // preview_available: false, or image_url null: the card is not ready
    // to look at yet. No button, per the brief; there is nothing to do
    // here but wait for the next email.
    unavailable: {
      heading: "Your card is still being prepared.",
      paragraph: "We will email you again when it is ready to look at.",
    },
    // POST 409 approvals_disabled: a temporary operator pause, not the
    // member's doing. No button, per the brief.
    paused: {
      heading: "Approvals are paused for a moment.",
      paragraph: "Nothing has changed. We will email you when this card can be approved.",
    },
    // POST 403 (the link was minted for a different mailbox) and the 409
    // reasons that mean this link cannot decide this card: not_subject,
    // not_found, and anything unrecognised. None of them is a connection
    // failure, so none of them should read like one.
    rejected: {
      heading: "We could not record that decision.",
      paragraph:
        "This link may not be the one for this card. Nothing has changed. Open Settings, Privacy to manage Spotlight.",
      button: "Open Settings, Privacy",
    },
    // POST 409 photo_not_owned: the photo on the card is no longer one we
    // are allowed to post, usually because it was removed or is waiting on
    // review again between the email and this click.
    photoRejected: {
      heading: "We could not use that photo.",
      paragraph:
        "It may have been removed, or it is waiting on review again. Nothing has been posted. Open the link again once your photos are settled.",
      button: "Try again",
    },
    // invalid, expired and error reuse the confirm page states verbatim
    // (brief Step 1: "the confirm page states with the same copy"), so
    // this page reads SPOTLIGHT_COPY.confirm.invalid/expired/error rather
    // than duplicating the strings here.
  },
} as const;

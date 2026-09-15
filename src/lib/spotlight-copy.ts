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
} as const;

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
} as const;

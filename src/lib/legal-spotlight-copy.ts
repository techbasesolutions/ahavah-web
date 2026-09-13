/**
 * Spotlight's privacy and terms copy, in one place.
 *
 * The same two paragraphs appear on four pages: the public /privacy and
 * /terms, and the signed-in /legal/privacy and /legal/terms. They are a
 * consent record for Community Spotlight (spec 3.1), so the four must never
 * drift: a member who reads one and opts in has agreed to what the others
 * say too. Edit the copy here, never in a page.
 *
 * `title` is the section heading; pages that key their sections by `heading`
 * map it across.
 */

export type LegalCopy = { title: string; body: string };

export const SPOTLIGHT_PRIVACY: LegalCopy = {
  title: "Spotlight",
  body: "Spotlight features members on the Ahavah Facebook page, Instagram and the weekly community email, only if you opt in. If you do, we share your first name, age, country and one photo you choose, and you approve each card before it is posted. You can turn Spotlight off any time in Settings, Privacy; we then remove the card and delete posts we control. Posts on Instagram cannot be removed by us automatically and are removed by hand.",
};

export const SPOTLIGHT_TERMS: LegalCopy = {
  title: "Spotlight",
  body: "If you opt in to Spotlight you grant Ahavah a limited, non-exclusive, revocable licence to publish the first name, age, country and the photo you approve for each Spotlight card on the Ahavah Facebook page, Instagram and member emails. You can revoke it at any time by turning Spotlight off in Settings, Privacy. Revocation stops future use; we remove existing posts we control within seven days.",
};

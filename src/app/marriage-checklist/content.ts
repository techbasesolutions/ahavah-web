/**
 * Marriage checklist content model + Section 1 scripture.
 *
 * Faithful to the Claude Design export ("Ahavah Marriage Checklist"):
 * Section 1 is fixed scripture, quoted verbatim (public-domain KJV),
 * trimmed with ... to the instructional core and linked to the full
 * passage on YouVersion. No titles, summaries, or interpretation.
 * Sections 2 and 3 are open: the couple writes their own items.
 *
 * Copy rule: NO em dashes in any string (customer-facing hard rule).
 * Answers live in client state (mirrored to localStorage mid-session),
 * are emailed via POST /marriage-checklist/send, and never persisted.
 */

export type Stance = "agree" | "disagree" | "other";
export type Section = "biblical" | "nice-to-have" | "challenge";
export type Role = "husband" | "wife";
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export type Passage = {
  id: string;
  roles: Role[];
  ref: string;
  translation: "KJV";
  link: string;
  text: string;
};

/** Per-passage answer (Section 1). */
export type PassageAnswer = {
  importance?: 1 | 2 | 3 | 4 | 5;
  stance?: Stance;
  frequency?: Frequency | null;
  /** "What does this mean to you?" */
  comment?: string;
  /** The respondent's own practical examples. */
  examples?: string[];
  /** Free text when stance is "other". */
  otherNote?: string;
};

/** The couple's own item (Sections 2 and 3). */
export type CustomItem = {
  id: string;
  section: Exclude<Section, "biblical">;
  title: string;
  importance?: 1 | 2 | 3 | 4 | 5 | null;
  stance?: Stance | null;
  frequency?: Frequency | null;
  comment?: string;
  otherNote?: string;
};

/** One rated item as sent to the API (matches MarriageChecklistAnswer). */
export type SendAnswer = {
  section: Section;
  ref?: string;
  title?: string;
  importance: number;
  /** Absent for nice-to-haves (no stance question on your own wishes). */
  stance?: Stance;
  frequency?: Frequency;
  comment?: string;
  examples?: string[];
  other_note?: string;
};

export const SECTIONS: Record<
  Section,
  { label: string; n: number; blurb: string; short?: string; placeholder?: string }
> = {
  biblical: {
    label: "Biblical Obligations",
    n: 1,
    blurb:
      "Read the scripture set for a husband and for a wife. Choose the role you are completing, then decide in your own words what each passage means to you.",
  },
  "nice-to-have": {
    label: "Nice to Haves",
    n: 2,
    short: "nice-to-have",
    placeholder: "Write it in your own words",
    blurb:
      "This section is yours to fill in. Add the good habits and hopes that matter in your marriage.",
  },
  challenge: {
    label: "Challenges and Obstacles",
    n: 3,
    short: "challenge",
    placeholder: "Write it in your own words",
    blurb:
      "This section is yours to fill in. Name the challenges and obstacles your marriage faces, in your own words.",
  },
};

export const FREQ_LABEL: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const PASSAGES: Passage[] = [
  { id: "p1", roles: ["husband", "wife"], ref: "Genesis 2:18-24", translation: "KJV", link: "https://www.bible.com/bible/1/GEN.2.18-24.KJV", text: "And the LORD God said, It is not good that the man should be alone; I will make him an help meet for him. ... Therefore shall a man leave his father and his mother, and shall cleave unto his wife: and they shall be one flesh." },
  { id: "p2", roles: ["husband"], ref: "Exodus 21:10-11", translation: "KJV", link: "https://www.bible.com/bible/1/EXO.21.10-11.KJV", text: "If he take him another wife; her food, her raiment, and her duty of marriage, shall he not diminish. And if he do not these three unto her, then shall she go out free without money." },
  { id: "p3", roles: ["husband", "wife"], ref: "Proverbs 5:15-19", translation: "KJV", link: "https://www.bible.com/bible/1/PRO.5.15-19.KJV", text: "Rejoice with the wife of thy youth. Let her be as the loving hind and pleasant roe; let her breasts satisfy thee at all times; and be thou ravished always with her love." },
  { id: "p4", roles: ["husband", "wife"], ref: "1 Corinthians 7:2-5", translation: "KJV", link: "https://www.bible.com/bible/1/1CO.7.2-5.KJV", text: "Let every man have his own wife, and let every woman have her own husband. Let the husband render unto the wife due benevolence: and likewise also the wife unto the husband. ... Defraud ye not one the other, except it be with consent for a time." },
  { id: "p5", roles: ["husband", "wife"], ref: "Ephesians 5:22-33", translation: "KJV", link: "https://www.bible.com/bible/1/EPH.5.22-33.KJV", text: "Wives, submit yourselves unto your own husbands, as unto the Lord. ... Husbands, love your wives, even as Christ also loved the church, and gave himself for it ... let every one of you in particular so love his wife even as himself; and the wife see that she reverence her husband." },
  { id: "p6", roles: ["husband", "wife"], ref: "Colossians 3:18-19", translation: "KJV", link: "https://www.bible.com/bible/1/COL.3.18-19.KJV", text: "Wives, submit yourselves unto your own husbands, as it is fit in the Lord. Husbands, love your wives, and be not bitter against them." },
  { id: "p7", roles: ["husband", "wife"], ref: "1 Peter 3:1-7", translation: "KJV", link: "https://www.bible.com/bible/1/1PE.3.1-7.KJV", text: "Ye wives, be in subjection to your own husbands ... let it be the hidden man of the heart ... the ornament of a meek and quiet spirit. ... Ye husbands, dwell with them according to knowledge, giving honour unto the wife, as unto the weaker vessel ... that your prayers be not hindered." },
  { id: "p8", roles: ["husband", "wife"], ref: "Malachi 2:14-16", translation: "KJV", link: "https://www.bible.com/bible/1/MAL.2.14-16.KJV", text: "The LORD hath been witness between thee and the wife of thy youth ... yet is she thy companion, and the wife of thy covenant. ... let none deal treacherously against the wife of his youth. ... take heed to your spirit, that ye deal not treacherously." },
  { id: "p9", roles: ["husband", "wife"], ref: "Hebrews 13:4", translation: "KJV", link: "https://www.bible.com/bible/1/HEB.13.4.KJV", text: "Marriage is honourable in all, and the bed undefiled: but whoremongers and adulterers God will judge." },
];

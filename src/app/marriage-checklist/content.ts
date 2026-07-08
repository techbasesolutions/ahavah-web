/**
 * Marriage checklist content model + curated obligations.
 *
 * Source: the "Marriage Checklist" worksheet (3 sections). Copy rules:
 * grounded in scripture, no new doctrine, and NO em dashes in any string
 * (hard project rule for customer-facing surfaces).
 *
 * Answers built from these are held in client state only, emailed via
 * POST /marriage-checklist/send, and never persisted anywhere.
 */

export type Stance = "agree" | "disagree" | "other";
export type Section = "biblical" | "nice-to-have" | "challenge";
export type Role = "husband" | "wife";

export type Obligation = {
  id: string;
  section: Section;
  role?: Role;
  title: string;
  verse?: string;
  explanation: string;
  example?: string;
  suggestedFrequency?: "daily" | "weekly" | "monthly" | "yearly";
};

export type Answer = {
  obligationId: string;
  title: string;
  section: Section;
  role?: Role;
  verse?: string;
  importance: 1 | 2 | 3 | 4 | 5;
  stance: Stance;
  comment?: string;
};

export const SECTION_LABELS: Record<Section, string> = {
  biblical: "Biblical obligations",
  "nice-to-have": "Nice-to-haves",
  challenge: "Challenges and obstacles",
};

export const OBLIGATIONS: Obligation[] = [
  // ── Section 1: Biblical obligations — Husband ──
  {
    id: "h-love-sacrificially",
    section: "biblical",
    role: "husband",
    title: "Love your wife sacrificially",
    verse: "Ephesians 5:25",
    explanation:
      "Husbands are called to love their wives as Messiah loved the assembly and gave himself up for her.",
    example:
      "Put her needs before your comfort, from the big decisions down to the daily ones.",
    suggestedFrequency: "daily",
  },
  {
    id: "h-provide",
    section: "biblical",
    role: "husband",
    title: "Provide for the household",
    verse: "1 Timothy 5:8",
    explanation:
      "Providing for your own household is a core duty. Neglecting it is treated as a denial of the faith.",
    example: "Steady work, a budget you both know, and no hidden debts.",
    suggestedFrequency: "daily",
  },
  {
    id: "h-honor-understanding",
    section: "biblical",
    role: "husband",
    title: "Live with her in an understanding way",
    verse: "1 Peter 3:7",
    explanation:
      "Honor your wife with knowledge and consideration, so that your prayers are not hindered.",
    example:
      "Learn what weighs on her and act on it before she has to ask twice.",
    suggestedFrequency: "daily",
  },
  {
    id: "h-lead-torah",
    section: "biblical",
    role: "husband",
    title: "Lead the home in Torah",
    verse: "Deuteronomy 6:6-7",
    explanation:
      "Keep the commandments on your own heart first, then teach them diligently inside your home.",
    example:
      "Set the rhythm: Shabbat at the table, scripture read aloud, questions welcomed.",
    suggestedFrequency: "weekly",
  },
  // ── Section 1: Biblical obligations — Wife ──
  {
    id: "w-respect",
    section: "biblical",
    role: "wife",
    title: "Respect your husband",
    verse: "Ephesians 5:33",
    explanation:
      "The wife is called to see that she respects her husband, in speech and in private attitude.",
    example: "Disagree in private with honesty and honor, not contempt.",
    suggestedFrequency: "daily",
  },
  {
    id: "w-build-home",
    section: "biblical",
    role: "wife",
    title: "Build the household",
    verse: "Proverbs 14:1",
    explanation:
      "The wise woman builds her house. Her hands and judgment establish the home's strength.",
    example:
      "Take real ownership of the home's order, culture, and peace, whatever your season allows.",
    suggestedFrequency: "daily",
  },
  {
    id: "w-strength-dignity",
    section: "biblical",
    role: "wife",
    title: "Clothe yourself in strength and dignity",
    verse: "Proverbs 31:25-26",
    explanation:
      "The excellent wife opens her mouth with wisdom, and the teaching of kindness is on her tongue.",
    example: "Be the steady voice in the storm, for him and for the children.",
    suggestedFrequency: "daily",
  },
  {
    id: "w-gentle-spirit",
    section: "biblical",
    role: "wife",
    title: "Cultivate a gentle and quiet spirit",
    verse: "1 Peter 3:4",
    explanation:
      "Imperishable beauty is the hidden person of the heart, precious in the eyes of the Almighty.",
    example:
      "Choose calm over escalation when tensions rise, without burying real concerns.",
    suggestedFrequency: "daily",
  },
  // ── Section 2: Nice-to-haves ──
  {
    id: "n-weekly-date",
    section: "nice-to-have",
    title: "A standing time together each week",
    explanation:
      "Not commanded, but a guarded weekly hour keeps courtship alive inside marriage.",
    example: "A walk after Shabbat, a shared meal without phones.",
    suggestedFrequency: "weekly",
  },
  {
    id: "n-study-together",
    section: "nice-to-have",
    title: "Study scripture together",
    explanation:
      "Reading the same portion and talking it through knits two walks into one.",
    example: "The weekly portion over coffee, one question each.",
    suggestedFrequency: "weekly",
  },
  {
    id: "n-hospitality",
    section: "nice-to-have",
    title: "Open your home to others",
    explanation:
      "Hospitality turns a household into a light for the community around it.",
    example: "One guest table a month, however simple.",
    suggestedFrequency: "monthly",
  },
  // ── Section 3: Challenges and obstacles ──
  {
    id: "c-name-challenge",
    section: "challenge",
    title: "Name your biggest obstacle honestly",
    explanation:
      "Every marriage carries something: distance, finances, family opposition, past wounds. Naming it together is the first step.",
    example: "Say the hard thing out loud and agree it belongs to both of you now.",
  },
  {
    id: "c-conflict-rule",
    section: "challenge",
    title: "Agree on a rule for conflict",
    verse: "Ephesians 4:26",
    explanation:
      "Be angry and do not sin. Do not let the sun go down on your anger.",
    example: "No walking out mid-argument, and no third parties before you have talked to each other.",
  },
  {
    id: "c-outside-counsel",
    section: "challenge",
    title: "Decide who you will turn to for counsel",
    verse: "Proverbs 11:14",
    explanation:
      "In an abundance of counselors there is safety. Decide together, before a crisis, whose counsel you trust.",
    example: "Name one or two elders or mentors you would both actually call.",
  },
];

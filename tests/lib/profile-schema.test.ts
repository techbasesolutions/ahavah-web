import { describe, expect, it } from "vitest";
import { type Sex, isSex } from "@/lib/profile-schema";
import {
  type MaleIntent,
  type FemaleIntent,
  type Intent,
  isMaleIntent,
  isFemaleIntent,
  intentOptionsForSex,
  type Assembly,
  type TorahLevel,
  type Shabbat,
  type FeastDay,
  type Calendar,
  isAssembly,
  isTorahLevel,
  isShabbat,
  isFeastDay,
  isCalendar,
  ASSEMBLIES,
  TORAH_LEVELS,
  SHABBATS,
  FEAST_DAYS,
  CALENDARS,
  type Polygyny,
  type HeadCovering,
  type Tzitzit,
  isPolygyny,
  isHeadCovering,
  isTzitzit,
  POLYGYNY_VIEWS,
  HEAD_COVERINGS,
  TZITZIT_OPTIONS,
  type FamilyView,
  type LivingPreference,
  type HealthTag,
  isFamilyView,
  isLivingPreference,
  isHealthTag,
  FAMILY_VIEWS,
  LIVING_PREFERENCES,
  HEALTH_TAGS,
  type Ethnicity,
  type Nationality,
  type Interest,
  type PersonalityTrait,
  type Relocation,
  type CommunicationPref,
  isEthnicity,
  isNationality,
  isInterest,
  isPersonalityTrait,
  isRelocation,
  isCommunicationPref,
  ETHNICITIES,
  NATIONALITIES,
  INTERESTS,
  PERSONALITY_TRAITS,
  RELOCATIONS,
  COMMUNICATION_PREFS,
  type VerificationTag,
  type BoundaryTag,
  isVerificationTag,
  isBoundaryTag,
  VERIFICATION_TAGS,
  BOUNDARY_TAGS,
  type Profile,
  MINIMUM_COMPLETE_FIELDS,
  emptyProfile,
} from "@/lib/profile-schema";

describe("Sex", () => {
  it("accepts 'male' and 'female' as valid values", () => {
    const male: Sex = "male";
    const female: Sex = "female";
    expect(isSex(male)).toBe(true);
    expect(isSex(female)).toBe(true);
  });

  it("rejects any other value at runtime", () => {
    expect(isSex("other")).toBe(false);
    expect(isSex("")).toBe(false);
    expect(isSex(null)).toBe(false);
    expect(isSex(undefined)).toBe(false);
    expect(isSex(42)).toBe(false);
  });
});

describe("RelationshipIntent", () => {
  it("MaleIntent accepts the 6 documented values", () => {
    const cases: MaleIntent[] = [
      "first-wife", "additional-wife", "courtship",
      "marriage-only", "long-distance-courtship", "local-only",
    ];
    for (const c of cases) {
      expect(isMaleIntent(c)).toBe(true);
    }
  });

  it("FemaleIntent accepts the 6 documented values", () => {
    const cases: FemaleIntent[] = [
      "unmarried-man", "married-man", "courtship",
      "marriage-only", "open-to-relocation", "local-only",
    ];
    for (const c of cases) {
      expect(isFemaleIntent(c)).toBe(true);
    }
  });

  it("intentOptionsForSex returns 6 options for each sex", () => {
    expect(intentOptionsForSex("male")).toHaveLength(6);
    expect(intentOptionsForSex("female")).toHaveLength(6);
  });

  it("intentOptionsForSex includes 'first-wife' for male only", () => {
    expect(intentOptionsForSex("male").map((o) => o.value)).toContain("first-wife");
    expect(intentOptionsForSex("female").map((o) => o.value)).not.toContain("first-wife");
  });

  it("Intent union accepts values from either sex (for storage)", () => {
    const malePick: Intent = "additional-wife";
    const femalePick: Intent = "married-man";
    expect(malePick).toBeDefined();
    expect(femalePick).toBeDefined();
  });
});

describe("Faith cluster", () => {
  it("ASSEMBLIES has 6 documented values", () => {
    expect(ASSEMBLIES.map((a) => a.value)).toEqual([
      "messianic",
      "torah-observant",
      "hebrew-israelite",
      "independent",
      "christian-transitioning",
      "non-denom-torah",
    ]);
  });

  it("TORAH_LEVELS has 4 documented values in escalation order", () => {
    expect(TORAH_LEVELS.map((t) => t.value)).toEqual([
      "learning",
      "beginner",
      "intermediate",
      "experienced",
    ]);
  });

  it("SHABBATS has 4 options including 'other'", () => {
    expect(SHABBATS).toHaveLength(4);
    expect(SHABBATS.map((s) => s.value)).toContain("other");
  });

  it("FEAST_DAYS has all 9 biblical feasts", () => {
    expect(FEAST_DAYS.map((f) => f.value)).toEqual([
      "passover",
      "unleavened-bread",
      "first-fruits",
      "shavuot",
      "trumpets",
      "yom-kippur",
      "sukkot",
      "hanukkah",
      "purim",
    ]);
  });

  it("CALENDARS has 6 options including 'other'", () => {
    expect(CALENDARS).toHaveLength(6);
    expect(CALENDARS.map((c) => c.value)).toContain("rabbinic");
    expect(CALENDARS.map((c) => c.value)).toContain("aviv-barley");
    expect(CALENDARS.map((c) => c.value)).toContain("other");
  });

  it("Type guards narrow correctly", () => {
    const a: Assembly = "messianic";
    const t: TorahLevel = "experienced";
    const s: Shabbat = "friday-sunset-saturday-sunset";
    const f: FeastDay = "passover";
    const c: Calendar = "aviv-barley";
    expect(a).toBe("messianic");
    expect(t).toBe("experienced");
    expect(s).toBe("friday-sunset-saturday-sunset");
    expect(f).toBe("passover");
    expect(c).toBe("aviv-barley");
  });

  it("isAssembly accepts all ASSEMBLIES values", () => {
    for (const opt of ASSEMBLIES) {
      expect(isAssembly(opt.value)).toBe(true);
    }
  });

  it("isAssembly rejects invalid values", () => {
    expect(isAssembly("not-an-assembly")).toBe(false);
    expect(isAssembly(null)).toBe(false);
    expect(isAssembly(undefined)).toBe(false);
    expect(isAssembly(123)).toBe(false);
    expect(isAssembly({})).toBe(false);
  });

  it("isTorahLevel accepts all TORAH_LEVELS values", () => {
    for (const opt of TORAH_LEVELS) {
      expect(isTorahLevel(opt.value)).toBe(true);
    }
  });

  it("isTorahLevel rejects invalid values", () => {
    expect(isTorahLevel("not-a-level")).toBe(false);
    expect(isTorahLevel(null)).toBe(false);
    expect(isTorahLevel(undefined)).toBe(false);
    expect(isTorahLevel(123)).toBe(false);
    expect(isTorahLevel({})).toBe(false);
  });

  it("isShabbat accepts all SHABBATS values", () => {
    for (const opt of SHABBATS) {
      expect(isShabbat(opt.value)).toBe(true);
    }
  });

  it("isShabbat rejects invalid values", () => {
    expect(isShabbat("not-a-shabbat")).toBe(false);
    expect(isShabbat(null)).toBe(false);
    expect(isShabbat(undefined)).toBe(false);
    expect(isShabbat(123)).toBe(false);
    expect(isShabbat({})).toBe(false);
  });

  it("isFeastDay accepts all FEAST_DAYS values", () => {
    for (const opt of FEAST_DAYS) {
      expect(isFeastDay(opt.value)).toBe(true);
    }
  });

  it("isFeastDay rejects invalid values", () => {
    expect(isFeastDay("not-a-feast")).toBe(false);
    expect(isFeastDay(null)).toBe(false);
    expect(isFeastDay(undefined)).toBe(false);
    expect(isFeastDay(123)).toBe(false);
    expect(isFeastDay({})).toBe(false);
  });

  it("isCalendar accepts all CALENDARS values", () => {
    for (const opt of CALENDARS) {
      expect(isCalendar(opt.value)).toBe(true);
    }
  });

  it("isCalendar rejects invalid values", () => {
    expect(isCalendar("not-a-calendar")).toBe(false);
    expect(isCalendar(null)).toBe(false);
    expect(isCalendar(undefined)).toBe(false);
    expect(isCalendar(123)).toBe(false);
    expect(isCalendar({})).toBe(false);
  });
});

describe("Doctrine cluster", () => {
  it("POLYGYNY_VIEWS has 4 options", () => {
    expect(POLYGYNY_VIEWS.map((p) => p.value)).toEqual([
      "supports",
      "open",
      "monogamy-only",
      "undecided",
    ]);
  });

  it("HEAD_COVERINGS has 4 options", () => {
    expect(HEAD_COVERINGS.map((h) => h.value)).toEqual([
      "required",
      "encouraged",
      "optional",
      "not-practiced",
    ]);
  });

  it("TZITZIT_OPTIONS has 3 options", () => {
    expect(TZITZIT_OPTIONS.map((t) => t.value)).toEqual([
      "regularly",
      "occasionally",
      "not-currently",
    ]);
  });

  it("Doctrine types are narrowed correctly", () => {
    const p: Polygyny = "supports";
    const h: HeadCovering = "required";
    const t: Tzitzit = "regularly";
    expect(p).toBe("supports");
    expect(h).toBe("required");
    expect(t).toBe("regularly");
  });

  it("isPolygyny accepts all POLYGYNY_VIEWS values", () => {
    for (const opt of POLYGYNY_VIEWS) {
      expect(isPolygyny(opt.value)).toBe(true);
    }
  });

  it("isPolygyny rejects invalid values", () => {
    expect(isPolygyny("not-a-polygyny-view")).toBe(false);
    expect(isPolygyny(null)).toBe(false);
    expect(isPolygyny(undefined)).toBe(false);
    expect(isPolygyny(123)).toBe(false);
    expect(isPolygyny({})).toBe(false);
  });

  it("isHeadCovering accepts all HEAD_COVERINGS values", () => {
    for (const opt of HEAD_COVERINGS) {
      expect(isHeadCovering(opt.value)).toBe(true);
    }
  });

  it("isHeadCovering rejects invalid values", () => {
    expect(isHeadCovering("not-a-covering")).toBe(false);
    expect(isHeadCovering(null)).toBe(false);
    expect(isHeadCovering(undefined)).toBe(false);
    expect(isHeadCovering(123)).toBe(false);
    expect(isHeadCovering({})).toBe(false);
  });

  it("isTzitzit accepts all TZITZIT_OPTIONS values", () => {
    for (const opt of TZITZIT_OPTIONS) {
      expect(isTzitzit(opt.value)).toBe(true);
    }
  });

  it("isTzitzit rejects invalid values", () => {
    expect(isTzitzit("not-a-tzitzit")).toBe(false);
    expect(isTzitzit(null)).toBe(false);
    expect(isTzitzit(undefined)).toBe(false);
    expect(isTzitzit(123)).toBe(false);
    expect(isTzitzit({})).toBe(false);
  });
});

describe("Lifestyle cluster", () => {
  it("FAMILY_VIEWS has the 6 documented options", () => {
    expect(FAMILY_VIEWS.map((f) => f.value)).toEqual([
      "wants-children",
      "has-children",
      "open-to-more",
      "does-not-want",
      "open-blended",
      "interested-large-family",
    ]);
  });

  it("LIVING_PREFERENCES has 6 options including 'open-to-relocation'", () => {
    expect(LIVING_PREFERENCES.map((l) => l.value)).toContain("open-to-relocation");
    expect(LIVING_PREFERENCES).toHaveLength(6);
  });

  it("HEALTH_TAGS has 7 options including 'prepper'", () => {
    expect(HEALTH_TAGS.map((h) => h.value)).toContain("prepper");
    expect(HEALTH_TAGS).toHaveLength(7);
  });

  it("Lifestyle types are usable as multi-select arrays", () => {
    const family: FamilyView[] = ["wants-children", "open-to-more"];
    const living: LivingPreference[] = ["rural", "homestead"];
    const health: HealthTag[] = ["non-smoker", "fitness"];
    expect(family).toHaveLength(2);
    expect(living).toHaveLength(2);
    expect(health).toHaveLength(2);
  });

  it("isFamilyView accepts all FAMILY_VIEWS values", () => {
    for (const opt of FAMILY_VIEWS) {
      expect(isFamilyView(opt.value)).toBe(true);
    }
  });

  it("isFamilyView rejects invalid values", () => {
    expect(isFamilyView("not-a-family-view")).toBe(false);
    expect(isFamilyView(null)).toBe(false);
    expect(isFamilyView(undefined)).toBe(false);
    expect(isFamilyView(123)).toBe(false);
    expect(isFamilyView({})).toBe(false);
  });

  it("isLivingPreference accepts all LIVING_PREFERENCES values", () => {
    for (const opt of LIVING_PREFERENCES) {
      expect(isLivingPreference(opt.value)).toBe(true);
    }
  });

  it("isLivingPreference rejects invalid values", () => {
    expect(isLivingPreference("not-a-preference")).toBe(false);
    expect(isLivingPreference(null)).toBe(false);
    expect(isLivingPreference(undefined)).toBe(false);
    expect(isLivingPreference(123)).toBe(false);
    expect(isLivingPreference({})).toBe(false);
  });

  it("isHealthTag accepts all HEALTH_TAGS values", () => {
    for (const opt of HEALTH_TAGS) {
      expect(isHealthTag(opt.value)).toBe(true);
    }
  });

  it("isHealthTag rejects invalid values", () => {
    expect(isHealthTag("not-a-health-tag")).toBe(false);
    expect(isHealthTag(null)).toBe(false);
    expect(isHealthTag(undefined)).toBe(false);
    expect(isHealthTag(123)).toBe(false);
    expect(isHealthTag({})).toBe(false);
  });
});

describe("Ethnicity/Nationality/Interests/Personality cluster", () => {
  it("ETHNICITIES has 17 options including 'other'", () => {
    expect(ETHNICITIES).toHaveLength(17);
    expect(ETHNICITIES.map((e) => e.value)).toContain("other");
  });

  it("NATIONALITIES has at least 20 options (curated, not exhaustive)", () => {
    expect(NATIONALITIES.length).toBeGreaterThanOrEqual(20);
    expect(NATIONALITIES.map((n) => n.value)).toContain("barbadian");
    expect(NATIONALITIES.map((n) => n.value)).toContain("israeli");
    expect(NATIONALITIES.map((n) => n.value)).toContain("other");
  });

  it("INTERESTS has 28 options spanning faith + lifestyle", () => {
    expect(INTERESTS).toHaveLength(28);
    expect(INTERESTS.map((i) => i.value)).toContain("scripture-study");
    expect(INTERESTS.map((i) => i.value)).toContain("paleo-hebrew");
    expect(INTERESTS.map((i) => i.value)).toContain("homesteading");
  });

  it("PERSONALITY_TRAITS has 12 options", () => {
    expect(PERSONALITY_TRAITS).toHaveLength(12);
    expect(PERSONALITY_TRAITS.map((p) => p.value)).toContain("introverted");
    expect(PERSONALITY_TRAITS.map((p) => p.value)).toContain("nurturing");
  });

  it("RELOCATIONS has 4 options", () => {
    expect(RELOCATIONS).toHaveLength(4);
  });

  it("COMMUNICATION_PREFS has 5 options", () => {
    expect(COMMUNICATION_PREFS).toHaveLength(5);
  });

  it("Types compose correctly", () => {
    const e: Ethnicity[] = ["afro-caribbean", "mixed-heritage"];
    const n: Nationality = "barbadian";
    const i: Interest[] = ["scripture-study", "hebrew-language"];
    const p: PersonalityTrait[] = ["introverted", "intellectual"];
    const r: Relocation = "will-relocate";
    const c: CommunicationPref[] = ["video-calls", "in-person"];
    expect(e).toHaveLength(2);
    expect(n).toBe("barbadian");
    expect(i).toHaveLength(2);
    expect(p).toHaveLength(2);
    expect(r).toBe("will-relocate");
    expect(c).toHaveLength(2);
  });

  it("isEthnicity accepts all ETHNICITIES values", () => {
    for (const opt of ETHNICITIES) {
      expect(isEthnicity(opt.value)).toBe(true);
    }
  });

  it("isEthnicity rejects invalid values", () => {
    expect(isEthnicity("not-an-ethnicity")).toBe(false);
    expect(isEthnicity(null)).toBe(false);
    expect(isEthnicity(undefined)).toBe(false);
    expect(isEthnicity(123)).toBe(false);
    expect(isEthnicity({})).toBe(false);
  });

  it("isNationality accepts all NATIONALITIES values", () => {
    for (const opt of NATIONALITIES) {
      expect(isNationality(opt.value)).toBe(true);
    }
  });

  it("isNationality rejects invalid values", () => {
    expect(isNationality("not-a-nationality")).toBe(false);
    expect(isNationality(null)).toBe(false);
    expect(isNationality(undefined)).toBe(false);
    expect(isNationality(123)).toBe(false);
    expect(isNationality({})).toBe(false);
  });

  it("isInterest accepts all INTERESTS values", () => {
    for (const opt of INTERESTS) {
      expect(isInterest(opt.value)).toBe(true);
    }
  });

  it("isInterest rejects invalid values", () => {
    expect(isInterest("not-an-interest")).toBe(false);
    expect(isInterest(null)).toBe(false);
    expect(isInterest(undefined)).toBe(false);
    expect(isInterest(123)).toBe(false);
    expect(isInterest({})).toBe(false);
  });

  it("isPersonalityTrait accepts all PERSONALITY_TRAITS values", () => {
    for (const opt of PERSONALITY_TRAITS) {
      expect(isPersonalityTrait(opt.value)).toBe(true);
    }
  });

  it("isPersonalityTrait rejects invalid values", () => {
    expect(isPersonalityTrait("not-a-trait")).toBe(false);
    expect(isPersonalityTrait(null)).toBe(false);
    expect(isPersonalityTrait(undefined)).toBe(false);
    expect(isPersonalityTrait(123)).toBe(false);
    expect(isPersonalityTrait({})).toBe(false);
  });

  it("isRelocation accepts all RELOCATIONS values", () => {
    for (const opt of RELOCATIONS) {
      expect(isRelocation(opt.value)).toBe(true);
    }
  });

  it("isRelocation rejects invalid values", () => {
    expect(isRelocation("not-a-relocation")).toBe(false);
    expect(isRelocation(null)).toBe(false);
    expect(isRelocation(undefined)).toBe(false);
    expect(isRelocation(123)).toBe(false);
    expect(isRelocation({})).toBe(false);
  });

  it("isCommunicationPref accepts all COMMUNICATION_PREFS values", () => {
    for (const opt of COMMUNICATION_PREFS) {
      expect(isCommunicationPref(opt.value)).toBe(true);
    }
  });

  it("isCommunicationPref rejects invalid values", () => {
    expect(isCommunicationPref("not-a-pref")).toBe(false);
    expect(isCommunicationPref(null)).toBe(false);
    expect(isCommunicationPref(undefined)).toBe(false);
    expect(isCommunicationPref(123)).toBe(false);
    expect(isCommunicationPref({})).toBe(false);
  });
});

describe("Verification + Boundary tags", () => {
  it("VERIFICATION_TAGS has 4 options", () => {
    expect(VERIFICATION_TAGS.map((v) => v.value)).toEqual([
      "government-id",
      "assembly",
      "community-references",
      "video-selfie",
    ]);
  });

  it("BOUNDARY_TAGS has 5 options", () => {
    expect(BOUNDARY_TAGS.map((b) => b.value)).toEqual([
      "monogamy-only",
      "no-long-distance",
      "no-additional-spouses",
      "no-smokers",
      "serious-courtship-only",
    ]);
  });

  it("Types are arrays in profile shape", () => {
    const v: VerificationTag[] = ["government-id", "video-selfie"];
    const b: BoundaryTag[] = ["no-smokers", "monogamy-only"];
    expect(v).toHaveLength(2);
    expect(b).toHaveLength(2);
  });

  it("isVerificationTag accepts all VERIFICATION_TAGS values", () => {
    for (const opt of VERIFICATION_TAGS) {
      expect(isVerificationTag(opt.value)).toBe(true);
    }
  });

  it("isVerificationTag rejects invalid values", () => {
    expect(isVerificationTag("not-a-verification-tag")).toBe(false);
    expect(isVerificationTag(null)).toBe(false);
    expect(isVerificationTag(undefined)).toBe(false);
    expect(isVerificationTag(123)).toBe(false);
    expect(isVerificationTag({})).toBe(false);
  });

  it("isBoundaryTag accepts all BOUNDARY_TAGS values", () => {
    for (const opt of BOUNDARY_TAGS) {
      expect(isBoundaryTag(opt.value)).toBe(true);
    }
  });

  it("isBoundaryTag rejects invalid values", () => {
    expect(isBoundaryTag("not-a-boundary-tag")).toBe(false);
    expect(isBoundaryTag(null)).toBe(false);
    expect(isBoundaryTag(undefined)).toBe(false);
    expect(isBoundaryTag(123)).toBe(false);
    expect(isBoundaryTag({})).toBe(false);
  });
});

describe("Profile aggregate", () => {
  it("emptyProfile() returns a Profile with all optional fields undefined", () => {
    const p = emptyProfile();
    expect(p.firstName).toBeUndefined();
    expect(p.age).toBeUndefined();
    expect(p.sex).toBeUndefined();
    expect(p.assembly).toBeUndefined();
    expect(p.feastDays).toBeUndefined();
    expect(p.interests).toBeUndefined();
  });

  it("MINIMUM_COMPLETE_FIELDS lists the 8 soft-required fields", () => {
    // Sourced from 2026-05-11 product spec — asterisked fields in the
    // Torah-observant matchmaker profile structure. verificationTags
    // requires AT LEAST ONE tag (empty arrays are not-filled).
    expect(MINIMUM_COMPLETE_FIELDS).toEqual([
      "firstName",
      "age",
      "sex",
      "country",
      "intent",
      "assembly",
      "relocation",
      "verificationTags",
    ]);
  });

  it("Profile accepts both shapes (male intent / female intent)", () => {
    const male: Profile = {
      firstName: "Daniel",
      age: 32,
      sex: "male",
      intent: "first-wife",
    };
    const female: Profile = {
      firstName: "Esther",
      age: 28,
      sex: "female",
      intent: "unmarried-man",
    };
    expect(male.intent).toBe("first-wife");
    expect(female.intent).toBe("unmarried-man");
  });
});

import {
  SAMPLE_PROFILES,
  sampleByName,
} from "@/lib/profile-sample";
import { computeCompleteness } from "@/lib/profile-completeness";

describe("Sample profiles", () => {
  it("SAMPLE_PROFILES has exactly 8 entries", () => {
    expect(SAMPLE_PROFILES).toHaveLength(8);
  });

  it("all 8 samples are discoverEligible (minimum 6 fields filled)", () => {
    for (const p of SAMPLE_PROFILES) {
      expect(computeCompleteness(p).discoverEligible).toBe(true);
    }
  });

  it("samples cover both sexes (4 male, 4 female)", () => {
    const males = SAMPLE_PROFILES.filter((p) => p.sex === "male");
    const females = SAMPLE_PROFILES.filter((p) => p.sex === "female");
    expect(males).toHaveLength(4);
    expect(females).toHaveLength(4);
  });

  it("samples cover all 4 Torah levels at least once", () => {
    const levels = new Set(SAMPLE_PROFILES.map((p) => p.torahLevel));
    expect(levels.size).toBe(4);
  });

  it("samples cover both polygyny stances (supports + monogamy-only)", () => {
    const polygyny = new Set(
      SAMPLE_PROFILES.map((p) => p.polygyny).filter(Boolean),
    );
    expect(polygyny.has("supports")).toBe(true);
    expect(polygyny.has("monogamy-only")).toBe(true);
  });

  it("sampleByName looks up by firstName (case-insensitive)", () => {
    expect(sampleByName("Daniel")).toBeDefined();
    expect(sampleByName("daniel")).toBeDefined();
    expect(sampleByName("Nonexistent")).toBeUndefined();
  });
});

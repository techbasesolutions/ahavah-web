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

import { describe, expect, it } from "vitest";
import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  FeastDay,
  Calendar,
  Intent,
  HealthTag,
} from "@/lib/profile-schema";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import {
  type DiscoverFilters,
  type DiscoverCandidate,
  applyHardFilters,
  rankCandidates,
  buildDiscoverDeck,
} from "@/lib/discover-engine";

describe("discover-engine", () => {
  const makeCandidate = (p: Profile): DiscoverCandidate => ({
    ...p,
    id: p.firstName || "unknown",
  });

  // ------- filter: ageMin / ageMax -------

  describe("filter: ageMin / ageMax", () => {
    it("excludes candidates outside age range", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Young", age: 20 }),
        makeCandidate({ firstName: "Daniel", age: 32 }),
        makeCandidate({ firstName: "Elder", age: 50 }),
      ];
      const filters: DiscoverFilters = { ageMin: 25, ageMax: 40 };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });

    it("excludes candidates with no age defined", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "NoAge" }),
        makeCandidate({ firstName: "Daniel", age: 32 }),
      ];
      const filters: DiscoverFilters = { ageMin: 25 };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });
  });

  // ------- filter: countries -------

  describe("filter: countries", () => {
    it("requires candidate country in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "US" }),
        makeCandidate({ firstName: "Yosef", country: "JM" }),
      ];
      const filters: DiscoverFilters = { countries: ["BB", "JM"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Yosef"]);
    });
  });

  // ------- filter: assemblies -------

  describe("filter: assemblies", () => {
    it("requires candidate assembly in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", assembly: "torah-observant" }),
        makeCandidate({ firstName: "Esther", assembly: "hebrew-israelite" }),
        makeCandidate({ firstName: "Adam", assembly: "messianic" }),
      ];
      const filters: DiscoverFilters = {
        assemblies: ["torah-observant", "messianic"] as readonly Assembly[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Adam"]);
    });
  });

  // ------- filter: torahLevels -------

  describe("filter: torahLevels", () => {
    it("requires candidate torahLevel in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", torahLevel: "experienced" }),
        makeCandidate({ firstName: "Esther", torahLevel: "intermediate" }),
        makeCandidate({ firstName: "Rivka", torahLevel: "learning" }),
      ];
      const filters: DiscoverFilters = {
        torahLevels: ["experienced", "intermediate"] as readonly TorahLevel[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });
  });

  // ------- filter: polygynyStances -------

  describe("filter: polygynyStances", () => {
    it("requires candidate polygyny in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", polygyny: "supports" }),
        makeCandidate({ firstName: "Esther", polygyny: "monogamy-only" }),
        makeCandidate({ firstName: "Caleb", polygyny: "open" }),
      ];
      const filters: DiscoverFilters = {
        polygynyStances: ["supports", "open"] as readonly Polygyny[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Caleb"]);
    });
  });

  // ------- filter: intents (NEW) -------

  describe("filter: intents", () => {
    it("requires candidate intent in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", sex: "male", intent: "courtship" }),
        makeCandidate({ firstName: "Yosef", sex: "male", intent: "additional-wife" }),
        makeCandidate({ firstName: "David", sex: "male", intent: "marriage-only" }),
      ];
      const filters: DiscoverFilters = {
        intents: ["courtship", "marriage-only"] as readonly Intent[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "David"]);
    });

    it("excludes candidates without an intent set", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "NoIntent" }),
        makeCandidate({ firstName: "David", sex: "male", intent: "courtship" }),
      ];
      const filters: DiscoverFilters = {
        intents: ["courtship"] as readonly Intent[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["David"]);
    });
  });

  // ------- filter: feastDays -------

  describe("filter: feastDays", () => {
    it("requires candidate to observe at least one of the feast days (overlap)", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", feastDays: ["passover", "shavuot", "sukkot"] }),
        makeCandidate({ firstName: "Esther", feastDays: ["passover", "yom-kippur"] }),
        makeCandidate({ firstName: "John", feastDays: ["hanukkah", "purim"] }),
      ];
      const filters: DiscoverFilters = {
        feastDays: ["passover", "shavuot"] as readonly FeastDay[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });

    it("excludes candidates with no feastDays", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", feastDays: ["passover"] }),
        makeCandidate({ firstName: "John" }),
      ];
      const filters: DiscoverFilters = {
        feastDays: ["passover"] as readonly FeastDay[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });
  });

  // ------- filter: calendars -------

  describe("filter: calendars", () => {
    it("requires candidate calendar in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", calendar: "aviv-barley" }),
        makeCandidate({ firstName: "Esther", calendar: "rabbinic" }),
        makeCandidate({ firstName: "Adina", calendar: "enoch" }),
      ];
      const filters: DiscoverFilters = {
        calendars: ["aviv-barley", "rabbinic"] as readonly Calendar[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });
  });

  // ------- filter: healthTags (NEW) -------

  describe("filter: healthTags", () => {
    it("requires candidate to have EVERY selected tag (AND semantics)", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", healthTags: ["non-smoker", "fitness"] }),
        makeCandidate({ firstName: "Adam", healthTags: ["non-smoker"] }),
        makeCandidate({ firstName: "John", healthTags: ["fitness"] }),
      ];
      const filters: DiscoverFilters = {
        healthTags: ["non-smoker", "fitness"] as readonly HealthTag[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });

    it("excludes candidates with no healthTags", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", healthTags: ["non-smoker"] }),
        makeCandidate({ firstName: "John" }),
      ];
      const filters: DiscoverFilters = {
        healthTags: ["non-smoker"] as readonly HealthTag[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });
  });

  // ------- filter: verifiedOnly -------

  describe("filter: verifiedOnly", () => {
    it("excludes candidates without verificationTags when verifiedOnly: true", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", verificationTags: ["government-id"] }),
        makeCandidate({ firstName: "John" }),
      ];
      const filters: DiscoverFilters = { verifiedOnly: true };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });

    it("includes all candidates when verifiedOnly: false", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", verificationTags: ["government-id"] }),
        makeCandidate({ firstName: "John" }),
      ];

      const result = applyHardFilters(viewer, candidates, { verifiedOnly: false });
      expect(result).toHaveLength(2);
    });
  });

  // ------- composition + edge cases -------

  describe("no filters", () => {
    it("returns all candidates when filters is undefined", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel" }),
        makeCandidate({ firstName: "John" }),
      ];
      expect(applyHardFilters(viewer, candidates)).toHaveLength(2);
    });

    it("returns all candidates when filters is empty {}", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel" }),
        makeCandidate({ firstName: "John" }),
      ];
      expect(applyHardFilters(viewer, candidates, {})).toHaveLength(2);
    });
  });

  describe("multiple filters compose with AND", () => {
    it("candidate must clear EVERY active filter", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          age: 32,
          country: "BB",
          polygyny: "monogamy-only",
          healthTags: ["non-smoker"],
        }),
        makeCandidate({
          firstName: "Adam",
          age: 32,
          country: "BB",
          polygyny: "supports", // fails polygynyStances
          healthTags: ["non-smoker"],
        }),
        makeCandidate({
          firstName: "Young",
          age: 22, // fails age
          country: "BB",
          polygyny: "monogamy-only",
          healthTags: ["non-smoker"],
        }),
      ];
      const filters: DiscoverFilters = {
        ageMin: 25,
        polygynyStances: ["monogamy-only"] as readonly Polygyny[],
        healthTags: ["non-smoker"] as readonly HealthTag[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });
  });

  describe("rankCandidates", () => {
    it("returns candidates in unchanged order for Sub-plan 4", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel" }),
        makeCandidate({ firstName: "Adam" }),
        makeCandidate({ firstName: "David" }),
      ];
      expect(rankCandidates(viewer, candidates)).toEqual(candidates);
    });
  });

  describe("buildDiscoverDeck", () => {
    it("composes filter then rank", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", age: 32 }),
        makeCandidate({ firstName: "Young", age: 20 }),
        makeCandidate({ firstName: "David", age: 35 }),
      ];
      const filters: DiscoverFilters = { ageMin: 30 };

      const result = buildDiscoverDeck(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "David"]);
    });
  });

  describe("integration with SAMPLE_PROFILES", () => {
    it("returns the full sample set when no filters are applied", () => {
      const viewer: Profile = { firstName: "Tester" };
      const candidates = SAMPLE_PROFILES.map((p) => makeCandidate(p));
      expect(applyHardFilters(viewer, candidates)).toHaveLength(8);
    });

    it("polygynyStances=['monogamy-only','undecided'] filters out polygyny-supporting samples", () => {
      const viewer: Profile = { firstName: "Tester" };
      const candidates = SAMPLE_PROFILES.map((p) => makeCandidate(p));
      const filters: DiscoverFilters = {
        polygynyStances: ["monogamy-only", "undecided"] as readonly Polygyny[],
      };
      const result = applyHardFilters(viewer, candidates, filters);
      // None of the 8 samples should be polygyny: "supports" after this filter
      expect(result.every((c) => c.polygyny !== "supports")).toBe(true);
    });
  });
});

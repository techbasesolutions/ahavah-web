import { describe, expect, it } from "vitest";
import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  Calendar,
  Intent,
  HealthTag,
  MaritalStatus,
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

  // ------- filter: country -------

  describe("filter: country", () => {
    it("empty/undefined country filter returns all candidates", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "JM" }),
        makeCandidate({ firstName: "Yosef", country: "IL" }),
      ];
      const filters: DiscoverFilters = {};

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(3);
    });

    it("empty array country filter returns all candidates", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "JM" }),
      ];
      const filters: DiscoverFilters = { country: [] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(2);
    });

    it("single country filter returns only matching candidates", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "JM" }),
        makeCandidate({ firstName: "Yosef", country: "IL" }),
      ];
      const filters: DiscoverFilters = { country: ["BB"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });

    it("multi-select country filter uses OR semantics", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "JM" }),
        makeCandidate({ firstName: "Yosef", country: "IL" }),
        makeCandidate({ firstName: "Adam", country: "ZA" }),
      ];
      const filters: DiscoverFilters = { country: ["BB", "JM"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });

    it("country filter with no matches returns empty", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", country: "BB" }),
        makeCandidate({ firstName: "Esther", country: "JM" }),
      ];
      const filters: DiscoverFilters = { country: ["XX"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(0);
    });
  });

  // ------- filter: assemblies -------

  describe("filter: assemblies", () => {
    it("requires candidate assembly in the list", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", assembly: ["torah-observant"] }),
        makeCandidate({ firstName: "Esther", assembly: ["hebrew-israelite"] }),
        makeCandidate({ firstName: "Adam", assembly: ["messianic"] }),
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
        makeCandidate({ firstName: "Daniel", sex: "male", intent: ["courtship"] }),
        makeCandidate({ firstName: "Yosef", sex: "male", intent: ["additional-wife"] }),
        makeCandidate({ firstName: "David", sex: "male", intent: ["marriage-only"] }),
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
        makeCandidate({ firstName: "David", sex: "male", intent: ["courtship"] }),
      ];
      const filters: DiscoverFilters = {
        intents: ["courtship"] as readonly Intent[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["David"]);
    });
  });

  // Feast-day filter removed — day-by-day overlap was too granular at
  // the filter layer; the scoring engine already weights feast alignment.

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

  // ------- filter: languages -------

  describe("filter: languages", () => {
    it("undefined/empty languages filter returns all candidates", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", languages: ["en"] }),
        makeCandidate({ firstName: "Adina", languages: ["en", "he"] }),
        makeCandidate({ firstName: "Rivka", languages: ["en", "fr"] }),
      ];
      const filters: DiscoverFilters = {};

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(3);
    });

    it("empty array languages filter returns all candidates", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", languages: ["en"] }),
        makeCandidate({ firstName: "Adina", languages: ["en", "he"] }),
      ];
      const filters: DiscoverFilters = { languages: [] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(2);
    });

    it("single language filter returns only candidates with that language", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", languages: ["en"] }),
        makeCandidate({ firstName: "Esther", languages: ["en"] }),
        makeCandidate({ firstName: "Adina", languages: ["en", "he"] }),
        makeCandidate({ firstName: "Caleb", languages: ["en"] }),
        makeCandidate({ firstName: "Rivka", languages: ["en", "fr"] }),
      ];
      const filters: DiscoverFilters = { languages: ["he"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Adina"]);
    });

    it("multi-select languages filter uses OR semantics on the filter (intersection)", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", languages: ["en"] }),
        makeCandidate({ firstName: "Esther", languages: ["en"] }),
        makeCandidate({ firstName: "Adina", languages: ["en", "he"] }),
        makeCandidate({ firstName: "Caleb", languages: ["en"] }),
        makeCandidate({ firstName: "Rivka", languages: ["en", "fr"] }),
        makeCandidate({ firstName: "Ezekiel", languages: ["en"] }),
        makeCandidate({ firstName: "Tirzah", languages: ["en"] }),
        makeCandidate({ firstName: "Yosef", languages: ["en"] }),
      ];
      const filters: DiscoverFilters = { languages: ["he", "fr"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Adina", "Rivka"]);
    });

    it("languages filter with no matches returns empty", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", languages: ["en"] }),
        makeCandidate({ firstName: "Esther", languages: ["en"] }),
      ];
      const filters: DiscoverFilters = { languages: ["xx"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(0);
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

  // ------- filter: maritalStatuses (SP23) -------

  describe("passesAllFilters — marital status (SP23)", () => {
    it("no filter set → all marital statuses pass", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", maritalStatus: "never-married" }),
        makeCandidate({ firstName: "Yosef", maritalStatus: "married" }),
        makeCandidate({ firstName: "Caleb", maritalStatus: "widowed" }),
        makeCandidate({ firstName: "Adam", maritalStatus: "divorced" }),
      ];
      const filters: DiscoverFilters = {};

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(4);
    });

    it("single selected → only matching candidate passes", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", maritalStatus: "never-married" }),
        makeCandidate({ firstName: "Yosef", maritalStatus: "married" }),
      ];
      const filters: DiscoverFilters = {
        maritalStatuses: ["never-married"] as readonly MaritalStatus[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });

    it("multi selected → union", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", maritalStatus: "never-married" }),
        makeCandidate({ firstName: "Adam", maritalStatus: "divorced" }),
        makeCandidate({ firstName: "Caleb", maritalStatus: "widowed" }),
      ];
      const filters: DiscoverFilters = {
        maritalStatuses: ["divorced", "widowed"] as readonly MaritalStatus[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Adam", "Caleb"]);
    });

    it("candidate missing maritalStatus → fails when filter active", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "NoMarital" }),
        makeCandidate({ firstName: "Daniel", maritalStatus: "never-married" }),
      ];
      const filters: DiscoverFilters = {
        maritalStatuses: ["never-married"] as readonly MaritalStatus[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel"]);
    });
  });

  // ------- filter: hasChildrenBuckets (SP23) -------

  describe("passesAllFilters — has-kids buckets (SP23)", () => {
    it("'has' only → children >= 1 passes, 0 fails", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", children: 0 }),
        makeCandidate({ firstName: "Yosef", children: 3 }),
        makeCandidate({ firstName: "Ezekiel", children: 5 }),
      ];
      const filters: DiscoverFilters = { hasChildrenBuckets: ["has"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Yosef", "Ezekiel"]);
    });

    it("'none' only → children === 0 passes, >= 1 fails", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", children: 0 }),
        makeCandidate({ firstName: "Yosef", children: 3 }),
        makeCandidate({ firstName: "Esther", children: 0 }),
      ];
      const filters: DiscoverFilters = { hasChildrenBuckets: ["none"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });

    it("both buckets selected → equivalent to no filter", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", children: 0 }),
        makeCandidate({ firstName: "Yosef", children: 3 }),
        makeCandidate({ firstName: "Esther", children: 0 }),
        makeCandidate({ firstName: "Ezekiel", children: 5 }),
      ];
      const filters: DiscoverFilters = { hasChildrenBuckets: ["has", "none"] };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(4);
    });

    it("undefined children → fails when bucket filter active", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "NoChildren" }),
        makeCandidate({ firstName: "Daniel", children: 0 }),
        makeCandidate({ firstName: "Yosef", children: 3 }),
      ];
      const noneOnly: DiscoverFilters = { hasChildrenBuckets: ["none"] };
      const hasOnly: DiscoverFilters = { hasChildrenBuckets: ["has"] };

      const noneResult = applyHardFilters(viewer, candidates, noneOnly);
      expect(noneResult.map((c) => c.firstName)).toEqual(["Daniel"]);

      const hasResult = applyHardFilters(viewer, candidates, hasOnly);
      expect(hasResult.map((c) => c.firstName)).toEqual(["Yosef"]);
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
    it("attaches a compatScore to each candidate", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel" }),
        makeCandidate({ firstName: "Adam" }),
      ];
      const result = rankCandidates(viewer, candidates);
      expect(result).toHaveLength(2);
      for (const c of result) {
        expect(typeof c.compatScore).toBe("number");
        expect(c.compatScore).toBeGreaterThanOrEqual(0);
        expect(c.compatScore).toBeLessThanOrEqual(100);
      }
    });

    it("sorts higher-compat candidates first", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        polygyny: "monogamy-only",
        torahLevel: "experienced",
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Mismatched",
          polygyny: "supports",
          torahLevel: "learning",
        }),
        makeCandidate({
          firstName: "Aligned",
          polygyny: "monogamy-only",
          torahLevel: "experienced",
        }),
      ];
      const result = rankCandidates(viewer, candidates);
      expect(result[0].firstName).toBe("Aligned");
      expect(result[1].firstName).toBe("Mismatched");
      expect(result[0].compatScore).toBeGreaterThan(result[1].compatScore);
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

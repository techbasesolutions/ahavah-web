import { describe, expect, it } from "vitest";
import type {
  Profile,
  Assembly,
  TorahLevel,
  Polygyny,
  FeastDay,
  Calendar,
} from "@/lib/profile-schema";
import { SAMPLE_PROFILES } from "@/lib/profile-sample";
import {
  type DiscoverFilters,
  type DiscoverCandidate,
  applyHardFilters,
  rankCandidates,
  buildDiscoverDeck,
} from "@/lib/discover-engine";

/**
 * TDD test suite for discover-engine pure functions.
 * 15 tests covering boundary tags, filter semantics, and composition.
 */

describe("discover-engine", () => {
  // Helper to build a DiscoverCandidate from Profile
  const makeCandidate = (p: Profile): DiscoverCandidate => ({
    ...p,
    id: p.firstName || "unknown",
  });

  // BOUNDARY TAG TESTS (5 tests)

  describe("boundary: monogamy-only", () => {
    it("excludes candidates with polygyny: 'supports'", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["monogamy-only"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          polygyny: "supports",
        }),
        makeCandidate({
          firstName: "Adam",
          polygyny: "monogamy-only",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Adam");
    });

    it("excludes candidates with intent: 'additional-wife'", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["monogamy-only"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Yosef",
          sex: "male",
          intent: "additional-wife",
        }),
        makeCandidate({
          firstName: "Jacob",
          sex: "male",
          intent: "first-wife",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Jacob");
    });
  });

  describe("boundary: no-long-distance", () => {
    it("excludes candidates from different countries", () => {
      const viewer: Profile = {
        firstName: "Daniel",
        country: "BB",
        boundaryTags: ["no-long-distance"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Esther",
          country: "US",
        }),
        makeCandidate({
          firstName: "Miriam",
          country: "BB",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Miriam");
    });

    it("excludes candidates with no country defined (strict semantics)", () => {
      const viewer: Profile = {
        firstName: "Daniel",
        country: "BB",
        boundaryTags: ["no-long-distance"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Unknown",
          // no country
        }),
        makeCandidate({
          firstName: "Miriam",
          country: "BB",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Miriam");
    });
  });

  describe("boundary: no-additional-spouses", () => {
    it("excludes candidates with intent: 'additional-wife'", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["no-additional-spouses"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Yosef",
          sex: "male",
          intent: "additional-wife",
        }),
        makeCandidate({
          firstName: "David",
          sex: "male",
          intent: "first-wife",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("David");
    });
  });

  describe("boundary: no-smokers", () => {
    it("excludes candidates without 'non-smoker' in healthTags", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["no-smokers"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "John",
          healthTags: ["fitness"],
          // no non-smoker tag
        }),
        makeCandidate({
          firstName: "Daniel",
          healthTags: ["non-smoker", "fitness"],
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });

    it("excludes candidates with no healthTags (strict semantics)", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["no-smokers"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "John",
          // no healthTags at all
        }),
        makeCandidate({
          firstName: "Daniel",
          healthTags: ["non-smoker"],
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });
  });

  describe("boundary: serious-courtship-only", () => {
    it("requires intent: 'courtship' or 'marriage-only'", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: ["serious-courtship-only"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          sex: "male",
          intent: "courtship",
        }),
        makeCandidate({
          firstName: "David",
          sex: "male",
          intent: "marriage-only",
        }),
        makeCandidate({
          firstName: "John",
          sex: "male",
          intent: "long-distance-courtship",
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "David"]);
    });
  });

  // MULTIPLE BOUNDARIES (AND) TEST
  describe("multiple boundaries compose with AND", () => {
    it("applies all boundaries together", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        country: "BB",
        boundaryTags: ["monogamy-only", "no-smokers"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          polygyny: "supports", // fails monogamy-only
          healthTags: ["non-smoker"],
        }),
        makeCandidate({
          firstName: "Adam",
          polygyny: "monogamy-only",
          healthTags: ["fitness"], // fails no-smokers
        }),
        makeCandidate({
          firstName: "David",
          polygyny: "monogamy-only",
          healthTags: ["non-smoker"], // passes both
        }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("David");
    });
  });

  // NO BOUNDARY TAGS TEST
  describe("no boundary tags", () => {
    it("returns all candidates when viewer has no boundary tags", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        boundaryTags: [],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", polygyny: "supports" }),
        makeCandidate({ firstName: "Yosef", intent: "additional-wife" }),
        makeCandidate({ firstName: "John", healthTags: ["fitness"] }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(3);
    });

    it("returns all candidates when viewer has undefined boundary tags", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        // no boundaryTags field
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "Daniel", polygyny: "supports" }),
        makeCandidate({ firstName: "John" }),
      ];

      const result = applyHardFilters(viewer, candidates);
      expect(result).toHaveLength(2);
    });
  });

  // FILTER TESTS (5 tests)

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
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });

    it("excludes candidates with no age defined", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({ firstName: "NoAge" }),
        makeCandidate({ firstName: "Daniel", age: 32 }),
      ];
      const filters: DiscoverFilters = { ageMin: 25 };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });
  });

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
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Yosef"]);
    });
  });

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
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Adam"]);
    });
  });

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
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });
  });

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
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Caleb"]);
    });
  });

  describe("filter: feastDays", () => {
    it("requires candidate to observe at least one of the feast days", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          feastDays: ["passover", "shavuot", "sukkot"],
        }),
        makeCandidate({
          firstName: "Esther",
          feastDays: ["passover", "yom-kippur"],
        }),
        makeCandidate({
          firstName: "John",
          feastDays: ["hanukkah", "purim"],
        }),
      ];
      const filters: DiscoverFilters = {
        feastDays: ["passover", "shavuot"] as readonly FeastDay[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });

    it("excludes candidates with no feastDays", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          feastDays: ["passover"],
        }),
        makeCandidate({
          firstName: "John",
          // no feastDays
        }),
      ];
      const filters: DiscoverFilters = {
        feastDays: ["passover"] as readonly FeastDay[],
      };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });
  });

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
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "Esther"]);
    });
  });

  describe("filter: verifiedOnly", () => {
    it("excludes candidates without verificationTags when verifiedOnly: true", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          verificationTags: ["government-id"],
        }),
        makeCandidate({
          firstName: "John",
          // no verificationTags
        }),
      ];
      const filters: DiscoverFilters = { verifiedOnly: true };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("Daniel");
    });

    it("includes all candidates when verifiedOnly: false or undefined", () => {
      const viewer: Profile = { firstName: "Sarah" };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          verificationTags: ["government-id"],
        }),
        makeCandidate({
          firstName: "John",
        }),
      ];

      const result = applyHardFilters(viewer, candidates, { verifiedOnly: false });
      expect(result).toHaveLength(2);
    });
  });

  // COMPOSITE TESTS (2 tests)

  describe("boundaries and filters compose", () => {
    it("applies boundaries first, then filters", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        country: "BB",
        boundaryTags: ["monogamy-only"],
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          country: "BB",
          polygyny: "supports", // fails boundary
          age: 32,
        }),
        makeCandidate({
          firstName: "Adam",
          country: "BB",
          polygyny: "monogamy-only", // passes boundary
          age: 25, // fails age filter
        }),
        makeCandidate({
          firstName: "David",
          country: "BB",
          polygyny: "monogamy-only", // passes boundary
          age: 32, // passes age filter
        }),
      ];
      const filters: DiscoverFilters = { ageMin: 30 };

      const result = applyHardFilters(viewer, candidates, filters);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("David");
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

      const result = rankCandidates(viewer, candidates);
      expect(result).toEqual(candidates);
    });
  });

  describe("buildDiscoverDeck", () => {
    it("composes filter then rank", () => {
      const viewer: Profile = {
        firstName: "Sarah",
        country: "BB",
      };
      const candidates: DiscoverCandidate[] = [
        makeCandidate({
          firstName: "Daniel",
          country: "BB",
          age: 32,
        }),
        makeCandidate({
          firstName: "Young",
          country: "BB",
          age: 20,
        }),
        makeCandidate({
          firstName: "David",
          country: "BB",
          age: 35,
        }),
      ];
      const filters: DiscoverFilters = { ageMin: 30 };

      const result = buildDiscoverDeck(viewer, candidates, filters);
      // Should filter to Daniel and David, then rank (which is identity)
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.firstName)).toEqual(["Daniel", "David"]);
    });
  });

  // INTEGRATION TEST WITH SAMPLE PROFILES
  describe("integration with SAMPLE_PROFILES", () => {
    it("filters sample profiles by boundaries and filters", () => {
      const esther = makeCandidate(
        SAMPLE_PROFILES.find((p) => p.firstName === "Esther")!,
      );
      const viewers = SAMPLE_PROFILES.map((p) => p);

      // Esther has: monogamy-only, no-smokers boundaries; monogamy-only polygyny; non-smoker tag
      const danielView = viewers[0]; // Daniel
      const candidates = [esther];
      const result = applyHardFilters(danielView, candidates);

      // Daniel has no boundaries, so Esther should pass
      expect(result).toHaveLength(1);
    });
  });
});

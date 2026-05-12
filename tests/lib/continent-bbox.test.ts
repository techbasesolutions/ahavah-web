import { describe, expect, it } from "vitest";

import {
  CONTINENTS,
  ISO_TO_CONTINENT,
  iso2ToContinent,
} from "@/lib/continent-bbox";
import { ALL_COUNTRIES } from "@/lib/countries";

describe("iso2ToContinent", () => {
  it("buckets Caribbean nations under north-america per Bumpy convention", () => {
    expect(iso2ToContinent("BB")).toBe("north-america");
    expect(iso2ToContinent("JM")).toBe("north-america");
    expect(iso2ToContinent("TT")).toBe("north-america");
    expect(iso2ToContinent("DM")).toBe("north-america");
    expect(iso2ToContinent("LC")).toBe("north-america");
  });

  it("returns the correct continent for canonical anchor countries", () => {
    expect(iso2ToContinent("US")).toBe("north-america");
    expect(iso2ToContinent("BR")).toBe("south-america");
    expect(iso2ToContinent("JP")).toBe("asia");
    expect(iso2ToContinent("DE")).toBe("europe");
    expect(iso2ToContinent("KE")).toBe("africa");
    expect(iso2ToContinent("AU")).toBe("oceania");
  });

  it("is case-insensitive and returns null for unknown or malformed codes", () => {
    expect(iso2ToContinent("bb")).toBe("north-america");
    expect(iso2ToContinent("XX")).toBeNull();
    expect(iso2ToContinent("")).toBeNull();
    expect(iso2ToContinent("USA")).toBeNull();
  });
});

describe("CONTINENTS metadata", () => {
  it("exposes the six expected continents with non-empty bboxes", () => {
    expect(CONTINENTS.map((c) => c.id).sort()).toEqual([
      "africa",
      "asia",
      "europe",
      "north-america",
      "oceania",
      "south-america",
    ]);
    for (const c of CONTINENTS) {
      expect(c.bbox.north).toBeGreaterThan(c.bbox.south);
      expect(c.bbox.east).toBeGreaterThan(c.bbox.west);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});

describe("ISO_TO_CONTINENT coverage", () => {
  it("classifies every ALL_COUNTRIES entry to a known continent", () => {
    const validContinents = new Set(CONTINENTS.map((c) => c.id));
    const missing: string[] = [];
    const wrong: string[] = [];
    for (const c of ALL_COUNTRIES) {
      const continent = ISO_TO_CONTINENT[c.cc];
      if (!continent) missing.push(c.cc);
      else if (!validContinents.has(continent)) wrong.push(`${c.cc}=${continent}`);
    }
    expect(missing).toEqual([]);
    expect(wrong).toEqual([]);
  });
});

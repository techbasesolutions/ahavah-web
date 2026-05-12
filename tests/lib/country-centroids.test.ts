import { describe, expect, it } from "vitest";

import { ALL_COUNTRIES } from "@/lib/countries";
import {
  COUNTRY_CENTROIDS,
  centroidOf,
  countriesInBounds,
} from "@/lib/country-centroids";

describe("centroidOf", () => {
  it("returns the centroid of Barbados within sanity tolerance", () => {
    const c = centroidOf("BB");
    expect(c).not.toBeNull();
    // BB is the project's home country; verify rough placement (lat 13, lng -59)
    expect(c!.lat).toBeGreaterThan(12.5);
    expect(c!.lat).toBeLessThan(14);
    expect(c!.lng).toBeGreaterThan(-60);
    expect(c!.lng).toBeLessThan(-59);
  });

  it("returns the centroid of Israel within sanity tolerance", () => {
    const c = centroidOf("IL");
    expect(c).not.toBeNull();
    // IL roughly (31, 35)
    expect(c!.lat).toBeGreaterThan(30);
    expect(c!.lat).toBeLessThan(33);
    expect(c!.lng).toBeGreaterThan(34);
    expect(c!.lng).toBeLessThan(36);
  });

  it("returns null for unknown codes and bad inputs", () => {
    expect(centroidOf("XX")).toBeNull();
    expect(centroidOf("")).toBeNull();
    expect(centroidOf("USA")).toBeNull();
    expect(centroidOf("u")).toBeNull();
  });

  it("is case-insensitive for the iso2 input", () => {
    const a = centroidOf("us");
    const b = centroidOf("US");
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it("covers every ALL_COUNTRIES entry", () => {
    const missing = ALL_COUNTRIES.filter((c) => !COUNTRY_CENTROIDS[c.cc]);
    expect(missing.map((c) => c.cc)).toEqual([]);
  });
});

describe("countriesInBounds", () => {
  it("returns most-of-world for a world-view bbox", () => {
    const result = countriesInBounds({
      north: 85,
      south: -85,
      east: 180,
      west: -180,
    });
    expect(result.length).toBeGreaterThan(200);
  });

  it("returns African ISOs for an Africa-region bbox", () => {
    const result = countriesInBounds({
      north: 37,
      south: -35,
      east: 52,
      west: -18,
    });
    expect(result).toContain("NG");
    expect(result).toContain("KE");
    expect(result).toContain("ZA");
    expect(result).toContain("GH");
    expect(result).toContain("ET");
    expect(result).toContain("EG");
    expect(result.length).toBeGreaterThanOrEqual(30);
  });

  it("returns Israel for a tight bbox around it", () => {
    // Israel centroid ~ (31.51, 35.03). Use a small bbox around that.
    const result = countriesInBounds({
      north: 33.5,
      south: 29.5,
      east: 36.5,
      west: 34,
    });
    expect(result).toContain("IL");
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns empty for a mid-ocean bbox with no land", () => {
    // Mid-Atlantic, well clear of any country centroid.
    const result = countriesInBounds({
      north: 10,
      south: 0,
      east: -30,
      west: -40,
    });
    expect(result).toEqual([]);
  });

  it("returns Caribbean ISOs for a Caribbean bbox", () => {
    // Bbox covering most Caribbean islands.
    const result = countriesInBounds({
      north: 27,
      south: 10,
      east: -59,
      west: -85,
    });
    expect(result).toContain("BB"); // Barbados
    expect(result).toContain("JM"); // Jamaica
    expect(result).toContain("TT"); // Trinidad & Tobago
    expect(result).toContain("BS"); // Bahamas
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});

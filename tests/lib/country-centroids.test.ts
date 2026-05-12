import { describe, expect, it } from "vitest";

import { ALL_COUNTRIES } from "@/lib/countries";
import { COUNTRY_CENTROIDS, centroidOf } from "@/lib/country-centroids";

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

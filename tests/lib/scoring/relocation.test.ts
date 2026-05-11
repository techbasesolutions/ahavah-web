import { describe, expect, it } from "vitest";
import { scoreRelocation } from "@/lib/scoring/rules/relocation";

describe("scoreRelocation", () => {
  it("returns 1.0 for will-relocate × will-relocate", () => {
    expect(
      scoreRelocation(
        { relocation: "will-relocate" },
        { relocation: "will-relocate" },
      ),
    ).toBe(1.0);
  });

  it("returns 1.0 for will-relocate × wants-partner-willing (perfect complement)", () => {
    expect(
      scoreRelocation(
        { relocation: "will-relocate" },
        { relocation: "wants-partner-willing" },
      ),
    ).toBe(1.0);
    expect(
      scoreRelocation(
        { relocation: "wants-partner-willing" },
        { relocation: "will-relocate" },
      ),
    ).toBe(1.0);
  });

  it("returns 0.5 for wants-partner-willing × wants-partner-willing (stalemate)", () => {
    expect(
      scoreRelocation(
        { relocation: "wants-partner-willing" },
        { relocation: "wants-partner-willing" },
      ),
    ).toBe(0.5);
  });

  it("returns 0.2 for wants-partner-willing × local-only (conflict)", () => {
    expect(
      scoreRelocation(
        { relocation: "wants-partner-willing" },
        { relocation: "local-only" },
      ),
    ).toBe(0.2);
    expect(
      scoreRelocation(
        { relocation: "local-only" },
        { relocation: "wants-partner-willing" },
      ),
    ).toBe(0.2);
  });

  it("returns 1.0 for local-only × local-only when same country", () => {
    expect(
      scoreRelocation(
        { relocation: "local-only", country: "US" },
        { relocation: "local-only", country: "US" },
      ),
    ).toBe(1.0);
    expect(
      scoreRelocation(
        { relocation: "local-only", country: "CA" },
        { relocation: "local-only", country: "CA" },
      ),
    ).toBe(1.0);
  });

  it("returns 0.0 for local-only × local-only when different countries", () => {
    expect(
      scoreRelocation(
        { relocation: "local-only", country: "US" },
        { relocation: "local-only", country: "CA" },
      ),
    ).toBe(0.0);
    expect(
      scoreRelocation(
        { relocation: "local-only", country: "GB" },
        { relocation: "local-only", country: "AU" },
      ),
    ).toBe(0.0);
  });

  it("returns 0.5 for local-only × local-only when country is missing", () => {
    expect(
      scoreRelocation(
        { relocation: "local-only", country: "US" },
        { relocation: "local-only" },
      ),
    ).toBe(0.5);
    expect(
      scoreRelocation(
        { relocation: "local-only" },
        { relocation: "local-only", country: "US" },
      ),
    ).toBe(0.5);
    expect(
      scoreRelocation(
        { relocation: "local-only" },
        { relocation: "local-only" },
      ),
    ).toBe(0.5);
  });

  it("is symmetric: scoreRelocation(a, b) === scoreRelocation(b, a)", () => {
    const pairs = [
      [{ relocation: "will-relocate" }, { relocation: "local-only" }],
      [{ relocation: "will-relocate" }, { relocation: "international-open" }],
      [
        { relocation: "wants-partner-willing" },
        { relocation: "international-open" },
      ],
      [
        { relocation: "local-only", country: "US" },
        { relocation: "international-open" },
      ],
      [
        { relocation: "international-open" },
        { relocation: "international-open" },
      ],
    ] as const;

    for (const [a, b] of pairs) {
      expect(scoreRelocation(a, b)).toBe(scoreRelocation(b, a));
    }
  });

  it("returns 0.5 when either side relocation is undefined", () => {
    expect(scoreRelocation({}, { relocation: "will-relocate" })).toBe(0.5);
    expect(scoreRelocation({ relocation: "will-relocate" }, {})).toBe(0.5);
    expect(scoreRelocation({}, {})).toBe(0.5);
  });
});

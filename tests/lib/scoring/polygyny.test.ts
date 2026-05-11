import { describe, expect, it } from "vitest";
import { scorePolygyny } from "@/lib/scoring/rules/polygyny";

describe("scorePolygyny", () => {
  it("returns 1.0 when both stances are identical (supports)", () => {
    expect(scorePolygyny({ polygyny: "supports" }, { polygyny: "supports" })).toBe(1.0);
  });

  it("returns 1.0 when both stances are identical (monogamy-only)", () => {
    expect(
      scorePolygyny({ polygyny: "monogamy-only" }, { polygyny: "monogamy-only" }),
    ).toBe(1.0);
  });

  it("returns 1.0 when both stances are identical (undecided)", () => {
    expect(scorePolygyny({ polygyny: "undecided" }, { polygyny: "undecided" })).toBe(0.7);
  });

  it("returns 0.9 for open × open", () => {
    expect(scorePolygyny({ polygyny: "open" }, { polygyny: "open" })).toBe(0.9);
  });

  it("returns symmetric score regardless of argument order", () => {
    expect(scorePolygyny({ polygyny: "supports" }, { polygyny: "open" })).toBe(
      scorePolygyny({ polygyny: "open" }, { polygyny: "supports" }),
    );
    expect(scorePolygyny({ polygyny: "monogamy-only" }, { polygyny: "undecided" })).toBe(
      scorePolygyny({ polygyny: "undecided" }, { polygyny: "monogamy-only" }),
    );
  });

  it("returns 0.0 for supports × monogamy-only", () => {
    expect(
      scorePolygyny({ polygyny: "supports" }, { polygyny: "monogamy-only" }),
    ).toBe(0.0);
  });

  it("returns 0.4 for open × monogamy-only", () => {
    expect(
      scorePolygyny({ polygyny: "open" }, { polygyny: "monogamy-only" }),
    ).toBe(0.4);
  });

  it("returns 0.5 when one side is undefined", () => {
    expect(scorePolygyny({}, { polygyny: "supports" })).toBe(0.5);
    expect(scorePolygyny({ polygyny: "monogamy-only" }, {})).toBe(0.5);
  });

  it("returns 0.5 when both sides are undefined", () => {
    expect(scorePolygyny({}, {})).toBe(0.5);
  });

  it("returns 0.5 for supports × undecided", () => {
    expect(scorePolygyny({ polygyny: "supports" }, { polygyny: "undecided" })).toBe(0.5);
  });

  it("returns 0.6 for open × undecided", () => {
    expect(scorePolygyny({ polygyny: "open" }, { polygyny: "undecided" })).toBe(0.6);
  });

  it("returns 0.5 for monogamy-only × undecided", () => {
    expect(
      scorePolygyny({ polygyny: "monogamy-only" }, { polygyny: "undecided" }),
    ).toBe(0.5);
  });

  it("returns 0.8 for supports × open", () => {
    expect(scorePolygyny({ polygyny: "supports" }, { polygyny: "open" })).toBe(0.8);
  });
});

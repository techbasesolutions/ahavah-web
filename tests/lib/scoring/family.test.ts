import { describe, expect, it } from "vitest";
import { scoreFamily } from "@/lib/scoring/rules/family";

describe("scoreFamily", () => {
  it("returns 0.5 when both sides have no familyViews set", () => {
    expect(scoreFamily({}, {})).toBe(0.5);
  });

  it("returns 0.4 when one side has familyViews but the other doesn't", () => {
    expect(scoreFamily({ familyViews: ["wants-children"] }, {})).toBe(0.4);
    expect(scoreFamily({}, { familyViews: ["open-to-more"] })).toBe(0.4);
  });

  it("returns 0.0 when one side has 'does-not-want' and the other has pro-creation intent", () => {
    // A has does-not-want, B has wants-children
    expect(
      scoreFamily(
        { familyViews: ["does-not-want"] },
        { familyViews: ["wants-children"] },
      ),
    ).toBe(0.0);

    // B has does-not-want, A has has-children
    expect(
      scoreFamily(
        { familyViews: ["has-children"] },
        { familyViews: ["does-not-want"] },
      ),
    ).toBe(0.0);

    // A has does-not-want, B has open-to-more
    expect(
      scoreFamily(
        { familyViews: ["does-not-want"] },
        { familyViews: ["open-to-more"] },
      ),
    ).toBe(0.0);

    // B has does-not-want, A has interested-large-family
    expect(
      scoreFamily(
        { familyViews: ["interested-large-family"] },
        { familyViews: ["does-not-want"] },
      ),
    ).toBe(0.0);
  });

  it("returns 1.0 when both sides have identical sets", () => {
    expect(
      scoreFamily(
        { familyViews: ["wants-children", "open-to-more"] },
        { familyViews: ["wants-children", "open-to-more"] },
      ),
    ).toBe(1.0);
  });

  it("returns Jaccard + 0.1 bonus when there is partial overlap", () => {
    // ["wants-children", "open-to-more"] vs ["wants-children"]
    // Intersection: ["wants-children"] (1 item)
    // Union: ["wants-children", "open-to-more"] (2 items)
    // Jaccard: 1/2 = 0.5, bonus: +0.1 → 0.6
    expect(
      scoreFamily(
        { familyViews: ["wants-children", "open-to-more"] },
        { familyViews: ["wants-children"] },
      ),
    ).toBe(0.6);
  });

  it("returns 0.0 when there is no overlap and no deal-breaker", () => {
    // ["open-blended"] vs ["interested-large-family"]
    // No intersection, no bonus applies
    expect(
      scoreFamily(
        { familyViews: ["open-blended"] },
        { familyViews: ["interested-large-family"] },
      ),
    ).toBe(0.0);
  });
});

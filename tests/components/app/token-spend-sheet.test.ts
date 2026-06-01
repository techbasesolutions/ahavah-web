import { describe, expect, it } from "vitest";

import { computeSpendState } from "@/components/app/token-spend-sheet";

/**
 * `TokenSpendSheet` receives `currentBalance` from `useTokenBalance()`,
 * which starts in `{state:"loading", balance:0}`. Before this helper
 * landed, all 4 spend sites (reveal, super-like, day-pass, boost)
 * passed `balance` directly — so on the first paint after a tap the
 * sheet flashed "not enough to confirm / Get tokens" even when the
 * user had funds. `computeSpendState` accepts `number | null` and
 * returns `"loading"` for null, so callers can pass `null` while the
 * fetch is in flight and the sheet renders the confirm CTA
 * optimistically (the backend still 402s if truly insufficient).
 */
describe("computeSpendState — TokenSpendSheet balance guard", () => {
  it("returns 'loading' when balance is unknown (null)", () => {
    expect(computeSpendState(null, 3)).toBe("loading");
  });

  it("returns 'sufficient' when balance covers the cost", () => {
    expect(computeSpendState(5, 3)).toBe("sufficient");
  });

  it("returns 'sufficient' when balance exactly equals the cost", () => {
    expect(computeSpendState(3, 3)).toBe("sufficient");
  });

  it("returns 'insufficient' only when balance is known and < cost", () => {
    expect(computeSpendState(2, 3)).toBe("insufficient");
  });

  it("returns 'insufficient' for a real zero balance (not loading)", () => {
    expect(computeSpendState(0, 1)).toBe("insufficient");
  });
});

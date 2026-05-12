import { describe, expect, it } from "vitest";

import { clampStep } from "@/components/ui/number-stepper";

/**
 * The NumberStepper primitive uses React Testing Library to drive
 * click + keyboard interactions in a fuller world. RTL is NOT in the
 * project's dev deps as of SP22 (verified by grep against package.json),
 * so we cover the clamping math via a pure helper instead. The helper
 * is exported FROM the same module the component uses — both code
 * paths share it, so these cases assert the actual production behaviour
 * of the +/- buttons and arrow-key handlers.
 *
 * Coverage:
 *   1. Normal increment
 *   2. Clamped at max (would overshoot)
 *   3. Clamped at min (would undershoot)
 *   4. Custom step
 *   5. Partial overshoot near max (large step, must still respect ceiling)
 */
describe("clampStep — NumberStepper clamping helper", () => {
  it("increments by the default step within range", () => {
    expect(clampStep(0, 1, 0, 20)).toBe(1);
  });

  it("clamps at max when an increment would overshoot", () => {
    expect(clampStep(20, 1, 0, 20)).toBe(20);
  });

  it("clamps at min when a decrement would undershoot", () => {
    expect(clampStep(0, -1, 0, 20)).toBe(0);
  });

  it("respects a custom step size when adding within range", () => {
    expect(clampStep(5, 3, 0, 20)).toBe(8);
  });

  it("clamps to max when a partial overshoot occurs near the ceiling", () => {
    expect(clampStep(19, 3, 0, 20)).toBe(20);
  });
});

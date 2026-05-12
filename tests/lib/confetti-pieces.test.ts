import { describe, expect, it } from "vitest";
import { generatePieces, type ConfettiPiece } from "@/lib/confetti-pieces";

describe("generatePieces", () => {
  it("returns 14 pieces by default", () => {
    const pieces = generatePieces();
    expect(pieces).toHaveLength(14);
  });

  it("is deterministic — same seed produces identical output", () => {
    const a = generatePieces(14, 42);
    const b = generatePieces(14, 42);
    expect(a).toEqual(b);
  });

  it("different seeds produce different output", () => {
    const a = generatePieces(14, 1);
    const b = generatePieces(14, 2);
    // At least some pieces must differ in angle / distance.
    const allSame = a.every((p, i) =>
      p.angle === b[i].angle && p.distance === b[i].distance,
    );
    expect(allSame).toBe(false);
  });

  it("color distribution: 4 lime, 4 lavender, 4 pink, 2 peach", () => {
    const pieces = generatePieces();
    const counts: Record<ConfettiPiece["color"], number> = {
      lime: 0, lavender: 0, pink: 0, peach: 0,
    };
    pieces.forEach((p) => counts[p.color]++);
    expect(counts.lime).toBe(4);
    expect(counts.lavender).toBe(4);
    expect(counts.pink).toBe(4);
    expect(counts.peach).toBe(2);
  });
});

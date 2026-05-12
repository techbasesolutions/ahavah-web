import { afterEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  loadDecisions,
  saveDecisions,
  clearDecisions,
} from "@/lib/use-decision-storage";

describe("use-decision-storage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("loadDecisions returns [] when nothing stored", () => {
    expect(loadDecisions()).toEqual([]);
  });

  it("saveDecisions + loadDecisions round-trip", () => {
    const ds = [
      { subjectId: "esther", action: "like" as const, timestamp: 1 },
    ];
    saveDecisions(ds);
    expect(loadDecisions()).toEqual(ds);
  });

  it("loadDecisions recovers from corruption (returns [])", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json");
    expect(loadDecisions()).toEqual([]);
  });

  it("clearDecisions empties the store", () => {
    saveDecisions([
      { subjectId: "esther", action: "like", timestamp: 1 },
    ]);
    clearDecisions();
    expect(loadDecisions()).toEqual([]);
  });

  it("loadDecisions returns [] when stored JSON is valid but not an array", () => {
    window.localStorage.setItem(STORAGE_KEY, '{"not":"array"}');
    expect(loadDecisions()).toEqual([]);
  });

  it("saveDecisions + loadDecisions round-trip an empty array", () => {
    saveDecisions([]);
    expect(loadDecisions()).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { scoreCalendar } from "@/lib/scoring/rules/calendar";

describe("scoreCalendar", () => {
  it("returns 1.0 when both calendars are identical", () => {
    expect(scoreCalendar({ calendar: "aviv-barley" }, { calendar: "aviv-barley" })).toBe(1.0);
    expect(scoreCalendar({ calendar: "rabbinic" }, { calendar: "rabbinic" })).toBe(1.0);
  });

  it("returns 0.7 for luni-solar-family cross-matches", () => {
    expect(
      scoreCalendar({ calendar: "luni-solar" }, { calendar: "aviv-barley" }),
    ).toBe(0.7);
    expect(
      scoreCalendar({ calendar: "observational-new-moon" }, { calendar: "luni-solar" }),
    ).toBe(0.7);
    expect(
      scoreCalendar({ calendar: "aviv-barley" }, { calendar: "observational-new-moon" }),
    ).toBe(0.7);
  });

  it("returns 0.4 for cross-family pairs (e.g. rabbinic vs aviv-barley)", () => {
    expect(
      scoreCalendar({ calendar: "rabbinic" }, { calendar: "aviv-barley" }),
    ).toBe(0.4);
    expect(scoreCalendar({ calendar: "enoch" }, { calendar: "rabbinic" })).toBe(0.4);
  });

  it("returns 0.3 when one side is 'other'", () => {
    expect(scoreCalendar({ calendar: "other" }, { calendar: "rabbinic" })).toBe(0.3);
    expect(scoreCalendar({ calendar: "aviv-barley" }, { calendar: "other" })).toBe(0.3);
  });

  it("returns 0.3 when either side has no calendar set", () => {
    expect(scoreCalendar({}, { calendar: "rabbinic" })).toBe(0.3);
    expect(scoreCalendar({ calendar: "rabbinic" }, {})).toBe(0.3);
    expect(scoreCalendar({}, {})).toBe(0.3);
  });
});

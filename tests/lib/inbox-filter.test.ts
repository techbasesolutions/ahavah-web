import { describe, expect, it } from "vitest";
import { filterChats, type ChatSummary } from "@/lib/inbox-filter";

const CHATS: ChatSummary[] = [
  { id: "adina", name: "Adina", age: 24, msg: "Say hi!" },
  { id: "rivka", name: "Rivka", age: 31, msg: "Photo" },
  { id: "esther", name: "Esther", age: 28, msg: "Hey, how are you?" },
  { id: "tirzah", name: "Tirzah", age: 22, msg: "is typing…" },
  { id: "daniel", name: "Daniel", age: 32, msg: "Shalom — looking forward." },
];

describe("inbox-filter", () => {
  it("filterChats with empty query returns the full list", () => {
    expect(filterChats(CHATS, "")).toEqual(CHATS);
    expect(filterChats(CHATS, "   ")).toEqual(CHATS);
  });

  it("filterChats matches on name (case-insensitive)", () => {
    const result = filterChats(CHATS, "Adi");
    expect(result.map((c) => c.id)).toEqual(["adina"]);

    const lowered = filterChats(CHATS, "ESTHER");
    expect(lowered.map((c) => c.id)).toEqual(["esther"]);
  });

  it("filterChats matches on last-message preview (case-insensitive)", () => {
    const result = filterChats(CHATS, "shalom");
    expect(result.map((c) => c.id)).toEqual(["daniel"]);
  });

  it("filterChats returns multiple matches across name + msg fields", () => {
    const result = filterChats(CHATS, "h");
    // h matches: Hey (esther msg), Shalom (daniel msg), "Say hi" (adina msg), "Photo" (rivka msg), Tirzah (name).
    expect(result.map((c) => c.id).sort()).toEqual(
      ["adina", "daniel", "esther", "rivka", "tirzah"],
    );
  });

  it("filterChats returns [] when no match", () => {
    expect(filterChats(CHATS, "xyz")).toEqual([]);
  });

  it("filterChats returns a fresh array (no aliasing of input)", () => {
    expect(filterChats(CHATS, "")).not.toBe(CHATS);
    expect(filterChats(CHATS, "xyz")).not.toBe(CHATS);
  });
});

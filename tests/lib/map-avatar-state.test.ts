import { describe, it, expect } from "vitest";
import { resolveMarkerState } from "@/lib/map-avatar-state";
import type { Decision } from "@/lib/decision-engine";

const EMPTY_CHATS = new Set<string>();

describe("resolveMarkerState", () => {
  it("returns 'none' when no decision and not in chats", () => {
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions: [],
      matched: false,
      activeChatIds: EMPTY_CHATS,
    });
    expect(result).toBe("none");
  });

  it("returns 'active-chat' when no decision but in chats", () => {
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions: [],
      matched: false,
      activeChatIds: new Set(["adina"]),
    });
    expect(result).toBe("active-chat");
  });

  it("returns 'passed' for a pass decision", () => {
    const decisions: Decision[] = [{ subjectId: "adina", action: "pass", timestamp: 1 }];
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions,
      matched: false,
      activeChatIds: EMPTY_CHATS,
    });
    expect(result).toBe("passed");
  });

  it("returns 'liked' for a like decision that isn't matched and not in chats", () => {
    const decisions: Decision[] = [{ subjectId: "adina", action: "like", timestamp: 1 }];
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions,
      matched: false,
      activeChatIds: EMPTY_CHATS,
    });
    expect(result).toBe("liked");
  });

  it("returns 'match' when liked and matched", () => {
    const decisions: Decision[] = [{ subjectId: "adina", action: "like", timestamp: 1 }];
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions,
      matched: true,
      activeChatIds: EMPTY_CHATS,
    });
    expect(result).toBe("match");
  });

  it("match priority beats active-chat (liked + matched + in chats → match)", () => {
    const decisions: Decision[] = [{ subjectId: "adina", action: "like", timestamp: 1 }];
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions,
      matched: true,
      activeChatIds: new Set(["adina"]),
    });
    expect(result).toBe("match");
  });

  it("active-chat priority beats liked (liked + not matched + in chats → active-chat)", () => {
    const decisions: Decision[] = [{ subjectId: "adina", action: "like", timestamp: 1 }];
    const result = resolveMarkerState({
      candidate: { id: "adina" },
      decisions,
      matched: false,
      activeChatIds: new Set(["adina"]),
    });
    expect(result).toBe("active-chat");
  });
});

/**
 * Tests for chat-cache (IndexedDB recent-history cache).
 *
 * Uses fake-indexeddb to swap in a Node-compatible IDB. We must install
 * the globals BEFORE importing the cache module so its `getIDB()` capture
 * lands on the fake. Each test wipes both the singleton + the stores so
 * inter-test state doesn't leak.
 */

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  _resetForTests,
  appendMessage,
  clearAll,
  getThreadHistory,
} from "@/lib/chat-cache";
import type { ChatMessage } from "@/lib/chat-types";

function msg(overrides: Partial<ChatMessage> & { id: string; threadId: string }): ChatMessage {
  return {
    fromUserId: "alice",
    toUserId: "bob",
    body: "hi",
    serverTime: "2026-05-12T00:00:00.000Z",
    status: "sent",
    ...overrides,
  };
}

beforeEach(async () => {
  await _resetForTests();
  // Drop the named DB so each test starts clean.
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("ahavah-chat");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

afterEach(async () => {
  await _resetForTests();
});

describe("chat-cache", () => {
  it("appendMessage + getThreadHistory roundtrip", async () => {
    await appendMessage(msg({ id: "1", threadId: "thread-a", body: "first" }));
    await appendMessage(msg({ id: "2", threadId: "thread-a", body: "second", serverTime: "2026-05-12T00:00:01.000Z" }));
    const history = await getThreadHistory("thread-a");
    expect(history.map((m) => m.body)).toEqual(["first", "second"]);
  });

  it("isolates threads", async () => {
    await appendMessage(msg({ id: "1", threadId: "a", body: "alice-msg" }));
    await appendMessage(msg({ id: "2", threadId: "b", body: "bob-msg" }));
    expect((await getThreadHistory("a")).map((m) => m.body)).toEqual(["alice-msg"]);
    expect((await getThreadHistory("b")).map((m) => m.body)).toEqual(["bob-msg"]);
  });

  it("sorts by serverTime ascending", async () => {
    await appendMessage(msg({ id: "z", threadId: "t", body: "late",  serverTime: "2026-05-12T00:00:05.000Z" }));
    await appendMessage(msg({ id: "a", threadId: "t", body: "early", serverTime: "2026-05-12T00:00:01.000Z" }));
    await appendMessage(msg({ id: "m", threadId: "t", body: "mid",   serverTime: "2026-05-12T00:00:03.000Z" }));
    const out = await getThreadHistory("t");
    expect(out.map((m) => m.body)).toEqual(["early", "mid", "late"]);
  });

  it("caps to limit, keeping most recent", async () => {
    for (let i = 0; i < 60; i++) {
      await appendMessage(
        msg({
          id: `m${i}`,
          threadId: "cap",
          body: String(i),
          serverTime: `2026-05-12T00:0${Math.floor(i / 10)}:${String(i % 10).padStart(2, "0")}.000Z`,
        }),
      );
    }
    const out = await getThreadHistory("cap", 50);
    expect(out).toHaveLength(50);
    expect(out[0].body).toBe("10");
    expect(out[49].body).toBe("59");
  });

  it("custom limit", async () => {
    for (let i = 0; i < 10; i++) {
      await appendMessage(
        msg({
          id: `m${i}`,
          threadId: "lim",
          body: String(i),
          serverTime: `2026-05-12T00:00:0${i}.000Z`,
        }),
      );
    }
    const out = await getThreadHistory("lim", 3);
    expect(out.map((m) => m.body)).toEqual(["7", "8", "9"]);
  });

  it("overwrites on duplicate id (pending → sent flip)", async () => {
    await appendMessage(msg({ id: "x", threadId: "t", body: "pending body", status: "pending" }));
    await appendMessage(msg({ id: "x", threadId: "t", body: "pending body", status: "sent" }));
    const out = await getThreadHistory("t");
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe("sent");
  });

  it("returns [] for unknown thread", async () => {
    expect(await getThreadHistory("nope")).toEqual([]);
  });

  it("clearAll wipes every thread", async () => {
    await appendMessage(msg({ id: "1", threadId: "a", body: "x" }));
    await appendMessage(msg({ id: "2", threadId: "b", body: "y" }));
    await clearAll();
    expect(await getThreadHistory("a")).toEqual([]);
    expect(await getThreadHistory("b")).toEqual([]);
  });
});

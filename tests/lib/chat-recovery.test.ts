import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { ChatEvent } from "@/lib/chat-types";
import { _resetForTests, clearAll, getThreadHistory } from "@/lib/chat-cache";

const transport = vi.hoisted(() => ({ listeners: new Set<(e: ChatEvent) => void>(), send: vi.fn() }));
vi.mock("@/lib/chat-client", () => ({ chatClient: {
  subscribe: (fn: (e: ChatEvent) => void) => { transport.listeners.add(fn); return () => transport.listeners.delete(fn); },
  getState: () => "ready", fetchHistory: vi.fn(), disconnect: vi.fn(), sendMessage: transport.send,
} }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get: async () => ({ reactions: [] }) } }));
import { useChatThread } from "@/lib/use-chat-thread";

beforeEach(async () => {
  localStorage.setItem("ahavah.my-uuid", "me");
  localStorage.setItem("ahavah.session-token", "synthetic-session");
  await clearAll();
  transport.send.mockReset();
});
afterEach(async () => { await _resetForTests(); transport.listeners.clear(); localStorage.clear(); });

it("recovers the same saved body and removes the original only after delivery confirmation", async () => {
  const hook = renderHook(() => useChatThread("peer", "me"));
  await waitFor(() => expect(hook.result.current.isHydrated).toBe(true));
  transport.send.mockReturnValue(false);
  act(() => hook.result.current.send("A saved message"));
  await waitFor(() => expect(hook.result.current.messages[0]?.status).toBe("failed"));
  const original = hook.result.current.messages[0].id;
  transport.send.mockReturnValue(true);
  act(() => { hook.result.current.retry(original); hook.result.current.retry(original); });
  expect(transport.send).toHaveBeenCalledTimes(2); // Original attempt plus one retry.
  const pending = hook.result.current.messages.find(m => m.status === "pending")!;
  expect(pending.body).toBe("A saved message");
  expect(hook.result.current.messages.some(m => m.id === original)).toBe(true);
  act(() => transport.listeners.forEach(fn => fn({ type: "message-ack", clientId: pending.clientId!, result: "delivered" })));
  await waitFor(() => expect(hook.result.current.messages).toHaveLength(1));
  expect(hook.result.current.messages[0].status).toBe("sent");
  expect((await getThreadHistory("me", "peer")).some(m => m.id === original)).toBe(false);
  hook.unmount();
});

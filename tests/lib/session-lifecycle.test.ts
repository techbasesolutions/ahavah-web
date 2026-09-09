import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ disconnect: vi.fn(), clear: vi.fn(async () => {}) }));
vi.mock("@/lib/chat-client", () => ({ chatClient: { disconnect: mocks.disconnect } }));
vi.mock("@/lib/chat-cache", () => ({ clearAll: mocks.clear }));
import { clearAccountData, SESSION_RESET, sessionEpoch } from "@/lib/session-lifecycle";
import { apiClient, getSessionToken, setSessionToken, signOutSession } from "@/lib/api-client";

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
it("clears private caches, disconnects transport and invalidates pending work", async () => {
  localStorage.setItem("ahavah.profile.v1", "synthetic-private-profile");
  localStorage.setItem("ahavah.decisions.v1", "synthetic");
  localStorage.setItem("theme", "dark");
  const listener = vi.fn();
  window.addEventListener(SESSION_RESET, listener);
  const before = sessionEpoch();
  await clearAccountData();
  expect(sessionEpoch()).toBeGreaterThan(before);
  expect(localStorage.getItem("ahavah.profile.v1")).toBeNull();
  expect(localStorage.getItem("ahavah.decisions.v1")).toBeNull();
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(mocks.disconnect).toHaveBeenCalled();
  expect(mocks.clear).toHaveBeenCalled();
  expect(listener).toHaveBeenCalled();
  window.removeEventListener(SESSION_RESET, listener);
});
it("never reuses the memoized credential after another tab changes storage", () => {
  setSessionToken("synthetic-a");
  expect(getSessionToken()).toBe("synthetic-a");
  localStorage.setItem("ahavah.session-token", "synthetic-b");
  expect(getSessionToken()).toBe("synthetic-b");
});
it("sign-out clears credentials before a failed revocation completes", async () => {
  setSessionToken("synthetic-session");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const done = signOutSession();
  expect(getSessionToken()).toBeNull();
  await done;
  vi.unstubAllGlobals();
});
it("ignores an old account's 401 arriving while its response body is being read", async () => {
  setSessionToken("synthetic-a");
  let resolveBody!: (body: unknown) => void;
  const body = new Promise(resolve => { resolveBody = resolve; });
  const json = vi.fn(() => body);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, url: "/api/private", headers: new Headers({ "content-type": "application/json" }), json })));
  try {
    const pending = apiClient.get("/private");
    const rejected = expect(pending).rejects.toMatchObject({ status: 409 });
    await vi.waitFor(() => expect(json).toHaveBeenCalled());
    setSessionToken("synthetic-b");
    resolveBody({ error: "Old session expired" });
    await rejected;
    expect(getSessionToken()).toBe("synthetic-b");
  } finally { vi.unstubAllGlobals(); }
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import { useTokenBalance } from "@/lib/use-token-balance";
import { apiClient, getSessionToken } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
  getSessionToken: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

describe("useTokenBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading then balance", async () => {
    vi.mocked(getSessionToken).mockReturnValue("session-tok");
    vi.mocked(apiClient.get).mockResolvedValueOnce({ balance: 12 });
    const { result } = renderHook(() => useTokenBalance());
    expect(result.current.state).toBe("loading");
    await waitFor(() => expect(result.current.state).toBe("happy"));
    expect(result.current.balance).toBe(12);
  });

  it("returns 0 when unauthenticated (no session token)", async () => {
    vi.mocked(getSessionToken).mockReturnValue(null);
    const { result } = renderHook(() => useTokenBalance());
    await waitFor(() => expect(result.current.state).toBe("happy"));
    expect(result.current.balance).toBe(0);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("refresh() refetches", async () => {
    vi.mocked(getSessionToken).mockReturnValue("session-tok");
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ balance: 5 })
      .mockResolvedValueOnce({ balance: 8 });
    const { result } = renderHook(() => useTokenBalance());
    await waitFor(() => expect(result.current.balance).toBe(5));
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.balance).toBe(8));
  });
});

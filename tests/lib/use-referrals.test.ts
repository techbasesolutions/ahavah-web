import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { apiClient, getSessionToken } from "@/lib/api-client";
import type { ReferralsMeResponse } from "@/lib/api-types";
import {
  formatInviteLink,
  formatShortDate,
  friendDisplayName,
  friendInitial,
  premiumMonthsEarned,
  useReferrals,
} from "@/lib/use-referrals";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
  getSessionToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.body = body;
    }
  },
}));

const FIXTURE: ReferralsMeResponse = {
  code: "242W67K",
  link: "https://ahavah.app/i/242W67K",
  items: [
    { state: "credited", created_at: "2026-08-04T00:00:00Z", display_name: "Rivka" },
    { state: "pending", created_at: "2026-08-11T00:00:00Z", display_name: null },
  ],
  totals: { joined: 3, credited: 2, premium_days_earned: 60, tokens_earned: 10 },
};

describe("useReferrals — contract parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses GET /referrals/me into { data, isLoading, error }", async () => {
    vi.mocked(getSessionToken).mockReturnValue("session-tok");
    vi.mocked(apiClient.get).mockResolvedValueOnce(FIXTURE);

    const { result } = renderHook(() => useReferrals());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(FIXTURE);
    expect(apiClient.get).toHaveBeenCalledWith("/referrals/me");
  });

  it("short-circuits without calling the API when signed out", async () => {
    vi.mocked(getSessionToken).mockReturnValue(null);
    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("surfaces a failed first load with no data to fall back on", async () => {
    vi.mocked(getSessionToken).mockReturnValue("session-tok");
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it("reload() preserves the last-good data across a failed revalidation", async () => {
    vi.mocked(getSessionToken).mockReturnValue("session-tok");
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(FIXTURE)
      .mockRejectedValueOnce(new Error("timed out"));

    const { result } = renderHook(() => useReferrals());
    await waitFor(() => expect(result.current.data).toEqual(FIXTURE));

    await result.current.reload();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    // Stale-but-good data survives the failed revalidation — this is what
    // lets the /invite page still render a working link during the SOT's
    // "status list failed (link still works)" frame.
    expect(result.current.data).toEqual(FIXTURE);
  });
});

describe("friendDisplayName — 'A friend' fallback", () => {
  it("falls back to 'A friend' when display_name is null", () => {
    expect(friendDisplayName({ display_name: null })).toBe("A friend");
  });

  it("falls back to 'A friend' when display_name is blank/whitespace", () => {
    expect(friendDisplayName({ display_name: "   " })).toBe("A friend");
  });

  it("uses the real display_name when present", () => {
    expect(friendDisplayName({ display_name: "Daniel" })).toBe("Daniel");
  });
});

describe("friendInitial", () => {
  it("uppercases the first letter of the resolved name", () => {
    expect(friendInitial("rivka")).toBe("R");
    expect(friendInitial("A friend")).toBe("A");
  });
});

describe("formatShortDate", () => {
  it("formats an ISO date as 'D MMM' (day + short month, no year)", () => {
    // Noon UTC avoids the test flipping a calendar day on timezones
    // reasonably close to UTC; the shape assertion (not an exact day
    // number) is what matters here — the SOT's row date style is
    // "4 Aug" / "28 Jul", never a year or a leading zero.
    expect(formatShortDate("2026-08-04T12:00:00Z")).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
    expect(formatShortDate("2026-08-04T12:00:00Z")).not.toMatch(/2026/);
  });

  it("falls back to the raw date slice on an unparsable string", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatInviteLink", () => {
  it("splits a full URL into host+path prefix and the bolded code", () => {
    expect(formatInviteLink("https://ahavah.app/i/242W67K", "242W67K")).toEqual({
      prefix: "ahavah.app/i/",
      code: "242W67K",
    });
  });

  it("falls back to a synthesized prefix when link isn't a well-formed URL", () => {
    expect(formatInviteLink("not-a-url", "242W67K")).toEqual({
      prefix: "ahavah.app/i/",
      code: "242W67K",
    });
  });
});

describe("premiumMonthsEarned", () => {
  it("rounds premium_days_earned to whole months", () => {
    expect(premiumMonthsEarned(60)).toBe(2);
    expect(premiumMonthsEarned(0)).toBe(0);
    expect(premiumMonthsEarned(40)).toBe(1);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

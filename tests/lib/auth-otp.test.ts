import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestEmailOtp,
  checkOtp,
  requestPhoneOtp,
  checkPhoneOtp,
} from "@/lib/auth-otp";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { post: vi.fn() },
  ApiError: class extends Error {
    constructor(
      public status: number,
      public body: unknown,
    ) {
      super();
    }
  },
}));

describe("auth-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requestEmailOtp posts the email", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    await requestEmailOtp("user@example.com");
    expect(apiClient.post).toHaveBeenCalledWith("/request-otp", {
      email: "user@example.com",
    });
  });

  it("checkOtp posts email + code and returns the result", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      session_token: "abc",
      is_new_account: true,
    });
    const result = await checkOtp("user@example.com", "123456");
    expect(apiClient.post).toHaveBeenCalledWith("/check-otp", {
      email: "user@example.com",
      otp: "123456",
    });
    expect(result).toEqual({ session_token: "abc", is_new_account: true });
  });

  it("requestPhoneOtp posts the phone number", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    await requestPhoneOtp("+14155550100");
    expect(apiClient.post).toHaveBeenCalledWith("/request-otp", {
      phone: "+14155550100",
    });
  });

  it("checkPhoneOtp posts phone + code and returns the result", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      session_token: "xyz",
      is_new_account: false,
    });
    const result = await checkPhoneOtp("+14155550100", "654321");
    expect(apiClient.post).toHaveBeenCalledWith("/check-otp", {
      phone: "+14155550100",
      otp: "654321",
    });
    expect(result).toEqual({ session_token: "xyz", is_new_account: false });
  });
});

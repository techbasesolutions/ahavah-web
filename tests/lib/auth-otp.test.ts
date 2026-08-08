import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestEmailOtp,
  checkOtp,
  requestPhoneOtp,
  checkPhoneOtp,
} from "@/lib/auth-otp";
import { apiClient, setSessionToken } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: { post: vi.fn() },
  // requestEmailOtp / requestPhoneOtp capture the session_token returned by
  // /request-otp so the follow-up /check-otp carries bearer auth (commit
  // 513e0da), so the mock must export setSessionToken too.
  setSessionToken: vi.fn(),
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

  it("requestEmailOtp posts the email and stores the session token", async () => {
    // /request-otp now returns { session_token } (unauthenticated session).
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      session_token: "tok-email",
    });
    await requestEmailOtp("user@example.com");
    // With no stored referral code and the default empty antibot payload,
    // the posted body is still just { email } (inviter_code and Turnstile
    // fields are only spread in when present).
    expect(apiClient.post).toHaveBeenCalledWith("/request-otp", {
      email: "user@example.com",
    });
    expect(setSessionToken).toHaveBeenCalledWith("tok-email");
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

  it("requestPhoneOtp posts the phone number and stores the session token", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      session_token: "tok-phone",
    });
    await requestPhoneOtp("+14155550100");
    // Default empty antibot payload spreads nothing extra into the body.
    expect(apiClient.post).toHaveBeenCalledWith("/request-otp", {
      phone: "+14155550100",
    });
    expect(setSessionToken).toHaveBeenCalledWith("tok-phone");
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

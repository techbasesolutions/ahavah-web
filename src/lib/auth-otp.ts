/**
 * Thin helpers over the email-OTP auth endpoints.
 *
 * Duolicious (ahavah-api) uses passwordless email OTP. The client never
 * stores or transmits a password — only an email address and the 6-digit
 * code returned by the OTP email. `/check-otp` sets the `duo_session`
 * httpOnly cookie server-side; the client never reads it directly.
 *
 * Backend reference: `service/api/__init__.py` lines 173-229.
 *
 * These helpers exist so individual pages (`/auth/sign-up`,
 * `/auth/sign-in`, `/onboarding/verify-email`) don't all repeat the
 * `apiClient.post("/request-otp", { email })` shape. Phone variants live
 * here too so all OTP transport is in one file.
 */

import { apiClient, setSessionToken } from "@/lib/api-client";

type RequestOtpResponse = { session_token: string };

export async function requestEmailOtp(email: string): Promise<void> {
  // /request-otp returns `{ session_token }` for an unauthenticated session;
  // /check-otp validates the OTP against that session via the bearer header.
  // Without storing the token here, /check-otp goes out with no auth and
  // the backend can't tie the request to the session that holds the OTP.
  const res = await apiClient.post<RequestOtpResponse>("/request-otp", { email });
  setSessionToken(res.session_token);
}

export type CheckOtpResult = {
  /** Authenticated user's bare uuid — required for chat WebSocket auth. */
  person_uuid: string;
  /** Internal numeric id; not used client-side today but returned. */
  person_id: number | null;
  is_new_account: boolean;
  /** True when the user has finished onboarding. Callers branch on this. */
  onboarded: boolean;
  // NOTE: `/check-otp` does NOT return session_token — the token comes
  // from `/request-otp` and is set by `requestEmailOtp` before this fires.
  // Earlier versions of this type included `session_token: string`, but the
  // backend never sends it (service/person/__init__.py:349-353 returns
  // onboarded + person row + clubs only).
};

export async function checkOtp(
  email: string,
  otp: string,
): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { email, otp });
}

export async function requestPhoneOtp(phone: string): Promise<void> {
  const res = await apiClient.post<RequestOtpResponse>("/request-otp", { phone });
  setSessionToken(res.session_token);
}

export async function checkPhoneOtp(
  phone: string,
  otp: string,
): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { phone, otp });
}

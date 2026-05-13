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

import { apiClient } from "@/lib/api-client";

export async function requestEmailOtp(email: string): Promise<void> {
  await apiClient.post("/request-otp", { email });
}

export type CheckOtpResult = {
  /** Backend also sets duo_session as an httpOnly cookie for REST auth.
   *  Chat needs the raw token client-side for SASL PLAIN — see
   *  `writeChatSession` in `lib/chat-session.ts`. */
  session_token: string;
  /** Authenticated user's bare uuid — required for chat WebSocket auth. */
  person_uuid: string;
  /** Internal numeric id; not used client-side today but returned. */
  person_id: number;
  is_new_account: boolean;
  /** True when the user has finished onboarding. Callers branch on this. */
  onboarded: boolean;
};

export async function checkOtp(
  email: string,
  otp: string,
): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { email, otp });
}

export async function requestPhoneOtp(phone: string): Promise<void> {
  await apiClient.post("/request-otp", { phone });
}

export async function checkPhoneOtp(
  phone: string,
  otp: string,
): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { phone, otp });
}

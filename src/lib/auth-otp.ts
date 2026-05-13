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
  const res = await apiClient.post<RequestOtpResponse>("/request-otp", { phone });
  setSessionToken(res.session_token);
}

export async function checkPhoneOtp(
  phone: string,
  otp: string,
): Promise<CheckOtpResult> {
  return apiClient.post<CheckOtpResult>("/check-otp", { phone, otp });
}

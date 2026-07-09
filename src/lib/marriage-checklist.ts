/**
 * Client helper for the marriage-checklist activity.
 *
 * Answers live only in client state (mirrored to localStorage mid-session);
 * this posts them to the API which composes and sends the two result emails
 * (respondent + spouse) and persists nothing. Requires the OTP session set
 * by `requestEmailOtp` + `checkOtp(..., { source: "marriage_checklist" })`.
 */

import { apiClient } from "@/lib/api-client";
import type { Role, SendAnswer } from "@/app/marriage-checklist/content";

export async function sendChecklistResults(
  spouseEmail: string,
  role: Role | null,
  answers: SendAnswer[],
): Promise<void> {
  await apiClient.post<{ sent: boolean }>("/marriage-checklist/send", {
    spouse_email: spouseEmail,
    ...(role ? { role } : {}),
    answers,
  });
}

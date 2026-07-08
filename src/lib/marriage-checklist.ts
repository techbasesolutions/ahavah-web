/**
 * Client helper for the marriage-checklist activity.
 *
 * Answers live only in React state; this posts them to the API which
 * composes and sends the two result emails (respondent + spouse) and
 * persists nothing. Requires the OTP session set by `requestEmailOtp`
 * plus `checkOtp(..., { source: "marriage_checklist" })`.
 */

import { apiClient } from "@/lib/api-client";
import type { Answer } from "@/app/marriage-checklist/content";

export type { Answer };

export async function sendChecklistResults(
  spouseEmail: string,
  answers: Answer[],
): Promise<void> {
  await apiClient.post<{ sent: boolean }>("/marriage-checklist/send", {
    spouse_email: spouseEmail,
    answers: answers.map((a) => ({
      section: a.section,
      ...(a.role ? { role: a.role } : {}),
      title: a.title,
      ...(a.verse ? { verse: a.verse } : {}),
      importance: a.importance,
      stance: a.stance,
      ...(a.comment ? { comment: a.comment } : {}),
    })),
  });
}

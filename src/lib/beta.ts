/**
 * Beta-tester opt-in client. The opt-in lives in the public waitlist flow, so
 * the email (the address the user just entered on the waitlist) is sent in the
 * body; POST /beta-tester is public + rate-limited.
 */

import { apiClient } from "@/lib/api-client";

export async function registerBetaTester(email: string) {
  return apiClient.post<{ ok: boolean }>("/beta-tester", { email });
}

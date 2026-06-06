/**
 * Beta-tester opt-in client. The opt-in lives in the public waitlist flow, so
 * the email (the address the user just entered on the waitlist) is sent in the
 * body; POST /beta-tester is public + rate-limited.
 */

import { apiClient } from "@/lib/api-client";
import type { AntibotPayload } from "@/lib/antibot";

export async function registerBetaTester(
  email: string,
  antibot: AntibotPayload = {},
) {
  const { readReferralCode } = await import("@/lib/referrals");
  const inviter_code = readReferralCode();
  // isNew=false → already a beta tester (the card shows an "already in" state).
  return apiClient.post<{ ok: boolean; isNew?: boolean }>("/beta-tester", {
    email,
    ...antibot,
    ...(inviter_code ? { inviter_code } : {}),
  });
}

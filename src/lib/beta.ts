/**
 * Beta-tester opt-in client. POST /beta-tester is authenticated; identity comes
 * from the session on the server, so no body is needed (apiClient attaches the
 * bearer token automatically).
 */

import { apiClient } from "@/lib/api-client";

export async function registerBetaTester() {
  return apiClient.post<{ ok: boolean }>("/beta-tester", {});
}

/**
 * Chat translation client — POSTs to the authed /translate endpoint.
 * The backend passes the original text through on any failure, so callers
 * can treat the result as best-effort.
 */

import { apiClient } from "@/lib/api-client";

export type TranslateResult = {
  translated: string;
  detected_source: string | null;
  cached: boolean;
};

export async function translateText(text: string, target: string) {
  return apiClient.post<TranslateResult>("/translate", { text, target });
}

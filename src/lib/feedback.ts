/**
 * Public feedback capture — category model + POST client.
 *
 * Mirrors the waitlist client (src/lib/waitlist.ts): a thin wrapper over
 * apiClient. The backend (POST /feedback) emails admin@techbaseltd.com; there
 * is no DB. Anonymous-friendly (email is optional); the bearer token, if a
 * session exists, rides along via apiClient but is not required.
 */

import { apiClient } from "@/lib/api-client";

export const FEEDBACK_CATEGORIES = [
  { value: "idea", label: "Idea" },
  { value: "problem", label: "Problem" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export type FeedbackPayload = {
  category: FeedbackCategory;
  message: string;
  email?: string;
  path?: string;
  user_agent?: string;
};

export async function postFeedback(payload: FeedbackPayload) {
  return apiClient.post<{ ok: boolean }>("/feedback", payload);
}

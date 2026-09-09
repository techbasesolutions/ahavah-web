import { clearAll } from "@/lib/chat-cache";
import { chatClient } from "@/lib/chat-client";

export const SESSION_RESET = "ahavah:session-reset";
let epoch = 0;
export const sessionEpoch = () => epoch;

/** Invalidate pending work before removing account-specific browser data. */
export function clearAccountData(): Promise<void> {
  epoch++;
  chatClient.disconnect();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_RESET));
    try {
      for (const key of ["ahavah.profile.v1", "ahavah.decisions.v1", "ahavah.filters.v1", "ahavah.show_on_map.v1", "ahavah.onboarded", "ahavah.my-uuid"]) {
        window.localStorage.removeItem(key);
      }
      window.sessionStorage.removeItem("ahavah.map-first-mount");
    } catch { /* Storage can be disabled. Memory is already invalidated. */ }
  }
  return clearAll();
}

/** Exit other tabs without deleting a newly signed-in tab's shared data. */
export function handleIdentityStorageChange(event: StorageEvent): void {
  if (event.key !== null && !["ahavah.session-token", "ahavah.my-uuid"].includes(event.key)) return;
  if (event.oldValue === event.newValue && event.key !== null) return;
  epoch++;
  chatClient.disconnect();
  window.dispatchEvent(new Event(SESSION_RESET));
  window.location.replace("/auth/sign-in");
}

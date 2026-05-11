import { emptyProfile, type Profile } from "@/lib/profile-schema";

export const STORAGE_KEY = "ahavah.profile.v1";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return emptyProfile();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProfile();
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

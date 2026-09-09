"use client";
import { useEffect } from "react";
import { handleIdentityStorageChange } from "@/lib/session-lifecycle";

export function SessionBoundary() {
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("storage", handleIdentityStorageChange);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("storage", handleIdentityStorageChange);
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  return null;
}

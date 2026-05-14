"use client";

/**
 * Detect whether the chat WebSocket transport can actually connect from
 * this page.
 *
 * Browsers block plain `ws://` connections originating from `https://`
 * pages (mixed-content). On the Vercel-hosted PWA today the chat URL
 * still points at the droplet over plain WS (no `chat.ahavah.app` SSL
 * yet), so any connection attempt would fail with a console error.
 *
 * Consumers (`/inbox`, `/chat/[id]`) check this BEFORE calling
 * `chatClient.connect()` and render an honest "Chat ships with the
 * domain launch" banner when unavailable. Local development and any
 * future `wss://` URL pass through unchanged.
 */

export function isChatTransportAvailable(): boolean {
  if (typeof window === "undefined") return false; // SSR — irrelevant
  const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "";
  if (!wsUrl) return false;
  // wss:// always works regardless of page protocol.
  if (wsUrl.startsWith("wss://")) return true;
  // ws:// works ONLY when the page is also plain HTTP (localhost dev).
  // From any HTTPS origin, browsers refuse the upgrade.
  if (wsUrl.startsWith("ws://")) {
    return window.location.protocol === "http:";
  }
  return false;
}

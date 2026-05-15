/**
 * Format a "seconds since last online" integer into a human-readable
 * status. Used by /discover card, /matches grid, /map markers, and the
 * /chat header.
 *
 * Convention:
 *   - < 5 min  → treat as "online" (driven by sub-5-minute keepalive)
 *   - < 1 hour → "Last seen Xm ago"
 *   - < 24 hours → "Last seen Xh ago"
 *   - < 7 days → "Last seen Xd ago"
 *   - older → "Last seen recently" (don't shame inactive accounts)
 *   - null / undefined → "Last seen recently" (no signal yet)
 */

export const ONLINE_THRESHOLD_SECONDS = 300; // 5 min

export function isOnline(seconds: number | null | undefined): boolean {
  return typeof seconds === "number" && seconds < ONLINE_THRESHOLD_SECONDS;
}

export function formatLastSeen(seconds: number | null | undefined): string {
  if (seconds == null) return "Last seen recently";
  if (seconds < ONLINE_THRESHOLD_SECONDS) return "Online";
  if (seconds < 3600) {
    const m = Math.max(1, Math.floor(seconds / 60));
    return `Last seen ${m}m ago`;
  }
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    return `Last seen ${h}h ago`;
  }
  if (seconds < 7 * 86_400) {
    const d = Math.floor(seconds / 86_400);
    return `Last seen ${d}d ago`;
  }
  return "Last seen recently";
}

/**
 * Pure case-insensitive substring filter for the /inbox chat list.
 * Matches against `name` OR `msg`. Empty / whitespace-only query
 * returns the full list (no filtering). Used by the Inbox Search
 * Sheet — symmetric with the decision-engine pattern (pure logic
 * in lib, consumed by a React state in the page).
 */

export type ChatSummary = {
  id: string;
  name: string;
  age: number;
  msg: string;
};

export function filterChats<T extends ChatSummary>(
  chats: ReadonlyArray<T>,
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...chats];
  return chats.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.msg.toLowerCase().includes(q),
  );
}

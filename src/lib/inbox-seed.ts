/**
 * Inbox seed data — shared source of truth for the chat list on `/inbox`
 * and the `active-chat` marker state on `/map` (sub-plan 16 T2).
 *
 * Seed names MUST match SAMPLE_PROFILES (profile-sample.ts) so the chat-header
 * avatar → /profile/[id] route lands on a real record. Mismatch = "Profile
 * not found" from inbox→chat→profile.
 */

export interface InboxSeedChat {
  id: string;
  name: string;
  age: number;
  msg: string;
  unread: number;
  state: "none" | "dot" | "count";
  ring: "none" | "lime" | "online";
}

export const SEED_CHATS: ReadonlyArray<InboxSeedChat> = [
  { id: "adina",   name: "Adina",   age: 24, msg: "Say hi!",                 unread: 3, state: "count", ring: "lime"   },
  { id: "rivka",   name: "Rivka",   age: 31, msg: "Photo",                   unread: 0, state: "dot",   ring: "online" },
  { id: "esther",  name: "Esther",  age: 28, msg: "Hey, how are you?",       unread: 0, state: "dot",   ring: "none"   },
  { id: "tirzah",  name: "Tirzah",  age: 22, msg: "is typing…",              unread: 1, state: "count", ring: "online" },
  { id: "daniel",  name: "Daniel",  age: 32, msg: "Shalom, looking forward.", unread: 0, state: "none",  ring: "none"   },
  { id: "yosef",   name: "Yosef",   age: 41, msg: "Sounds good 💜",            unread: 0, state: "none",  ring: "none"   },
  { id: "ezekiel", name: "Ezekiel", age: 47, msg: "Thanks for the photos!",   unread: 0, state: "none",  ring: "none"   },
];

/**
 * Set of subject IDs the viewer has an active chat thread with. Consumed by
 * `/map`'s `resolveMarkerState` to upgrade those markers to the `active-chat`
 * state (priority: `match` > `active-chat` > `liked` > `passed` > `none`).
 */
export const ACTIVE_CHAT_IDS: ReadonlySet<string> = new Set(
  SEED_CHATS.map((c) => c.id),
);

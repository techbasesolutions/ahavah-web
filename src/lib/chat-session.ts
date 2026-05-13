/**
 * Reads the authenticated user's uuid + session token from localStorage so
 * the chat WebSocket can SASL PLAIN auth.
 *
 * Why localStorage and not the duo_session cookie? The cookie is set
 * httpOnly (by /check-otp) for REST auth — JavaScript can't read it. The
 * chat module needs the raw token client-side to send as the SASL PLAIN
 * password.
 *
 * Storage contract (defined here as canonical; Agent 1's auth flow is
 * expected to populate these on sign-in completion):
 *   - localStorage["ahavah.session-token"] — the session_token from
 *     POST /check-otp's response body
 *   - localStorage["ahavah.my-uuid"]       — the authenticated user's
 *     bare uuid (uuid::text from person.uuid)
 *
 * Both are wiped on sign-out alongside the duo_session cookie expiry.
 *
 * SSR-safe: returns `null` when localStorage is unavailable.
 */

const SESSION_TOKEN_KEY = "ahavah.session-token";
const MY_UUID_KEY = "ahavah.my-uuid";

export type ChatSession = {
  myUuid: string;
  sessionToken: string;
};

/**
 * Read the chat session from localStorage. Returns null when either field
 * is missing (caller treats as "not yet signed in").
 */
export function readChatSession(): ChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const myUuid = window.localStorage.getItem(MY_UUID_KEY);
    const sessionToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
    if (!myUuid || !sessionToken) return null;
    return { myUuid, sessionToken };
  } catch {
    return null;
  }
}

/**
 * Persist the chat session to localStorage. Called by Agent 1's sign-in
 * + sign-up handlers once they receive POST /check-otp's response.
 */
export function writeChatSession(session: ChatSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MY_UUID_KEY, session.myUuid);
    window.localStorage.setItem(SESSION_TOKEN_KEY, session.sessionToken);
  } catch {
    // localStorage full / disabled — chat will fall back to "connecting…".
  }
}

/** Wipe the chat session. Called on sign-out. */
export function clearChatSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MY_UUID_KEY);
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}

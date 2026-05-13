/**
 * IndexedDB cache for recent chat history (≤50 messages per thread).
 *
 * Purpose: paint a chat thread instantly on mount before the live
 * WebSocket has caught up — first-paint must NOT wait on auth-success +
 * MAM round-trip (otherwise users see a blank pane). We hydrate from
 * cache, then merge incoming MAM history + live messages on top.
 *
 * Database: `ahavah-chat` v1.
 * Object store: `messages` (keyPath: `id`, indexes: `threadId`).
 *
 * Lifecycle: per-message append; per-thread getThreadHistory(threadId, limit=50);
 * clearAll() invoked on sign-out so we don't leak the prior user's chats.
 *
 * SSR-safe: every method bails to a sane default (no-op write, empty read)
 * when `indexedDB` is undefined, so this can be imported (but not called
 * with effect) during server-side rendering.
 */

import type { ChatMessage } from "@/lib/chat-types";

const DB_NAME = "ahavah-chat";
const DB_VERSION = 1;
const STORE = "messages";
const THREAD_INDEX = "threadId";

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): IDBFactory | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  return candidate ?? null;
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const idb = getIDB();
  if (!idb) {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex(THREAD_INDEX, "threadId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
  return dbPromise;
}

/**
 * Reset internal singleton — for tests only. Production code should never
 * call this; the DB connection lives for the page lifetime.
 *
 * Closes the cached connection (so a subsequent `indexedDB.deleteDatabase`
 * does not get blocked) and then nulls the singleton promise.
 */
export async function _resetForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}

/**
 * Append a single message to the cache. Overwrites any existing record
 * with the same id (useful when a pending bubble's status flips from
 * pending → sent and we rewrite it).
 */
export async function appendMessage(message: ChatMessage): Promise<void> {
  if (!getIDB()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put(message);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB put failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
    });
  } catch {
    // Cache failures are non-fatal; we still have the live message in memory.
  }
}

/**
 * Read recent history for a thread, oldest-first. Limit defaults to 50.
 * Returns [] on SSR or when nothing is cached.
 */
export async function getThreadHistory(
  threadId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  if (!getIDB()) return [];
  try {
    const db = await openDB();
    return await new Promise<ChatMessage[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const idx = store.index(THREAD_INDEX);
      const range = IDBKeyRange.only(threadId);
      const out: ChatMessage[] = [];
      const cursorReq = idx.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          out.push(cursor.value as ChatMessage);
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        // Sort by serverTime ascending; if equal, fall back to id for
        // determinism (clientId ULIDs sort lexicographically by time).
        out.sort((a, b) => {
          const cmp = a.serverTime.localeCompare(b.serverTime);
          return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
        });
        // Apply cap, keeping the MOST RECENT N (tail).
        resolve(out.length > limit ? out.slice(out.length - limit) : out);
      };
      tx.onerror = () => reject(tx.error ?? new Error("IDB read failed"));
    });
  } catch {
    return [];
  }
}

/**
 * Wipe the entire chat cache. Invoke on sign-out.
 */
export async function clearAll(): Promise<void> {
  if (!getIDB()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB clear failed"));
    });
  } catch {
    // No-op on failure.
  }
}

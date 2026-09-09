/** Account-scoped chat cache. Legacy ownerless messages are never migrated. */
import type { ChatMessage } from "@/lib/chat-types";

const DB_NAME = "ahavah-chat";
const STORE = "messages";
const THREAD_INDEX = "ownerThread";
export const HISTORY_LIMIT = 50;
export const RECOVERY_LIMIT = 50;
type StoredMessage = ChatMessage & { owner: string };
let dbPromise: Promise<IDBDatabase> | null = null;
let generation = 0;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      const store = db.createObjectStore(STORE, { keyPath: ["owner", "id"] });
      store.createIndex(THREAD_INDEX, ["owner", "threadId"]);
      store.createIndex("owner", "owner");
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); dbPromise = null; };
      resolve(req.result);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function newest(a: ChatMessage, b: ChatMessage): number {
  return b.serverTime.localeCompare(a.serverTime) || b.id.localeCompare(a.id);
}
function unresolved(m: ChatMessage): boolean {
  return m.status === "failed" || m.status === "pending";
}

export async function appendMessage(owner: string, message: ChatMessage): Promise<void> {
  const epoch = generation;
  if (!owner || typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    if (epoch !== generation) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put({ ...message, owner });
      const req = store.index(THREAD_INDEX).getAll([owner, message.threadId]);
      req.onsuccess = () => {
        const rows = (req.result as StoredMessage[]).sort(newest);
        let history = 0;
        let recovery = 0;
        for (const row of rows) {
          const keep = unresolved(row) ? ++recovery <= RECOVERY_LIMIT : ++history <= HISTORY_LIMIT;
          if (!keep) store.delete([owner, row.id]);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { /* Cache failures must not interrupt live delivery. */ }
}

export async function getThreadHistory(owner: string, threadId: string, limit = HISTORY_LIMIT): Promise<ChatMessage[]> {
  const epoch = generation;
  if (!owner || typeof indexedDB === "undefined") return [];
  try {
    const db = await openDB();
    const rows = await new Promise<StoredMessage[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).index(THREAD_INDEX).getAll([owner, threadId]);
      req.onsuccess = () => resolve(req.result as StoredMessage[]);
      req.onerror = () => reject(req.error);
    });
    if (epoch !== generation) return [];
    const sorted = rows.sort(newest);
    // Recovery messages remain visible even when older than the history window.
    return [...sorted.filter(unresolved), ...sorted.filter(m => !unresolved(m)).slice(0, Math.max(0, limit))]
      .sort((a, b) => -newest(a, b))
      .map(({ owner: _owner, ...m }) => { void _owner; return m; });
  } catch { return []; }
}

export async function getMostRecentFailedOutgoing(owner: string): Promise<ChatMessage | null> {
  const epoch = generation;
  if (!owner || typeof indexedDB === "undefined") return null;
  try {
    const db = await openDB();
    const rows = await new Promise<StoredMessage[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).index("owner").getAll(owner);
      req.onsuccess = () => resolve(req.result as StoredMessage[]);
      req.onerror = () => reject(req.error);
    });
    if (epoch !== generation) return null;
    const row = rows.filter(m => m.status === "failed" && m.fromUserId === owner).sort(newest)[0];
    if (!row) return null;
    const { owner: _owner, ...message } = row;
    void _owner;
    return message;
  } catch { return null; }
}

export async function removeMessage(owner: string, id: string): Promise<void> {
  if (!owner || typeof indexedDB === "undefined") return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete([owner, id]);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

export async function clearAll(): Promise<void> {
  generation++;
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { /* Owner-scoped reads still prevent cross-account exposure. */ }
}

export async function _resetForTests(): Promise<void> {
  generation++;
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

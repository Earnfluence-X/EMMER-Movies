// Tiny IndexedDB wrapper for storing downloaded movie blobs.
// We store one large Blob per movie, keyed by movie id.

const DB_NAME = "emmer-downloads";
const STORE = "videos";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const videoStore = {
  put: (id: number, blob: Blob) => tx("readwrite", (s) => s.put(blob, id)),
  get: (id: number) => tx<Blob | undefined>("readonly", (s) => s.get(id)),
  delete: (id: number) => tx("readwrite", (s) => s.delete(id)),
  has: async (id: number) => {
    const b = await tx<Blob | undefined>("readonly", (s) => s.get(id));
    return !!b;
  },
};

// Returns approximate bytes used by the origin (cross-store).
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!("storage" in navigator) || !navigator.storage.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}

// Request persistent storage so the browser is less likely to evict our data
// when disk space gets low.
export async function requestPersistent(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    const already = await navigator.storage.persisted?.();
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

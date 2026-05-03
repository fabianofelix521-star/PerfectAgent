import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ---------------------------------------------------------------------------
// IndexedDB-backed storage adapter for Zustand persist middleware.
// Replaces localStorage so there is no quota ceiling — only the user's disk.
// ---------------------------------------------------------------------------

interface ZustandStoreDB extends DBSchema {
  kv: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<ZustandStoreDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ZustandStoreDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ZustandStoreDB>("pa-zustand-v1", 1, {
      upgrade(db) {
        db.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

export const idbZustandStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const db = await getDb();
      return (await db.get("kv", name)) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      const db = await getDb();
      await db.put("kv", value, name);
    } catch {
      // IDB unavailable (private mode without storage grant) — silent drop
    }
  },
  async removeItem(name: string): Promise<void> {
    try {
      const db = await getDb();
      await db.delete("kv", name);
    } catch {
      // ignore
    }
  },
};

/* BolKe Offline Database — IndexedDB via idb
 * Replaces Android Room DB cache — PRD FR-6.2
 * Caches last 50 query→reply pairs for 24 hours
 */

import { openDB } from 'idb';

const DB_NAME = 'bolke-cache';
const DB_VERSION = 1;
const STORE_NAME = 'queries';
const MAX_CACHED = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('created_at', 'created_at');
          store.createIndex('intent', 'intent');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Save a query result to cache
 */
export async function cacheQuery(queryResult) {
  try {
    const db = await getDb();
    const entry = {
      ...queryResult,
      created_at: Date.now(),
    };

    await db.add(STORE_NAME, entry);

    // Trim to MAX_CACHED entries
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const count = await store.count();

    if (count > MAX_CACHED) {
      const cursor = await store.openCursor();
      let toDelete = count - MAX_CACHED;
      while (cursor && toDelete > 0) {
        await cursor.delete();
        await cursor.continue();
        toDelete--;
      }
    }

    await tx.done;
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
}

/**
 * Get recent cached queries
 */
export async function getRecentQueries(limit = 5) {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORE_NAME, 'created_at');

    // Filter expired entries
    const now = Date.now();
    const valid = all.filter((entry) => now - entry.created_at < TTL_MS);

    // Return most recent first
    return valid.reverse().slice(0, limit);
  } catch (err) {
    console.warn('Cache read failed:', err);
    return [];
  }
}

/**
 * Clear expired entries
 */
export async function purgeExpired() {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const all = await store.getAll();
    const now = Date.now();

    for (const entry of all) {
      if (now - entry.created_at >= TTL_MS) {
        await store.delete(entry.id);
      }
    }

    await tx.done;
  } catch (err) {
    console.warn('Cache purge failed:', err);
  }
}

/**
 * Clear all cached data
 */
export async function clearCache() {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.warn('Cache clear failed:', err);
  }
}

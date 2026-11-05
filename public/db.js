// Speichert gespottete Autos lokal im Browser (IndexedDB).
const DB_NAME = "car-spotter";
const STORE = "spots";

let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function getAllSpots() {
  const spots = await tx("readonly", (s) => s.getAll());
  return spots.sort((a, b) => b.createdAt - a.createdAt);
}

export function addSpot(spot) {
  return tx("readwrite", (s) => s.put(spot));
}

export function deleteSpot(id) {
  return tx("readwrite", (s) => s.delete(id));
}

export function putSpots(spots) {
  return tx("readwrite", (s) => {
    for (const spot of spots) s.put(spot);
  });
}

export function clearSpots() {
  return tx("readwrite", (s) => s.clear());
}

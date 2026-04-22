"use client";

const DB_NAME = "baaki-offline";
const DB_VERSION = 2;

export const OFFLINE_STORES = {
  ledger: "ledgerQueue",
  customers: "customerQueue",
} as const;

type OfflineStoreName = (typeof OFFLINE_STORES)[keyof typeof OFFLINE_STORES];

export async function enqueueOfflineItem<T>(storeName: OfflineStoreName, item: T) {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).add(item);
  await transactionDone(transaction);
}

export async function readOfflineQueue<T>(storeName: OfflineStoreName) {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const items = await requestToPromise<T[]>(store.getAll());
  const keys = await requestToPromise<IDBValidKey[]>(store.getAllKeys());
  return items.map((item, index) => ({ key: keys[index], item }));
}

export async function removeOfflineItem(storeName: OfflineStoreName, key: IDBValidKey) {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

async function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;

      for (const storeName of Object.values(OFFLINE_STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { autoIncrement: true });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

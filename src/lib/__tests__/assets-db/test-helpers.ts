import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { Blob as NodeBlob } from "buffer";

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
const originalIdbKeyRangeDescriptor = Object.getOwnPropertyDescriptor(window, "IDBKeyRange");

export function installFakeIndexedDb(): void {
  const indexedDb = new IDBFactory();

  Object.defineProperty(window, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(window, "IDBKeyRange", { configurable: true, value: IDBKeyRange });
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(globalThis, "IDBKeyRange", { configurable: true, value: IDBKeyRange });

  Dexie.dependencies.indexedDB = indexedDb;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

export function restoreIndexedDb(): void {
  if (originalIndexedDbDescriptor) {
    Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).indexedDB;
  }

  if (originalIdbKeyRangeDescriptor) {
    Object.defineProperty(window, "IDBKeyRange", originalIdbKeyRangeDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).IDBKeyRange;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).indexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IDBKeyRange;
}

export async function deleteDb(name: string): Promise<void> {
  if (!("indexedDB" in window)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${name}`));
    request.onblocked = () => reject(new Error(`Failed to delete ${name}: blocked`));
  });
}

export function createTestBlob(
  parts: string[] = ["x"],
  type: string = "image/png",
): Blob {
  return new NodeBlob(parts, { type }) as unknown as Blob;
}

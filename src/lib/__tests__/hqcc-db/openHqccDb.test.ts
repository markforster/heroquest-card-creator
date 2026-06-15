import Dexie from "dexie";
import { IDBDatabase, IDBFactory, IDBKeyRange } from "fake-indexeddb";

import { APP_VERSION } from "@/version";

type StoreSeeder = (db: IDBDatabase, tx: IDBTransaction) => void;

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
const originalIdbKeyRangeDescriptor = Object.getOwnPropertyDescriptor(window, "IDBKeyRange");

function installFakeIndexedDb(): void {
  const indexedDb = new IDBFactory();

  Object.defineProperty(window, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(window, "IDBKeyRange", { configurable: true, value: IDBKeyRange });
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(globalThis, "IDBKeyRange", { configurable: true, value: IDBKeyRange });

  Dexie.dependencies.indexedDB = indexedDb;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

function restoreIndexedDb(): void {
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

async function deleteDb(name: string): Promise<void> {
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

async function openDbVersion(version: number, seed?: StoreSeeder): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("hqcc", version);

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;

      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("assets")) {
        const assetsStore = db.createObjectStore("assets", { keyPath: "id" });
        assetsStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("collections")) {
        db.createObjectStore("collections", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("decks")) {
        db.createObjectStore("decks", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("deckGroups")) {
        const groupsStore = db.createObjectStore("deckGroups", { keyPath: "id" });
        groupsStore.createIndex("deckId", "deckId", { unique: false });
      }

      if (!db.objectStoreNames.contains("deckSets")) {
        const setsStore = db.createObjectStore("deckSets", { keyPath: "id" });
        setsStore.createIndex("deckId", "deckId", { unique: false });
        setsStore.createIndex("groupId", "groupId", { unique: false });
        setsStore.createIndex("backFaceId", "backFaceId", { unique: false });
      }

      if (!db.objectStoreNames.contains("deckEntries")) {
        const entriesStore = db.createObjectStore("deckEntries", { keyPath: "id" });
        entriesStore.createIndex("deckId", "deckId", { unique: false });
        entriesStore.createIndex("setId", "setId", { unique: false });
        entriesStore.createIndex("pairId", "pairId", { unique: false });
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "id" });
      }

      seed?.(db, tx);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open test DB"));
  });
}

async function readAllFromDb(db: globalThis.IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();

    request.onsuccess = () => {
      resolve((request.result as unknown[] | undefined) ?? []);
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to read ${storeName}`));
    };
  });
}

async function waitFor<T>(reader: () => Promise<T>, predicate: (value: T) => boolean): Promise<T> {
  let lastValue: T | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    lastValue = await reader();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error(`Condition not met: ${JSON.stringify(lastValue)}`);
}

describe("openHqccDb", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    jest.spyOn(console, "debug").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    try {
      const { getHqccDexieDb } = await import("@/lib/hqcc-dexie");
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown import failures in tests that intentionally unset IndexedDB.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("rejects when IndexedDB is not available", async () => {
    restoreIndexedDb();
    const { openHqccDb } = await import("@/lib/hqcc-db");

    await expect(openHqccDb()).rejects.toThrow("IndexedDB not available");
  });

  it("opens the hqcc DB as a native database with the current stores", async () => {
    const { openHqccDb, readExistingHqccDbAppVersion } = await import("@/lib/hqcc-db");

    const db = await openHqccDb();

    expect(db).toBeInstanceOf(IDBDatabase);
    expect(db.version).toBe(6);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "assets",
        "cards",
        "collections",
        "deckEntries",
        "deckGroups",
        "decks",
        "deckSets",
        "meta",
        "pairs",
        "settings",
      ]),
    );

    db.close();
    await expect(readExistingHqccDbAppVersion()).resolves.toBe(APP_VERSION);
  });

  it("upgrades a legacy DB to version 6 and preserves post-open pair maintenance", async () => {
    const legacyDb = await openDbVersion(4, (_db, tx) => {
      tx.objectStore("cards").put({
        id: "front-1",
        title: "Front",
        face: "front",
        schemaVersion: 1,
        pairedWith: "back-1",
      });
      tx.objectStore("cards").put({
        id: "back-1",
        title: "Back",
        face: "back",
        schemaVersion: 1,
      });
    });
    legacyDb.close();

    const { openHqccDb, probeHqccDbVersion } = await import("@/lib/hqcc-db");
    const db = await openHqccDb();

    expect(db.version).toBe(6);
    expect(await probeHqccDbVersion()).toBe(6);

    const pairs = (await waitFor(
      async () =>
        (await readAllFromDb(db, "pairs")) as Array<{ frontFaceId: string; backFaceId: string }>,
      (items) => items.length === 1,
    )) as Array<{ frontFaceId: string; backFaceId: string }>;

    expect(pairs[0]).toEqual(
      expect.objectContaining({
        frontFaceId: "front-1",
        backFaceId: "back-1",
      }),
    );

    const cards = (await waitFor(
      async () =>
        (await readAllFromDb(db, "cards")) as Array<{ id: string; schemaVersion?: number }>,
      (items) => items.every((item) => item.schemaVersion === 2),
    )) as Array<{ id: string; schemaVersion?: number }>;

    expect(cards).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "front-1", schemaVersion: 2 })]),
    );

    db.close();
  });
});

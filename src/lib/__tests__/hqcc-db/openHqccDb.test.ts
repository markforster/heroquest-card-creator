import { DB_VERSION, openHqccDb } from "@/lib/hqcc-db";

type MockStore = {
  indexNames: { contains: (name: string) => boolean };
  createIndex: jest.Mock;
  put: jest.Mock;
};

type MockDb = {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: jest.Mock;
  transaction?: {
    objectStore: (name: string) => MockStore;
  };
};

type OpenRequest = {
  result: MockDb;
  error?: unknown;
  transaction?: {
    objectStore: (name: string) => MockStore;
  };
  onupgradeneeded: null | ((event: IDBVersionChangeEvent) => void);
  onsuccess: null | (() => void);
  onerror: null | (() => void);
};

function createDb({
  existingStores = [],
  existingAssetIndexes = [],
}: {
  existingStores?: string[];
  existingAssetIndexes?: string[];
}): {
  db: MockDb;
  assetsStore: MockStore;
  metaStore: MockStore;
  settingsStore: MockStore;
  pairsStore: MockStore;
  groupsStore: MockStore;
  setsStore: MockStore;
  entriesStore: MockStore;
} {
  const storeSet = new Set(existingStores);
  const assetsIndexSet = new Set(existingAssetIndexes);
  const createStore = (existingIndexes: string[] = []): MockStore => {
    const indexSet = new Set(existingIndexes);
    return {
      indexNames: { contains: (name) => indexSet.has(name) },
      createIndex: jest.fn(),
      put: jest.fn(),
    };
  };

  const assetsStore = createStore([...assetsIndexSet]);
  const metaStore = createStore();
  const settingsStore = createStore();
  const pairsStore = createStore();
  const groupsStore = createStore();
  const setsStore = createStore();
  const entriesStore = createStore();

  const db: MockDb = {
    objectStoreNames: { contains: (name) => storeSet.has(name) },
    createObjectStore: jest.fn((name: string) => {
      storeSet.add(name);
      if (name === "assets") return assetsStore;
      if (name === "pairs") return pairsStore;
      if (name === "meta") return metaStore;
      if (name === "settings") return settingsStore;
      if (name === "deckGroups") return groupsStore;
      if (name === "deckSets") return setsStore;
      if (name === "deckEntries") return entriesStore;
      return undefined;
    }),
    transaction: {
      objectStore: (name: string) => {
        if (name === "meta") return metaStore;
        if (name === "settings") return settingsStore;
        if (name === "pairs") return pairsStore;
        if (name === "deckGroups") return groupsStore;
        if (name === "deckSets") return setsStore;
        if (name === "deckEntries") return entriesStore;
        return assetsStore;
      },
    },
  };

  return { db, assetsStore, metaStore, settingsStore, pairsStore, groupsStore, setsStore, entriesStore };
}

function createOpenRequest(db: MockDb): OpenRequest {
  return {
    result: db,
    transaction: db.transaction,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  };
}

describe("openHqccDb", () => {
  const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");

  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.debug as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();

    if (originalIndexedDbDescriptor) {
      Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).indexedDB;
    }
  });

  it("rejects when IndexedDB is not available", async () => {
    // Ensure `"indexedDB" in window` is false.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).indexedDB;

    await expect(openHqccDb()).rejects.toThrow("IndexedDB not available");
  });

  it("opens the hqcc DB and resolves on success", async () => {
    const { db } = createDb({});
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    expect(open).toHaveBeenCalledWith("hqcc", DB_VERSION);

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("creates missing stores and indexes during upgrade", async () => {
    const { db, assetsStore, metaStore } = createDb({ existingStores: [] });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.({ oldVersion: 5 } as IDBVersionChangeEvent);

    expect(db.createObjectStore).toHaveBeenCalledWith("cards", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("pairs", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("assets", { keyPath: "id" });
    expect(assetsStore.createIndex).toHaveBeenCalledWith("createdAt", "createdAt", { unique: false });
    expect(db.createObjectStore).toHaveBeenCalledWith("collections", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("settings", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("decks", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("deckGroups", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("deckSets", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("deckEntries", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("meta", { keyPath: "id" });
    expect(metaStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "appVersion",
        dbVersion: DB_VERSION,
      }),
    );

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("does not recreate existing stores or indexes during upgrade", async () => {
    const { db, assetsStore, metaStore } = createDb({
      existingStores: [
        "cards",
        "pairs",
        "assets",
        "collections",
        "settings",
        "decks",
        "deckGroups",
        "deckSets",
        "deckEntries",
        "meta",
      ],
      existingAssetIndexes: ["createdAt"],
    });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.({ oldVersion: 5 } as IDBVersionChangeEvent);

    expect(db.createObjectStore).not.toHaveBeenCalled();
    expect(assetsStore.createIndex).not.toHaveBeenCalled();
    expect(metaStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "appVersion",
        dbVersion: DB_VERSION,
      }),
    );

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("rejects with request.error on error", async () => {
    const { db } = createDb({});
    const request = createOpenRequest(db);
    request.error = new Error("boom");
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onerror?.();
    await expect(promise).rejects.toThrow("boom");
  });

  it("rejects with a default error when request.error is missing", async () => {
    const { db } = createDb({});
    const request = createOpenRequest(db);
    request.error = undefined;
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onerror?.();
    await expect(promise).rejects.toThrow("Failed to open hqcc DB");
  });
});

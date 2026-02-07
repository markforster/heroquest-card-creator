import { openHqccDb } from "@/lib/hqcc-db";

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
  onupgradeneeded: null | (() => void);
  onsuccess: null | (() => void);
  onerror: null | (() => void);
};

function createDb({
  existingStores = [],
  existingAssetIndexes = [],
}: {
  existingStores?: string[];
  existingAssetIndexes?: string[];
}): { db: MockDb; assetsStore: MockStore; metaStore: MockStore; settingsStore: MockStore } {
  const storeSet = new Set(existingStores);
  const assetsIndexSet = new Set(existingAssetIndexes);

  const assetsStore: MockStore = {
    indexNames: { contains: (name) => assetsIndexSet.has(name) },
    createIndex: jest.fn(),
    put: jest.fn(),
  };

  const metaStore: MockStore = {
    indexNames: { contains: () => false },
    createIndex: jest.fn(),
    put: jest.fn(),
  };

  const settingsStore: MockStore = {
    indexNames: { contains: () => false },
    createIndex: jest.fn(),
    put: jest.fn(),
  };

  const db: MockDb = {
    objectStoreNames: { contains: (name) => storeSet.has(name) },
    createObjectStore: jest.fn((name: string) => {
      storeSet.add(name);
      if (name === "assets") return assetsStore;
      if (name === "meta") return metaStore;
      if (name === "settings") return settingsStore;
      return undefined;
    }),
    transaction: {
      objectStore: (name: string) => {
        if (name === "meta") return metaStore;
        if (name === "settings") return settingsStore;
        return assetsStore;
      },
    },
  };

  return { db, assetsStore, metaStore, settingsStore };
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

    expect(open).toHaveBeenCalledWith("hqcc", 4);

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("creates missing stores and indexes during upgrade", async () => {
    const { db, assetsStore, metaStore } = createDb({ existingStores: [] });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.();

    expect(db.createObjectStore).toHaveBeenCalledWith("cards", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("assets", { keyPath: "id" });
    expect(assetsStore.createIndex).toHaveBeenCalledWith("createdAt", "createdAt", { unique: false });
    expect(db.createObjectStore).toHaveBeenCalledWith("collections", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("settings", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("meta", { keyPath: "id" });
    expect(metaStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "appVersion",
        dbVersion: 4,
      }),
    );

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("does not recreate existing stores or indexes during upgrade", async () => {
    const { db, assetsStore, metaStore } = createDb({
      existingStores: ["cards", "assets", "collections", "settings", "meta"],
      existingAssetIndexes: ["createdAt"],
    });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.();

    expect(db.createObjectStore).not.toHaveBeenCalled();
    expect(assetsStore.createIndex).not.toHaveBeenCalled();
    expect(metaStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "appVersion",
        dbVersion: 4,
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

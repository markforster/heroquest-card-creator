import { openHqccDb } from "@/lib/hqcc-db";

type MockStore = {
  indexNames: { contains: (name: string) => boolean };
  createIndex: jest.Mock;
};

type MockDb = {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: jest.Mock;
};

type OpenRequest = {
  result: MockDb;
  error?: unknown;
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
}): { db: MockDb; assetsStore: MockStore } {
  const storeSet = new Set(existingStores);
  const assetsIndexSet = new Set(existingAssetIndexes);

  const assetsStore: MockStore = {
    indexNames: { contains: (name) => assetsIndexSet.has(name) },
    createIndex: jest.fn(),
  };

  const db: MockDb = {
    objectStoreNames: { contains: (name) => storeSet.has(name) },
    createObjectStore: jest.fn((name: string) => {
      storeSet.add(name);
      if (name === "assets") return assetsStore;
      return undefined;
    }),
  };

  return { db, assetsStore };
}

function createOpenRequest(db: MockDb): OpenRequest {
  return {
    result: db,
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

    expect(open).toHaveBeenCalledWith("hqcc", 2);

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("creates missing stores and indexes during upgrade", async () => {
    const { db, assetsStore } = createDb({ existingStores: [] });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.();

    expect(db.createObjectStore).toHaveBeenCalledWith("cards", { keyPath: "id" });
    expect(db.createObjectStore).toHaveBeenCalledWith("assets", { keyPath: "id" });
    expect(assetsStore.createIndex).toHaveBeenCalledWith("createdAt", "createdAt", { unique: false });
    expect(db.createObjectStore).toHaveBeenCalledWith("collections", { keyPath: "id" });

    request.onsuccess?.();
    await expect(promise).resolves.toBe(db);
  });

  it("does not recreate existing stores or indexes during upgrade", async () => {
    const { db, assetsStore } = createDb({
      existingStores: ["cards", "assets", "collections"],
      existingAssetIndexes: ["createdAt"],
    });
    const request = createOpenRequest(db);
    const open = jest.fn(() => request);

    Object.defineProperty(window, "indexedDB", { configurable: true, value: { open } });

    const promise = openHqccDb();

    request.onupgradeneeded?.();

    expect(db.createObjectStore).not.toHaveBeenCalled();
    expect(assetsStore.createIndex).not.toHaveBeenCalled();

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


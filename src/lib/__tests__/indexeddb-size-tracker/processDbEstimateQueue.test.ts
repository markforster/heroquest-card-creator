const openHqccDexieDb = jest.fn();
const estimateIndexedDbSize = jest.fn();
const estimateRecordBytes = jest.fn();

jest.mock("@/lib/hqcc-dexie", () => ({
  openHqccDexieDb: () => openHqccDexieDb(),
}));

jest.mock("@/lib/indexeddb-size-estimate", () => ({
  estimateIndexedDbSize: (...args: unknown[]) => estimateIndexedDbSize(...args),
  estimateRecordBytes: (...args: unknown[]) => estimateRecordBytes(...args),
}));

type StoreRecord = Record<string, unknown> & { id: string };
type StoreTable = {
  get: jest.Mock<Promise<StoreRecord | undefined>, [string]>;
};

type DexieTableMap = {
  cards: StoreTable;
  assets: StoreTable;
  collections: StoreTable;
  settings: StoreTable;
  pairs: StoreTable;
  decks: StoreTable;
  deckGroups: StoreTable;
  deckSets: StoreTable;
  deckEntries: StoreTable;
};

type TrackerModule = typeof import("@/lib/indexeddb-size-tracker");

const QUEUE_KEY = "hqcc.dbEstimate.queue.v1";
const TOTALS_KEY = "hqcc.dbEstimate.totals.v1";
const RECORD_SIZES_KEY = "hqcc.dbEstimate.recordSizes.v1";

function createFakeDb(recordsByStore: Partial<Record<keyof DexieTableMap, StoreRecord[]>> = {}): DexieTableMap {
  const createTable = (records: StoreRecord[] = []): StoreTable => {
    const state = new Map(records.map((record) => [record.id, { ...record }]));
    return {
      get: jest.fn(async (id: string) => {
        const record = state.get(id);
        return record ? { ...record } : undefined;
      }),
    };
  };

  return {
    cards: createTable(recordsByStore.cards),
    assets: createTable(recordsByStore.assets),
    collections: createTable(recordsByStore.collections),
    settings: createTable(recordsByStore.settings),
    pairs: createTable(recordsByStore.pairs),
    decks: createTable(recordsByStore.decks),
    deckGroups: createTable(recordsByStore.deckGroups),
    deckSets: createTable(recordsByStore.deckSets),
    deckEntries: createTable(recordsByStore.deckEntries),
  };
}

async function loadTrackerModule(): Promise<TrackerModule> {
  jest.resetModules();
  return import("@/lib/indexeddb-size-tracker");
}

describe("processDbEstimateQueue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    openHqccDexieDb.mockReset();
    estimateIndexedDbSize.mockReset();
    estimateRecordBytes.mockReset();
    estimateIndexedDbSize.mockResolvedValue({
      totalBytes: 0,
      recordsScanned: 0,
      byStore: {},
      lastUpdated: null,
      recordSizes: {},
    });
    estimateRecordBytes.mockImplementation((record: unknown) => ({
      bytes: JSON.stringify(record).length,
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("processes queued records through the mapped Dexie table and updates totals", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "settings", id: "defaultCopyright" }]));

    const db = createFakeDb({
      settings: [{ id: "defaultCopyright", value: "Copyright", updatedAt: 1, schemaVersion: 1 }],
    });
    openHqccDexieDb.mockResolvedValue(db);
    estimateRecordBytes.mockReturnValueOnce({ bytes: 42 });

    const tracker = await loadTrackerModule();

    await tracker.processDbEstimateQueue();

    expect(db.settings.get).toHaveBeenCalledWith("defaultCopyright");
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 42,
        recordsScanned: 1,
        queueLength: 0,
        byStore: {
          settings: { bytes: 42, records: 1 },
        },
      }),
    );
    expect(JSON.parse(window.localStorage.getItem(RECORD_SIZES_KEY) ?? "{}")).toEqual({
      settings: { defaultCopyright: 42 },
    });
  });

  it("removes missing records by reducing their cached size to zero", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "cards", id: "card-1" }]));
    window.localStorage.setItem(
      TOTALS_KEY,
      JSON.stringify({
        totalBytes: 50,
        recordsScanned: 1,
        byStore: { cards: { bytes: 50, records: 1 } },
        lastUpdated: "before",
      }),
    );
    window.localStorage.setItem(RECORD_SIZES_KEY, JSON.stringify({ cards: { "card-1": 50 } }));

    openHqccDexieDb.mockResolvedValue(createFakeDb());

    const tracker = await loadTrackerModule();

    await tracker.processDbEstimateQueue();

    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 0,
        recordsScanned: 0,
        byStore: {
          cards: { bytes: 0, records: 0 },
        },
      }),
    );
    expect(JSON.parse(window.localStorage.getItem(RECORD_SIZES_KEY) ?? "{}")).toEqual({
      cards: {},
    });
  });

  it("tolerates unknown store names and treats them as size zero", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "unknownStore", id: "x-1" }]));
    window.localStorage.setItem(
      TOTALS_KEY,
      JSON.stringify({
        totalBytes: 12,
        recordsScanned: 1,
        byStore: { unknownStore: { bytes: 12, records: 1 } },
        lastUpdated: "before",
      }),
    );
    window.localStorage.setItem(RECORD_SIZES_KEY, JSON.stringify({ unknownStore: { "x-1": 12 } }));

    openHqccDexieDb.mockResolvedValue(createFakeDb());

    const tracker = await loadTrackerModule();

    await tracker.processDbEstimateQueue();

    expect(openHqccDexieDb).toHaveBeenCalledTimes(1);
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 0,
        recordsScanned: 0,
        byStore: {
          unknownStore: { bytes: 0, records: 0 },
        },
      }),
    );
  });

  it("falls back to the previous size when a record read fails", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "pairs", id: "pair-1" }]));
    window.localStorage.setItem(
      TOTALS_KEY,
      JSON.stringify({
        totalBytes: 33,
        recordsScanned: 1,
        byStore: { pairs: { bytes: 33, records: 1 } },
        lastUpdated: "before",
      }),
    );
    window.localStorage.setItem(RECORD_SIZES_KEY, JSON.stringify({ pairs: { "pair-1": 33 } }));

    const db = createFakeDb();
    db.pairs.get.mockRejectedValueOnce(new Error("read failed"));
    openHqccDexieDb.mockResolvedValue(db);

    const tracker = await loadTrackerModule();

    await tracker.processDbEstimateQueue();

    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 33,
        recordsScanned: 1,
        byStore: {
          pairs: { bytes: 33, records: 1 },
        },
      }),
    );
    expect(JSON.parse(window.localStorage.getItem(RECORD_SIZES_KEY) ?? "{}")).toEqual({
      pairs: { "pair-1": 33 },
    });
  });

  it("does not start duplicate processing while a run is already in flight", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "collections", id: "collection-1" }]));

    const control: { releaseGet?: () => void } = {};
    const db = createFakeDb();
    db.collections.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          control.releaseGet = () => resolve({ id: "collection-1", name: "Collection" });
        }),
    );
    openHqccDexieDb.mockResolvedValue(db);
    estimateRecordBytes.mockReturnValue({ bytes: 25 });

    const tracker = await loadTrackerModule();

    const first = tracker.processDbEstimateQueue();
    const second = tracker.processDbEstimateQueue();

    await Promise.resolve();
    expect(openHqccDexieDb).toHaveBeenCalledTimes(1);
    expect(second).resolves.toBeUndefined();

    control.releaseGet?.();

    await expect(first).resolves.toBeUndefined();
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 25,
        recordsScanned: 1,
      }),
    );
  });

  it("waits while paused and resumes queued processing when unpaused", async () => {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([{ store: "decks", id: "deck-1" }]));

    const requestIdleCallbackMock = jest.fn((_callback: IdleRequestCallback) => 1);
    globalThis.requestIdleCallback = requestIdleCallbackMock as typeof requestIdleCallback;

    const db = createFakeDb({
      decks: [{ id: "deck-1", title: "Deck", updatedAt: 1, createdAt: 1, schemaVersion: 1 }],
    });
    openHqccDexieDb.mockResolvedValue(db);
    estimateRecordBytes.mockReturnValue({ bytes: 18 });

    const tracker = await loadTrackerModule();

    tracker.setDbEstimatePaused(true);
    await tracker.processDbEstimateQueue();

    expect(openHqccDexieDb).not.toHaveBeenCalled();
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        queueLength: 1,
        totalBytes: 0,
      }),
    );

    tracker.setDbEstimatePaused(false);

    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1);
    const idleCallback = requestIdleCallbackMock.mock.calls[0]?.[0];
    expect(typeof idleCallback).toBe("function");

    if (idleCallback) {
      idleCallback({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openHqccDexieDb).toHaveBeenCalledTimes(1);
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        queueLength: 0,
        totalBytes: 18,
        recordsScanned: 1,
      }),
    );
  });

  it("keeps queue entries deduped before processing starts", async () => {
    const requestIdleCallbackMock = jest.fn((_callback: IdleRequestCallback) => 1);
    globalThis.requestIdleCallback = requestIdleCallbackMock as typeof requestIdleCallback;

    const tracker = await loadTrackerModule();

    tracker.enqueueDbEstimateChange("cards", "card-1");
    tracker.enqueueDbEstimateChange("cards", "card-1");

    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        queueLength: 1,
      }),
    );
    expect(JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]")).toEqual([
      { store: "cards", id: "card-1" },
    ]);
    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1);
  });

  it("delegates full estimates to the native estimate utility unchanged", async () => {
    estimateIndexedDbSize.mockResolvedValueOnce({
      totalBytes: 77,
      recordsScanned: 4,
      byStore: { cards: { bytes: 77, records: 4 } },
      lastUpdated: "now",
      recordSizes: { cards: { "card-1": 20 } },
    });

    const tracker = await loadTrackerModule();

    await tracker.runFullDbEstimate();

    expect(estimateIndexedDbSize).toHaveBeenCalledWith({ includeRecordSizes: true });
    expect(tracker.getDbEstimateStatus()).toEqual(
      expect.objectContaining({
        totalBytes: 77,
        recordsScanned: 4,
        queueLength: 0,
      }),
    );
  });
});

import type { DeckEntryRecord, DeckSetRecord } from "@/types/decks-db";

const enqueueDbEstimateChange = jest.fn();
const openHqccDb = jest.fn();
const createPair = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

jest.mock("@/lib/pairs-service", () => ({
  createPair: (...args: unknown[]) => createPair(...args),
}));

import { addFrontsToSet, listEntriesForSet, updateEntryCount } from "@/lib/decks-service";

type Request<T> = {
  result: T;
  error?: unknown;
  onsuccess: null | (() => void);
  onerror: null | (() => void);
};

function createRequest<T>(result: T): Request<T> {
  return { result, onsuccess: null, onerror: null };
}

function queueSuccess(request: Request<unknown>) {
  queueMicrotask(() => request.onsuccess?.());
}

class FakeStore<T extends { id: string }> {
  public indexNames: { contains: (name: string) => boolean };
  public transaction: { oncomplete: null | (() => void); onerror: null | (() => void); error?: unknown };

  constructor(
    private records: Map<string, T>,
    private indexes: Array<keyof T & string>,
  ) {
    this.indexNames = {
      contains: (name: string) => this.indexes.includes(name as keyof T & string),
    };
    this.transaction = { oncomplete: null, onerror: null };
  }

  get(id: string) {
    const req = createRequest<T | undefined>(this.records.get(id));
    queueSuccess(req as Request<unknown>);
    return req;
  }

  add(record: T) {
    this.records.set(record.id, record);
    const req = createRequest<void>(undefined);
    queueSuccess(req as Request<unknown>);
    return req;
  }

  put(record: T) {
    this.records.set(record.id, record);
    const req = createRequest<void>(undefined);
    queueSuccess(req as Request<unknown>);
    return req;
  }

  index(indexName: string) {
    return {
      openCursor: (value: unknown) => {
        const entries = Array.from(this.records.values()).filter(
          (record) => (record as Record<string, unknown>)[indexName] === value,
        );
        const req = createRequest<any>(null);
        let position = 0;
        const emit = () => {
          if (position >= entries.length) {
            req.result = null;
            queueSuccess(req as Request<unknown>);
            return;
          }
          req.result = {
            value: entries[position],
            continue: () => {
              position += 1;
              emit();
            },
          };
          queueSuccess(req as Request<unknown>);
        };
        emit();
        return req;
      },
    };
  }
}

function createFixture({
  sets,
  entries,
}: {
  sets: DeckSetRecord[];
  entries: Array<DeckEntryRecord & { count?: number | null }>;
}) {
  const setsMap = new Map(sets.map((set) => [set.id, set]));
  const entriesMap = new Map(entries.map((entry) => [entry.id, entry]));

  const stores = {
    decks: new FakeStore(new Map(), []),
    deckGroups: new FakeStore(new Map(), ["deckId"]),
    deckSets: new FakeStore(setsMap, ["deckId", "groupId", "backFaceId"]),
    deckEntries: new FakeStore(entriesMap, ["deckId", "setId", "pairId"]),
    pairs: new FakeStore(new Map(), ["frontFaceId", "backFaceId"]),
  } as const;

  const db = {
    objectStoreNames: {
      contains: (name: string) => Object.prototype.hasOwnProperty.call(stores, name),
    },
    transaction: (names: string | string[], _mode: IDBTransactionMode) => {
      const requested = Array.isArray(names) ? names : [names];
      const tx = {
        error: undefined as unknown,
        oncomplete: null as null | (() => void),
        onerror: null as null | (() => void),
        objectStore: (name: string) => (stores as Record<string, unknown>)[name] as IDBObjectStore,
      };
      queueMicrotask(() => {
        if (requested.length >= 1) tx.oncomplete?.();
      });
      return tx;
    },
  };

  return { db, stores };
}

describe("decks-service entry count", () => {
  const now = 100;

  beforeEach(() => {
    enqueueDbEstimateChange.mockReset();
    openHqccDb.mockReset();
    createPair.mockReset();
    (globalThis as { IDBKeyRange?: { only: (value: unknown) => unknown } }).IDBKeyRange = {
      only: (value: unknown) => value,
    };
  });

  it("listEntriesForSet defaults missing count to 1", async () => {
    const fixture = createFixture({
      sets: [],
      entries: [
        {
          id: "entry-1",
          deckId: "deck-1",
          setId: "set-1",
          pairId: "pair-1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const entries = await listEntriesForSet("set-1");
    expect(entries[0]?.count).toBe(1);
  });

  it("addFrontsToSet creates entries with count 1", async () => {
    const fixture = createFixture({
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "S",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      entries: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);
    createPair.mockResolvedValue({
      id: "pair-1",
      frontFaceId: "front-1",
      backFaceId: "back-1",
      name: "Pair",
      nameLower: "pair",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    const created = await addFrontsToSet("set-1", ["front-1"]);
    expect(created[0]?.count).toBe(1);
  });

  it("updateEntryCount clamps between 1 and 12", async () => {
    const fixture = createFixture({
      sets: [],
      entries: [
        {
          id: "entry-1",
          deckId: "deck-1",
          setId: "set-1",
          pairId: "pair-1",
          count: 3,
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const nextLow = await updateEntryCount("set-1", "entry-1", 0);
    expect(nextLow?.count).toBe(1);

    const nextHigh = await updateEntryCount("set-1", "entry-1", 99);
    expect(nextHigh?.count).toBe(12);
  });
});

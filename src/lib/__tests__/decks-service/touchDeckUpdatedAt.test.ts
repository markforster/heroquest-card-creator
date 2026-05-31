import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";

const enqueueDbEstimateChange = jest.fn();
const openHqccDb = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async (id: string) => ({
    id,
    title: id,
    name: id,
    templateId: "hero",
    status: "saved",
    face: "back",
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 2,
  })),
}));

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

  delete(id: string) {
    this.records.delete(id);
    const req = createRequest<void>(undefined);
    queueSuccess(req as Request<unknown>);
    return req;
  }

  getAll() {
    const req = createRequest<T[]>(Array.from(this.records.values()));
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

function createFixture(data: {
  decks: DeckRecord[];
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  entries: DeckEntryRecord[];
}) {
  const stores = {
    decks: new FakeStore(new Map(data.decks.map((deck) => [deck.id, deck])), []),
    deckGroups: new FakeStore(new Map(data.groups.map((group) => [group.id, group])), ["deckId"]),
    deckSets: new FakeStore(new Map(data.sets.map((set) => [set.id, set])), ["deckId", "groupId", "backFaceId"]),
    deckEntries: new FakeStore(new Map(data.entries.map((entry) => [entry.id, entry])), ["deckId", "setId", "pairId"]),
    pairs: new FakeStore(new Map(), ["frontFaceId", "backFaceId"]),
  };
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
        onabort: null as null | (() => void),
        objectStoreNames: {
          contains: (name: string) => requested.includes(name),
        },
        objectStore: (name: string) => (stores as Record<string, unknown>)[name] as IDBObjectStore,
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
  };
  return { db, stores };
}

describe("decks-service deck updatedAt touch propagation", () => {
  let nowValue = 1_000;

  beforeEach(() => {
    jest.clearAllMocks();
    nowValue = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => nowValue);
    (globalThis as { IDBKeyRange?: { only: (value: unknown) => unknown } }).IDBKeyRange = {
      only: (value: unknown) => value,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("touches deck updatedAt for group mutations", async () => {
    const fixture = createFixture({
      decks: [
        { id: "deck-1", title: "Deck 1", description: null, keySetId: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      groups: [
        { id: "group-1", deckId: "deck-1", sortIndex: 0, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "group-2", deckId: "deck-1", sortIndex: 1, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      sets: [],
      entries: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);
    const { createGroup, reorderGroups } = await import("@/lib/decks-service");

    await createGroup("deck-1", {});
    const touchedAfterCreate = fixture.stores.decks.get("deck-1").result?.updatedAt;

    nowValue = 2_000;
    await reorderGroups("deck-1", ["group-2", "group-1"]);
    const touchedAfterReorder = fixture.stores.decks.get("deck-1").result?.updatedAt;

    expect(touchedAfterCreate).toBeGreaterThan(1);
    expect(touchedAfterReorder).toBeGreaterThan(touchedAfterCreate ?? 0);
  });

  it("touches deck updatedAt for set mutations", async () => {
    const fixture = createFixture({
      decks: [
        { id: "deck-1", title: "Deck 1", description: null, keySetId: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      groups: [{ id: "group-1", deckId: "deck-1", sortIndex: 0, createdAt: 1, updatedAt: 1, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      entries: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);
    const { createSet, reorderSets } = await import("@/lib/decks-service");

    await createSet("deck-1", "group-1", { backFaceId: "back-2", description: null });
    const touchedAfterCreate = fixture.stores.decks.get("deck-1").result?.updatedAt;

    nowValue = 3_000;
    await reorderSets("deck-1", "group-1", ["set-1"]);
    const touchedAfterReorder = fixture.stores.decks.get("deck-1").result?.updatedAt;

    expect(touchedAfterCreate).toBeGreaterThan(1);
    expect(touchedAfterReorder).toBeGreaterThan(touchedAfterCreate ?? 0);
  });

  it("touches deck updatedAt for entry mutations", async () => {
    const fixture = createFixture({
      decks: [
        { id: "deck-1", title: "Deck 1", description: null, keySetId: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      groups: [{ id: "group-1", deckId: "deck-1", sortIndex: 0, createdAt: 1, updatedAt: 1, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      entries: [
        {
          id: "entry-1",
          deckId: "deck-1",
          setId: "set-1",
          pairId: "pair-1",
          count: 1,
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);
    const { updateEntryCount } = await import("@/lib/decks-service");

    await updateEntryCount("set-1", "entry-1", 3);
    const touched = fixture.stores.decks.get("deck-1").result?.updatedAt;

    expect(touched).toBeGreaterThan(1);
  });
});

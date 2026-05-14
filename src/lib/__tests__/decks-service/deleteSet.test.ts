import type { DeckEntryRecord, DeckGroupRecord, DeckSetRecord } from "@/types/decks-db";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

const openHqccDb = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

import { deleteSet } from "@/lib/decks-service";

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
  public records: Map<string, T>;

  constructor(
    records: Map<string, T>,
    private indexes: Array<keyof T & string>,
  ) {
    this.records = records;
    this.indexNames = {
      contains: (name: string) => this.indexes.includes(name as keyof T & string),
    };
  }

  get(id: string) {
    const req = createRequest<T | undefined>(this.records.get(id));
    queueSuccess(req as Request<unknown>);
    return req;
  }

  delete(id: string) {
    this.records.delete(id);
    const req = createRequest<void>(undefined);
    queueSuccess(req as Request<unknown>);
    return req;
  }

  put(value: T) {
    this.records.set(value.id, value);
    const req = createRequest<void>(undefined);
    queueSuccess(req as Request<unknown>);
    return req;
  }

  add(value: T) {
    this.records.set(value.id, value);
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

function createDbFixture(data: {
  decks?: Array<{ id: string; title: string; description: string | null; keySetId?: string | null; createdAt: number; updatedAt: number; schemaVersion: 1 }>;
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  entries: DeckEntryRecord[];
}) {
  const decks = new Map((data.decks ?? []).map((deck) => [deck.id, deck]));
  const groups = new Map(data.groups.map((group) => [group.id, group]));
  const sets = new Map(data.sets.map((set) => [set.id, set]));
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));

  const stores = {
    decks: new FakeStore(decks, []),
    deckGroups: new FakeStore(groups, ["deckId"]),
    deckSets: new FakeStore(sets, ["deckId", "groupId"]),
    deckEntries: new FakeStore(entries, ["deckId", "setId", "pairId"]),
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
        objectStore: (name: string) => (stores as Record<string, unknown>)[name] as IDBObjectStore,
      };
      queueMicrotask(() => {
        if (requested.length > 1) {
          tx.oncomplete?.();
        }
      });
      return tx;
    },
  };

  return { db, groups, sets, entries };
}

describe("deleteSet", () => {
  const now = 100;

  beforeEach(() => {
    enqueueDbEstimateChange.mockReset();
    openHqccDb.mockReset();
    (globalThis as { IDBKeyRange?: { only: (value: unknown) => unknown } }).IDBKeyRange = {
      only: (value: unknown) => value,
    };
  });

  it("deletes set and entries and removes the parent group when it was the last set", async () => {
    const fixture = createDbFixture({
      groups: [
        { id: "group-1", deckId: "deck-1", title: "G", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 },
      ],
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

    await deleteSet("set-1");

    expect(fixture.sets.has("set-1")).toBe(false);
    expect(fixture.entries.has("entry-1")).toBe(false);
    expect(fixture.groups.has("group-1")).toBe(false);
  });

  it("deletes set and entries but keeps group when other sets remain", async () => {
    const fixture = createDbFixture({
      groups: [
        { id: "group-1", deckId: "deck-1", title: "G", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 },
      ],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "S1",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "set-2",
          deckId: "deck-1",
          groupId: "group-1",
          title: "S2",
          description: null,
          backFaceId: "back-2",
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
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

    await deleteSet("set-1");

    expect(fixture.sets.has("set-1")).toBe(false);
    expect(fixture.entries.has("entry-1")).toBe(false);
    expect(fixture.groups.has("group-1")).toBe(true);
    expect(fixture.sets.has("set-2")).toBe(true);
  });

  it("clears deck keySetId when deleting the key set", async () => {
    const fixture = createDbFixture({
      decks: [
        {
          id: "deck-1",
          title: "Deck",
          description: null,
          keySetId: "set-1",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      groups: [
        { id: "group-1", deckId: "deck-1", title: "G", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 },
      ],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "S1",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "set-2",
          deckId: "deck-1",
          groupId: "group-1",
          title: "S2",
          description: null,
          backFaceId: "back-2",
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      entries: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    await deleteSet("set-1");

    const deck = (fixture.db as any).transaction("decks", "readonly").objectStore("decks").records.get("deck-1");
    expect(deck.keySetId).toBeNull();
  });
});

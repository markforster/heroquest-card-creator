import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

const openHqccDb = jest.fn();
const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
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

  constructor(
    private records: Map<string, T>,
    private indexes: Array<keyof T & string>,
  ) {
    this.indexNames = {
      contains: (name: string) => this.indexes.includes(name as keyof T & string),
    };
  }

  getAll() {
    const req = createRequest(Array.from(this.records.values()));
    queueSuccess(req as Request<unknown>);
    return req;
  }

  delete(id: string) {
    this.records.delete(id);
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
  pairs: PairRecord[];
  decks: DeckRecord[];
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  entries: DeckEntryRecord[];
}) {
  const pairs = new Map(data.pairs.map((pair) => [pair.id, pair]));
  const decks = new Map(data.decks.map((deck) => [deck.id, deck]));
  const groups = new Map(data.groups.map((group) => [group.id, group]));
  const sets = new Map(data.sets.map((set) => [set.id, set]));
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));

  const stores = {
    pairs: new FakeStore(pairs, ["frontFaceId", "backFaceId"]),
    decks: new FakeStore(decks, []),
    deckGroups: new FakeStore(groups, ["deckId"]),
    deckSets: new FakeStore(sets, ["deckId", "groupId"]),
    deckEntries: new FakeStore(entries, ["deckId", "setId", "pairId"]),
  };

  const db = {
    objectStoreNames: {
      contains: (name: string) => Object.prototype.hasOwnProperty.call(stores, name),
    },
    transaction: (names: string | string[]) => {
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

  return { db, pairs, entries };
}

describe("pairs-service deletion cascade", () => {
  const now = 100;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (globalThis as { IDBKeyRange?: { only: (value: unknown) => unknown } }).IDBKeyRange = {
      only: (value: unknown) => value,
    };
  });

  it("throws confirm-required for deletePair when dependent deck entries exist", async () => {
    const fixture = createDbFixture({
      pairs: [
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "pair",
          nameLower: "pair",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      decks: [{ id: "deck-1", title: "Deck", description: null, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      groups: [{ id: "group-1", deckId: "deck-1", title: "Group", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set",
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
          count: 1,
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const { deletePair } = await import("@/lib/pairs-service");

    await expect(
      deletePair("front-1", "back-1", { mode: "confirmable-cascade" }),
    ).rejects.toMatchObject({ code: "PAIR_DELETE_CONFIRM_REQUIRED" });

    expect(fixture.pairs.has("pair-1")).toBe(true);
    expect(fixture.entries.has("entry-1")).toBe(true);
  });

  it("deletes pair and dependent entries after confirm cascade", async () => {
    const fixture = createDbFixture({
      pairs: [
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "pair",
          nameLower: "pair",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      decks: [{ id: "deck-1", title: "Deck", description: null, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      groups: [{ id: "group-1", deckId: "deck-1", title: "Group", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set",
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
          count: 1,
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const { deletePair } = await import("@/lib/pairs-service");
    const result = await deletePair("front-1", "back-1", {
      mode: "confirmable-cascade",
      confirmCascade: true,
    });

    expect(result).toMatchObject({ kind: "executed", deletedPairs: 1, cascadedEntries: 1 });
    expect(fixture.pairs.has("pair-1")).toBe(false);
    expect(fixture.entries.has("entry-1")).toBe(false);
  });

  it("bulk deletePairsForFaces removes all affected pairs and entries", async () => {
    const fixture = createDbFixture({
      pairs: [
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "pair-1",
          nameLower: "pair-1",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "pair-2",
          frontFaceId: "front-2",
          backFaceId: "back-1",
          name: "pair-2",
          nameLower: "pair-2",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      decks: [{ id: "deck-1", title: "Deck", description: null, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      groups: [{ id: "group-1", deckId: "deck-1", title: "Group", sortIndex: 0, createdAt: now, updatedAt: now, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set",
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
          count: 1,
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "entry-2",
          deckId: "deck-1",
          setId: "set-1",
          pairId: "pair-2",
          count: 1,
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const { deletePairsForFaces } = await import("@/lib/pairs-service");

    await expect(
      deletePairsForFaces(["back-1"], { mode: "confirmable-cascade" }),
    ).rejects.toMatchObject({ code: "PAIR_DELETE_CONFIRM_REQUIRED" });

    const result = await deletePairsForFaces(["back-1"], {
      mode: "confirmable-cascade",
      confirmCascade: true,
    });

    expect(result).toMatchObject({ kind: "executed", deletedPairs: 2, cascadedEntries: 2 });
    expect(fixture.pairs.size).toBe(0);
    expect(fixture.entries.size).toBe(0);
  });
});

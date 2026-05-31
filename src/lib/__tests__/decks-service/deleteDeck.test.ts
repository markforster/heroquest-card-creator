import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

const openHqccDb = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

import { deleteDeck } from "@/lib/decks-service";

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
  decks: DeckRecord[];
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  entries: DeckEntryRecord[];
  pairs: PairRecord[];
}) {
  const decks = new Map(data.decks.map((deck) => [deck.id, deck]));
  const groups = new Map(data.groups.map((group) => [group.id, group]));
  const sets = new Map(data.sets.map((set) => [set.id, set]));
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));
  const pairs = new Map(data.pairs.map((pair) => [pair.id, pair]));

  const stores = {
    decks: new FakeStore(decks, []),
    deckGroups: new FakeStore(groups, ["deckId"]),
    deckSets: new FakeStore(sets, ["deckId", "groupId"]),
    deckEntries: new FakeStore(entries, ["deckId", "setId", "pairId"]),
    pairs: new FakeStore(pairs, ["frontFaceId", "backFaceId"]),
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

  return { db, decks, groups, sets, entries, pairs };
}

describe("deleteDeck", () => {
  const now = 100;

  beforeEach(() => {
    enqueueDbEstimateChange.mockReset();
    openHqccDb.mockReset();
    (globalThis as { IDBKeyRange?: { only: (value: unknown) => unknown } }).IDBKeyRange = {
      only: (value: unknown) => value,
    };
  });

  it("deletes deck and all related groups/sets/entries, preserves unrelated deck data and pairs", async () => {
    const fixture = createDbFixture({
      decks: [
        {
          id: "deck-a",
          title: "Deck A",
          description: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "deck-b",
          title: "Deck B",
          description: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      groups: [
        {
          id: "group-a-1",
          deckId: "deck-a",
          title: "A1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "group-b-1",
          deckId: "deck-b",
          title: "B1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      sets: [
        {
          id: "set-a-1",
          deckId: "deck-a",
          groupId: "group-a-1",
          title: "A set",
          description: null,
          backFaceId: "back-a",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "set-b-1",
          deckId: "deck-b",
          groupId: "group-b-1",
          title: "B set",
          description: null,
          backFaceId: "back-b",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      entries: [
        {
          id: "entry-a-1",
          deckId: "deck-a",
          setId: "set-a-1",
          pairId: "pair-a",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "entry-b-1",
          deckId: "deck-b",
          setId: "set-b-1",
          pairId: "pair-b",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      pairs: [
        {
          id: "pair-a",
          name: "Pair A",
          nameLower: "pair a",
          frontFaceId: "front-a",
          backFaceId: "back-a",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
        {
          id: "pair-b",
          name: "Pair B",
          nameLower: "pair b",
          frontFaceId: "front-b",
          backFaceId: "back-b",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    await deleteDeck("deck-a");

    expect(fixture.decks.has("deck-a")).toBe(false);
    expect(fixture.groups.has("group-a-1")).toBe(false);
    expect(fixture.sets.has("set-a-1")).toBe(false);
    expect(fixture.entries.has("entry-a-1")).toBe(false);

    expect(fixture.decks.has("deck-b")).toBe(true);
    expect(fixture.groups.has("group-b-1")).toBe(true);
    expect(fixture.sets.has("set-b-1")).toBe(true);
    expect(fixture.entries.has("entry-b-1")).toBe(true);

    expect(fixture.pairs.has("pair-a")).toBe(true);
    expect(fixture.pairs.has("pair-b")).toBe(true);

    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("decks", "deck-a");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckGroups", "group-a-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckSets", "set-a-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-a-1");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("decks", "deck-b");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckGroups", "group-b-1");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckSets", "set-b-1");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckEntries", "entry-b-1");
  });

  it("is idempotent for missing deck ids and leaves data untouched", async () => {
    const fixture = createDbFixture({
      decks: [
        {
          id: "deck-b",
          title: "Deck B",
          description: null,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      groups: [
        {
          id: "group-b-1",
          deckId: "deck-b",
          title: "B1",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      sets: [
        {
          id: "set-b-1",
          deckId: "deck-b",
          groupId: "group-b-1",
          title: "B set",
          description: null,
          backFaceId: "back-b",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      entries: [
        {
          id: "entry-b-1",
          deckId: "deck-b",
          setId: "set-b-1",
          pairId: "pair-b",
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
      pairs: [
        {
          id: "pair-b",
          name: "Pair B",
          nameLower: "pair b",
          frontFaceId: "front-b",
          backFaceId: "back-b",
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    await expect(deleteDeck("deck-missing")).resolves.toBeUndefined();

    expect(fixture.decks.has("deck-b")).toBe(true);
    expect(fixture.groups.has("group-b-1")).toBe(true);
    expect(fixture.sets.has("set-b-1")).toBe(true);
    expect(fixture.entries.has("entry-b-1")).toBe(true);
    expect(fixture.pairs.has("pair-b")).toBe(true);

    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("decks", "deck-missing");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckGroups", "group-b-1");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckSets", "set-b-1");
    expect(enqueueDbEstimateChange).not.toHaveBeenCalledWith("deckEntries", "entry-b-1");
  });
});

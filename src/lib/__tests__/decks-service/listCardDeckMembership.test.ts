import type { DeckEntryRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";
import type { CardRecord } from "@/types/cards-db";

const openHqccDb = jest.fn();
const getCard = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDb(),
}));

jest.mock("@/lib/cards-db", () => ({
  getCard: (...args: unknown[]) => getCard(...args),
}));

import { listCardDeckMembership } from "@/lib/decks-service";

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

function createDbFixture(data: {
  decks: DeckRecord[];
  sets: DeckSetRecord[];
  entries: DeckEntryRecord[];
  pairs: PairRecord[];
}) {
  const decks = new Map(data.decks.map((deck) => [deck.id, deck]));
  const sets = new Map(data.sets.map((set) => [set.id, set]));
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));
  const pairs = new Map(data.pairs.map((pair) => [pair.id, pair]));

  const stores = {
    decks: new FakeStore(decks, []),
    deckGroups: new FakeStore(new Map(), ["deckId"]),
    deckSets: new FakeStore(sets, ["deckId", "groupId", "backFaceId"]),
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
        if (requested.length >= 1) {
          tx.oncomplete?.();
        }
      });
      return tx;
    },
  };

  return { db };
}

function createSavedCard(overrides: Partial<CardRecord>): CardRecord {
  return {
    id: "card-1",
    templateId: "hero",
    status: "saved",
    name: "Card",
    nameLower: "card",
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
    ...overrides,
  };
}

describe("listCardDeckMembership", () => {
  beforeEach(() => {
    openHqccDb.mockReset();
    getCard.mockReset();
  });

  it("returns empty when card cannot be resolved", async () => {
    getCard.mockResolvedValue(null);
    const result = await listCardDeckMembership("missing");
    expect(result).toEqual([]);
  });

  it("returns empty for non-saved cards", async () => {
    getCard.mockResolvedValue(createSavedCard({ status: "draft" }));
    const result = await listCardDeckMembership("draft-card");
    expect(result).toEqual([]);
  });

  it("resolves deck counts for front cards via pair -> entry -> set -> deck", async () => {
    getCard.mockResolvedValue(createSavedCard({ id: "front-1", templateId: "hero", face: "front" }));
    const fixture = createDbFixture({
      decks: [
        { id: "deck-b", title: "Beta", description: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "deck-a", title: "Alpha", description: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      sets: [
        {
          id: "set-1",
          deckId: "deck-a",
          groupId: "group-1",
          title: "Set A",
          description: null,
          backFaceId: "back-1",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
        {
          id: "set-2",
          deckId: "deck-b",
          groupId: "group-1",
          title: "Set B",
          description: null,
          backFaceId: "back-2",
          sortIndex: 1,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      entries: [
        { id: "entry-1", deckId: "deck-a", setId: "set-1", pairId: "pair-1", sortIndex: 0, count: 2, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "entry-2", deckId: "deck-a", setId: "set-1", pairId: "pair-1", sortIndex: 1, count: 1, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "entry-3", deckId: "deck-b", setId: "set-2", pairId: "pair-2", sortIndex: 0, count: 4, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      pairs: [
        { id: "pair-1", name: "P1", nameLower: "p1", frontFaceId: "front-1", backFaceId: "back-1", createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "pair-2", name: "P2", nameLower: "p2", frontFaceId: "front-1", backFaceId: "back-2", createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const result = await listCardDeckMembership("front-1");

    expect(result).toEqual([
      { deckId: "deck-a", deckTitle: "Alpha", count: 3 },
      { deckId: "deck-b", deckTitle: "Beta", count: 4 },
    ]);
  });

  it("resolves deck counts for back cards via sets + entries", async () => {
    getCard.mockResolvedValue(createSavedCard({ id: "back-9", templateId: "labelled-back", face: "back" }));
    const fixture = createDbFixture({
      decks: [
        { id: "deck-1", title: "Quest Deck", description: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "deck-2", title: "Arena Deck", description: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set",
          description: null,
          backFaceId: "back-9",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
        {
          id: "set-2",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set 2",
          description: null,
          backFaceId: "back-9",
          sortIndex: 1,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
        {
          id: "set-3",
          deckId: "deck-2",
          groupId: "group-2",
          title: "Set 3",
          description: null,
          backFaceId: "back-9",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      entries: [
        { id: "entry-1", deckId: "deck-1", setId: "set-1", pairId: "pair-1", sortIndex: 0, count: 2, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "entry-2", deckId: "deck-1", setId: "set-2", pairId: "pair-2", sortIndex: 1, count: 1, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
        { id: "entry-3", deckId: "deck-2", setId: "set-3", pairId: "pair-3", sortIndex: 0, count: 3, createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
      pairs: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const result = await listCardDeckMembership("back-9");
    expect(result).toEqual([
      { deckId: "deck-2", deckTitle: "Arena Deck", count: 3 },
      { deckId: "deck-1", deckTitle: "Quest Deck", count: 3 },
    ]);
  });

  it("returns zero count for back cards with matching sets but no entries", async () => {
    getCard.mockResolvedValue(createSavedCard({ id: "back-zero", templateId: "labelled-back", face: "back" }));
    const fixture = createDbFixture({
      decks: [{ id: "deck-1", title: "Quest Deck", description: null, createdAt: 1, updatedAt: 1, schemaVersion: 1 }],
      sets: [
        {
          id: "set-1",
          deckId: "deck-1",
          groupId: "group-1",
          title: "Set",
          description: null,
          backFaceId: "back-zero",
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      entries: [],
      pairs: [],
    });
    openHqccDb.mockResolvedValue(fixture.db);

    const result = await listCardDeckMembership("back-zero");
    expect(result).toEqual([{ deckId: "deck-1", deckTitle: "Quest Deck", count: 0 }]);
  });

  it("returns empty for soft-deleted cards", async () => {
    getCard.mockResolvedValue(createSavedCard({ id: "front-3", deletedAt: 12 }));
    const result = await listCardDeckMembership("front-3");
    expect(result).toEqual([]);
  });
});

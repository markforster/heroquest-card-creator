import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";

const deletePairsForFaces = jest.fn();
deletePairsForFaces.mockResolvedValue({
  kind: "no-impact" as const,
  report: {
    frontFaceId: "__bulk__",
    backFaceId: "__bulk__",
    mode: "confirmable-cascade" as const,
    cascadePlan: { pairIds: [], entryIds: [], usage: [] },
  },
});

jest.mock("@/lib/pairs-service", () => ({
  deletePairsForFaces: (...args: unknown[]) => deletePairsForFaces(...args),
  previewDeletePairsForFaces: jest.fn(async () => ({
    frontFaceId: "__bulk__",
    backFaceId: "__bulk__",
    mode: "confirmable-cascade" as const,
    cascadePlan: { pairIds: [], entryIds: [], usage: [] },
  })),
}));

const openHqccDbMock = jest.fn();

jest.mock("@/lib/hqcc-db", () => ({
  openHqccDb: () => openHqccDbMock(),
}));

type FakeTx = {
  oncomplete: null | (() => void);
  onerror: null | (() => void);
  onabort: null | (() => void);
  error?: Error;
};

function createRequest<T>(result: T) {
  return {
    result,
    error: undefined as unknown,
    onsuccess: null as null | (() => void),
    onerror: null as null | (() => void),
  };
}

function queueSuccess(request: { onsuccess: null | (() => void) }) {
  setTimeout(() => request.onsuccess?.(), 0);
}

function createStore<T extends { id: string }>(records: Map<string, T>, tx: FakeTx) {
  return {
    transaction: tx,
    getAll: jest.fn(() => {
      const req = createRequest(Array.from(records.values()));
      queueSuccess(req);
      return req;
    }),
    delete: jest.fn((id: string) => {
      const req = createRequest(undefined);
      records.delete(id);
      queueSuccess(req);
      setTimeout(() => tx.oncomplete?.(), 0);
      return req;
    }),
  };
}

type Fixture = {
  cards: Map<string, CardRecord>;
  decks: Map<string, DeckRecord>;
  deckGroups: Map<string, DeckGroupRecord>;
  deckSets: Map<string, DeckSetRecord>;
  deckEntries: Map<string, DeckEntryRecord>;
};

function installDbFixture(fixture: Fixture) {
  openHqccDbMock.mockImplementation(async () => {
    const objectStoreNames = new Set(["cards", "decks", "deckGroups", "deckSets", "deckEntries"]);

    return {
      objectStoreNames: {
        contains: (name: string) => objectStoreNames.has(name),
      },
      transaction: (storeNames: string | string[]) => {
        const tx: FakeTx & {
          objectStore: (name: string) => ReturnType<typeof createStore>;
          objectStoreNames: { contains: (name: string) => boolean };
        } = {
          oncomplete: null,
          onerror: null,
          onabort: null,
          error: undefined,
          objectStore: () => {
            throw new Error("not initialized");
          },
          objectStoreNames: { contains: () => false },
        };
        const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
        tx.objectStore = (name: string) => {
          if (!stores.includes(name)) {
            throw new Error(`Store ${name} not part of transaction`);
          }
          if (name === "cards") return createStore(fixture.cards, tx);
          if (name === "decks") return createStore(fixture.decks, tx);
          if (name === "deckGroups") return createStore(fixture.deckGroups, tx);
          if (name === "deckSets") return createStore(fixture.deckSets, tx);
          if (name === "deckEntries") return createStore(fixture.deckEntries, tx);
          throw new Error(`Unknown store ${name}`);
        };
        tx.objectStoreNames = {
          contains: (name: string) => stores.includes(name),
        };
        return tx;
      },
    };
  });
}

describe("deleteCardsWithCascade deck group cleanup", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("removes dependent set and entries, removes now-empty group, and keeps deck", async () => {
    const fixture: Fixture = {
      cards: new Map([
        [
          "back-1",
          {
            id: "back-1",
            templateId: "hero",
            status: "saved",
            name: "Back One",
            nameLower: "back one",
            createdAt: 1,
            updatedAt: 1,
            face: "back",
            schemaVersion: 2,
          },
        ],
      ]),
      decks: new Map([
        [
          "deck-1",
          {
            id: "deck-1",
            title: "Hard Delete",
            description: null,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckGroups: new Map([
        [
          "group-1",
          {
            id: "group-1",
            deckId: "deck-1",
            title: "New Group",
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckSets: new Map([
        [
          "set-1",
          {
            id: "set-1",
            deckId: "deck-1",
            groupId: "group-1",
            title: "New Set",
            description: null,
            backFaceId: "back-1",
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckEntries: new Map([
        [
          "entry-1",
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
      ]),
    };

    installDbFixture(fixture);
    const { deleteCardsWithCascade: runDelete } = await import("@/lib/cards-db");
    await runDelete(["back-1"], { mode: "confirmable-cascade", confirmCascade: true });

    expect(fixture.cards.has("back-1")).toBe(false);
    expect(fixture.deckSets.has("set-1")).toBe(false);
    expect(fixture.deckEntries.has("entry-1")).toBe(false);
    expect(fixture.deckGroups.has("group-1")).toBe(false);
    expect(fixture.decks.has("deck-1")).toBe(true);
  });

  it("keeps the group when another set remains in that group", async () => {
    const fixture: Fixture = {
      cards: new Map([
        [
          "back-1",
          {
            id: "back-1",
            templateId: "hero",
            status: "saved",
            name: "Back One",
            nameLower: "back one",
            createdAt: 1,
            updatedAt: 1,
            face: "back",
            schemaVersion: 2,
          },
        ],
      ]),
      decks: new Map([
        [
          "deck-1",
          {
            id: "deck-1",
            title: "Hard Delete",
            description: null,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckGroups: new Map([
        [
          "group-1",
          {
            id: "group-1",
            deckId: "deck-1",
            title: "New Group",
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckSets: new Map([
        [
          "set-1",
          {
            id: "set-1",
            deckId: "deck-1",
            groupId: "group-1",
            title: "New Set",
            description: null,
            backFaceId: "back-1",
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
        [
          "set-2",
          {
            id: "set-2",
            deckId: "deck-1",
            groupId: "group-1",
            title: "Second Set",
            description: null,
            backFaceId: "back-2",
            sortIndex: 1,
            createdAt: 1,
            updatedAt: 1,
            schemaVersion: 1,
          },
        ],
      ]),
      deckEntries: new Map([
        [
          "entry-1",
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
      ]),
    };

    installDbFixture(fixture);
    const { deleteCardsWithCascade: runDelete } = await import("@/lib/cards-db");
    await runDelete(["back-1"], { mode: "confirmable-cascade", confirmCascade: true });

    expect(fixture.cards.has("back-1")).toBe(false);
    expect(fixture.deckSets.has("set-1")).toBe(false);
    expect(fixture.deckEntries.has("entry-1")).toBe(false);
    expect(fixture.deckGroups.has("group-1")).toBe(true);
    expect(fixture.deckSets.has("set-2")).toBe(true);
    expect(fixture.decks.has("deck-1")).toBe(true);
  });
});

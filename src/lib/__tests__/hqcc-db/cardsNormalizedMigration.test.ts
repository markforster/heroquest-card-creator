import Dexie from "dexie";
import { IDBDatabase, IDBFactory, IDBKeyRange } from "fake-indexeddb";

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getCard } from "@/lib/cards-db";

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
const originalIdbKeyRangeDescriptor = Object.getOwnPropertyDescriptor(window, "IDBKeyRange");

function installFakeIndexedDb(): void {
  const indexedDb = new IDBFactory();

  Object.defineProperty(window, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(window, "IDBKeyRange", { configurable: true, value: IDBKeyRange });
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(globalThis, "IDBKeyRange", { configurable: true, value: IDBKeyRange });

  Dexie.dependencies.indexedDB = indexedDb;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

function restoreIndexedDb(): void {
  if (originalIndexedDbDescriptor) {
    Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).indexedDB;
  }

  if (originalIdbKeyRangeDescriptor) {
    Object.defineProperty(window, "IDBKeyRange", originalIdbKeyRangeDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).IDBKeyRange;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).indexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IDBKeyRange;
}

async function deleteDb(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${name}`));
    request.onblocked = () => reject(new Error(`Failed to delete ${name}: blocked`));
  });
}

async function seedLegacyDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.open("hqcc", 6);

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;

      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("assets")) {
        const assetsStore = db.createObjectStore("assets", { keyPath: "id" });
        assetsStore.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("collections")) {
        db.createObjectStore("collections", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("decks")) {
        db.createObjectStore("decks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("deckGroups")) {
        const groupsStore = db.createObjectStore("deckGroups", { keyPath: "id" });
        groupsStore.createIndex("deckId", "deckId", { unique: false });
      }
      if (!db.objectStoreNames.contains("deckSets")) {
        const setsStore = db.createObjectStore("deckSets", { keyPath: "id" });
        setsStore.createIndex("deckId", "deckId", { unique: false });
        setsStore.createIndex("groupId", "groupId", { unique: false });
        setsStore.createIndex("backFaceId", "backFaceId", { unique: false });
      }
      if (!db.objectStoreNames.contains("deckEntries")) {
        const entriesStore = db.createObjectStore("deckEntries", { keyPath: "id" });
        entriesStore.createIndex("deckId", "deckId", { unique: false });
        entriesStore.createIndex("setId", "setId", { unique: false });
        entriesStore.createIndex("pairId", "pairId", { unique: false });
      }
      if (!db.objectStoreNames.contains("pairs")) {
        const pairsStore = db.createObjectStore("pairs", { keyPath: "id" });
        pairsStore.createIndex("frontFaceId", "frontFaceId", { unique: false });
        pairsStore.createIndex("backFaceId", "backFaceId", { unique: false });
        pairsStore.createIndex("nameLower", "nameLower", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "id" });
      }

      tx.objectStore("cards").put({
        id: "monster-1",
        templateId: "monster",
        status: "saved",
        name: "Goblin",
        nameLower: "goblin",
        createdAt: 10,
        updatedAt: 20,
        schemaVersion: 2,
        title: "Goblin",
        description: "A sneaky foe",
        bodyTextColor: "#111111",
        bodyTextFitToBounds: true,
        copyright: "HQ",
        copyrightColor: "#222222",
        showCopyright: true,
        imageAssetId: "asset-main",
        imageAssetName: "Goblin Art",
        imageScale: 1.2,
        imageScaleMode: "relative",
        backgroundTint: "#eeeeee",
        heroAttackDice: 0,
        monsterMovementSquares: 8,
        monsterAttackDice: 2,
        monsterDefendDice: 1,
        monsterBodyPoints: 1,
        monsterMindPoints: 1,
        monsterIconAssetId: "asset-icon",
        monsterIconAssetName: "Goblin Icon",
        thumbnailBlob: new Blob(["thumb"], { type: "image/png" }),
      });
    };

    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to seed legacy DB"));
  });
}

describe("cards normalized migration", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("creates normalized rows for legacy cards without changing current card reads", async () => {
    await seedLegacyDb();

    const db = await openHqccDexieDb();

    expect(db.backendDB()?.version).toBe(10);
    expect(Array.from(db.backendDB()?.objectStoreNames ?? [])).not.toContain("cards");

    const baseRecord = await db.cardsBase.get("monster-1");
    expect(baseRecord).toEqual(
      expect.objectContaining({
        id: "monster-1",
        templateId: "monster",
        systemFamily: "hq.2021",
        status: "saved",
        name: "Goblin",
        nameLower: "goblin",
        schemaVersion: 1,
      }),
    );

    const slotLinks = await db.cardSlotLinks.where("cardId").equals("monster-1").sortBy("order");
    expect(slotLinks.map((entry) => entry.slotId)).toEqual([
      "hq.2021.background.base",
      "hq.2021.image.main",
      "hq.2021.title.main",
      "hq.2021.text.copyright",
      "hq.2021.text.body",
      "hq.2021.stats.monster.primary",
      "hq.2021.icon.monster.primary",
    ]);

    expect(await db.cardBackgroundComponents.get("monster-1:hq.2021.background.base")).toEqual(
      expect.objectContaining({
        tint: "#eeeeee",
      }),
    );
    expect(await db.cardTitleComponents.get("monster-1:hq.2021.title.main")).toEqual(
      expect.objectContaining({
        title: "Goblin",
      }),
    );
    expect(await db.cardTextComponents.get("monster-1:hq.2021.text.body")).toEqual(
      expect.objectContaining({
        text: "A sneaky foe",
        textColor: "#111111",
        fitToBounds: true,
      }),
    );
    expect(await db.cardImageComponents.get("monster-1:hq.2021.image.main")).toEqual(
      expect.objectContaining({
        assetId: "asset-main",
        assetName: "Goblin Art",
        scale: 1.2,
        scaleMode: "relative",
      }),
    );
    expect(await db.cardMonsterStatsComponents.get("monster-1:hq.2021.stats.monster.primary")).toEqual(
      expect.objectContaining({
        movementSquares: 8,
        attackDice: 2,
        defendDice: 1,
        bodyPoints: 1,
        mindPoints: 1,
      }),
    );
    expect(await db.cardIconComponents.get("monster-1:hq.2021.icon.monster.primary")).toEqual(
      expect.objectContaining({
        assetId: "asset-icon",
        assetName: "Goblin Icon",
      }),
    );
    const thumbnailRecord = await db.cardThumbnails.get("monster-1");
    expect(thumbnailRecord?.id).toBe("monster-1");
    expect(thumbnailRecord?.cardId).toBe("monster-1");
    expect(thumbnailRecord).toBeDefined();

    await expect(getCard("monster-1")).resolves.toEqual(
      expect.objectContaining({
        id: "monster-1",
        templateId: "monster",
        name: "Goblin",
        description: "A sneaky foe",
        monsterIconAssetId: "asset-icon",
        thumbnailBlob: expect.objectContaining({ type: "image/png" }),
      }),
    );
  });
});

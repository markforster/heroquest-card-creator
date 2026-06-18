import { createCard, getCard, getCardThumbnail } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("createCard", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("creates a card with timestamps, schemaVersion, and nameLower", async () => {
    jest.spyOn(Date, "now").mockReturnValue(100);
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => "card-1" },
    });

    const created = await createCard({
      templateId: "hero",
      status: "saved",
      name: "My HERO",
      title: "Title",
    });

    expect(created).toEqual({
      templateId: "hero",
      status: "saved",
      name: "My HERO",
      title: "Title",
      id: "card-1",
      createdAt: 100,
      updatedAt: 100,
      nameLower: "my hero",
      schemaVersion: 2,
    });
    await expect(getCard("card-1")).resolves.toEqual(expect.objectContaining(created));
    const db = await openHqccDexieDb();
    await expect(db.cardsBase.get("card-1")).resolves.toEqual(
      expect.objectContaining({
        id: "card-1",
        templateId: "hero",
        name: "My HERO",
        nameLower: "my hero",
      }),
    );
    await expect(db.cardTitleComponents.get("card-1:hq.2021.title.main")).resolves.toEqual(
      expect.objectContaining({
        title: "Title",
      }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "card-1");

    if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  });

  it("normalizes the thumbnail blob type before persisting", async () => {
    const blob = new Blob(["x"]);
    const created = await createCard({
      templateId: "hero",
      status: "saved",
      name: "Blob Card",
      thumbnailBlob: blob,
    });

    const stored = await getCard(created.id);
    const thumbnail = await getCardThumbnail(created.id);
    expect(stored?.thumbnailBlob?.type).toBe("image/png");
    expect(thumbnail?.type).toBe("image/png");
    const db = await openHqccDexieDb();
    const thumbnailRecord = await db.cardThumbnails.get(created.id);
    expect(thumbnailRecord?.cardId).toBe(created.id);
    expect(thumbnailRecord).toBeDefined();
  });

  it("persists bodyTextFitToBounds when provided", async () => {
    const created = await createCard({
      templateId: "hero",
      status: "saved",
      name: "Fit Card",
      bodyTextFitToBounds: true,
    });

    expect(created.bodyTextFitToBounds).toBe(true);
  });

  it("creates normalized rows for monster-specific icon and stats data", async () => {
    const created = await createCard({
      templateId: "monster",
      status: "saved",
      name: "Goblin",
      title: "Goblin",
      monsterIconAssetId: "icon-1",
      monsterAttackDice: [2, 0, 0],
    });

    const db = await openHqccDexieDb();
    await expect(db.cardIconComponents.get(`${created.id}:hq.2021.icon.monster.primary`)).resolves.toEqual(
      expect.objectContaining({
        assetId: "icon-1",
      }),
    );
    await expect(
      db.cardMonsterStatsComponents.get(`${created.id}:hq.2021.stats.monster.primary`),
    ).resolves.toEqual(
      expect.objectContaining({
        attackDice: [2, 0, 0],
      }),
    );
  });

  it("rolls back the legacy create when normalized persistence fails", async () => {
    const db = await openHqccDexieDb();
    const baseCountBefore = await db.cardsBase.count();
    const thumbCountBefore = await db.cardThumbnails.count();
    const hook = () => {
      throw new Error("normalized create failed");
    };
    db.cardTitleComponents.hook("creating", hook);

    await expect(
      createCard({
        templateId: "hero",
        status: "saved",
        name: "Broken Card",
        title: "Broken",
      }),
    ).rejects.toThrow("normalized create failed");

    await expect(db.cardsBase.count()).resolves.toBe(baseCountBefore);
    await expect(db.cardThumbnails.count()).resolves.toBe(thumbCountBefore);
    db.cardTitleComponents.hook("creating").unsubscribe(hook);
  });
});

import {
  getHqccDexieDb,
  META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";
import { migrateCardCanvas } from "@/lib/hqcc-db-card-canvas-job";
import {
  TEST_NOW,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

describe("migrateCardCanvas", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("scales saved image and icon offsets down to 750x1050 space", async () => {
    const db = await openHqccDexieDb();

    await db.cardImageComponents.put({
      id: "card-1:image",
      cardId: "card-1",
      slotId: "hq.2021.image.main",
      order: 0,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      schemaVersion: 1,
      offsetX: 7.56,
      offsetY: 10.56,
    });
    await db.cardIconComponents.put({
      id: "card-1:icon",
      cardId: "card-1",
      slotId: "hq.2021.icon.monster.primary",
      order: 0,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      schemaVersion: 1,
      offsetX: -15.12,
      offsetY: -21.12,
    });

    jest.spyOn(Date, "now").mockReturnValue(TEST_NOW + 1);

    await migrateCardCanvas(db);

    await expect(db.cardImageComponents.get("card-1:image")).resolves.toEqual(
      expect.objectContaining({
        offsetX: 7.5,
        offsetY: 10.5,
        updatedAt: TEST_NOW + 1,
      }),
    );
    await expect(db.cardIconComponents.get("card-1:icon")).resolves.toEqual(
      expect.objectContaining({
        offsetX: -15,
        offsetY: -21,
        updatedAt: TEST_NOW + 1,
      }),
    );
    await expect(db.meta.get(META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY)).resolves.toEqual(
      expect.objectContaining({
        id: META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY,
        value: true,
      }),
    );
  });

  it("runs only once after the rollback meta flag is set", async () => {
    const db = await openHqccDexieDb();

    await db.cardImageComponents.put({
      id: "card-1:image",
      cardId: "card-1",
      slotId: "hq.2021.image.main",
      order: 0,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      schemaVersion: 1,
      offsetX: 7.56,
      offsetY: 10.56,
    });

    jest.spyOn(Date, "now").mockReturnValue(TEST_NOW + 1);
    await migrateCardCanvas(db);
    const first = await db.cardImageComponents.get("card-1:image");

    jest.spyOn(Date, "now").mockReturnValue(TEST_NOW + 2);
    await migrateCardCanvas(db);

    await expect(db.cardImageComponents.get("card-1:image")).resolves.toEqual(first);
  });
});

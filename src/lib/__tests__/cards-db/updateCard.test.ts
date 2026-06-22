import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { getCard, updateCard } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";
import { seedNormalizedCard, seedNormalizedThumbnail } from "@/lib/test-support/normalized-card-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("updateCard", () => {
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

  it("returns null when the card does not exist", async () => {
    await expect(updateCard("missing", { title: "New" })).resolves.toBeNull();
  });

  it("updates an existing card and bumps updatedAt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const db = await openHqccDexieDb();
    await seedNormalizedCard(
      createCardRecord({ id: "c1", createdAt: 100, updatedAt: 100, name: "Old Name", nameLower: "old name" }),
    );

    const next = await updateCard("c1", { title: "New title" });

    expect(next).toEqual(
      expect.objectContaining({
        ...createCardRecord({ id: "c1", createdAt: 100, updatedAt: 100, name: "Old Name", nameLower: "old name" }),
        title: "New title",
        updatedAt: 200,
      }),
    );
    await expect(db.cardsBase.get("c1")).resolves.toEqual(
      expect.objectContaining({ updatedAt: 200 }),
    );
    await expect(db.cardTitleComponents.get("c1:hq.2021.title.main")).resolves.toEqual(
      expect.objectContaining({ title: "New title" }),
    );
    await expect(getCard("c1")).resolves.toEqual(expect.objectContaining({ title: "New title" }));
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("cards", "c1");
  });

  it("recomputes nameLower when patch.name is provided", async () => {
    await seedNormalizedCard(createCardRecord({ id: "c1", name: "Old Name", nameLower: "old name" }));

    const next = await updateCard("c1", { name: "NEW NAME" });
    expect(next?.nameLower).toBe("new name");
  });

  it("updates bodyTextFitToBounds when toggled", async () => {
    await seedNormalizedCard(createCardRecord({ id: "c1", bodyTextFitToBounds: false }));

    const next = await updateCard("c1", { bodyTextFitToBounds: true });
    expect(next?.bodyTextFitToBounds).toBe(true);
    const mapped = cardRecordToCardData((await getCard("c1")) as never);
    expect(mapped.bodyTextFitToBounds).toBe(true);
  });

  it("updates normalized thumbnails without using the legacy cards row", async () => {
    await seedNormalizedCard(createCardRecord({ id: "c1" }));
    await seedNormalizedThumbnail({
      cardId: "c1",
      thumbnailBlob: new Blob(["x"]),
      createdAt: 100,
      updatedAt: 100,
    });

    const next = await updateCard("c1", { thumbnailBlob: new Blob(["y"]) });
    expect(next?.thumbnailBlob?.type).toBe("image/png");

    const db = await openHqccDexieDb();
    const thumbnailRecord = await db.cardThumbnails.get("c1");
    expect(thumbnailRecord?.cardId).toBe("c1");
    expect(thumbnailRecord).toBeDefined();
  });

  it("rolls back the legacy update when normalized persistence fails", async () => {
    const db = await openHqccDexieDb();
    await seedNormalizedCard(createCardRecord({ id: "c1", title: "Before" }));
    const hook = () => {
      throw new Error("normalized update failed");
    };
    db.cardTitleComponents.hook("creating", hook);

    await expect(updateCard("c1", { title: "After" })).rejects.toThrow("normalized update failed");

    await expect(db.cardTitleComponents.get("c1:hq.2021.title.main")).resolves.toEqual(
      expect.objectContaining({ title: "Before" }),
    );
    db.cardTitleComponents.hook("creating").unsubscribe(hook);
  });
});

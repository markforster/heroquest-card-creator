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
    await expect(getCard("card-1")).resolves.toEqual(created);
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
});

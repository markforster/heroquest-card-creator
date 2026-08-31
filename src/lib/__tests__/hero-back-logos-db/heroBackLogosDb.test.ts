const enqueueDbEstimateChange = jest.fn();
const BrowserBlob = globalThis.Blob;

jest.mock("@/lib/db/maintenance/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { Blob as NodeBlob } from "buffer";

import {
  addHeroBackLogo,
  deleteHeroBackLogo,
  getHeroBackLogoBlob,
  getHeroBackLogoObjectUrl,
  getHeroBackLogoUsage,
  listHeroBackLogos,
} from "@/lib/data/hero-back-logos-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/db/hqcc-dexie";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "../settings-db/test-helpers";

describe("hero back logo data service", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    Object.defineProperty(globalThis, "Blob", { configurable: true, value: NodeBlob });
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    Object.defineProperty(globalThis, "Blob", { configurable: true, value: BrowserBlob });
    jest.restoreAllMocks();
  });

  it("adds and reads logo metadata, blobs, and object URLs", async () => {
    const blob = new Blob(["logo"], { type: "image/png" });
    jest.spyOn(Date, "now").mockReturnValue(100);
    const createObjectURL = jest.fn(() => "blob:logo");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });

    await addHeroBackLogo("logo-1", blob, {
      name: "Logo",
      mimeType: "image/png",
      width: 100,
      height: 80,
    });

    await expect(listHeroBackLogos()).resolves.toEqual([
      {
        id: "logo-1",
        name: "Logo",
        mimeType: "image/png",
        width: 100,
        height: 80,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
    await expect(getHeroBackLogoBlob("logo-1")).resolves.not.toBeNull();
    await expect(getHeroBackLogoObjectUrl("logo-1")).resolves.toBe("blob:logo");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("heroBackLogos", "logo-1");
  });

  it("reports usage and remediates dependent cards before deletion", async () => {
    const db = await openHqccDexieDb();
    await db.heroBackLogos.put({
      id: "logo-1",
      name: "Logo",
      mimeType: "image/png",
      width: 100,
      height: 80,
      createdAt: 1,
      updatedAt: 1,
    });
    await db.cardsBase.put({
      id: "card-1",
      templateId: "hero",
      systemFamily: "hq.2021",
      status: "saved",
      name: "Hero",
      nameLower: "hero",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    } as never);
    await db.cardHeroBackLogoComponents.put({
      id: "card-1:hero-back-logo",
      cardId: "card-1",
      slotId: "hq.2021.hero-back.logo",
      order: 0,
      mode: "custom",
      logoId: "logo-1",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    } as never);

    await expect(getHeroBackLogoUsage("logo-1")).resolves.toEqual([
      { cardId: "card-1", name: "Hero", logoMode: "custom" },
    ]);
    await expect(deleteHeroBackLogo("logo-1", { mode: "default" })).resolves.toEqual(["card-1"]);
    await expect(db.heroBackLogos.get("logo-1")).resolves.toBeUndefined();
    const remediated = await db.cardHeroBackLogoComponents.get("card-1:hero-back-logo");
    expect(remediated).toEqual(expect.objectContaining({ mode: "default" }));
    expect(remediated).not.toHaveProperty("logoId");
  });
});

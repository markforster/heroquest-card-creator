import { getAssetObjectUrl } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getAssetObjectUrl", () => {
  const originalCreateDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");

  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if the DB module was not opened.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    if (originalCreateDescriptor) {
      Object.defineProperty(URL, "createObjectURL", originalCreateDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).createObjectURL;
    }
    jest.resetModules();
  });

  it("returns null when the asset is missing", async () => {
    await expect(getAssetObjectUrl("missing")).resolves.toBeNull();
  });

  it("returns null when the asset has no blob", async () => {
    const db = await openHqccDexieDb();
    await db.table("assets").put({
      id: "a1",
      name: "a",
      mimeType: "x",
      width: 1,
      height: 1,
      createdAt: 1,
    });

    await expect(getAssetObjectUrl("a1")).resolves.toBeNull();
  });

  it("returns a blob URL when the asset has a blob", async () => {
    const createSpy = jest.fn(() => "blob:asset");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createSpy });

    const blob = createTestBlob();
    const db = await openHqccDexieDb();
    await db.table("assets").put({
      id: "a1",
      name: "a",
      mimeType: "image/png",
      width: 1,
      height: 1,
      createdAt: 1,
      blob,
    });

    await expect(getAssetObjectUrl("a1")).resolves.toBe("blob:asset");
    expect(createSpy).toHaveBeenCalledWith(expect.any(Object));
  });
});

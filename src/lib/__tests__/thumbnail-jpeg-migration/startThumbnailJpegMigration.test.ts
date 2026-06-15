import { Blob as NodeBlob } from "buffer";

const openHqccDexieDb = jest.fn();

jest.mock("@/lib/hqcc-dexie", () => ({
  openHqccDexieDb: () => openHqccDexieDb(),
}));

import {
  getThumbnailJpegMigrationStatus,
  startThumbnailJpegMigration,
} from "@/lib/thumbnail-jpeg-migration";
import { createSavedCardRecord } from "@/lib/test-support/decks-service-test-helpers";

const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalOffscreenCanvas = globalThis.OffscreenCanvas;
const originalRequestIdleCallback = globalThis.requestIdleCallback;
const originalDispatchEvent = window.dispatchEvent;
const originalBlob = globalThis.Blob;

type BitmapLike = {
  width: number;
  height: number;
  close: jest.Mock;
};

type FakeCardRecord = ReturnType<typeof createSavedCardRecord>;

function createPngBlob(size: number): Blob {
  return new NodeBlob([new Uint8Array(size)], { type: "image/png" }) as unknown as Blob;
}

function createJpegBlob(size: number): Blob {
  return new NodeBlob([new Uint8Array(size)], { type: "image/jpeg" }) as unknown as Blob;
}

function createFakeDb(records: FakeCardRecord[]) {
  const state = new Map(records.map((record) => [record.id, { ...record }]));

  return {
    cards: {
      toArray: jest.fn(async () => Array.from(state.values()).map((record) => ({ ...record }))),
      get: jest.fn(async (id: string) => {
        const record = state.get(id);
        return record ? { ...record } : undefined;
      }),
      put: jest.fn(async (record: FakeCardRecord) => {
        state.set(record.id, { ...record });
        return record.id;
      }),
      delete: jest.fn(async (id: string) => {
        state.delete(id);
      }),
    },
  };
}

describe("startThumbnailJpegMigration", () => {
  let convertedBlob: Blob | null;
  let createImageBitmapMock: jest.MockedFunction<(blob: Blob) => Promise<BitmapLike>>;
  let dispatchEventSpy: jest.SpyInstance<boolean, [Event]>;

  beforeEach(() => {
    window.localStorage.clear();
    globalThis.Blob = NodeBlob as unknown as typeof Blob;
    convertedBlob = createJpegBlob(10);
    openHqccDexieDb.mockReset();
    createImageBitmapMock = jest.fn(async (_blob: Blob) => ({
      width: 20,
      height: 10,
      close: jest.fn(),
    }));
    globalThis.createImageBitmap = createImageBitmapMock as typeof createImageBitmap;
    globalThis.OffscreenCanvas = class {
      width: number;
      height: number;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      getContext() {
        return {
          drawImage: jest.fn(),
        };
      }

      async convertToBlob() {
        return convertedBlob;
      }
    } as unknown as typeof OffscreenCanvas;
    globalThis.requestIdleCallback = ((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline);
      return 1;
    }) as typeof requestIdleCallback;
    dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();

    if (typeof originalCreateImageBitmap === "function") {
      globalThis.createImageBitmap = originalCreateImageBitmap;
    } else {
      delete (globalThis as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap;
    }

    if (typeof originalOffscreenCanvas !== "undefined") {
      globalThis.OffscreenCanvas = originalOffscreenCanvas;
    } else {
      delete (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas;
    }

    if (typeof originalRequestIdleCallback === "function") {
      globalThis.requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (globalThis as { requestIdleCallback?: typeof requestIdleCallback })
        .requestIdleCallback;
    }

    globalThis.Blob = originalBlob;
    window.dispatchEvent = originalDispatchEvent;
  });

  it("marks a fresh empty DB as done without error", async () => {
    openHqccDexieDb.mockResolvedValue(createFakeDb([]));

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        state: "done",
        total: 0,
        converted: 0,
        skipped: 0,
      }),
    );
    expect(window.localStorage.getItem("hqcc.migrations.thumbnailJpeg.v1")).toBe("done");
    expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "hqcc-cards-updated" }));
  });

  it("exits early when already marked done and no PNG thumbnails remain", async () => {
    window.localStorage.setItem("hqcc.migrations.thumbnailJpeg.v1", "done");
    openHqccDexieDb.mockResolvedValue(
      createFakeDb([
        createSavedCardRecord({
          id: "card-1",
          thumbnailBlob: createJpegBlob(12),
        }),
      ]),
    );

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        state: "done",
        converted: 0,
      }),
    );
    expect(createImageBitmapMock).not.toHaveBeenCalled();
    expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "hqcc-cards-updated" }));
  });

  it("reruns when the done flag exists but PNG thumbnails still remain", async () => {
    window.localStorage.setItem("hqcc.migrations.thumbnailJpeg.v1", "done");
    const db = createFakeDb([
      createSavedCardRecord({
        id: "card-1",
        thumbnailBlob: createPngBlob(30),
      }),
    ]);
    openHqccDexieDb.mockResolvedValue(db);

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(db.cards.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "card-1",
        thumbnailBlob: convertedBlob,
      }),
    );
    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        state: "done",
        total: 1,
        processed: 1,
        converted: 1,
        skipped: 0,
      }),
    );
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "hqcc-cards-updated" }));
  });

  it("skips cards when the converted blob is not smaller", async () => {
    convertedBlob = createJpegBlob(40);
    const db = createFakeDb([
      createSavedCardRecord({
        id: "card-1",
        thumbnailBlob: createPngBlob(30),
      }),
    ]);
    openHqccDexieDb.mockResolvedValue(db);

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(db.cards.put).not.toHaveBeenCalled();
    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        converted: 0,
        skipped: 1,
      }),
    );
  });

  it("skips missing cards during write-back without failing the run", async () => {
    const db = createFakeDb([
      createSavedCardRecord({
        id: "card-1",
        thumbnailBlob: createPngBlob(30),
      }),
    ]);
    db.cards.get.mockImplementationOnce(async () => undefined);
    openHqccDexieDb.mockResolvedValue(db);

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(db.cards.put).not.toHaveBeenCalled();
    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        converted: 0,
        skipped: 1,
      }),
    );
  });

  it("treats conversion failures as skipped and continues", async () => {
    const db = createFakeDb([
      createSavedCardRecord({
        id: "card-1",
        thumbnailBlob: createPngBlob(30),
      }),
    ]);
    openHqccDexieDb.mockResolvedValue(db);
    createImageBitmapMock.mockRejectedValueOnce(new Error("decode failed"));

    await expect(startThumbnailJpegMigration()).resolves.toBeUndefined();

    expect(db.cards.put).not.toHaveBeenCalled();
    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        converted: 0,
        skipped: 1,
      }),
    );
  });

  it("reuses the in-flight promise for concurrent starts", async () => {
    const db = createFakeDb([
      createSavedCardRecord({
        id: "card-1",
        thumbnailBlob: createPngBlob(30),
      }),
    ]);
    let releaseOpen: (() => void) | null = null;
    openHqccDexieDb
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseOpen = () => resolve(db);
          }),
      )
      .mockResolvedValue(db);

    const first = startThumbnailJpegMigration();
    const second = startThumbnailJpegMigration();

    await Promise.resolve();
    expect(releaseOpen).not.toBeNull();
    const openNow = releaseOpen;
    if (openNow) {
      (openNow as () => void)();
    }

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(createImageBitmapMock).toHaveBeenCalledTimes(1);
    expect(db.cards.put).toHaveBeenCalledTimes(1);
    expect(getThumbnailJpegMigrationStatus()).toEqual(
      expect.objectContaining({
        converted: 1,
      }),
    );
  });
});

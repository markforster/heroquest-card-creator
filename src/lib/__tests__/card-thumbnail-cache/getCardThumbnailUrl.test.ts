import { apiClient } from "@/api/client";
import {
  getCachedCardThumbnailUrl,
  getCardThumbnailUrl,
  invalidateCardThumbnail,
  MAX_ENTRIES,
  releaseCardThumbnail,
  retainCardThumbnail,
} from "@/lib/card-thumbnail-cache";

jest.mock("@/api/client", () => ({
  apiClient: {
    getCardThumbnail: jest.fn(),
  },
}));

describe("card-thumbnail-cache", () => {
  const originalCreateDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

  beforeEach(() => {
    invalidateCardThumbnail();
    jest.restoreAllMocks();
    let counter = 0;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => `blob:thumb-${++counter}`),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    invalidateCardThumbnail();
    if (originalCreateDescriptor) {
      Object.defineProperty(URL, "createObjectURL", originalCreateDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).createObjectURL;
    }
    if (originalRevokeDescriptor) {
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeDescriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (URL as any).revokeObjectURL;
    }
  });

  it("returns the cached URL immediately for an existing entry", () => {
    const blob = new Blob(["a"], { type: "image/png" });

    const first = getCachedCardThumbnailUrl("card-1", blob);
    const second = getCachedCardThumbnailUrl("card-1");

    expect(first).toBe("blob:thumb-1");
    expect(second).toBe("blob:thumb-1");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent fetches for the same card id", async () => {
    const blob = new Blob(["thumb"], { type: "image/png" });
    let resolveBlob!: (value: Blob | null) => void;
    (apiClient.getCardThumbnail as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<Blob | null>((resolve) => {
          resolveBlob = resolve;
        }),
    );

    const firstPromise = getCardThumbnailUrl("card-1");
    const secondPromise = getCardThumbnailUrl("card-1");

    expect(apiClient.getCardThumbnail).toHaveBeenCalledTimes(1);

    resolveBlob(blob);
    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toBe("blob:thumb-1");
    expect(second).toBe("blob:thumb-1");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("skips retained entries when evicting beyond the cache ceiling", () => {
    const retainedBlob = new Blob(["retained"], { type: "image/png" });
    const retainedUrl = getCachedCardThumbnailUrl("card-1", retainedBlob);
    retainCardThumbnail("card-1");

    for (let index = 2; index <= MAX_ENTRIES + 1; index += 1) {
      getCachedCardThumbnailUrl(
        `card-${index}`,
        new Blob([String(index)], { type: "image/png" }),
      );
    }

    expect(getCachedCardThumbnailUrl("card-1")).toBe(retainedUrl);
    expect(getCachedCardThumbnailUrl("card-2")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:thumb-2");

    releaseCardThumbnail("card-1");
  });

  it("evicts a released retained entry once the cache exceeds the ceiling again", () => {
    const retainedBlob = new Blob(["retained"], { type: "image/png" });
    const retainedUrl = getCachedCardThumbnailUrl("card-1", retainedBlob);
    retainCardThumbnail("card-1");

    for (let index = 2; index <= MAX_ENTRIES + 1; index += 1) {
      getCachedCardThumbnailUrl(
        `card-${index}`,
        new Blob([String(index)], { type: "image/png" }),
      );
    }

    releaseCardThumbnail("card-1");

    getCachedCardThumbnailUrl(
      `card-${MAX_ENTRIES + 2}`,
      new Blob(["overflow"], { type: "image/png" }),
    );

    expect(getCachedCardThumbnailUrl("card-1")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(retainedUrl);
  });
});

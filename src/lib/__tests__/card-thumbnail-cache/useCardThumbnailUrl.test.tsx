import { renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/api/client";
import {
  getCachedCardThumbnailUrl,
  invalidateCardThumbnail,
  MAX_ENTRIES,
  useCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";

jest.mock("@/api/client", () => ({
  apiClient: {
    getCardThumbnail: jest.fn(),
  },
}));

function churnCache(iterations: number) {
  let index = MAX_ENTRIES + 2;
  for (let count = 0; count < iterations; count += 1) {
    getCachedCardThumbnailUrl(
      `card-${index}`,
      new Blob([String(index)], { type: "image/png" }),
    );
    index += 1;
  }
}

describe("useCardThumbnailUrl", () => {
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

  it("retains a cache-backed card thumbnail while mounted and releases it on unmount", async () => {
    (apiClient.getCardThumbnail as jest.Mock).mockResolvedValue(new Blob(["a"], { type: "image/png" }));

    const { result, unmount } = renderHook(() =>
      useCardThumbnailUrl("card-1", null, { enabled: true, useCache: true }),
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-1");
    });
    const retainedUrl = result.current;

    for (let index = 2; index <= MAX_ENTRIES + 1; index += 1) {
      getCachedCardThumbnailUrl(
        `card-${index}`,
        new Blob([String(index)], { type: "image/png" }),
      );
    }

    expect(getCachedCardThumbnailUrl("card-1")).toBe("blob:thumb-1");

    unmount();

    churnCache(MAX_ENTRIES * 2);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(retainedUrl);
  });

  it("releases the old retained card id when switching to a different card", async () => {
    (apiClient.getCardThumbnail as jest.Mock)
      .mockResolvedValueOnce(new Blob(["a"], { type: "image/png" }))
      .mockResolvedValueOnce(new Blob(["b"], { type: "image/png" }));

    const { result, rerender } = renderHook(
      ({ cardId }: { cardId: string | null }) =>
        useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true }),
      {
        initialProps: { cardId: "card-1" as string | null },
      },
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-1");
    });

    rerender({ cardId: "card-2" });

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-2");
    });

    for (let index = 3; index <= MAX_ENTRIES + 2; index += 1) {
      getCachedCardThumbnailUrl(
        `card-${index}`,
        new Blob([String(index)], { type: "image/png" }),
      );
    }

    expect(getCachedCardThumbnailUrl("card-1")).toBeNull();
    expect(getCachedCardThumbnailUrl("card-2")).toBe("blob:thumb-2");
  });

  it("does not retain when useCache is false", async () => {
    const blob = new Blob(["legacy"], { type: "image/png" });

    const { result, unmount } = renderHook(() =>
      useCardThumbnailUrl("card-1", blob, { enabled: true, useCache: false }),
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-1");
    });

    for (let index = 2; index <= MAX_ENTRIES + 1; index += 1) {
      getCachedCardThumbnailUrl(
        `card-${index}`,
        new Blob([String(index)], { type: "image/png" }),
      );
    }

    expect(getCachedCardThumbnailUrl("card-1")).toBeNull();

    unmount();
  });

  it("releases retained ownership when disabled", async () => {
    (apiClient.getCardThumbnail as jest.Mock).mockResolvedValue(new Blob(["a"], { type: "image/png" }));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useCardThumbnailUrl("card-1", null, { enabled, useCache: true }),
      {
        initialProps: { enabled: true },
      },
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-1");
    });
    const retainedUrl = result.current;

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    churnCache(MAX_ENTRIES * 2);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(retainedUrl);
  });

  it("releases retained ownership when the card id becomes null", async () => {
    (apiClient.getCardThumbnail as jest.Mock).mockResolvedValue(new Blob(["a"], { type: "image/png" }));
    const initialProps: { cardId: string | null } = { cardId: "card-1" };

    const { result, rerender } = renderHook(
      ({ cardId }: { cardId: string | null }) =>
        useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true }),
      {
        initialProps,
      },
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:thumb-1");
    });
    const retainedUrl = result.current;

    rerender({ cardId: null });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    churnCache(MAX_ENTRIES * 2);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(retainedUrl);
  });
});

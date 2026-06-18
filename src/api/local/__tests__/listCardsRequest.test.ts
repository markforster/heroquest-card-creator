const listCards = jest.fn();

jest.mock("@/lib/cards-db", () => ({
  listCards: (...args: unknown[]) => listCards(...args),
}));

import { listCardsRequestPlugin } from "@/api/local/listCardsRequest";

describe("listCardsRequestPlugin", () => {
  beforeEach(() => {
    listCards.mockReset();
  });

  it("returns the existing flat list response shape without thumbnails", async () => {
    listCards.mockResolvedValue([
      {
        id: "card-1",
        templateId: "hero",
        status: "saved",
        name: "Hero",
        nameLower: "hero",
        createdAt: 1,
        updatedAt: 2,
        schemaVersion: 2,
        title: "Hero",
        thumbnailBlob: new Blob(["x"], { type: "image/png" }),
      },
    ]);

    const resolved = await listCardsRequestPlugin.request?.([], {} as never);
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

    expect(response?.status).toBe(200);
    expect(response?.data).toEqual([
      expect.objectContaining({
        id: "card-1",
        templateId: "hero",
        title: "Hero",
      }),
    ]);
    expect(response?.data[0]).not.toHaveProperty("thumbnailBlob");
  });
});

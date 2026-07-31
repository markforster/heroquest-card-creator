const listCards = jest.fn();

jest.mock("@/lib/data/cards-db", () => ({
  listCards: (...args: unknown[]) => listCards(...args),
}));

import { listCardsRequestPlugin } from "@/api/local/listCardsRequest";

async function runAdapter() {
  const request = listCardsRequestPlugin.request;
  if (!request) {
    throw new Error("Expected listCardsRequestPlugin.request");
  }

  const resolved = await request([], {} as never);
  if (typeof resolved.adapter !== "function") {
    throw new Error("Expected listCardsRequestPlugin to provide an adapter");
  }

  return resolved.adapter({} as never);
}

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

    const response = await runAdapter();

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

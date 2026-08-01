const createCard = jest.fn();

jest.mock("@/lib/data/cards-db", () => ({
  createCard: (...args: unknown[]) => createCard(...args),
}));

import { createCardRequestPlugin } from "@/api/local/createCardRequest";

describe("createCardRequestPlugin", () => {
  beforeEach(() => {
    createCard.mockReset();
  });

  it("returns the created flat card response shape", async () => {
    createCard.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Hero",
      nameLower: "hero",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 2,
      title: "Hero",
    });

    const request = createCardRequestPlugin.request;
    if (!request) {
      throw new Error("Expected createCardRequestPlugin.request");
    }

    const resolved = await request([], {
      data: {
        templateId: "hero",
        status: "saved",
        name: "Hero",
        duplicateFromCardId: "source-card",
      },
    } as never);
    if (typeof resolved.adapter !== "function") {
      throw new Error("Expected createCardRequestPlugin to provide an adapter");
    }

    const response = await resolved.adapter({} as never);

    expect(response?.status).toBe(200);
    expect(response?.data).toEqual(
      expect.objectContaining({
        id: "card-1",
        templateId: "hero",
        title: "Hero",
      }),
    );
    expect(createCard).toHaveBeenCalledWith(
      expect.objectContaining({
        duplicateFromCardId: "source-card",
      }),
    );
  });
});

const updateCard = jest.fn();

jest.mock("@/lib/data/cards-db", () => ({
  updateCard: (...args: unknown[]) => updateCard(...args),
}));

import { updateCardRequestPlugin } from "@/api/local/updateCardRequest";

async function runAdapter(config: Record<string, unknown>) {
  const request = updateCardRequestPlugin.request;
  if (!request) {
    throw new Error("Expected updateCardRequestPlugin.request");
  }

  const resolved = await request([], config as never);
  if (typeof resolved.adapter !== "function") {
    throw new Error("Expected updateCardRequestPlugin to provide an adapter");
  }

  return resolved.adapter({} as never);
}

describe("updateCardRequestPlugin", () => {
  beforeEach(() => {
    updateCard.mockReset();
  });

  it("throws when id param is missing", async () => {
    await expect(runAdapter({})).rejects.toThrow("[api:updateCard] Missing id param");
  });

  it("returns the updated flat card response shape", async () => {
    updateCard.mockResolvedValue({
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Hero",
      nameLower: "hero",
      createdAt: 1,
      updatedAt: 2,
      schemaVersion: 2,
      title: "Updated Hero",
    });

    const response = await runAdapter({
      params: { id: "card-1" },
      data: { title: "Updated Hero" },
    });

    expect(updateCard).toHaveBeenCalledWith("card-1", { title: "Updated Hero" });
    expect(response?.status).toBe(200);
    expect(response?.data).toEqual(
      expect.objectContaining({
        id: "card-1",
        title: "Updated Hero",
      }),
    );
  });
});

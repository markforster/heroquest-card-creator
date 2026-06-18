const updateCard = jest.fn();

jest.mock("@/lib/cards-db", () => ({
  updateCard: (...args: unknown[]) => updateCard(...args),
}));

import { updateCardRequestPlugin } from "@/api/local/updateCardRequest";

describe("updateCardRequestPlugin", () => {
  beforeEach(() => {
    updateCard.mockReset();
  });

  it("throws when id param is missing", async () => {
    const resolved = await updateCardRequestPlugin.request?.([], {} as never);
    const adapter = resolved?.adapter as (() => Promise<unknown>) | undefined;
    await expect(adapter?.()).rejects.toThrow("[api:updateCard] Missing id param");
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

    const resolved = await updateCardRequestPlugin.request?.(
      [],
      { params: { id: "card-1" }, data: { title: "Updated Hero" } } as never,
    );
    const adapter = resolved?.adapter as (() => Promise<any>) | undefined;
    const response = await adapter?.();

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

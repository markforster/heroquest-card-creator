import type { CardRecord } from "@/types/cards-db";

import { updateCard } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

describe("updateCard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when the card does not exist", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCards({ hasCardsStore: true });

    await expect(updateCard("missing", { title: "New" })).resolves.toBeNull();

    harness.cleanup();
  });

  it("updates an existing card and bumps updatedAt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Old Name",
      nameLower: "old name",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 1,
    };

    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });

    const next = await updateCard("c1", { title: "New title" });

    expect(next).toEqual({
      ...existing,
      title: "New title",
      updatedAt: 200,
    });

    expect(harness.cardsStore.put).toHaveBeenCalledWith(next);
    harness.cleanup();
  });

  it("recomputes nameLower when patch.name is provided", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Old Name",
      nameLower: "old name",
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 1,
    };

    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });

    const next = await updateCard("c1", { name: "NEW NAME" });
    expect(next?.nameLower).toBe("new name");

    harness.cleanup();
  });

  it("rejects when store.get fails", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("get", new Error("get-failed"));

    await expect(updateCard("c1", { title: "X" })).rejects.toThrow("get-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.get fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);
    const harness = installMockIndexedDbCards({ hasCardsStore: true });
    harness.cardsStore.failNext("get", undefined);

    await expect(updateCard("c1", { title: "X" })).rejects.toThrow("Failed to load card for update");
    harness.cleanup();
  });

  it("rejects when store.put fails", async () => {
    jest.spyOn(Date, "now").mockReturnValue(2);
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Old Name",
      nameLower: "old name",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });
    harness.cardsStore.failNext("put", new Error("put-failed"));

    await expect(updateCard("c1", { title: "X" })).rejects.toThrow("put-failed");
    harness.cleanup();
  });

  it("rejects with a default error when store.put fails without request.error", async () => {
    jest.spyOn(Date, "now").mockReturnValue(2);
    const existing: CardRecord = {
      id: "c1",
      templateId: "hero",
      status: "saved",
      name: "Old Name",
      nameLower: "old name",
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: [existing] });
    harness.cardsStore.failNext("put", undefined);

    await expect(updateCard("c1", { title: "X" })).rejects.toThrow("Failed to update card");
    harness.cleanup();
  });
});


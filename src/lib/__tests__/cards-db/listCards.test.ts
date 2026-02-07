import type { CardRecord } from "@/types/cards-db";

import { listCards } from "@/lib/cards-db";
import { installMockIndexedDbCards } from "@/lib/__testutils__/mockIndexedDbCards";

function card(partial: Partial<CardRecord> & Pick<CardRecord, "id" | "templateId" | "status" | "name" | "nameLower">): CardRecord {
  return {
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
    ...partial,
  };
}

describe("listCards", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses templateId_status index when available", async () => {
    const cards = [
      card({ id: "1", templateId: "hero", status: "saved", name: "A", nameLower: "a" }),
      card({ id: "2", templateId: "hero", status: "draft", name: "B", nameLower: "b" }),
      card({ id: "3", templateId: "monster", status: "saved", name: "C", nameLower: "c" }),
    ];
    const harness = installMockIndexedDbCards({
      hasCardsStore: true,
      initialCards: cards,
      indexNames: ["templateId_status"],
    });

    const indexSpy = jest.spyOn(harness.cardsStore, "index");
    const result = await listCards({ templateId: "hero", status: "saved" });

    expect(indexSpy).toHaveBeenCalledWith("templateId_status");
    expect(result.map((r) => r.id)).toEqual(["1"]);

    harness.cleanup();
  });

  it("uses status index when available and only status filter is provided", async () => {
    const cards = [
      card({ id: "1", templateId: "hero", status: "saved", name: "A", nameLower: "a" }),
      card({ id: "2", templateId: "hero", status: "draft", name: "B", nameLower: "b" }),
    ];
    const harness = installMockIndexedDbCards({
      hasCardsStore: true,
      initialCards: cards,
      indexNames: ["status"],
    });

    const indexSpy = jest.spyOn(harness.cardsStore, "index");
    const result = await listCards({ status: "draft" });

    expect(indexSpy).toHaveBeenCalledWith("status");
    expect(result.map((r) => r.id)).toEqual(["2"]);

    harness.cleanup();
  });

  it("uses templateId index when available and only templateId filter is provided", async () => {
    const cards = [
      card({ id: "1", templateId: "hero", status: "saved", name: "A", nameLower: "a" }),
      card({ id: "2", templateId: "monster", status: "saved", name: "B", nameLower: "b" }),
    ];
    const harness = installMockIndexedDbCards({
      hasCardsStore: true,
      initialCards: cards,
      indexNames: ["templateId"],
    });

    const indexSpy = jest.spyOn(harness.cardsStore, "index");
    const result = await listCards({ templateId: "monster" });

    expect(indexSpy).toHaveBeenCalledWith("templateId");
    expect(result.map((r) => r.id)).toEqual(["2"]);

    harness.cleanup();
  });

  it("falls back to store.openCursor when indexes are missing", async () => {
    const cards = [
      card({ id: "1", templateId: "hero", status: "saved", name: "A", nameLower: "a" }),
      card({ id: "2", templateId: "hero", status: "draft", name: "B", nameLower: "b" }),
    ];
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: cards, indexNames: [] });

    const result = await listCards({ templateId: "hero" });
    expect(harness.cardsStore.openCursor).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);

    harness.cleanup();
  });

  it("filters by search against nameLower", async () => {
    const cards = [
      card({ id: "1", templateId: "hero", status: "saved", name: "Hello", nameLower: "hello" }),
      card({ id: "2", templateId: "hero", status: "saved", name: "World", nameLower: "world" }),
    ];
    const harness = installMockIndexedDbCards({ hasCardsStore: true, initialCards: cards, indexNames: [] });

    const result = await listCards({ search: "HELL" });
    expect(result.map((r) => r.id)).toEqual(["1"]);

    harness.cleanup();
  });

  it("rejects when cursor request fails with request.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true, indexNames: [] });
    harness.cardsStore.failNext("openCursor", new Error("cursor-failed"));

    await expect(listCards()).rejects.toThrow("cursor-failed");
    harness.cleanup();
  });

  it("rejects with a default error when cursor request fails without request.error", async () => {
    const harness = installMockIndexedDbCards({ hasCardsStore: true, indexNames: [] });
    harness.cardsStore.failNext("openCursor", undefined);

    await expect(listCards()).rejects.toThrow("Failed to list cards");
    harness.cleanup();
  });
});


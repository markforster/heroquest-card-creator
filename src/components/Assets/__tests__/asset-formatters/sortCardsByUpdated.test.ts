import type { CardRecord } from "@/api/cards";
import { sortCardsByUpdated } from "@/components/Assets/asset-formatters";

function card(id: string, name: string, updatedAt: number, nameLower?: string): CardRecord {
  return {
    id,
    templateId: "hero",
    status: "saved",
    name,
    nameLower,
    createdAt: 1,
    updatedAt,
    schemaVersion: 2,
  } as CardRecord;
}

describe("sortCardsByUpdated", () => {
  it("sorts in place by newest update and then normalized name", () => {
    const cards = [card("b", "Beta", 1), card("old", "Old", 0), card("a", "Alpha", 1)];

    expect(sortCardsByUpdated(cards)).toBe(cards);
    expect(cards.map((entry) => entry.id)).toEqual(["a", "b", "old"]);
  });
});

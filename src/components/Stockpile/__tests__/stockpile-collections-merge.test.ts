import { mergeCollectionCardIds } from "@/components/Stockpile/stockpile-collections-merge";

describe("mergeCollectionCardIds", () => {
  it("returns a union without duplicates", () => {
    expect(mergeCollectionCardIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("handles empty inputs", () => {
    expect(mergeCollectionCardIds([], [])).toEqual([]);
    expect(mergeCollectionCardIds(["a"], [])).toEqual(["a"]);
  });
});

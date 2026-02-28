import { getDeleteCollectionImpact } from "@/components/Stockpile/collection-delete-impact";

describe("getDeleteCollectionImpact", () => {
  it("counts removed cards and unfiled cards using existing ids only", () => {
    const impact = getDeleteCollectionImpact({
      collectionId: "col-a",
      collections: [
        { id: "col-a", name: "A", cardIds: ["1", "2", "3", "missing"] },
        { id: "col-b", name: "B", cardIds: ["2"] },
      ],
      existingCardIdSet: new Set(["1", "2", "3"]),
    });

    expect(impact).toEqual({ name: "A", removedCount: 3, unfiledCount: 2 });
  });

  it("omits unfiled line when all cards still belong elsewhere", () => {
    const impact = getDeleteCollectionImpact({
      collectionId: "col-a",
      collections: [
        { id: "col-a", name: "A", cardIds: ["1", "2"] },
        { id: "col-b", name: "B", cardIds: ["1", "2"] },
      ],
      existingCardIdSet: new Set(["1", "2"]),
    });

    expect(impact).toEqual({ name: "A", removedCount: 2, unfiledCount: 0 });
  });

  it("returns null when target collection is missing", () => {
    const impact = getDeleteCollectionImpact({
      collectionId: "nope",
      collections: [{ id: "col-a", name: "A", cardIds: ["1"] }],
      existingCardIdSet: new Set(["1"]),
    });

    expect(impact).toBeNull();
  });
});


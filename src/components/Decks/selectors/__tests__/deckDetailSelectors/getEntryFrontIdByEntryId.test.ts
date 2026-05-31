import { getEntryFrontIdByEntryId } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getEntryFrontIdByEntryId", () => {
  it("maps entries to front ids when pair has frontFaceId", () => {
    const entries = [
      { id: "e1", pairId: "p1" },
      { id: "e2", pairId: "p2" },
    ] as never;
    const pairsById = new Map([
      ["p1", { id: "p1", frontFaceId: "f1" }],
      ["p2", { id: "p2", frontFaceId: null }],
    ]) as never;

    const map = getEntryFrontIdByEntryId(entries, pairsById);
    expect(map.get("e1")).toBe("f1");
    expect(map.has("e2")).toBe(false);
  });
});

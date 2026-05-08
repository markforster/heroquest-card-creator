import { getPairedNotInSetFrontIds } from "@/components/Decks/selectors/deckDetailSelectors";

describe("getPairedNotInSetFrontIds", () => {
  it("returns paired fronts for selected back that are not already in set entries", () => {
    const selectedSet = { id: "set-1", backFaceId: "back-1" } as never;
    const entries = [{ id: "entry-1", pairId: "pair-1" }] as never;
    const pairsById = new Map(
      [
        ["pair-1", { id: "pair-1", backFaceId: "back-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", backFaceId: "back-1", frontFaceId: "front-2" }],
        ["pair-3", { id: "pair-3", backFaceId: "back-2", frontFaceId: "front-3" }],
      ] as const,
    );

    expect(getPairedNotInSetFrontIds(entries, pairsById as never, selectedSet)).toEqual(["front-2"]);
  });

  it("returns empty when selected set is null", () => {
    expect(getPairedNotInSetFrontIds([], new Map(), null)).toEqual([]);
  });
});

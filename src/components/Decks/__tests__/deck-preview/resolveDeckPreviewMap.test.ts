const listDeckGroups = jest.fn();
const listDeckSets = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    listDeckGroups: (...args: unknown[]) => listDeckGroups(...args),
    listDeckSets: (...args: unknown[]) => listDeckSets(...args),
    listDeckEntries: jest.fn(),
    listPairs: jest.fn(),
  },
}));

import type { DeckRecord } from "@/api/decks";
import { resolveDeckPreviewMap } from "@/components/Decks/deck-preview";

describe("resolveDeckPreviewMap", () => {
  it("builds an ordered preview for each deck using a shared pair map", async () => {
    const decks = [{ id: "deck-1" }, { id: "deck-2" }] as DeckRecord[];
    listDeckGroups.mockImplementation(({ params }: { params: { deckId: string } }) =>
      Promise.resolve([{ id: `group-${params.deckId}`, sortIndex: 0 }]),
    );
    listDeckSets.mockImplementation(({ params }: { params: { deckId: string } }) =>
      Promise.resolve([
        {
          id: `set-${params.deckId}`,
          groupId: `group-${params.deckId}`,
          backFaceId: `back-${params.deckId}`,
          sortIndex: 0,
        },
      ]),
    );

    await expect(
      resolveDeckPreviewMap({ decks, maxCount: 3, pairMap: new Map() }),
    ).resolves.toEqual({
      "deck-1": ["back-deck-1"],
      "deck-2": ["back-deck-2"],
    });
  });
});

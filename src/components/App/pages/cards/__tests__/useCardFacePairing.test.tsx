const listCards = jest.fn();
const listPairs = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    listCards: (...args: unknown[]) => listCards(...args),
    listPairs: (...args: unknown[]) => listPairs(...args),
  },
}));

import { renderHook, waitFor } from "@testing-library/react";

import { useCardFacePairing } from "@/components/App/pages/cards/useCardFacePairing";

describe("useCardFacePairing", () => {
  beforeEach(() => {
    listCards.mockReset();
    listPairs.mockReset();
  });

  it("loads and orders paired fronts for a back face", async () => {
    listCards.mockResolvedValue([
      { id: "front-1", name: "Older", updatedAt: 1, lastViewedAt: 1 },
      { id: "front-2", name: "Newer", updatedAt: 2, lastViewedAt: 2 },
    ]);
    listPairs.mockResolvedValue([
      { id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" },
      { id: "pair-2", frontFaceId: "front-2", backFaceId: "back-1" },
    ]);

    const { result } = renderHook(() =>
      useCardFacePairing({ activeCardId: "back-1", effectiveFace: "back" }),
    );

    await waitFor(() => expect(result.current.pairedFrontCount).toBe(2));
    expect(result.current.activeFrontId).toBe("front-2");
    expect(result.current.pairedFrontIds).toEqual(["front-2", "front-1"]);
    expect(result.current.lastRememberedBackId).toBe("back-1");
  });

  it("loads the paired back for a front face", async () => {
    listCards.mockResolvedValue([{ id: "back-1", name: "Back", updatedAt: 1 }]);
    listPairs.mockResolvedValue([{ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }]);

    const { result } = renderHook(() =>
      useCardFacePairing({ activeCardId: "front-1", effectiveFace: "front" }),
    );

    await waitFor(() => expect(result.current.pairedBackId).toBe("back-1"));
  });

  it("clears pairing state when no active card is available", () => {
    const { result } = renderHook(() =>
      useCardFacePairing({ activeCardId: undefined, effectiveFace: null }),
    );

    expect(result.current).toMatchObject({
      activeFrontId: null,
      pairedBackId: null,
      pairedFrontCount: 0,
      pairedFrontIds: [],
    });
    expect(listCards).not.toHaveBeenCalled();
  });
});

import { renderHook } from "@testing-library/react";

import { useDeckHeaderModel } from "@/components/Decks/hooks/useDeckHeaderModel";

const mockUseGetDeck = jest.fn();

jest.mock("@/api/hooks", () => ({
  useGetDeck: (...args: unknown[]) => mockUseGetDeck(...args),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => (key === "decks.untitledDeck" ? "Untitled Deck" : key) }),
}));

describe("useDeckHeaderModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetDeck.mockReturnValue({ data: null });
  });

  it("disables deck query when deckId is null", () => {
    renderHook(() => useDeckHeaderModel(null));

    expect(mockUseGetDeck).toHaveBeenCalledWith(
      { params: { deckId: "" } },
      expect.objectContaining({ enabled: false }),
    );
  });

  it("falls back to untitled label when deck is null", () => {
    const { result } = renderHook(() => useDeckHeaderModel("deck-1"));
    expect(result.current.deckTitle).toBe("Untitled Deck");
  });

  it("uses deck title when available", () => {
    mockUseGetDeck.mockReturnValue({ data: { id: "deck-1", title: "My Deck" } });
    const { result } = renderHook(() => useDeckHeaderModel("deck-1"));
    expect(result.current.deckTitle).toBe("My Deck");
  });
});

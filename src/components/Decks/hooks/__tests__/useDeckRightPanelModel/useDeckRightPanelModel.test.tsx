import { act, renderHook } from "@testing-library/react";

import { useDeckRightPanelModel } from "@/components/Decks/hooks/useDeckRightPanelModel";

const mockUseListCollections = jest.fn();
const mockUseListCards = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListCollections: (...args: unknown[]) => mockUseListCollections(...args),
  useListCards: (...args: unknown[]) => mockUseListCards(...args),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "empty.noBackCards") return "No back cards";
      if (key === "empty.noCardsFound") return "No cards found";
      return key;
    },
  }),
}));

describe("useDeckRightPanelModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListCollections.mockReturnValue({ data: [] });
    mockUseListCards.mockReturnValue({ data: [] });
  });

  it("enables list queries by default with right panel open", () => {
    const { result } = renderHook(() => useDeckRightPanelModel());

    expect(result.current.isRightPanelVisible).toBe(true);

    expect(mockUseListCollections).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseListCards).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ enabled: true }),
    );
  });

  it("disables list queries when right panel is toggled closed", () => {
    const { result, rerender } = renderHook(() => useDeckRightPanelModel());

    act(() => {
      result.current.toggleRightPanel();
    });
    rerender();

    expect(mockUseListCollections).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseListCards).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("updates empty label when face mode changes", () => {
    const { result } = renderHook(() => useDeckRightPanelModel());
    expect(result.current.rightPanelEmptyLabel).toBe("No back cards");

    act(() => {
      result.current.setRightPanelFaceMode("front");
    });
    expect(result.current.rightPanelEmptyLabel).toBe("No cards found");
  });
});

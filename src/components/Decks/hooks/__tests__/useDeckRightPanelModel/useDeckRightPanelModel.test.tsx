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
    window.localStorage.clear();
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

  it("initializes collapsed when stored value is 0", () => {
    window.localStorage.setItem("hqcc.decks.rightPanelVisible", "0");

    const { result } = renderHook(() => useDeckRightPanelModel());

    expect(result.current.isRightPanelVisible).toBe(false);
  });

  it("initializes expanded when stored value is 1", () => {
    window.localStorage.setItem("hqcc.decks.rightPanelVisible", "1");

    const { result } = renderHook(() => useDeckRightPanelModel());

    expect(result.current.isRightPanelVisible).toBe(true);
  });

  it("falls back to expanded when stored value is invalid", () => {
    window.localStorage.setItem("hqcc.decks.rightPanelVisible", "maybe");

    const { result } = renderHook(() => useDeckRightPanelModel());

    expect(result.current.isRightPanelVisible).toBe(true);
  });

  it("persists 0 and 1 when toggling panel visibility", () => {
    const { result } = renderHook(() => useDeckRightPanelModel());

    act(() => {
      result.current.toggleRightPanel();
    });
    expect(window.localStorage.getItem("hqcc.decks.rightPanelVisible")).toBe("0");

    act(() => {
      result.current.toggleRightPanel();
    });
    expect(window.localStorage.getItem("hqcc.decks.rightPanelVisible")).toBe("1");
  });

  it("does not throw when localStorage read/write fails and defaults to expanded", () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("read failed");
    });
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("write failed");
    });

    expect(() => renderHook(() => useDeckRightPanelModel())).not.toThrow();
    const { result } = renderHook(() => useDeckRightPanelModel());
    expect(result.current.isRightPanelVisible).toBe(true);

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

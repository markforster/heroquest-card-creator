import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";

const mockUseListDeckSets = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListDeckSets: (...args: unknown[]) => mockUseListDeckSets(...args),
}));

jest.mock("@/components/common/IconButton", () => ({
  __esModule: true,
  default: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={Boolean(disabled)} onClick={onClick as never}>
      {children}
    </button>
  ),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => (key === "decks.actions.exportDeck" ? "Export" : key),
  }),
}));

import DeckExportButton from "@/components/Decks/DeckExportButton";
import type { DeckExportButtonHandle } from "@/components/Decks/DeckExportButton";
import { DeckExportProvider } from "@/components/Decks/context/DeckExportContext";

describe("DeckExportButton", () => {
  beforeEach(() => {
    mockUseListDeckSets.mockReset();
    mockUseListDeckSets.mockReturnValue({ data: [], isLoading: false });
  });

  it("is disabled when deck has zero sets", () => {
    render(
      <DeckExportProvider value={{ exportDeck: async () => {}, exportDeckPdf: async () => {} }}>
        <DeckExportButton deckId="deck-1" scope="decks_grid" />
      </DeckExportProvider>,
    );

    const buttons = screen.getAllByRole("button", { name: "Export" });
    expect(buttons[0]).toBeDisabled();
  });

  it("is enabled when deck has one or more sets", () => {
    mockUseListDeckSets.mockReturnValue({ data: [{ id: "set-1" }], isLoading: false });

    render(
      <DeckExportProvider value={{ exportDeck: async () => {}, exportDeckPdf: async () => {} }}>
        <DeckExportButton deckId="deck-1" scope="decks_grid" />
      </DeckExportProvider>,
    );

    const buttons = screen.getAllByRole("button", { name: "Export" });
    expect(buttons[0]).toBeEnabled();
  });

  it("remains safely disabled without provider", () => {
    mockUseListDeckSets.mockReturnValue({ data: [{ id: "set-1" }], isLoading: false });

    render(<DeckExportButton deckId="deck-1" scope="decks_grid" />);

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("exposes imperative export actions through the existing menu items", async () => {
    mockUseListDeckSets.mockReturnValue({ data: [{ id: "set-1" }], isLoading: false });
    const exportDeck = jest.fn().mockResolvedValue(undefined);
    const exportDeckPdf = jest.fn().mockResolvedValue(undefined);
    const ref = createRef<DeckExportButtonHandle>();

    render(
      <DeckExportProvider value={{ exportDeck, exportDeckPdf }}>
        <DeckExportButton ref={ref} deckId="deck-1" scope="deck_detail" />
      </DeckExportProvider>,
    );

    expect(ref.current?.isMenuOpen()).toBe(false);

    act(() => {
      expect(ref.current?.toggleMenu()).toBe(true);
    });

    expect(ref.current?.isMenuOpen()).toBe(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await act(async () => {
      await ref.current?.runImageExport();
    });

    expect(exportDeck).toHaveBeenCalledWith("deck-1", "deck_detail");
    expect(ref.current?.isMenuOpen()).toBe(false);

    act(() => {
      ref.current?.toggleMenu();
    });

    await act(async () => {
      await ref.current?.runPdfExport();
    });

    expect(exportDeckPdf).toHaveBeenCalledWith("deck-1", "deck_detail");
    expect(ref.current?.isMenuOpen()).toBe(false);
  });
});

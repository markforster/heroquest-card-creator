import { render, screen } from "@testing-library/react";

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
import { DeckExportProvider } from "@/components/Decks/context/DeckExportContext";

describe("DeckExportButton", () => {
  beforeEach(() => {
    mockUseListDeckSets.mockReset();
    mockUseListDeckSets.mockReturnValue({ data: [], isLoading: false });
  });

  it("is disabled when deck has zero sets", () => {
    render(
      <DeckExportProvider value={{ exportDeck: async () => {} }}>
        <DeckExportButton deckId="deck-1" scope="decks_grid" />
      </DeckExportProvider>,
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("is enabled when deck has one or more sets", () => {
    mockUseListDeckSets.mockReturnValue({ data: [{ id: "set-1" }], isLoading: false });

    render(
      <DeckExportProvider value={{ exportDeck: async () => {} }}>
        <DeckExportButton deckId="deck-1" scope="decks_grid" />
      </DeckExportProvider>,
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("remains safely disabled without provider", () => {
    mockUseListDeckSets.mockReturnValue({ data: [{ id: "set-1" }], isLoading: false });

    render(<DeckExportButton deckId="deck-1" scope="decks_grid" />);

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });
});

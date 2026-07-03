import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockNavigate = jest.fn();
const mockListCardDecks = jest.fn();
const mockUseCardEditor = jest.fn();
const mockDeckFanByDeckId = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listCardDecks: (...args: unknown[]) => mockListCardDecks(...args),
  },
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => mockUseCardEditor(),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "empty.saveCardToViewDecks": "Save this card to view deck membership.",
        "empty.saveCardToViewDecksTitle": "Save this card to view decks",
        "empty.saveCardToViewDecksBody": "Deck membership appears here after this card has been saved.",
        "empty.saveCardToViewDecksHint":
          "Once the card has a saved record, any decks that include it will be listed here.",
        "status.loadingDecks": "Loading decks...",
        "status.loadingDecksBody": "Checking which decks currently include this card.",
        "error.failedToLoadDecks": "Unable to load decks right now.",
        "error.failedToLoadDecksBody":
          "Something went wrong while loading deck membership for this card. Please try again in a moment.",
        "empty.cardNotInDecks": "This card is not in any deck.",
        "empty.cardNotInDecksTitle": "Not in any decks yet",
        "empty.cardNotInDecksBody": "This card has not been added to a deck yet.",
        "empty.cardNotInDecksHint":
          "When a deck includes this card, it will appear here with its deck entry count.",
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock("@/components/Decks/DeckFanByDeckId", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockDeckFanByDeckId(props);
    return <div data-testid="deck-fan-mini" />;
  },
}));

import DecksInspectorPanel from "@/components/Cards/CardInspector/DecksInspectorPanel";

describe("DecksInspectorPanel", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockListCardDecks.mockReset();
    mockUseCardEditor.mockReset();
    mockDeckFanByDeckId.mockReset();
  });

  it("shows save-first state when active card is not saved", () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: undefined },
        activeCardStatusByTemplate: { hero: "draft" },
      },
    });

    render(<DecksInspectorPanel />);

    expect(screen.getByText("Save this card to view decks")).toBeInTheDocument();
    expect(
      screen.getByText("Deck membership appears here after this card has been saved."),
    ).toBeInTheDocument();
    expect(mockListCardDecks).not.toHaveBeenCalled();
  });

  it("renders empty state when no decks are returned", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCardDecks.mockResolvedValue([]);

    render(<DecksInspectorPanel />);

    await waitFor(() => {
      expect(mockListCardDecks).toHaveBeenCalledWith({ params: { id: "card-1" } });
    });
    expect(screen.getByText("Not in any decks yet")).toBeInTheDocument();
    expect(screen.getByText("This card has not been added to a deck yet.")).toBeInTheDocument();
  });

  it("lists decks and navigates when clicked", async () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-2" },
        activeCardStatusByTemplate: { hero: "saved" },
      },
    });
    mockListCardDecks.mockResolvedValue([
      { deckId: "deck-1", deckTitle: "Dungeon Deck", count: 2, setId: "set-1" },
      { deckId: "deck-2", deckTitle: "Boss Deck", count: 5, setId: "set-9", entryId: "entry-3" },
    ]);

    render(<DecksInspectorPanel />);

    expect(await screen.findByText("Dungeon Deck")).toBeInTheDocument();
    expect(mockDeckFanByDeckId).toHaveBeenCalledWith(
      expect.objectContaining({
        deckId: "deck-1",
        maxCount: 5,
        variant: "inspector",
      }),
    );
    expect(mockDeckFanByDeckId).toHaveBeenCalledWith(
      expect.objectContaining({
        deckId: "deck-2",
        maxCount: 5,
        variant: "inspector",
      }),
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Boss Deck"));

    expect(mockNavigate).toHaveBeenCalledWith("/decks/deck-2/set/set-9/entry/entry-3");
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockNavigate = jest.fn();
const mockListCardDecks = jest.fn();
const mockUseCardEditor = jest.fn();

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
        "heading.decksForCard": "Decks for this card",
        "empty.saveCardToViewDecks": "Save this card to view deck membership.",
        "status.loadingDecks": "Loading decks...",
        "error.failedToLoadDecks": "Unable to load decks right now.",
        "empty.cardNotInDecks": "This card is not in any deck.",
      };
      return map[key] ?? key;
    },
  }),
}));

import DecksInspectorPanel from "@/components/Cards/CardInspector/DecksInspectorPanel";

describe("DecksInspectorPanel", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockListCardDecks.mockReset();
    mockUseCardEditor.mockReset();
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

    expect(screen.getByText("Save this card to view deck membership.")).toBeInTheDocument();
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
    expect(screen.getByText("This card is not in any deck.")).toBeInTheDocument();
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
      { deckId: "deck-1", deckTitle: "Dungeon Deck" },
      { deckId: "deck-2", deckTitle: "Boss Deck" },
    ]);

    render(<DecksInspectorPanel />);

    expect(await screen.findByText("Dungeon Deck")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Boss Deck"));

    expect(mockNavigate).toHaveBeenCalledWith("/decks/deck-2");
  });
});

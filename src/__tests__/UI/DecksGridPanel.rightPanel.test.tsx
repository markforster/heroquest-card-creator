import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DecksGridPanel from "@/components/Decks/DecksGridPanel";

const mockNavigate = jest.fn();
const mockUseDecksGridModel = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "actions.cancel": "Cancel",
          "actions.delete": "Delete",
          "actions.edit": "Edit",
          "actions.save": "Save",
          "decks.createDeck": "Create deck",
          "decks.editDeck": "Edit deck",
          "decks.untitledDeck": "Untitled deck",
          "decks.deleteDeckTitle": "Delete deck?",
          "decks.deleteSelectedBody": "Delete {count} selected deck(s)?",
          "decks.deleteSelected": "Delete selected",
          "decks.searchLabel": "Search decks",
          "decks.searchPlaceholder": "Search decks or card titles...",
          "decks.openDeck": "Open deck",
          "decks.noResults": "No decks match \"{query}\".",
          "decks.empty": "No decks yet.",
          "decks.title": "Title",
          "decks.description": "Description",
          "decks.descriptionPlaceholder": "Description placeholder",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Decks/hooks/useDecksGridModel", () => ({
  useDecksGridModel: (...args: unknown[]) => mockUseDecksGridModel(...args),
}));

jest.mock("@/components/Decks/DeckFanByDeckId", () => ({
  __esModule: true,
  default: () => <div data-testid="card-fan" />,
}));

describe("DecksGridPanel grid refresh", () => {
  const createModel = (overrides: Record<string, unknown> = {}) => ({
    decks: [{ id: "d1", title: "Deck 1", updatedAt: Date.now() }],
    filteredDecks: [{ id: "d1", title: "Deck 1", updatedAt: Date.now() }],
    selectedDeckIds: new Set<string>(["d1"]),
    selectedDeckId: "d1",
    selectedCount: 1,
    visibleDeckCount: 1,
    hasVisibleResults: true,
    hasAnyDecks: true,
    isDeleteSelectedEnabled: true,
    searchDraft: "",
    setSearchDraft: jest.fn(),
    deckBackgroundUrlByDeckId: { d1: "blob:deck-bg-1" },
    effectiveDeckTitleById: { d1: "Deck 1" },
    isDeleteDeckOpen: false,
    setIsDeleteDeckOpen: jest.fn(),
    deckTitleDraft: "",
    setDeckTitleDraft: jest.fn(),
    deckDescriptionDraft: "",
    setDeckDescriptionDraft: jest.fn(),
    selectDeck: jest.fn(),
    createDeck: jest.fn().mockResolvedValue("d1"),
    submitDeckDraft: jest.fn().mockResolvedValue("d1"),
    beginCreateDeckDraft: jest.fn(),
    beginEditDeckDraft: jest.fn().mockReturnValue(true),
    cancelDeckDraft: jest.fn(),
    deleteSelectedDecks: jest.fn().mockResolvedValue(undefined),
    duplicateDeck: jest.fn().mockResolvedValue("d2"),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDecksGridModel.mockReturnValue(createModel());
  });

  it("renders top toolbar and does not render right panel or export", () => {
    const { container } = render(<DecksGridPanel />);

    expect(screen.getByRole("searchbox", { name: "Search decks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create deck" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();

    expect(container.querySelector("aside")).toBeFalsy();
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
    expect(container.querySelector(".deckTileCreate")).toBeFalsy();
  });

  it("wires search input to model setter", () => {
    const model = createModel();
    mockUseDecksGridModel.mockReturnValue(model);
    render(<DecksGridPanel />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search decks" }), {
      target: { value: "wizard" },
    });

    expect(model.setSearchDraft).toHaveBeenCalledWith("wizard");
  });

  it("renders icon action buttons on each deck card", () => {
    const { container } = render(<DecksGridPanel />);

    expect(screen.getAllByRole("button", { name: "Open deck" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThan(0);
    expect(container.querySelector(".deckTileBottom")).toBeTruthy();
    expect(container.querySelector(".deckTileMetaSlot")).toBeTruthy();
    expect(container.querySelector(".deckTileActionsSlot")).toBeTruthy();
    expect(container.querySelector(".deckTileAtmosphereFrame")).toBeTruthy();
    expect(container.querySelector(".deckTileAtmosphere")).toBeTruthy();
    expect(screen.getByText("Deck 1")).toBeInTheDocument();
  });

  it("shows no-results state", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
        filteredDecks: [],
        hasVisibleResults: false,
        searchDraft: "wizard",
      }),
    );

    render(<DecksGridPanel />);
    expect(screen.getByText('No decks match "wizard".')).toBeInTheDocument();
  });

  it("shows no-decks state", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
        decks: [],
        filteredDecks: [],
        hasAnyDecks: false,
        hasVisibleResults: false,
      }),
    );

    render(<DecksGridPanel />);
    expect(screen.getByText("No decks yet.")).toBeInTheDocument();
  });

  it("includes selected count in delete confirmation copy", async () => {
    const model = createModel({
      isDeleteDeckOpen: true,
      selectedCount: 3,
    });
    mockUseDecksGridModel.mockReturnValue(model);

    render(<DecksGridPanel />);
    expect(screen.getByText("Delete 3 selected deck(s)?")).toBeInTheDocument();

    const confirmButton = screen.getAllByRole("button", { name: "Delete" }).at(-1) as HTMLButtonElement;
    fireEvent.click(confirmButton);
    await waitFor(() => expect(model.deleteSelectedDecks).toHaveBeenCalled());
  });

  it("opens edit mode modal from deck card edit action", () => {
    const model = createModel();
    mockUseDecksGridModel.mockReturnValue(model);
    render(<DecksGridPanel />);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(model.beginEditDeckDraft).toHaveBeenCalledWith("d1");
    expect(screen.getByRole("heading", { name: "Edit deck" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("submit in edit mode uses submitDeckDraft and not navigation", async () => {
    const model = createModel();
    mockUseDecksGridModel.mockReturnValue(model);
    render(<DecksGridPanel />);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(model.submitDeckDraft).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalledWith("/decks/d1");
  });
});

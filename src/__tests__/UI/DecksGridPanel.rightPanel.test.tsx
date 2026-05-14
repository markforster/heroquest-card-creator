import { fireEvent, render, screen } from "@testing-library/react";

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
          "actions.decks": "Decks",
          "actions.cancel": "Cancel",
          "actions.delete": "Delete",
          "decks.createDeck": "Create deck",
          "decks.untitledDeck": "Untitled deck",
          "decks.deleteDeckTitle": "Delete deck?",
          "decks.deleteDeckBody": "Delete body",
          "decks.title": "Title",
          "decks.description": "Description",
          "decks.descriptionPlaceholder": "Description placeholder",
          "decks.noDeckSelected": "Select a deck to view and edit its details.",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Decks/hooks/useDecksGridModel", () => ({
  useDecksGridModel: (...args: unknown[]) => mockUseDecksGridModel(...args),
}));

jest.mock("@/components/Decks/CardFan", () => ({
  __esModule: true,
  default: () => <div data-testid="card-fan" />,
}));

describe("DecksGridPanel right panel", () => {
  const createModel = (overrides: Record<string, unknown> = {}) => ({
    decks: [{ id: "d1", title: "Deck 1", updatedAt: Date.now() }],
    effectiveDeckTitleById: { d1: "Deck 1" },
    selectedDeckIds: new Set<string>(["d1"]),
    selectedDeckId: "d1",
    selectedDeckTitleDraft: "Deck 1",
    setSelectedDeckTitleDraft: jest.fn(),
    onDeckTitleDraftChangeLive: jest.fn(),
    isDeckTitleEditing: false,
    isDeckTitleSaving: false,
    deckTitleSaveError: null,
    canRenameDeck: true,
    canDeleteDecks: true,
    startDeckTitleEdit: jest.fn().mockReturnValue(true),
    commitDeckTitleEdit: jest.fn().mockResolvedValue(true),
    cancelDeckTitleEdit: jest.fn(),
    isDeleteDeckOpen: false,
    setIsDeleteDeckOpen: jest.fn(),
    deckTitleDraft: "",
    setDeckTitleDraft: jest.fn(),
    deckDescriptionDraft: "",
    setDeckDescriptionDraft: jest.fn(),
    selectDeck: jest.fn(),
    createDeck: jest.fn().mockResolvedValue("d1"),
    deleteSelectedDecks: jest.fn().mockResolvedValue(undefined),
    duplicateDeck: jest.fn().mockResolvedValue("d2"),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDecksGridModel.mockReturnValue(createModel());
  });

  it("renders right panel scaffold containers and top actions", () => {
    const { container } = render(<DecksGridPanel />);
    const rightPanel = container.querySelector("aside");
    expect(rightPanel).toBeTruthy();

    const toolbars = rightPanel?.querySelectorAll(".assetsToolbar");
    expect(toolbars?.length).toBe(2);
    expect(rightPanel?.querySelector(".decksRightSection")).toBeTruthy();
    expect(rightPanel?.querySelector(".decksGridRightMiddle")).toBeTruthy();

    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("disables edit and input for multi-select while keeping delete enabled", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
      selectedDeckIds: new Set<string>(["d1", "d2"]),
      selectedDeckId: null,
      selectedDeckTitleDraft: "",
      canRenameDeck: false,
      canDeleteDecks: true,
      }),
    );
    render(<DecksGridPanel />);

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Title" })).toBeDisabled();
  });

  it("wires title input events to rename handlers", async () => {
    const model = createModel();
    mockUseDecksGridModel.mockReturnValue(model);
    render(<DecksGridPanel />);

    const input = screen.getByRole("textbox", { name: "Title" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Deck Name 2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: "Escape" });

    expect(model.startDeckTitleEdit).toHaveBeenCalled();
    expect(model.onDeckTitleDraftChangeLive).toHaveBeenCalledWith("Deck Name 2");
    expect(model.commitDeckTitleEdit).toHaveBeenCalled();
    expect(model.cancelDeckTitleEdit).toHaveBeenCalled();
  });

  it("renders tile title from effective live title map", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
        effectiveDeckTitleById: { d1: "Live Deck Title" },
      }),
    );
    render(<DecksGridPanel />);
    expect(screen.getByText("Live Deck Title")).toBeInTheDocument();
  });

  it("shows 'Untitled deck' in grid tile when effective title is empty", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
        decks: [{ id: "d1", title: "", updatedAt: Date.now() }],
        effectiveDeckTitleById: { d1: "Untitled deck" },
      }),
    );
    render(<DecksGridPanel />);
    expect(screen.getByText("Untitled deck")).toBeInTheDocument();
  });

  it("navigates to deck route when Edit is clicked", () => {
    render(<DecksGridPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(mockNavigate).toHaveBeenCalledWith("/decks/d1");
  });

  it("shows no-selection message box when nothing is selected", () => {
    mockUseDecksGridModel.mockReturnValue(
      createModel({
        selectedDeckIds: new Set<string>(),
        selectedDeckId: null,
        canRenameDeck: false,
        canDeleteDecks: false,
      }),
    );

    render(<DecksGridPanel />);
    expect(screen.getByText("Select a deck to view and edit its details.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
  });
});

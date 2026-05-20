import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockRegisterDropHandler = jest.fn();
const mockAddFront = jest.fn();
const mockRefreshEntries = jest.fn();
const mockUpdateEntryCount = jest.fn();
const mockRemoveEntry = jest.fn();
const mockReorderEntries = jest.fn();
const mockDeletePair = jest.fn();

let pairedNotInSetFrontIds: string[] = [];

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    deletePair: (...args: unknown[]) => mockDeletePair(...args),
  },
}));

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  useDeckDetailSelection: () => ({
    selectedEntryId: null,
    selectedSetId: "set-1",
    setById: new Map(),
  }),
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => ({
    setId: "set-1",
    entries: [],
    entriesSorted: [],
    entryFrontIdByEntryId: new Map(),
    pairedNotInSetFrontIds,
    pairsById: new Map(),
    addFront: mockAddFront,
    refreshEntries: mockRefreshEntries,
    removeEntry: mockRemoveEntry,
    reorderEntries: mockReorderEntries,
    updateEntryCount: mockUpdateEntryCount,
  }),
}));

jest.mock("@/components/Decks/detail/boards/DeckBoardsCore", () => ({
  BOARD_ROUTING_META_BY_ID: {
    entries: { emitToken: "entry", acceptTokens: ["source-front"] },
  },
  useDeckMockDnd: () => ({
    registerDropHandler: mockRegisterDropHandler,
  }),
  useDeckSortableBoardViewModel: (_boardId: string, _routing: unknown, options: Record<string, unknown>) => ({
    config: { boardId: "entries", title: "Entries", allowMultipleGroups: false, allowGroupCreate: false, allowDropTarget: true },
    groupIds: [],
    itemsByGroup: {},
    activeSetId: null,
    activeGroupId: null,
    activeTargetBoardId: null,
    hoverBoundaryIndex: null,
    showDropAffordance: false,
    onHoverBoundary: jest.fn(),
    onLeaveBoard: jest.fn(),
    onCreateGroupAtIndex: jest.fn(),
    registerGroupRef: jest.fn(),
    groupLabelsById: {},
    setLabelsById: {},
    setCardIdById: {},
    renderSetContent: options.renderSetContent,
    renderTopToolbar: options.renderTopToolbar,
    renderBottomToolbar: options.renderBottomToolbar,
    renderBoardHeaderActions: options.renderBoardHeaderActions,
    isSetSelected: options.isSetSelected,
    emptyMessage: options.emptyMessage ?? null,
  }),
  DeckSortableBoardView: ({ model }: { model: { renderBoardHeaderActions?: () => React.ReactNode } }) => (
    <div>
      <div>Entries</div>
      {model.renderBoardHeaderActions ? model.renderBoardHeaderActions() : null}
    </div>
  ),
  DefaultSetThumbnailContent: ({ cardId }: { cardId?: string }) => <div>{cardId ?? "unknown-card"}</div>,
}));

describe("DeckEntriesBoardController recover paired modal", () => {
  const DeckEntriesBoardController =
    require("@/components/Decks/detail/boards/DeckEntriesBoardController").default;

  beforeEach(() => {
    pairedNotInSetFrontIds = [];
    mockRegisterDropHandler.mockReset();
    mockAddFront.mockReset();
    mockRefreshEntries.mockReset();
    mockUpdateEntryCount.mockReset();
    mockRemoveEntry.mockReset();
    mockReorderEntries.mockReset();
    mockDeletePair.mockReset();
    mockAddFront.mockResolvedValue([]);
    mockRefreshEntries.mockResolvedValue(undefined);
  });

  it("shows disabled recover button with zero count", () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Recover Paired (0)" });
    expect(button).toBeDisabled();
  });

  it("opens modal and supports checkbox/full-card selection with add selected", async () => {
    pairedNotInSetFrontIds = ["front-1", "front-2"];
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Recover Paired (2)" }));
    expect(screen.getByText("Recover Paired Cards")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "front-1" }));
    fireEvent.click(screen.getByRole("button", { name: "front-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Selected" }));

    await waitFor(() => {
      expect(mockAddFront).toHaveBeenCalledTimes(1);
      expect(mockAddFront).toHaveBeenCalledWith("front-2", "set-1");
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });

  it("supports ctrl/cmd additive selection and add all", async () => {
    pairedNotInSetFrontIds = ["front-1", "front-2", "front-3"];
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Recover Paired (3)" }));

    fireEvent.click(screen.getByRole("button", { name: "front-1" }));
    fireEvent.click(screen.getByRole("button", { name: "front-3" }), { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Add Selected" }));

    await waitFor(() => {
      expect(mockAddFront).toHaveBeenNthCalledWith(1, "front-1", "set-1");
      expect(mockAddFront).toHaveBeenNthCalledWith(2, "front-3", "set-1");
    });

    mockAddFront.mockClear();
    mockRefreshEntries.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Recover Paired (3)" }));
    fireEvent.click(screen.getByRole("button", { name: "Add All" }));

    await waitFor(() => {
      expect(mockAddFront).toHaveBeenNthCalledWith(1, "front-1", "set-1");
      expect(mockAddFront).toHaveBeenNthCalledWith(2, "front-2", "set-1");
      expect(mockAddFront).toHaveBeenNthCalledWith(3, "front-3", "set-1");
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });
});

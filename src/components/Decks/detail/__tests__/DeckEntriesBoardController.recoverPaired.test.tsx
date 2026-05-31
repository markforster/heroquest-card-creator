import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const mockRegisterDropHandler = jest.fn();
const mockAddFront = jest.fn();
const mockRefreshEntries = jest.fn();
const mockUpdateEntryCount = jest.fn();
const mockRemoveEntry = jest.fn();
const mockReorderEntries = jest.fn();
const mockDeletePair = jest.fn();
const mockUseCardThumbnailUrl = jest.fn();

let pairedNotInSetFrontIds: string[] = [];
let entriesSortedMock: Array<{ id: string; setId: string; pairId: string; sortIndex: number; count: number }> = [];
let selectedSetIdMock: string | null = "set-1";
let selectionSetByIdMock = new Map<string, { id: string; title: string; backFaceId: string }>();
let pairsByIdMock = new Map<
  string,
  {
    id: string;
    frontFaceId: string;
    backFaceId: string;
    name: string;
    nameLower: string;
    createdAt: number;
    updatedAt: number;
    schemaVersion: number;
  }
>();
let registeredDropHandler: ((event: any) => Promise<any>) | null = null;

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
    selectedSetId: selectedSetIdMock,
    setById: selectionSetByIdMock,
  }),
}));

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  useDeckRightPanel: () => ({
    backCards: [
      { id: "back-1", name: "Back Card Alpha" },
      { id: "back-2", name: "Back Card Beta" },
    ],
  }),
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: (...args: unknown[]) => mockUseCardThumbnailUrl(...args),
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => ({
    setId: "set-1",
    entries: [],
    entriesSorted: entriesSortedMock,
    entryFrontIdByEntryId: new Map(),
    pairedNotInSetFrontIds,
    pairsById: pairsByIdMock,
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
    registerDropHandler: (...args: unknown[]) => {
      mockRegisterDropHandler(...args);
      const maybeHandler = args[1];
      registeredDropHandler = typeof maybeHandler === "function" ? (maybeHandler as (event: any) => Promise<any>) : null;
      return () => undefined;
    },
  }),
  useDeckSortableBoardViewModel: (_boardId: string, _routing: unknown, options: Record<string, unknown>) => ({
    config: {
      boardId: "entries",
      title: options.title ?? "Entries",
      allowMultipleGroups: false,
      allowGroupCreate: false,
      allowDropTarget: true,
    },
    groupIds: ["entries:E1"],
    itemsByGroup: { "entries:E1": entriesSortedMock.map((entry) => `entry:${entry.id}`) },
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
    onSetClick: options.onSetClick,
    isSetSelected: options.isSetSelected,
    emptyMessage: options.emptyMessage ?? null,
  }),
  DeckSortableBoardView: ({ model }: { model: any }) => (
    <div>
      <div>{model.config?.title}</div>
      {model.renderBoardHeaderActions ? model.renderBoardHeaderActions() : null}
      <div>
        {(model?.itemsByGroup?.["entries:E1"] ?? []).map((setId: string) => (
          <button
            key={setId}
            type="button"
            data-testid={`entry-${setId}`}
            className={model.isSetSelected?.(setId, "entries:E1") ? "selected" : ""}
            onClick={(event) =>
              model.onSetClick?.(setId, "entries:E1", { additive: event.metaKey || event.ctrlKey })
            }
          >
            {setId}
          </button>
        ))}
      </div>
    </div>
  ),
  DefaultSetThumbnailContent: ({ cardId }: { cardId?: string }) => <div>{cardId ?? "unknown-card"}</div>,
}));

describe("DeckEntriesBoardController recover paired modal", () => {
  const DeckEntriesBoardController =
    require("@/components/Decks/detail/boards/DeckEntriesBoardController").default;

  beforeEach(() => {
    selectedSetIdMock = "set-1";
    selectionSetByIdMock = new Map([["set-1", { id: "set-1", title: "Selected Set", backFaceId: "back-1" }]]);
    pairedNotInSetFrontIds = [];
    entriesSortedMock = [
      { id: "entry-1", setId: "set-1", pairId: "pair-1", sortIndex: 0, count: 1 },
      { id: "entry-2", setId: "set-1", pairId: "pair-2", sortIndex: 1, count: 1 },
    ];
    pairsByIdMock = new Map([
      [
        "pair-1",
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      [
        "pair-2",
        {
          id: "pair-2",
          frontFaceId: "front-2",
          backFaceId: "back-1",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
    ]);
    mockRegisterDropHandler.mockReset();
    mockAddFront.mockReset();
    mockRefreshEntries.mockReset();
    mockUpdateEntryCount.mockReset();
    mockRemoveEntry.mockReset();
    mockReorderEntries.mockReset();
    mockDeletePair.mockReset();
    mockUseCardThumbnailUrl.mockReset();
    registeredDropHandler = null;
    mockAddFront.mockResolvedValue([]);
    mockRefreshEntries.mockResolvedValue(undefined);
    mockRemoveEntry.mockResolvedValue(undefined);
    mockDeletePair.mockResolvedValue(undefined);
    mockUseCardThumbnailUrl.mockImplementation((cardId: string | null) =>
      cardId ? `thumb:${cardId}` : null,
    );
  });

  it("persists reorder for ENTRIES_REORDER raw entry ids", async () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);
    expect(registeredDropHandler).not.toBeNull();

    await registeredDropHandler?.({
      kind: "ENTRIES_REORDER",
      dragId: "drag-test-1",
      orderedEntryIds: ["entry-2", "entry-1"],
    });

    expect(mockReorderEntries).toHaveBeenCalledWith(["entry-2", "entry-1"]);
  });

  it("shows disabled recover button with zero count", () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Recover Paired (0)" });
    expect(button).toBeDisabled();
    const removeSelectedButton = screen.getByRole("button", { name: "Remove Selected (0)" });
    expect(removeSelectedButton).toBeDisabled();
    expect(removeSelectedButton.className).toContain("removeSelectedButton");
    expect(screen.getByRole("img", { name: "Selected set back" })).toBeInTheDocument();
    expect(screen.getByText("Back Card Alpha")).toBeInTheDocument();
  });

  it("renders text-only Entries title when selected set is unavailable", () => {
    selectedSetIdMock = null;
    selectionSetByIdMock = new Map();

    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    expect(screen.queryByText("Entries")).toBeNull();
    expect(screen.queryByRole("img", { name: "Selected set back" })).toBeNull();
    expect(screen.getByTestId("entries-empty-state-board")).toBeInTheDocument();
    expect(screen.getByText("Select a set to view entries.")).toBeInTheDocument();
    expect(screen.queryByTestId("entry-entry:entry-1")).toBeNull();
  });

  it("renders Entries text fallback while keeping thumbnail when back card title is unavailable", () => {
    selectedSetIdMock = "set-1";
    selectionSetByIdMock = new Map([["set-1", { id: "set-1", title: "Set Without Back", backFaceId: "back-missing" }]]);

    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    expect(screen.getByText("Entries")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Selected set back" })).toBeInTheDocument();
  });

  it("supports single and ctrl/cmd additive entry selection and updates delete count", () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    const entry1 = screen.getByTestId("entry-entry:entry-1");
    const entry2 = screen.getByTestId("entry-entry:entry-2");
    fireEvent.click(entry1);
    expect(entry1.className).toContain("selected");
    expect(screen.getByRole("button", { name: "Remove Selected (1)" })).toBeEnabled();

    fireEvent.click(entry2, { ctrlKey: true });
    expect(entry2.className).toContain("selected");
    expect(screen.getByRole("button", { name: "Remove Selected (2)" })).toBeEnabled();
  });

  it("bulk Remove from set deletes all selected entries and refreshes", async () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByTestId("entry-entry:entry-1"));
    fireEvent.click(screen.getByTestId("entry-entry:entry-2"), { metaKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Selected (2)" }));

    expect(screen.getByText("Remove 2 entries from set?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "decks.removeFromSet" }));

    await waitFor(() => {
      expect(mockRemoveEntry).toHaveBeenCalledWith("entry-1", "set-1");
      expect(mockRemoveEntry).toHaveBeenCalledWith("entry-2", "set-1");
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });

  it("bulk Remove and unpair unpairs all selected entries", async () => {
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByTestId("entry-entry:entry-1"));
    fireEvent.click(screen.getByTestId("entry-entry:entry-2"), { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Selected (2)" }));

    fireEvent.click(screen.getByRole("button", { name: "decks.removeAndUnpair" }));

    await waitFor(() => {
      expect(mockDeletePair).toHaveBeenCalledTimes(2);
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });

  it("opens modal with select-all/cancel/recover-selected and supports recover selected", async () => {
    pairedNotInSetFrontIds = ["front-1", "front-2"];
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Recover Paired (2)" }));
    expect(screen.getByText("Recover Paired Cards")).toBeInTheDocument();
    expect(document.querySelector(".cardsPopover")).not.toBeNull();
    expect(document.querySelector(".recoverModalScrollArea")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add All" })).toBeNull();
    expect(screen.getByRole("button", { name: "Recover Selected" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "front-1" }));
    fireEvent.click(screen.getByRole("button", { name: "front-2" }), { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Recover Selected" }));

    await waitFor(() => {
      expect(mockAddFront).toHaveBeenCalledTimes(2);
      expect(mockAddFront).toHaveBeenCalledWith("front-1", "set-1");
      expect(mockAddFront).toHaveBeenCalledWith("front-2", "set-1");
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });

  it("supports select all/none tri-state flow and recover selected as sole commit action", async () => {
    pairedNotInSetFrontIds = ["front-1", "front-2", "front-3"];
    render(<DeckEntriesBoardController onOpenCardEditor={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Recover Paired (3)" }));
    const selectAll = screen.getByRole("checkbox", { name: "Select all recoverable cards" }) as HTMLInputElement;
    const recoverSelected = screen.getByRole("button", { name: "Recover Selected" });

    expect(selectAll.checked).toBe(false);
    expect(recoverSelected).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "front-1" }));
    expect(recoverSelected).toBeEnabled();
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(true);

    fireEvent.click(selectAll);
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);

    fireEvent.click(selectAll);
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(false);
    expect(recoverSelected).toBeDisabled();

    fireEvent.click(selectAll);
    fireEvent.click(recoverSelected);

    await waitFor(() => {
      expect(mockAddFront).toHaveBeenNthCalledWith(1, "front-1", "set-1");
      expect(mockAddFront).toHaveBeenNthCalledWith(2, "front-2", "set-1");
      expect(mockAddFront).toHaveBeenNthCalledWith(3, "front-3", "set-1");
      expect(mockRefreshEntries).toHaveBeenCalledWith("set-1");
    });
  });

  it("defines entries remove-hover danger pulse selector and reduced-motion fallback in styles", () => {
    const cssPath = path.resolve(
      process.cwd(),
      "src/components/Decks/detail/DeckGroupsSection2.module.css",
    );
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(':has(.removeSelectedButton:hover) .setCardSelected .setThumb');
    expect(css).toContain(
      ':has(.removeSelectedButton:focus-visible) .setCardSelected .setThumb',
    );
    expect(css).toContain(':has(.removeSelectedButton:hover) .setCard:not(.setCardSelected)');
    expect(css).toContain(
      ':has(.removeSelectedButton:focus-visible) .setCard:not(.setCardSelected)',
    );
    expect(css).toContain(".setCardBottomToolbar");
    expect(css).toContain("transform: translate(-50%, -4px);");
    expect(css).toContain(".setShell:hover .setCardTopToolbar");
    expect(css).toContain("transform: translate(-50%, 2px);");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("entriesRemoveSelectedWarningPulse");
  });
});

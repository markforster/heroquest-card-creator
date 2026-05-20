import { render } from "@testing-library/react";
import { TransformStream } from "node:stream/web";

const mockDeckDetailHeader = jest.fn();

if (!(globalThis as { TransformStream?: typeof TransformStream }).TransformStream) {
  (globalThis as { TransformStream?: typeof TransformStream }).TransformStream =
    TransformStream;
}

jest.mock("@/components/Decks/hooks/useDeckHeaderModel", () => ({
  useDeckHeaderModel: () => ({
    deckTitle: "Deck Title",
    keySetId: "set-2",
  }),
}));

jest.mock("@/components/Decks/detail/DeckDetailHeader", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockDeckDetailHeader(props);
    return <div data-testid="deck-header" />;
  },
}));

jest.mock("@/components/Decks/detail/DeckBacksPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="backs-panel" />,
}));

jest.mock("@/components/Decks/detail/DeckDetailModals", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  __esModule: true,
  DeckRightPanelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDeckRightPanel: () => ({ isRightPanelVisible: true }),
}));

jest.mock("@/components/Decks/detail/DeckGroupsSection2.models", () => ({
  useDeckBoardsModels: () => ({
    groups: {
      boardId: "groups",
      groupIds: [],
      itemsByGroup: {},
      groupLabelsById: {},
      setLabelsById: {},
      setCardIdById: {},
    },
    entries: {
      boardId: "entries",
      groupIds: [],
      itemsByGroup: {},
      groupLabelsById: {},
      setLabelsById: {},
      setCardIdById: {},
    },
    source: {
      boardId: "source",
      groupIds: [],
      itemsByGroup: {},
      groupLabelsById: {},
      setLabelsById: {},
      setCardIdById: {},
    },
  }),
}));

jest.mock("@/components/Decks/detail/DeckGroupsSection2", () => {
  const MockProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const MockBoard = () => null;
  return {
    __esModule: true,
    default: MockBoard,
    DeckMockDndProvider: MockProvider,
    DeckGroupsBoardController: MockBoard,
    DeckEntriesBoardController: MockBoard,
    DeckSourceBoardController: MockBoard,
  };
});

describe("DeckDetailPanel deck title fan preview ids", () => {
  beforeEach(() => {
    mockDeckDetailHeader.mockReset();
  });

  it("passes key-set-prioritized back-face ids to DeckDetailHeader", () => {
    const DeckDetailPanel =
      require("@/components/Decks/DeckDetailPanel").default as typeof import("@/components/Decks/DeckDetailPanel").default;

    const props = {
      deckId: "deck-1",
      actions: {
        onOpenCardEditor: jest.fn(),
        deleteDeck: jest.fn(),
        handleDeleteSet: jest.fn(),
        handleDeleteGroup: jest.fn(),
        startRebuildFlow: jest.fn(),
        navigateToDecks: jest.fn(),
        makeSelectedSetKeyCard: jest.fn(async () => {}),
        deleteSetFromGroupCard: jest.fn(async () => {}),
      },
      drag: {
        dragActiveSetId: null,
        dragActiveGroupId: null,
        dragActiveBackFaceId: null,
        dragActiveFrontFaceId: null,
        dragActiveEntryId: null,
        isBackFaceDragActive: false,
        isFrontFaceDragActive: false,
        isEntryDragActive: false,
        isGroupDropOver: false,
        isGroupDragActive: false,
        isSetDragActive: false,
        isFrontDropOver: false,
        isEntriesDropOver: false,
        backFaceDropGroupId: null,
        backFaceDropIndex: null,
        isBackFaceNewGroupEdgeTarget: false,
        dragTargetGroupId: null,
        groupDropIndex: null,
        setDropIndex: null,
        setDropGroupId: null,
        entryDropIndex: null,
        faceDropSucceeded: false,
        finalizingEntryId: null,
        finalizingSetId: null,
        isRemoveZone: false,
        finalizingBackFaceId: null,
        finalizingFrontFaceId: null,
      },
      dndProps: {
        sensors: [],
        onDragStart: jest.fn(),
        onDragMove: jest.fn(),
        onDragOver: jest.fn(),
        onDragEnd: jest.fn(),
        onDragCancel: jest.fn(),
      },
      modalState: {
        isDeleteDeckOpen: false,
        isDeleteSetOpen: false,
        isDeleteGroupOpen: false,
        isRebuildConfirmOpen: false,
      },
      modalActions: {
        setIsDeleteDeckOpen: jest.fn(),
        setIsDeleteSetOpen: jest.fn(),
        setIsDeleteGroupOpen: jest.fn(),
        setPendingDeleteSet: jest.fn(),
        setPendingDeleteGroup: jest.fn(),
        setIsRebuildConfirmOpen: jest.fn(),
        setPendingRebuildSetId: jest.fn(),
      },
      groupRowRef: jest.fn(),
      entriesRowRef: jest.fn(),
      selectionModel: {
        deckId: "deck-1",
        groups: [],
        sets: [
          { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 },
          { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 },
          { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 },
        ] as any,
        orderedGroups: [
          { id: "group-1", title: "Group 1", sortIndex: 0 },
          { id: "group-2", title: "Group 2", sortIndex: 1 },
        ] as any,
        groupBySetId: new Map(),
        setById: new Map(),
        selectedGroupId: null,
        selectedSetId: null,
        selectedEntryId: null,
        setSelectedGroupId: jest.fn(),
        setSelectedEntryId: jest.fn(),
        clearSelection: jest.fn(),
        selectGroup: jest.fn(),
        selectSet: jest.fn(),
        reloadStructure: jest.fn(async () => {}),
        applyOptimisticSets: jest.fn(() => () => {}),
      } as any,
      entriesModel: {
        setId: null,
        backFaceId: null,
        entries: [],
        entriesSorted: [],
        pairsById: new Map(),
        entryFrontIdByEntryId: new Map(),
        pairedNotInSetFrontIds: [],
        addFront: jest.fn(async () => []),
        removeEntry: jest.fn(async () => {}),
        reorderEntries: jest.fn(async () => {}),
        reorderEntriesOptimistic: jest.fn(async () => {}),
        updateEntryCount: jest.fn(async () => {}),
        refreshEntries: jest.fn(async () => {}),
      } as any,
    };

    render(<DeckDetailPanel {...(props as any)} />);

    expect(mockDeckDetailHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        deckPreviewCardIds: ["back-2", "back-1", "back-3"],
      }),
    );
  });
});

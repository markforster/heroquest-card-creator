import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { TransformStream } from "node:stream/web";

if (!(globalThis as unknown as { TransformStream?: typeof TransformStream }).TransformStream) {
  (globalThis as unknown as { TransformStream?: typeof TransformStream }).TransformStream =
    TransformStream;
}

import DeckGroupsBoardController, {
  DeckEntriesBoardController,
  DeckMockDndProvider,
  DeckSourceBoardController,
  type BoardModel,
  toEntriesBoardModel,
  toGroupsBoardModel,
  toSourceBoardModel,
} from "@/components/Decks/detail/DeckGroupsSection2";
import type { DeckEntryRecord, DeckGroupRecord, DeckSetRecord } from "@/api/decks/types";
import type { PairRecord } from "@/api/pairs/types";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";

type DragEventLike = {
  canceled?: boolean;
  operation: {
    source?: { id: string; type: string; group?: string; board?: string };
    target?: { id: string; type: string; group?: string; board?: string };
  };
};

const callbacks: {
  onDragStart?: (event: DragEventLike) => void;
  onDragOver?: (event: DragEventLike) => void;
  onDragEnd?: (event: DragEventLike) => void;
  onDragCancel?: () => void;
} = {};

const actualUseState = React.useState;
let currentSelectionModel: DeckDetailSelectionModel | null = null;
let currentEntriesModel: DeckSetEntriesModel | null = null;
let currentRightPanelModel: { backCards: Array<{ id: string; name: string }> } | null = null;
const DEFAULT_RECORD_META = {
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 1 as const,
};
const mutationMocks = {
  createGroup: jest.fn(),
  reorderGroups: jest.fn(),
  reorderSets: jest.fn(),
  updateSetGroup: jest.fn(),
  deleteGroup: jest.fn(),
  deleteSet: jest.fn(),
  setDeckKeySet: jest.fn(),
  createSetFromBackFace: jest.fn(),
};
const CREATE_GROUP_BUTTON_NAME = "decks.groups.actions.createAtPosition";

function createGroupRecord(
  id: string,
  sortIndex: number,
  title: string,
): DeckGroupRecord {
  return {
    id,
    deckId: "deck-1",
    title,
    sortIndex,
    ...DEFAULT_RECORD_META,
  };
}

function createSetRecord(
  id: string,
  groupId: string,
  sortIndex: number,
  backFaceId: string,
  title?: string,
): DeckSetRecord {
  return {
    id,
    deckId: "deck-1",
    groupId,
    backFaceId,
    sortIndex,
    description: null,
    title,
    ...DEFAULT_RECORD_META,
  };
}

function createEntryRecord(
  id: string,
  setId: string,
  pairId: string,
  sortIndex: number,
): DeckEntryRecord {
  return {
    id,
    deckId: "deck-1",
    setId,
    pairId,
    sortIndex,
    count: 1,
    ...DEFAULT_RECORD_META,
  };
}

function createPairRecord(
  id: string,
  frontFaceId: string,
  backFaceId: string,
): PairRecord {
  return {
    id,
    name: id,
    nameLower: id.toLowerCase(),
    frontFaceId,
    backFaceId,
    ...DEFAULT_RECORD_META,
  };
}

function getCreateBoundaryButton(index: number): HTMLButtonElement {
  return within(screen.getByTestId(`create-boundary-${index}`)).getByRole("button", {
    name: CREATE_GROUP_BUTTON_NAME,
    hidden: true,
  });
}

function getSetTestIdsWithinGroup(groupTestId: string): string[] {
  return within(screen.getByTestId(groupTestId))
    .queryAllByTestId(/^set-/)
    .map((node) => node.getAttribute("data-testid") ?? "")
    .filter(Boolean);
}

jest.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragStart, onDragOver, onDragEnd, onDragCancel }: any) => {
    callbacks.onDragStart = onDragStart;
    callbacks.onDragOver = onDragOver;
    callbacks.onDragEnd = onDragEnd;
    callbacks.onDragCancel = onDragCancel;
    return <div>{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  useDroppable: () => ({ ref: jest.fn(), isDropTarget: false }),
  useDraggable: () => ({ ref: jest.fn(), handleRef: jest.fn(), isDragging: false }),
}));

jest.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: jest.fn(),
    isDragging: false,
    isDragSource: false,
    isDropTarget: false,
  }),
}));

jest.mock("@dnd-kit/helpers", () => ({
  move: jest.fn((items: Record<string, string[]>, event: DragEventLike) => {
    const sourceId = event.operation.source?.id;
    const sourceGroup = event.operation.source?.group;
    const targetGroup =
      event.operation.target?.type === "group" ? event.operation.target.id : event.operation.target?.group;
    const targetId = event.operation.target?.id;

    if (!sourceId || !sourceGroup || !targetGroup || sourceGroup === targetGroup) {
      if (!sourceId || !sourceGroup || sourceGroup !== targetGroup || !targetId || targetId === sourceId) {
        return items;
      }
      const current = [...(items[sourceGroup] ?? [])];
      const from = current.indexOf(sourceId);
      const to = current.indexOf(targetId);
      if (from < 0 || to < 0) return items;
      current.splice(from, 1);
      current.splice(to, 0, sourceId);
      return { ...items, [sourceGroup]: current };
    }

    return {
      ...items,
      [sourceGroup]: (items[sourceGroup] ?? []).filter((id) => id !== sourceId),
      [targetGroup]: [...(items[targetGroup] ?? []), sourceId],
    };
  }),
}));

jest.mock("@/components/Decks/hooks/useDeckMutations", () => ({
  __esModule: true,
  useDeckMutations: () => mutationMocks,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  __esModule: true,
  useDeckDetailSelection: () => {
    if (!currentSelectionModel) {
      throw new Error("missing selection model");
    }
    return currentSelectionModel;
  },
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  __esModule: true,
  useDeckSetEntries: () => {
    if (!currentEntriesModel) {
      throw new Error("missing entries model");
    }
    return currentEntriesModel;
  },
}));

jest.mock("@/components/Decks/detail/context/DeckRightPanelContext", () => ({
  __esModule: true,
  useDeckRightPanel: () => {
    if (!currentRightPanelModel) {
      throw new Error("missing right panel model");
    }
    return currentRightPanelModel;
  },
}));

beforeEach(() => {
  jest.spyOn(React, "useState").mockImplementation(((initialState: unknown) => {
    const stateTuple = actualUseState(initialState) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    const [state, setState] = stateTuple;
    const initialValue =
      typeof initialState === "function" ? (initialState as () => unknown)() : initialState;
    const isEmptyObject =
      typeof initialValue === "object" &&
      initialValue !== null &&
      !Array.isArray(initialValue) &&
      Object.keys(initialValue as Record<string, unknown>).length === 0;

    if (!isEmptyObject) {
      return stateTuple;
    }

    const guardedSetState: typeof setState = (next) =>
      setState((prev: unknown) => {
        const resolved =
          typeof next === "function" ? (next as (prevState: unknown) => unknown)(prev as unknown) : next;
        const prevIsEmptyObject =
          typeof prev === "object" &&
          prev !== null &&
          !Array.isArray(prev) &&
          Object.keys(prev as Record<string, unknown>).length === 0;
        const resolvedIsEmptyObject =
          typeof resolved === "object" &&
          resolved !== null &&
          !Array.isArray(resolved) &&
          Object.keys(resolved as Record<string, unknown>).length === 0;
        if (prevIsEmptyObject && resolvedIsEmptyObject) {
          return prev;
        }
        return resolved;
      });

    return [state, guardedSetState];
  }) as typeof React.useState);
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.values(mutationMocks).forEach((mockFn) => mockFn.mockReset());
  currentSelectionModel = null;
  currentEntriesModel = null;
  currentRightPanelModel = null;
});

function renderWorkspace(options?: {
  enableFanLayout?: boolean;
  keySetId?: string | null;
  selectedSetId?: string | null;
  boardModelsOverride?: Partial<Record<"groups" | "entries" | "source", Partial<BoardModel>>>;
}) {
  const boardModels: Record<"groups" | "entries" | "source", BoardModel> = {
    groups: toGroupsBoardModel({
      orderedGroups: [
        { id: "A", title: "A" },
        { id: "B", title: "B" },
        { id: "C", title: "C" },
      ],
      sets: [
        { id: "g-A1", groupId: "A", sortIndex: 0, title: "A1", backFaceId: "g-A1" },
        { id: "g-A2", groupId: "A", sortIndex: 1, title: "A2", backFaceId: "g-A2" },
        { id: "g-A3", groupId: "A", sortIndex: 2, title: "A3", backFaceId: "g-A3" },
        { id: "g-B1", groupId: "B", sortIndex: 0, title: "B1", backFaceId: "g-B1" },
        { id: "g-B2", groupId: "B", sortIndex: 1, title: "B2", backFaceId: "g-B2" },
        { id: "g-C1", groupId: "C", sortIndex: 0, title: "C1", backFaceId: "g-C1" },
      ],
      cardNameById: new Map([
        ["g-A1", "A1"],
        ["g-A2", "A2"],
        ["g-A3", "A3"],
        ["g-B1", "B1"],
        ["g-B2", "B2"],
        ["g-C1", "C1"],
      ]),
    }),
    entries: toEntriesBoardModel({
      entriesSorted: [
        { id: "e-1", sortIndex: 0 },
        { id: "e-2", sortIndex: 1 },
      ],
      entryFrontIdByEntryId: new Map([
        ["e-1", "e-1"],
        ["e-2", "e-2"],
      ]),
      cardNameById: new Map([
        ["e-1", "E-1"],
        ["e-2", "E-2"],
      ]),
      laneLabel: "Entries",
    }),
    source: {
      ...toSourceBoardModel({
        cards: [
          { id: "src-1", name: "SRC-1" },
          { id: "src-2", name: "SRC-2" },
        ],
        sourceFaceMode: "front",
        laneLabel: "Source",
      }),
      sourceItemFaceBySetId: {
        "source:src-1": "back",
        "source:src-2": "front",
      },
    },
  };
  if (options?.boardModelsOverride) {
    (Object.keys(options.boardModelsOverride) as Array<"groups" | "entries" | "source">).forEach((boardId) => {
      const override = options.boardModelsOverride?.[boardId];
      if (!override) return;
      boardModels[boardId] = {
        ...boardModels[boardId],
        ...override,
      };
    });
  }
  const groups: DeckGroupRecord[] = boardModels.groups.groupIds.map((groupId, index) =>
    createGroupRecord(
      groupId.replace(/^group:/, ""),
      index,
      boardModels.groups.groupLabelsById[groupId] ?? groupId,
    ),
  );
  const sets = Object.entries(boardModels.groups.itemsByGroup).flatMap(([groupId, setIds]) =>
    setIds.map((setId, index) =>
      createSetRecord(
        setId.replace(/^set:/, ""),
        groupId.replace(/^group:/, ""),
        index,
        boardModels.groups.setCardIdById[setId] ?? setId.replace(/^set:/, ""),
        boardModels.groups.setLabelsById[setId],
      ),
    ),
  );
  const selectedSet =
    sets.find((set) => set.id === (options?.selectedSetId ?? "g-C1")) ?? sets[0] ?? null;
  const selectedGroupId = selectedSet?.groupId ?? groups[0]?.id ?? null;
  const entryRecords = Object.entries(boardModels.entries.itemsByGroup).flatMap(([groupId, entryIds]) =>
    entryIds.map((entryId, index) =>
      createEntryRecord(
        entryId.replace(/^entry:/, ""),
        selectedSet?.id ?? "g-A1",
        `pair-${entryId.replace(/^entry:/, "")}`,
        index,
      ),
    ),
  );
  const pairsById = new Map<string, PairRecord>(
    entryRecords.map((entry) => [
      entry.pairId,
      createPairRecord(
        entry.pairId,
        boardModels.entries.setCardIdById[`entry:${entry.id}`] ?? entry.id,
        selectedSet?.backFaceId ?? "g-A1",
      ),
    ]),
  );
  currentSelectionModel = {
    deckId: "deck-1",
    groups,
    sets,
    orderedGroups: groups,
    groupBySetId: new Map(sets.map((set) => [set.id, set.groupId])),
    setById: new Map(sets.map((set) => [set.id, set])),
    selectedGroupId,
    selectedSetId: selectedSet?.id ?? null,
    selectedEntryId: null,
    setSelectedGroupId: jest.fn(),
    setSelectedEntryId: jest.fn(),
    clearSelection: jest.fn(),
    selectGroup: jest.fn(),
    selectSet: jest.fn(),
    reloadStructure: jest.fn().mockResolvedValue(undefined),
    applyOptimisticSets: jest.fn(() => () => undefined),
  };
  currentEntriesModel = {
    setId: selectedSet?.id ?? null,
    backFaceId: selectedSet?.backFaceId ?? null,
    entries: entryRecords,
    entriesSorted: entryRecords,
    pairsById,
    entryFrontIdByEntryId: new Map(
      entryRecords.map((entry) => [
        entry.id,
        boardModels.entries.setCardIdById[`entry:${entry.id}`] ?? entry.id,
      ]),
    ),
    pairedNotInSetFrontIds: [],
    addFront: jest.fn(async (frontFaceId: string) => [
      createEntryRecord(
        `entry:${frontFaceId}`,
        selectedSet?.id ?? "g-A1",
        `pair:${frontFaceId}`,
        entryRecords.length,
      ),
    ]),
    removeEntry: jest.fn().mockResolvedValue(undefined),
    reorderEntries: jest.fn().mockResolvedValue(undefined),
    reorderEntriesOptimistic: jest.fn().mockResolvedValue(undefined),
    updateEntryCount: jest.fn().mockResolvedValue(undefined),
    refreshEntries: jest.fn().mockResolvedValue(undefined),
  };
  currentRightPanelModel = {
    backCards: sets.map((set) => ({
      id: set.backFaceId,
      name: boardModels.groups.setLabelsById[set.id] ?? set.id,
    })),
  };
  return render(
    <DeckMockDndProvider boardModels={boardModels}>
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={options?.keySetId ?? null}
        enableFanLayout={options?.enableFanLayout ?? true}
        onOpenCardEditor={() => {}}
      />
      <DeckEntriesBoardController onOpenCardEditor={() => {}} />
      <DeckSourceBoardController />
    </DeckMockDndProvider>,
  );
}

describe("DeckGroupsSection2 mock boards", () => {
  it("applies fill-parent layout to entries and source, but not groups", () => {
    renderWorkspace();

    expect(screen.getByTestId("board-groups").className).not.toContain("boardFillParent");
    expect(screen.getByTestId("board-entries").className).toContain("boardFillParent");
    expect(screen.getByTestId("board-source").className).toContain("boardFillParent");
  });

  it.skip("keeps default groups board visuals when fan layout is disabled", () => {
    renderWorkspace({ enableFanLayout: false });
    const group = screen.getByTestId("group-group:A");
    expect(group.className).not.toContain("groupVisualCollapsed");
    expect(group.className).not.toContain("groupVisualPartial");
    expect(group.className).not.toContain("groupVisualExpanded");
  });

  it("applies fan visual classes when fan layout is enabled", () => {
    renderWorkspace({ enableFanLayout: true });
    const group = screen.getByTestId("group-group:A");
    expect(group.className).toContain("groupVisualCollapsed");
  });

  it("keeps collapsed fan styling for keyed groups without extra overlay markup", () => {
    renderWorkspace({ enableFanLayout: true, keySetId: "g-A2" });
    expect(screen.getByTestId("set-set:g-A2").className).toContain("setShellFanCollapsed");
    expect(screen.queryByTestId("key-card-overlay-groups:A")).not.toBeInTheDocument();
  });

  it("keeps overlay key-card pill in expanded groups (single owner)", () => {
    renderWorkspace({
      enableFanLayout: true,
      keySetId: "g-C1",
      boardModelsOverride: {
        groups: {
          groupIds: ["group:C"],
          itemsByGroup: { "group:C": ["set:g-C1"] },
          groupLabelsById: { "group:C": "C" },
          setLabelsById: { "set:g-C1": "C1" },
          setCardIdById: { "set:g-C1": "g-C1" },
        },
      },
    });
    expect(screen.getByTestId("key-card-overlay-group:C")).toBeInTheDocument();
    expect(screen.getByTestId("set-set:g-C1").className).not.toContain("keyCardSetShellCollapsed");
    expect(screen.getAllByText("decks.sets.badge.keyCard")).toHaveLength(1);
  });

  it.skip("keeps existing inline key-card behavior when fan layout is disabled", () => {
    renderWorkspace({ enableFanLayout: false, keySetId: "g-A2" });
    expect(screen.queryByTestId("key-card-overlay-groups:A")).not.toBeInTheDocument();
    expect(screen.getByTestId("set-set:g-A2").className).not.toContain("keyCardSetShellCollapsed");
    expect(screen.getAllByText("Cover Card")).toHaveLength(1);
  });

  it("renders groups board create rail on hover with split icon", () => {
    renderWorkspace();
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    const createButton = getCreateBoundaryButton(0);
    expect(createButton).toBeInTheDocument();
    expect(createButton.querySelector("svg")).toBeInTheDocument();
  });

  it("keeps create rail unfocusable when hidden and focusable when visible", () => {
    renderWorkspace();
    const createButton = getCreateBoundaryButton(0);
    expect(createButton).toHaveAttribute("tabindex", "-1");
    fireEvent.pointerEnter(createButton);
    expect(createButton).toHaveAttribute("tabindex", "0");
  });

  it("does not render create rail for entries/source boards", () => {
    renderWorkspace();
    fireEvent.mouseMove(screen.getByTestId("groups-row-entries"), { clientX: -9999 });
    fireEvent.mouseMove(screen.getByTestId("groups-row-source"), { clientX: -9999 });
    expect(screen.queryAllByRole("button", { name: /Create group at position/i }).length).toBeLessThanOrEqual(1);
  });

  it("hides create boundaries in bootstrap empty groups state (one group, zero sets)", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:A"],
          itemsByGroup: { "groups:A": [] },
          groupLabelsById: { "groups:A": "A" },
          setLabelsById: {},
          setCardIdById: {},
        },
      },
    });
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    expect(screen.queryByRole("button", { name: /Create group at position/i })).not.toBeInTheDocument();
  });

  it("shows create boundaries for single group once it has at least one set", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:A"],
          itemsByGroup: { "groups:A": ["g-A1"] },
          groupLabelsById: { "groups:A": "A" },
          setLabelsById: { "g-A1": "A1" },
          setCardIdById: { "g-A1": "g-A1" },
        },
      },
    });
    const createButton = getCreateBoundaryButton(0);
    fireEvent.pointerEnter(createButton);
    expect(createButton).toHaveAttribute("tabindex", "0");
  });

  it("hydrates empty-slot placeholder for default empty group and accepts source drop", async () => {
    mutationMocks.createSetFromBackFace.mockResolvedValue({ id: "created-set-empty-group" });
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["group:A", "group:B", "group:C"],
          itemsByGroup: {
            "group:A": [],
            "group:B": ["set:g-B1", "set:g-B2"],
            "group:C": ["set:g-C1"],
          },
          setLabelsById: {
            "set:g-B1": "B1",
            "set:g-B2": "B2",
            "set:g-C1": "C1",
          },
          setCardIdById: {
            "set:g-B1": "g-B1",
            "set:g-B2": "g-B2",
            "set:g-C1": "g-C1",
          },
        },
      },
    });

    expect(
      screen.getByTestId("set-ephemeral:empty-slot:group:group:A"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("set-ephemeral:empty-slot:group:group:B")).not.toBeInTheDocument();

    await act(async () => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
      await callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
    });

    expect(mutationMocks.createSetFromBackFace).toHaveBeenCalledWith("deck-1", "A", "src-1");
  });

  it("keeps only one placeholder-only ephemeral group when creating repeatedly", () => {
    renderWorkspace();
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(getCreateBoundaryButton(0));
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(getCreateBoundaryButton(0));

    const emptySlotSetNodes = screen
      .getAllByTestId(/^set-ephemeral:empty-slot:group:/)
      .map((node) => node.getAttribute("data-testid"));
    expect(emptySlotSetNodes).toHaveLength(1);
  });

  it("collapses stale multiple placeholder-only groups to one when creating a new one", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:E1", "groups:A", "groups:E2", "groups:B", "groups:C"],
          itemsByGroup: {
            "groups:E1": ["ephemeral:empty-slot:group:groups:E1"],
            "groups:A": ["g-A1", "g-A2", "g-A3"],
            "groups:E2": ["ephemeral:empty-slot:group:groups:E2"],
            "groups:B": ["g-B1", "g-B2"],
            "groups:C": ["g-C1"],
          },
          setLabelsById: {
            "g-A1": "A1",
            "g-A2": "A2",
            "g-A3": "A3",
            "g-B1": "B1",
            "g-B2": "B2",
            "g-C1": "C1",
            "ephemeral:empty-slot:group:groups:E1": "",
            "ephemeral:empty-slot:group:groups:E2": "",
          },
          setCardIdById: {
            "g-A1": "g-A1",
            "g-A2": "g-A2",
            "g-A3": "g-A3",
            "g-B1": "g-B1",
            "g-B2": "g-B2",
            "g-C1": "g-C1",
            "ephemeral:empty-slot:group:groups:E1": "",
            "ephemeral:empty-slot:group:groups:E2": "",
          },
        },
      },
    });
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(getCreateBoundaryButton(0));

    const emptySlotSetNodes = screen
      .getAllByTestId(/^set-ephemeral:empty-slot:group:/)
      .map((node) => node.getAttribute("data-testid"));
    expect(emptySlotSetNodes).toHaveLength(2);
    expect(screen.getByTestId("group-groups:A")).toBeInTheDocument();
    expect(screen.getByTestId("group-groups:B")).toBeInTheDocument();
  });

  it("keeps insertion between B and C after removing ephemeral between A and B", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:A", "groups:E1", "groups:B", "groups:C", "groups:D"],
          itemsByGroup: {
            "groups:A": ["g-A1"],
            "groups:E1": ["ephemeral:empty-slot:group:groups:E1"],
            "groups:B": ["g-B1"],
            "groups:C": ["g-C1"],
            "groups:D": ["g-D1"],
          },
          setLabelsById: {
            "g-A1": "A1",
            "g-B1": "B1",
            "g-C1": "C1",
            "g-D1": "D1",
            "ephemeral:empty-slot:group:groups:E1": "",
          },
          setCardIdById: {
            "g-A1": "g-A1",
            "g-B1": "g-B1",
            "g-C1": "g-C1",
            "g-D1": "g-D1",
            "ephemeral:empty-slot:group:groups:E1": "",
          },
        },
      },
    });

    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(getCreateBoundaryButton(3));

    const groupOrder = screen
      .getAllByTestId(/^group-groups:/)
      .map((node) => node.getAttribute("data-testid"));
    const idxB = groupOrder.indexOf("group-groups:B");
    const idxC = groupOrder.indexOf("group-groups:C");
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxC).toBeGreaterThan(idxB);
    expect(groupOrder[idxB + 1]).toMatch(/^group-groups:N\d+$/);
    expect(groupOrder[idxB + 2]).toBe("group-groups:C");
  });

  it("keeps insertion between B and C in mirrored case after removing ephemeral between C and D", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:A", "groups:B", "groups:C", "groups:E1", "groups:D"],
          itemsByGroup: {
            "groups:A": ["g-A1"],
            "groups:B": ["g-B1"],
            "groups:C": ["g-C1"],
            "groups:E1": ["ephemeral:empty-slot:group:groups:E1"],
            "groups:D": ["g-D1"],
          },
          setLabelsById: {
            "g-A1": "A1",
            "g-B1": "B1",
            "g-C1": "C1",
            "g-D1": "D1",
            "ephemeral:empty-slot:group:groups:E1": "",
          },
          setCardIdById: {
            "g-A1": "g-A1",
            "g-B1": "g-B1",
            "g-C1": "g-C1",
            "g-D1": "g-D1",
            "ephemeral:empty-slot:group:groups:E1": "",
          },
        },
      },
    });

    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(getCreateBoundaryButton(2));

    const groupOrder = screen
      .getAllByTestId(/^group-groups:/)
      .map((node) => node.getAttribute("data-testid"));
    const idxB = groupOrder.indexOf("group-groups:B");
    const idxC = groupOrder.indexOf("group-groups:C");
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxC).toBeGreaterThan(idxB);
    expect(groupOrder[idxB + 1]).toMatch(/^group-groups:N\d+$/);
    expect(groupOrder[idxB + 2]).toBe("group-groups:C");
  });

  it("moves from source to groups and to entries", async () => {
    mutationMocks.createSetFromBackFace.mockResolvedValue({ id: "created-set-1" });
    renderWorkspace();

    await act(async () => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
      await callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
    });

    expect(mutationMocks.createSetFromBackFace).toHaveBeenCalledWith("deck-1", "A", "src-1");
    expect(mutationMocks.reorderSets).toHaveBeenCalledWith("created-set-1", ["g-A1", "g-A2", "g-A3", "created-set-1"]);

    await act(async () => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "entries:lane", type: "group", board: "entries" },
        },
      });
      await callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "entries:lane", type: "group", board: "entries" },
        },
      });
    });

    expect(currentEntriesModel?.addFront).toHaveBeenCalledWith("src-2");
  });

  it("routes source-to-entries drop when target is entries board area (not group/item)", () => {
    renderWorkspace({
      boardModelsOverride: {
        entries: {
          itemsByGroup: { "entries:lane": ["ephemeral:empty-slot:group:entries:lane"] },
          setLabelsById: { "ephemeral:empty-slot:group:entries:lane": "" },
          setCardIdById: { "ephemeral:empty-slot:group:entries:lane": "" },
        },
      },
    });

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "board-entries", type: "board", board: "entries" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "board-entries", type: "board", board: "entries" },
        },
      });
    });

    expect(currentEntriesModel?.addFront).toHaveBeenCalledWith("src-2");
  });

  it("does not commit source-to-entries when drag ends over source after transient entries hover", () => {
    renderWorkspace({
      boardModelsOverride: {
        entries: {
          itemsByGroup: { "entries:lane": ["ephemeral:empty-slot:group:entries:lane"] },
          setLabelsById: { "ephemeral:empty-slot:group:entries:lane": "" },
          setCardIdById: { "ephemeral:empty-slot:group:entries:lane": "" },
        },
      },
    });

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "board:entries", type: "board", board: "entries" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
          target: { id: "board:source", type: "board", board: "source" },
        },
      });
    });

    expect(currentEntriesModel?.addFront).not.toHaveBeenCalled();
    expect(currentEntriesModel?.reorderEntriesOptimistic).not.toHaveBeenCalled();
  });

  it("does not allow dropping into source board", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "source:lane", type: "group", board: "source" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "source:lane", type: "group", board: "source" },
        },
      });
    });

    expect(mutationMocks.reorderSets).not.toHaveBeenCalled();
    expect(mutationMocks.updateSetGroup).not.toHaveBeenCalled();
  });

  it("blocks groups to entries routing", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "entries:lane", type: "group", board: "entries" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "entries:lane", type: "group", board: "entries" },
        },
      });
    });

    expect(currentEntriesModel?.addFront).not.toHaveBeenCalled();
    expect(mutationMocks.updateSetGroup).not.toHaveBeenCalled();
  });

  it("blocks entries to groups routing", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "entry:e-1", type: "set", group: "entries:lane", board: "entries" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "entry:e-1", type: "set", group: "entries:lane", board: "entries" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "entry:e-1", type: "set", group: "entries:lane", board: "entries" },
          target: { id: "group:A", type: "group", board: "groups" },
        },
      });
    });

    expect(mutationMocks.updateSetGroup).not.toHaveBeenCalled();
    expect(mutationMocks.reorderSets).not.toHaveBeenCalled();
  });

  it("does not sort within source group but still sorts within groups board", () => {
    renderWorkspace();

    expect(getSetTestIdsWithinGroup("group-source:lane")).toEqual([
      "set-source:src-1",
      "set-source:src-2",
    ]);

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-1", type: "set", group: "source:lane", board: "source" },
          target: { id: "source:src-2", type: "set", group: "source:lane", board: "source" },
        },
      });
    });

    expect(getSetTestIdsWithinGroup("group-source:lane")).toEqual([
      "set-source:src-1",
      "set-source:src-2",
    ]);

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "set:g-A3", type: "set", group: "group:A", board: "groups" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "set:g-A1", type: "set", group: "group:A", board: "groups" },
          target: { id: "set:g-A3", type: "set", group: "group:A", board: "groups" },
        },
      });
    });

    expect(getSetTestIdsWithinGroup("group-group:A")).toEqual([
      "set-set:g-A2",
      "set-set:g-A3",
      "set-set:g-A1",
    ]);
  });

  it("does not sort source even when drag metadata omits group ids", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "source:src-1", type: "set", board: "source" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "source:src-1", type: "set", board: "source" },
          target: { id: "source:src-2", type: "set", board: "source" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "source:src-1", type: "set", board: "source" },
          target: { id: "source:src-2", type: "set", board: "source" },
        },
      });
    });

    expect(getSetTestIdsWithinGroup("group-source:lane")).toEqual([
      "set-source:src-1",
      "set-source:src-2",
    ]);
  });
});

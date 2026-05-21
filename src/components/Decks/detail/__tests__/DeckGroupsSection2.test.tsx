import { act, fireEvent, render, screen } from "@testing-library/react";
import { TransformStream } from "node:stream/web";

if (!(globalThis as { TransformStream?: typeof TransformStream }).TransformStream) {
  (globalThis as { TransformStream?: typeof TransformStream }).TransformStream =
    TransformStream;
}

import DeckGroupsBoardController, {
  DeckEntriesBoardController,
  DeckMockDndProvider,
  DeckSourceBoardController,
  type BoardModel,
} from "@/components/Decks/detail/DeckGroupsSection2";

type DragEventLike = {
  canceled?: boolean;
  operation: {
    source?: { id: string; type: string; group?: string };
    target?: { id: string; type: string; group?: string };
  };
};

const callbacks: {
  onDragStart?: (event: DragEventLike) => void;
  onDragOver?: (event: DragEventLike) => void;
  onDragEnd?: (event: DragEventLike) => void;
  onDragCancel?: () => void;
} = {};

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

function renderWorkspace(options?: {
  enableFanLayout?: boolean;
  keySetId?: string | null;
  boardModelsOverride?: Partial<Record<"groups" | "entries" | "source", Partial<BoardModel>>>;
}) {
  const boardModels: Record<"groups" | "entries" | "source", BoardModel> = {
    groups: {
      boardId: "groups",
      groupIds: ["groups:A", "groups:B", "groups:C"],
      itemsByGroup: {
        "groups:A": ["g-A1", "g-A2", "g-A3"],
        "groups:B": ["g-B1", "g-B2"],
        "groups:C": ["g-C1"],
      },
      groupLabelsById: { "groups:A": "A", "groups:B": "B", "groups:C": "C" },
      setLabelsById: {
        "g-A1": "A1",
        "g-A2": "A2",
        "g-A3": "A3",
        "g-B1": "B1",
        "g-B2": "B2",
        "g-C1": "C1",
      },
      setCardIdById: {
        "g-A1": "g-A1",
        "g-A2": "g-A2",
        "g-A3": "g-A3",
        "g-B1": "g-B1",
        "g-B2": "g-B2",
        "g-C1": "g-C1",
      },
      emitToken: "set",
      acceptTokens: ["source"],
    },
    entries: {
      boardId: "entries",
      groupIds: ["entries:E1"],
      itemsByGroup: { "entries:E1": ["e-1", "e-2"] },
      groupLabelsById: { "entries:E1": "Entries" },
      setLabelsById: { "e-1": "E-1", "e-2": "E-2" },
      setCardIdById: { "e-1": "e-1", "e-2": "e-2" },
      emitToken: "entry",
      acceptTokens: ["source"],
    },
    source: {
      boardId: "source",
      groupIds: ["source:S1"],
      itemsByGroup: { "source:S1": ["src-1", "src-2"] },
      groupLabelsById: { "source:S1": "Source" },
      setLabelsById: { "src-1": "SRC-1", "src-2": "SRC-2" },
      setCardIdById: { "src-1": "src-1", "src-2": "src-2" },
      emitToken: "source",
      acceptTokens: [],
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
  return render(
    <DeckMockDndProvider boardModels={boardModels}>
      <DeckGroupsBoardController
        deckId={null}
        keySetId={options?.keySetId ?? null}
        enableFanLayout={options?.enableFanLayout}
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

  it("keeps default groups board visuals when fan layout is disabled", () => {
    renderWorkspace({ enableFanLayout: false });
    const group = screen.getByTestId("group-groups:A");
    expect(group.className).not.toContain("groupVisualCollapsed");
    expect(group.className).not.toContain("groupVisualPartial");
    expect(group.className).not.toContain("groupVisualExpanded");
  });

  it("applies fan visual classes when fan layout is enabled", () => {
    renderWorkspace({ enableFanLayout: true });
    const group = screen.getByTestId("group-groups:A");
    expect(group.className).toContain("groupVisualCollapsed");
  });

  it("uses key-card overlay in collapsed fan groups and suppresses inline duplicate", () => {
    renderWorkspace({ enableFanLayout: true, keySetId: "g-A2" });
    expect(screen.getByTestId("key-card-overlay-groups:A")).toBeInTheDocument();
    expect(screen.getByTestId("set-set:g-A2").className).toContain("keyCardSetShellCollapsed");
    expect(screen.getByText("Cover Card")).toBeInTheDocument();
    expect(screen.getAllByText("Cover Card")).toHaveLength(1);
  });

  it("keeps overlay key-card pill in expanded groups (single owner)", () => {
    renderWorkspace({
      enableFanLayout: true,
      keySetId: "g-C1",
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:C"],
          itemsByGroup: { "groups:C": ["g-C1"] },
          groupLabelsById: { "groups:C": "C" },
          setLabelsById: { "g-C1": "C1" },
          setCardIdById: { "g-C1": "g-C1" },
        },
      },
    });
    expect(screen.getByTestId("key-card-overlay-groups:C")).toBeInTheDocument();
    expect(screen.getByTestId("set-set:g-C1").className).not.toContain("keyCardSetShellCollapsed");
    expect(screen.getAllByText("Cover Card")).toHaveLength(1);
  });

  it("keeps existing inline key-card behavior when fan layout is disabled", () => {
    renderWorkspace({ enableFanLayout: false, keySetId: "g-A2" });
    expect(screen.queryByTestId("key-card-overlay-groups:A")).not.toBeInTheDocument();
    expect(screen.getByTestId("set-set:g-A2").className).not.toContain("keyCardSetShellCollapsed");
    expect(screen.getAllByText("Cover Card")).toHaveLength(1);
  });

  it("renders groups board create rail on hover with split icon", () => {
    renderWorkspace();
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    const createButton = screen.getByRole("button", { name: /Create group at position/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton.querySelector("svg")).toBeInTheDocument();
  });

  it("keeps create rail unfocusable when hidden and focusable when visible", () => {
    renderWorkspace();
    const createButton = screen.getByRole("button", { name: /Create group at position 0/i });
    expect(createButton).toHaveAttribute("tabindex", "-1");
    fireEvent.mouseMove(screen.getByTestId("groups-row-groups"), { clientX: -9999 });
    expect(createButton).toHaveAttribute("tabindex", "0");
  });

  it("does not render create rail for entries/source boards", () => {
    renderWorkspace();
    fireEvent.mouseMove(screen.getByTestId("groups-row-entries"), { clientX: -9999 });
    fireEvent.mouseMove(screen.getByTestId("groups-row-source"), { clientX: -9999 });
    expect(screen.queryAllByRole("button", { name: /Create group at position/i }).length).toBeLessThanOrEqual(1);
  });

  it("hydrates empty-slot placeholder for default empty group and accepts source drop", () => {
    renderWorkspace({
      boardModelsOverride: {
        groups: {
          groupIds: ["groups:A", "groups:B", "groups:C"],
          itemsByGroup: {
            "groups:A": [],
            "groups:B": ["g-B1", "g-B2"],
            "groups:C": ["g-C1"],
          },
          setLabelsById: {
            "g-B1": "B1",
            "g-B2": "B2",
            "g-C1": "C1",
          },
          setCardIdById: {
            "g-B1": "g-B1",
            "g-B2": "g-B2",
            "g-C1": "g-C1",
          },
        },
      },
    });

    expect(
      screen.getByTestId("set-ephemeral:empty-slot:group:groups:A"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("set-ephemeral:empty-slot:group:groups:B")).not.toBeInTheDocument();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-1", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "groups:A", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "groups:A", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-groups:A")).toHaveTextContent("SRC-1");
  });

  it("keeps only one placeholder-only ephemeral group when creating repeatedly", () => {
    renderWorkspace();
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(screen.getByRole("button", { name: "Create group at position 0" }));
    fireEvent.mouseMove(row, { clientX: -9999 });
    fireEvent.click(screen.getByRole("button", { name: "Create group at position 0" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Create group at position 0" }));

    const emptySlotSetNodes = screen
      .getAllByTestId(/^set-ephemeral:empty-slot:group:/)
      .map((node) => node.getAttribute("data-testid"));
    expect(emptySlotSetNodes).toHaveLength(1);
    expect(screen.getByTestId("group-group:groups:A")).toBeInTheDocument();
    expect(screen.getByTestId("group-group:groups:B")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Create group at position 3" }));

    const groupOrder = screen
      .getAllByTestId(/^group-group:/)
      .map((node) => node.getAttribute("data-testid"));
    const idxB = groupOrder.indexOf("group-group:groups:B");
    const idxC = groupOrder.indexOf("group-group:groups:C");
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxC).toBeGreaterThan(idxB);
    expect(groupOrder[idxB + 1]).toMatch(/^group-group:groups:N\d+$/);
    expect(groupOrder[idxB + 2]).toBe("group-group:groups:C");
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
    fireEvent.click(screen.getByRole("button", { name: "Create group at position 2" }));

    const groupOrder = screen
      .getAllByTestId(/^group-group:/)
      .map((node) => node.getAttribute("data-testid"));
    const idxB = groupOrder.indexOf("group-group:groups:B");
    const idxC = groupOrder.indexOf("group-group:groups:C");
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxC).toBeGreaterThan(idxB);
    expect(groupOrder[idxB + 1]).toMatch(/^group-group:groups:N\d+$/);
    expect(groupOrder[idxB + 2]).toBe("group-group:groups:C");
  });

  it("moves from source to groups and to entries", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-1", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "groups:A", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "groups:A", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-groups:A")).toHaveTextContent("SRC-1");

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-2", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "entries:E1", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "entries:E1", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-entries:E1")).toHaveTextContent("SRC-2");
  });

  it("routes source-to-entries drop when target is entries board area (not group/item)", () => {
    renderWorkspace({
      boardModelsOverride: {
        entries: {
          itemsByGroup: { "entries:E1": ["ephemeral:empty-slot:group:entries:E1"] },
          setLabelsById: { "ephemeral:empty-slot:group:entries:E1": "" },
          setCardIdById: { "ephemeral:empty-slot:group:entries:E1": "" },
        },
      },
    });

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-2", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "board-entries", type: "board", board: "entries" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "board-entries", type: "board", board: "entries" },
        },
      });
    });

    expect(screen.getByTestId("group-entries:E1")).toHaveTextContent("SRC-2");
  });

  it("does not commit source-to-entries when drag ends over source after transient entries hover", () => {
    renderWorkspace({
      boardModelsOverride: {
        entries: {
          itemsByGroup: { "entries:E1": ["ephemeral:empty-slot:group:entries:E1"] },
          setLabelsById: { "ephemeral:empty-slot:group:entries:E1": "" },
          setCardIdById: { "ephemeral:empty-slot:group:entries:E1": "" },
        },
      },
    });

    const beforeText = screen.getByTestId("group-entries:E1").textContent ?? "";

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-2", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "board:entries", type: "board", board: "entries" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-2", type: "set", group: "source:S1" },
          target: { id: "board:source", type: "board", board: "source" },
        },
      });
    });

    expect(screen.getByTestId("group-entries:E1").textContent ?? "").toBe(beforeText);
    expect(screen.getByTestId("group-entries:E1")).not.toHaveTextContent("SRC-2");
  });

  it("does not allow dropping into source board", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "g-A1", type: "set", group: "groups:A" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "source:S1", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "source:S1", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-groups:A")).toHaveTextContent("A1");
    expect(screen.getByTestId("group-source:S1")).not.toHaveTextContent("A1");
  });

  it("blocks groups to entries routing", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "g-A1", type: "set", group: "groups:A" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "entries:E1", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "entries:E1", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-groups:A")).toHaveTextContent("A1");
    expect(screen.getByTestId("group-entries:E1")).not.toHaveTextContent("A1");
  });

  it("blocks entries to groups routing", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "e-1", type: "set", group: "entries:E1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "e-1", type: "set", group: "entries:E1" },
          target: { id: "groups:A", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "e-1", type: "set", group: "entries:E1" },
          target: { id: "groups:A", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-entries:E1")).toHaveTextContent("E-1");
    expect(screen.getByTestId("group-groups:A")).not.toHaveTextContent("E-1");
  });

  it("does not sort within source group but still sorts within groups board", () => {
    renderWorkspace();

    expect(screen.getByTestId("group-source:S1")).toHaveTextContent("SRC-1");
    expect(screen.getByTestId("group-source:S1")).toHaveTextContent("SRC-2");

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-1", type: "set", group: "source:S1" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "src-4", type: "set", group: "source:S1" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-1", type: "set", group: "source:S1" },
          target: { id: "src-4", type: "set", group: "source:S1" },
        },
      });
    });

    expect(screen.getByTestId("group-source:S1").textContent).toMatch(/SRC-1.*SRC-2.*SRC-3.*SRC-4/);

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "g-A1", type: "set", group: "groups:A" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "g-A3", type: "set", group: "groups:A" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "g-A1", type: "set", group: "groups:A" },
          target: { id: "g-A3", type: "set", group: "groups:A" },
        },
      });
    });

    expect(screen.getByTestId("group-groups:A").textContent).toMatch(/A2.*A3.*A1/);
  });

  it("does not sort source even when drag metadata omits group ids", () => {
    renderWorkspace();

    act(() => {
      callbacks.onDragStart?.({
        operation: { source: { id: "src-1", type: "set" } },
      });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "src-1", type: "set" },
          target: { id: "src-4", type: "set" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "src-1", type: "set" },
          target: { id: "src-4", type: "set" },
        },
      });
    });

    expect(screen.getByTestId("group-source:S1").textContent).toMatch(/SRC-1.*SRC-2.*SRC-3.*SRC-4/);
  });
});

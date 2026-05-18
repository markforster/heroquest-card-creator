import { act, fireEvent, render, screen } from "@testing-library/react";

import DeckGroupsSection2, {
  DeckEntriesSection2Mock,
  DeckMockDndProvider,
  DeckSourceBoard2Mock,
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

function renderWorkspace() {
  render(
    <DeckMockDndProvider>
      <DeckGroupsSection2 />
      <DeckEntriesSection2Mock />
      <DeckSourceBoard2Mock />
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

  it("renders groups board and supports + on hover", () => {
    renderWorkspace();
    const row = screen.getByTestId("groups-row-groups");
    fireEvent.mouseMove(row, { clientX: -9999 });
    expect(screen.getByRole("button", { name: /Create group at position/i })).toBeInTheDocument();
  });

  it("does not render + for entries/source boards", () => {
    renderWorkspace();
    fireEvent.mouseMove(screen.getByTestId("groups-row-entries"), { clientX: -9999 });
    fireEvent.mouseMove(screen.getByTestId("groups-row-source"), { clientX: -9999 });
    expect(screen.queryAllByRole("button", { name: /Create group at position/i }).length).toBeLessThanOrEqual(1);
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

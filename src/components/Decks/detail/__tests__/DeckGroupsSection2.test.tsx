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

    if (!sourceId || !sourceGroup || !targetGroup || sourceGroup === targetGroup) {
      return items;
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
});


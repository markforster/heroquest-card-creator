import { act, render, screen } from "@testing-library/react";

type DragEventLike = {
  canceled?: boolean;
  operation: {
    source?: { id: string; type: string };
    target?: { id: string; type: string };
  };
};

const callbacks: {
  onDragStart?: (event: DragEventLike) => void;
  onDragOver?: (event: DragEventLike) => void;
  onDragEnd?: (event: DragEventLike) => void;
} = {};

jest.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragStart, onDragOver, onDragEnd }: any) => {
    callbacks.onDragStart = onDragStart;
    callbacks.onDragOver = onDragOver;
    callbacks.onDragEnd = onDragEnd;
    return <div data-testid="mock-drag-provider">{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div data-testid="mock-drag-overlay">{children}</div>,
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
    const targetId = event.operation.target?.id;

    if (sourceId === "A1" && targetId === "B") {
      return {
        ...items,
        A: items.A.filter((id) => id !== "A1"),
        B: ["A1", ...items.B],
      };
    }

    if (sourceId === "B2" && targetId === "A") {
      return {
        ...items,
        A: [...items.A, "B2"],
        B: [],
      };
    }

    return items;
  }),
}));

const DeckGroupsSection2 = require("@/components/Decks/detail/DeckGroupsSection2").default;

describe("DeckGroupsSection2", () => {
  it("renders with fake model groups and sets", () => {
    render(<DeckGroupsSection2 />);

    expect(screen.getByTestId("group-A")).toBeInTheDocument();
    expect(screen.getByTestId("group-B")).toBeInTheDocument();
    expect(screen.getByTestId("group-C")).toBeInTheDocument();
    expect(screen.queryByTestId("group-slot-0")).not.toBeInTheDocument();
  });

  it("shows all temporary group slots while dragging", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "A1", type: "set" } } });
    });

    expect(screen.getByTestId("group-slot-0")).toBeInTheDocument();
    expect(screen.getByTestId("group-slot-1")).toBeInTheDocument();
    expect(screen.getByTestId("group-slot-2")).toBeInTheDocument();
    expect(screen.getByTestId("group-slot-3")).toBeInTheDocument();
  });

  it("moves a set across groups via onDragOver", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "A1", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "B", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "B", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-B")).toHaveTextContent("A1");
  });

  it("drops on a slot and creates a new group", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "A1", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "new-group-slot:1", type: "new-group-slot" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "new-group-slot:1", type: "new-group-slot" },
        },
      });
    });

    expect(screen.getByTestId("group-N1")).toBeInTheDocument();
    expect(screen.getByTestId("group-N1")).toHaveTextContent("A1");
    expect(screen.queryByTestId("group-A")).toHaveTextContent("A2");
    expect(screen.queryByTestId("group-A")).not.toHaveTextContent("A1");
  });

  it("removes empty groups after a committed non-slot drop", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "B2", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "B2", type: "set" },
          target: { id: "A", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "B2", type: "set" },
          target: { id: "A", type: "group" },
        },
      });
    });

    expect(screen.queryByTestId("group-B")).not.toBeInTheDocument();
  });

  it("restores previous state when drag is canceled", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "A1", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "B", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: true,
        operation: {
          source: { id: "A1", type: "set" },
          target: { id: "B", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-A")).toHaveTextContent("A1");
    expect(screen.queryByTestId("group-slot-0")).not.toBeInTheDocument();
  });
});

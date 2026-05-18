import { act, fireEvent, render, screen } from "@testing-library/react";

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

    return items;
  }),
}));

const DeckGroupsSection2 = require("@/components/Decks/detail/DeckGroupsSection2").default;

describe("DeckGroupsSection2", () => {
  it("renders fake groups and no placeholder by default", () => {
    render(<DeckGroupsSection2 />);

    expect(screen.getByTestId("group-A")).toBeInTheDocument();
    expect(screen.getByTestId("group-B")).toBeInTheDocument();
    expect(screen.getByTestId("group-C")).toBeInTheDocument();
    expect(screen.queryByTestId("create-boundary-0")).not.toBeInTheDocument();
  });

  it("shows a non-drag create placeholder on row hover", () => {
    render(<DeckGroupsSection2 />);

    const row = screen.getByTestId("groups-row");
    fireEvent.mouseMove(row, { clientX: -1000 });

    expect(screen.getByTestId("create-boundary-0")).toBeInTheDocument();
  });

  it("creates a permanent empty group from + button", () => {
    render(<DeckGroupsSection2 />);

    const row = screen.getByTestId("groups-row");
    fireEvent.mouseMove(row, { clientX: -1000 });

    fireEvent.click(screen.getByRole("button", { name: "Create group at position 0" }));

    expect(screen.getByTestId("group-N1")).toBeInTheDocument();
  });

  it("does not show create placeholders while dragging", () => {
    render(<DeckGroupsSection2 />);

    const row = screen.getByTestId("groups-row");
    fireEvent.mouseMove(row, { clientX: -1000 });
    expect(screen.getByTestId("create-boundary-0")).toBeInTheDocument();

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "A1", type: "set" } } });
    });

    expect(screen.queryByTestId("create-boundary-0")).not.toBeInTheDocument();
  });

  it("still moves sets between existing groups", () => {
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
});

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
  useDroppable: () => ({ ref: jest.fn() }),
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

    if (sourceId !== "A1" || targetId == null) {
      return items;
    }

    const withoutSource = Object.fromEntries(
      Object.entries(items).map(([group, setIds]) => [
        group,
        setIds.filter((setId) => setId !== sourceId),
      ]),
    ) as Record<string, string[]>;

    if (targetId === "B") {
      return {
        ...withoutSource,
        B: [sourceId, ...withoutSource.B],
      };
    }

    if (targetId === "A") {
      return {
        ...withoutSource,
        A: [withoutSource.A[0], sourceId, ...withoutSource.A.slice(1)],
      };
    }

    return withoutSource;
  }),
}));

const DeckGroupsSection2 = require("@/components/Decks/detail/DeckGroupsSection2").default;

describe("DeckGroupsSection2", () => {
  it("renders with fake model groups and sets", () => {
    render(<DeckGroupsSection2 />);

    expect(screen.getByTestId("group-A")).toBeInTheDocument();
    expect(screen.getByTestId("group-B")).toBeInTheDocument();
    expect(screen.getByTestId("group-C")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("B2")).toBeInTheDocument();
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

    const groupA = screen.getByTestId("group-A");
    const groupB = screen.getByTestId("group-B");

    expect(groupA).not.toHaveTextContent("A1");
    expect(groupB).toHaveTextContent("A1");
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

    const groupA = screen.getByTestId("group-A");
    const groupB = screen.getByTestId("group-B");

    expect(groupA).toHaveTextContent("A1");
    expect(groupB).not.toHaveTextContent("A1");
  });
});

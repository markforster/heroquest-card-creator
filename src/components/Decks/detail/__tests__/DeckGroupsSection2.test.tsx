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

    if ((sourceId === "B1" || sourceId === "B2") && targetId === "C") {
      return {
        ...items,
        B: items.B.filter((id) => id !== sourceId),
        C: [...items.C, sourceId],
      };
    }

    return items;
  }),
}));

const DeckGroupsSection2 = require("@/components/Decks/detail/DeckGroupsSection2").default;

function mockGroupRects(order: string[]) {
  order.forEach((groupId, index) => {
    const group = screen.getByTestId(`group-${groupId}`);
    const wrapper = group.parentElement as HTMLElement;

    jest.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      x: index * 240,
      y: 0,
      width: 220,
      height: 140,
      top: 0,
      left: index * 240,
      right: index * 240 + 220,
      bottom: 140,
      toJSON: () => ({}),
    } as DOMRect);
  });
}

describe("DeckGroupsSection2", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("keeps only one pending empty group when + is clicked repeatedly", () => {
    render(<DeckGroupsSection2 />);
    mockGroupRects(["A", "B", "C"]);

    const row = screen.getByTestId("groups-row");
    fireEvent.mouseMove(row, { clientX: -1000 });
    fireEvent.click(screen.getByRole("button", { name: /Create group at position/i }));
    expect(screen.getByTestId("group-N1")).toBeInTheDocument();

    mockGroupRects(["N1", "A", "B", "C"]);
    fireEvent.mouseMove(row, { clientX: 360 });
    fireEvent.click(screen.getByRole("button", { name: /Create group at position/i }));

    expect(screen.queryByTestId("group-N1")).not.toBeInTheDocument();
    expect(screen.getByTestId("group-N2")).toBeInTheDocument();
  });

  it("does not show + on boundaries adjacent to any empty group", () => {
    render(<DeckGroupsSection2 />);

    const row = screen.getByTestId("groups-row");
    fireEvent.mouseMove(row, { clientX: -1000 });
    fireEvent.click(screen.getByRole("button", { name: /Create group at position/i }));
    expect(screen.getByTestId("group-N1")).toBeInTheDocument();

    const createdGroup = screen.getByTestId("group-N1");
    const leftOfCreated = createdGroup.getBoundingClientRect().left - 1;
    const rightOfCreated = createdGroup.getBoundingClientRect().right + 1;

    fireEvent.mouseMove(row, { clientX: leftOfCreated });
    expect(screen.queryByTestId("create-boundary-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-boundary-1")).not.toBeInTheDocument();

    fireEvent.mouseMove(row, { clientX: rightOfCreated });
    expect(screen.queryByTestId("create-boundary-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-boundary-1")).not.toBeInTheDocument();
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

  it("deletes source group when it has no sets after committed drop", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "B1", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "B1", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "B1", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
    });

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "B2", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "B2", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: false,
        operation: {
          source: { id: "B2", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
    });

    expect(screen.queryByTestId("group-B")).not.toBeInTheDocument();
    expect(screen.getByTestId("group-C")).toHaveTextContent("B1");
    expect(screen.getByTestId("group-C")).toHaveTextContent("B2");
  });

  it("does not delete groups on canceled drag", () => {
    render(<DeckGroupsSection2 />);

    act(() => {
      callbacks.onDragStart?.({ operation: { source: { id: "B1", type: "set" } } });
      callbacks.onDragOver?.({
        operation: {
          source: { id: "B1", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
      callbacks.onDragEnd?.({
        canceled: true,
        operation: {
          source: { id: "B1", type: "set" },
          target: { id: "C", type: "group" },
        },
      });
    });

    expect(screen.getByTestId("group-B")).toBeInTheDocument();
    expect(screen.getByTestId("group-B")).toHaveTextContent("B1");
    expect(screen.getByTestId("group-B")).toHaveTextContent("B2");
  });
});

import { TransformStream } from "node:stream/web";

if (!(globalThis as { TransformStream?: typeof TransformStream }).TransformStream) {
  (globalThis as { TransformStream?: typeof TransformStream }).TransformStream =
    TransformStream;
}

jest.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: any) => children,
  DragOverlay: ({ children }: any) => children,
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
  move: jest.fn(),
}));

const { toEntriesBoardModel } = jest.requireActual(
  "@/components/Decks/detail/boards/DeckBoardsCore",
) as {
  toEntriesBoardModel: typeof import("@/components/Decks/detail/boards/DeckBoardsCore").toEntriesBoardModel;
};

describe("toEntriesBoardModel", () => {
  it("emits one empty-slot placeholder when entries are empty", () => {
    const model = toEntriesBoardModel({
      entriesSorted: [],
      entryFrontIdByEntryId: new Map(),
      cardNameById: new Map(),
    });

    expect(model.groupIds).toEqual(["entries:lane"]);
    expect(model.itemsByGroup["entries:lane"]).toHaveLength(1);
    expect(model.itemsByGroup["entries:lane"][0]).toBe(
      "ephemeral:empty-slot:group:entries:lane",
    );
  });

  it("emits normal entry ids when entries exist", () => {
    const model = toEntriesBoardModel({
      entriesSorted: [{ id: "entry-1", sortIndex: 0 }],
      entryFrontIdByEntryId: new Map([["entry-1", "front-1"]]),
      cardNameById: new Map([["front-1", "Front One"]]),
    });

    expect(model.itemsByGroup["entries:lane"]).toEqual(["entry:entry-1"]);
    expect(model.setLabelsById["entry:entry-1"]).toBe("Front One");
    expect(model.setCardIdById["entry:entry-1"]).toBe("front-1");
  });
});

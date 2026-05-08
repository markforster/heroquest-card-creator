import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeckEntriesSection from "@/components/Decks/detail/DeckEntriesSection";

const mockUseDeckDetailSelection = jest.fn();
const mockUseDeckSetEntries = jest.fn();
const mockDndUseDroppable = jest.fn();
const mockDndUseSortable = jest.fn();

jest.mock("@dnd-kit/core", () => ({
  useDroppable: (...args: unknown[]) => mockDndUseDroppable(...args),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: unknown }) => children,
  rectSortingStrategy: jest.fn(),
  useSortable: (...args: unknown[]) => mockDndUseSortable(...args),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  useDeckDetailSelection: () => mockUseDeckDetailSelection(),
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => mockUseDeckSetEntries(),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("DeckEntriesSection guidance states", () => {
  let currentSelectedSetId: string | null;
  const baseDrag = {
    isEntryDragActive: false,
    dragActiveEntryId: null,
    isFrontFaceDragActive: false,
    isFrontDropOver: false,
    isEntriesDropOver: false,
    entryDropIndex: null,
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDndUseDroppable.mockReturnValue({ setNodeRef: jest.fn() });
    mockDndUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    });
    currentSelectedSetId = null;
    mockUseDeckDetailSelection.mockImplementation(() => ({
      selectedGroupId: "group-1",
      selectedSetId: currentSelectedSetId,
    }));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [],
      pairsById: new Map(),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
    });
  });

  it("shows explicit no-group guidance", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: null, selectedSetId: null });

    render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={() => null}
      />,
    );

    expect(screen.getByText("decks.noGroupSelectedEntries")).toBeInTheDocument();
  });

  it("shows no-set-selected guidance when group exists", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: "group-1", selectedSetId: null });

    render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={() => null}
      />,
    );

    expect(screen.getByText("decks.noSetSelected")).toBeInTheDocument();
  });

  it("shows empty-set guidance when set is selected with no entries", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: "group-1", selectedSetId: "set-1" });

    render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={() => null}
      />,
    );

    expect(screen.getByText("decks.emptyEntries")).toBeInTheDocument();
  });

  it("renders set entries from entriesSorted and exposes dnd dropzone markers", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: "group-1", selectedSetId: "set-1" });
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
    });

    const { container } = render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    expect(screen.getByText("front-1")).toBeInTheDocument();
    expect(screen.getByText("front-2")).toBeInTheDocument();
    expect(container.querySelector("[data-deck-entries-dropzone]")).not.toBeNull();
    expect(container.querySelector('[data-entry-id="entry-1"]')).not.toBeNull();
    expect(container.querySelector('[data-entry-tail-dropzone="true"]')).not.toBeNull();
  });

  it("keeps entries mounted during in-set entry drag", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: "group-1", selectedSetId: "set-1" });
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
    });

    const { container } = render(
      <DeckEntriesSection
        drag={
          {
            ...(baseDrag as object),
            isEntryDragActive: true,
            dragActiveEntryId: "entry-1",
            entryDropIndex: 0,
          } as never
        }
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    expect(container.querySelectorAll('[data-entry-placeholder="true"]').length).toBe(0);
    expect(screen.getByText("front-1")).toBeInTheDocument();
    expect(screen.getByText("front-2")).toBeInTheDocument();
    expect(container.querySelector('[data-entry-id="entry-1"]')).not.toBeNull();
  });

  it("does not render bespoke placeholder for entry drag when index is unresolved", () => {
    mockUseDeckDetailSelection.mockReturnValue({ selectedGroupId: "group-1", selectedSetId: "set-1" });
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
    });

    const { container } = render(
      <DeckEntriesSection
        drag={
          {
            ...(baseDrag as object),
            isEntryDragActive: true,
            dragActiveEntryId: "entry-1",
            entryDropIndex: null,
          } as never
        }
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    expect(container.querySelectorAll('[data-entry-placeholder="true"]').length).toBe(0);
    expect(screen.getByText("front-1")).toBeInTheDocument();
    expect(screen.getByText("front-2")).toBeInTheDocument();
    expect(container.querySelector('[data-entry-id="entry-1"]')).not.toBeNull();
  });

  it("resets to in-set tab when selected set changes", async () => {
    currentSelectedSetId = "set-1";
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [{ id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0 }],
      pairsById: new Map([["pair-1", { id: "pair-1", frontFaceId: "front-1" }]]),
      pairedNotInSetFrontIds: ["front-2"],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
    });

    const { rerender } = render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Paired (Not In Set) (1)" }));
    expect(screen.getByRole("button", { name: "Paired (Not In Set) (1)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    currentSelectedSetId = "set-2";
    rerender(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In Set (1)" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Paired (Not In Set) (1)" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});

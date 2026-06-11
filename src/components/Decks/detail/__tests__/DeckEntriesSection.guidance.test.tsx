import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeckEntriesSection from "@/components/Decks/detail/DeckEntriesSection";

const mockUseDeckDetailSelection = jest.fn();
const mockUseDeckSetEntries = jest.fn();
const mockDndUseDroppable = jest.fn();
const mockDndUseSortable = jest.fn();
const mockNavigate = jest.fn();
const mockSetSelectedEntryId = jest.fn();

const buildSelectionState = (groupId: string | null, setId: string | null) => ({
  deckId: "deck-1",
  orderedGroups: groupId ? [{ id: groupId, title: "Group", sortIndex: 0 }] : [],
  sets: setId ? [{ id: setId, groupId: groupId ?? "group-1", backFaceId: "back-1", sortIndex: 0 }] : [],
  selectedGroupId: groupId,
  selectedSetId: setId,
  selectedEntryId: null,
  setSelectedEntryId: mockSetSelectedEntryId,
});

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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

jest.mock("@/api/client", () => ({
  apiClient: {
    deletePair: jest.fn(),
  },
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
    mockUseDeckDetailSelection.mockImplementation(() =>
      buildSelectionState("group-1", currentSelectedSetId),
    );
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [],
      pairsById: new Map(),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
    });
  });

  it("hides entries section when no groups/sets exist", () => {
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState(null, null));

    const { container } = render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={() => null}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows no-set-selected guidance when group exists", () => {
    mockUseDeckDetailSelection.mockReturnValue({
      deckId: "deck-1",
      orderedGroups: [{ id: "group-1", title: "Group 1", sortIndex: 0 }],
      sets: [{ id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
      selectedGroupId: "group-1",
      selectedSetId: null,
      selectedEntryId: null,
      setSelectedEntryId: mockSetSelectedEntryId,
    });

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
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));

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
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1, count: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
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
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1, count: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
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
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1, count: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
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

  it("renders placeholder for front-face insert at hovered index", () => {
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1, count: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
    });

    const { container } = render(
      <DeckEntriesSection
        drag={
          {
            ...(baseDrag as object),
            isFrontFaceDragActive: true,
            entryDropIndex: 1,
          } as never
        }
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    expect(container.querySelectorAll('[data-entry-placeholder="true"]').length).toBe(1);
  });

  it("applies over-state class to front-face placeholder while dropzone is hovered", () => {
    mockUseDeckDetailSelection.mockReturnValue(buildSelectionState("group-1", "set-1"));
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [
        { id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 },
        { id: "entry-2", pairId: "pair-2", setId: "set-1", sortIndex: 1, count: 1 },
      ],
      pairsById: new Map([
        ["pair-1", { id: "pair-1", frontFaceId: "front-1" }],
        ["pair-2", { id: "pair-2", frontFaceId: "front-2" }],
      ]),
      pairedNotInSetFrontIds: [],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
    });

    const { container } = render(
      <DeckEntriesSection
        drag={
          {
            ...(baseDrag as object),
            isFrontFaceDragActive: true,
            isFrontDropOver: true,
            entryDropIndex: 1,
          } as never
        }
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    const placeholder = container.querySelector('[data-entry-placeholder="true"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveClass("deckEntriesDropPlaceholderOver");
  });

  it("resets to in-set tab when selected set changes", async () => {
    currentSelectedSetId = "set-1";
    mockUseDeckSetEntries.mockReturnValue({
      entriesSorted: [{ id: "entry-1", pairId: "pair-1", setId: "set-1", sortIndex: 0, count: 1 }],
      pairsById: new Map([["pair-1", { id: "pair-1", frontFaceId: "front-1" }]]),
      pairedNotInSetFrontIds: ["front-2"],
      addFront: jest.fn(),
      removeEntry: jest.fn(),
      updateEntryCount: jest.fn(),
      refreshEntries: jest.fn(),
    });

    const { rerender } = render(
      <DeckEntriesSection
        drag={baseDrag}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={(cardId) => <span>{cardId}</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "decks.entries.mode.pairedNotInSet" }));
    expect(screen.getByRole("button", { name: "decks.entries.mode.pairedNotInSet" })).toHaveAttribute(
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
      expect(screen.getByRole("button", { name: "decks.entries.mode.inSet" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "decks.entries.mode.pairedNotInSet" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});

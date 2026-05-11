import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeckEntriesSection from "@/components/Decks/detail/DeckEntriesSection";

const removeEntry = jest.fn();
const addFront = jest.fn();
const deletePair = jest.fn();
const refreshEntries = jest.fn();
const onOpenCardEditor = jest.fn();
let sortableIsDragging = false;
let entriesSortedMock: Array<{ id: string; setId: string; pairId: string; sortIndex: number }> = [];
let pairsByIdMock = new Map<
  string,
  {
    id: string;
    frontFaceId: string;
    backFaceId: string;
    name: string;
    nameLower: string;
    createdAt: number;
    updatedAt: number;
    schemaVersion: number;
  }
>();

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "decks.removeFromSet": "Remove from set",
          "decks.removeAndUnpair": "Remove and unpair",
          "decks.removeFrontPromptTitle": "Remove front from set?",
          "decks.removeFrontPromptBody": "Remove body",
          "actions.cancel": "Cancel",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  useDeckDetailSelection: () => ({ selectedGroupId: "group-1", selectedSetId: "set-1" }),
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => ({
    entriesSorted: entriesSortedMock,
    pairsById: pairsByIdMock,
    pairedNotInSetFrontIds: [],
    addFront,
    removeEntry,
    refreshEntries,
  }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    deletePair: (...args: unknown[]) => deletePair(...args),
  },
}));

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: ({ isOpen, onConfirm, onExtra, onCancel, confirmLabel, extraLabel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-modal">
        <button type="button" onClick={onConfirm}>{confirmLabel ?? "confirm"}</button>
        <button type="button" onClick={onExtra}>{extraLabel ?? "extra"}</button>
        <button type="button" onClick={onCancel}>cancel</button>
      </div>
    );
  },
}));

jest.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: jest.fn() }),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  rectSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: sortableIsDragging,
  }),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => "",
    },
  },
}));

describe("DeckEntriesSection front remove prompt", () => {
  beforeEach(() => {
    entriesSortedMock = [{ id: "entry-1", setId: "set-1", pairId: "pair-1", sortIndex: 0 }];
    pairsByIdMock = new Map([
      [
        "pair-1",
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
    ]);
    removeEntry.mockReset();
    addFront.mockReset();
    deletePair.mockReset();
    refreshEntries.mockReset();
    onOpenCardEditor.mockReset();
    sortableIsDragging = false;
    removeEntry.mockResolvedValue(undefined);
    deletePair.mockResolvedValue(undefined);
    refreshEntries.mockResolvedValue(undefined);
  });

  it("applies grab cursor class by default and grabbing class while dragging", () => {
    const { rerender } = render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    const cardSelect = screen.getByRole("button", { name: "thumb" });
    expect(cardSelect.className).toContain("deckEntrySelect");
    expect(cardSelect.className).not.toContain("deckEntrySelectDragging");

    sortableIsDragging = true;
    rerender(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    expect(screen.getByRole("button", { name: "thumb" }).className).toContain(
      "deckEntrySelectDragging",
    );
  });

  it("keeps Delete Selected disabled until one or more entries are selected", () => {
    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    const deleteSelected = screen.getByRole("button", { name: "Delete Selected" });
    expect(deleteSelected).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "thumb" }));
    expect(deleteSelected).toBeEnabled();
  });

  it("navigates to the card editor when per-card Edit is clicked", () => {
    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    fireEvent.click(screen.getByTitle("Edit front card"));

    expect(onOpenCardEditor).toHaveBeenCalledWith("front-1");
  });

  it("removes from set only when confirm is clicked", async () => {
    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    fireEvent.click(screen.getByTitle("Remove front from set"));
    fireEvent.click(screen.getByText("Remove from set"));

    await waitFor(() => expect(removeEntry).toHaveBeenCalledWith("entry-1", "set-1"));
    expect(deletePair).not.toHaveBeenCalled();
  });

  it("removes and unpairs when extra action is clicked", async () => {
    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    fireEvent.click(screen.getByTitle("Remove front from set"));
    fireEvent.click(screen.getByText("Remove and unpair"));

    await waitFor(() => expect(removeEntry).toHaveBeenCalledWith("entry-1", "set-1"));
    expect(deletePair).toHaveBeenCalledWith({ frontFaceId: "front-1", backFaceId: "back-1" });
  });

  it("bulk Remove from set removes every selected entry without unpairing", async () => {
    entriesSortedMock = [
      { id: "entry-1", setId: "set-1", pairId: "pair-1", sortIndex: 0 },
      { id: "entry-2", setId: "set-1", pairId: "pair-2", sortIndex: 1 },
    ];
    pairsByIdMock = new Map([
      [
        "pair-1",
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      [
        "pair-2",
        {
          id: "pair-2",
          frontFaceId: "front-2",
          backFaceId: "back-2",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
    ]);

    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    const thumbs = screen.getAllByRole("button", { name: "thumb" });
    fireEvent.click(thumbs[0], { metaKey: true });
    fireEvent.click(thumbs[1], { metaKey: true });

    fireEvent.click(screen.getByRole("button", { name: "Delete Selected" }));
    fireEvent.click(screen.getByText("Remove from set"));

    await waitFor(() => {
      expect(removeEntry).toHaveBeenCalledWith("entry-1", "set-1");
      expect(removeEntry).toHaveBeenCalledWith("entry-2", "set-1");
    });
    expect(deletePair).not.toHaveBeenCalled();
  });

  it("bulk Remove and unpair removes and unpairs every selected entry", async () => {
    entriesSortedMock = [
      { id: "entry-1", setId: "set-1", pairId: "pair-1", sortIndex: 0 },
      { id: "entry-2", setId: "set-1", pairId: "pair-2", sortIndex: 1 },
    ];
    pairsByIdMock = new Map([
      [
        "pair-1",
        {
          id: "pair-1",
          frontFaceId: "front-1",
          backFaceId: "back-1",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
      [
        "pair-2",
        {
          id: "pair-2",
          frontFaceId: "front-2",
          backFaceId: "back-2",
          name: "",
          nameLower: "",
          createdAt: 1,
          updatedAt: 1,
          schemaVersion: 1,
        },
      ],
    ]);

    render(
      <DeckEntriesSection
        drag={{
          isFrontFaceDragActive: false,
          isEntryDragActive: false,
          isFrontDropOver: false,
          isEntriesDropOver: false,
          entryDropIndex: null,
        } as never}
        entriesRowRef={jest.fn()}
        onOpenCardEditor={onOpenCardEditor}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    const thumbs = screen.getAllByRole("button", { name: "thumb" });
    fireEvent.click(thumbs[0], { metaKey: true });
    fireEvent.click(thumbs[1], { metaKey: true });

    fireEvent.click(screen.getByRole("button", { name: "Delete Selected" }));
    fireEvent.click(screen.getByText("Remove and unpair"));

    await waitFor(() => {
      expect(removeEntry).toHaveBeenCalledWith("entry-1", "set-1");
      expect(removeEntry).toHaveBeenCalledWith("entry-2", "set-1");
    });
    expect(deletePair).toHaveBeenCalledWith({ frontFaceId: "front-1", backFaceId: "back-1" });
    expect(deletePair).toHaveBeenCalledWith({ frontFaceId: "front-2", backFaceId: "back-2" });
  });
});

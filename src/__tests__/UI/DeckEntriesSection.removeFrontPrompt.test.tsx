import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeckEntriesSection from "@/components/Decks/detail/DeckEntriesSection";

const removeEntry = jest.fn();
const addFront = jest.fn();
const deletePair = jest.fn();

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
    entriesSorted: [{ id: "entry-1", setId: "set-1", pairId: "pair-1", sortIndex: 0 }],
    pairsById: new Map([
      [
        "pair-1",
        { id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1", name: "", nameLower: "", createdAt: 1, updatedAt: 1, schemaVersion: 1 },
      ],
    ]),
    pairedNotInSetFrontIds: [],
    addFront,
    removeEntry,
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
    isDragging: false,
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
    removeEntry.mockReset();
    addFront.mockReset();
    deletePair.mockReset();
    removeEntry.mockResolvedValue(undefined);
    deletePair.mockResolvedValue(undefined);
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
        onOpenCardEditor={jest.fn()}
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
        onOpenCardEditor={jest.fn()}
        deckEntryThumb={() => <div>thumb</div>}
      />,
    );

    fireEvent.click(screen.getByTitle("Remove front from set"));
    fireEvent.click(screen.getByText("Remove and unpair"));

    await waitFor(() => expect(removeEntry).toHaveBeenCalledWith("entry-1", "set-1"));
    expect(deletePair).toHaveBeenCalledWith({ frontFaceId: "front-1", backFaceId: "back-1" });
  });
});

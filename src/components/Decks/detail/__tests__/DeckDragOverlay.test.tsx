import { render } from "@testing-library/react";

import DeckDragOverlay from "@/components/Decks/detail/DeckDragOverlay";
import type { DeckDetailDragState } from "@/components/Decks/types/deck-detail";

const mockDragOverlay = jest.fn();

jest.mock("@dnd-kit/core", () => ({
  DragOverlay: (props: unknown) => {
    mockDragOverlay(props);
    return null;
  },
}));

jest.mock("@/components/Decks/detail/context/DeckSetEntriesContext", () => ({
  useDeckSetEntries: () => ({
    entries: [],
    pairsById: new Map(),
  }),
}));

function buildDragState(overrides?: Partial<DeckDetailDragState>): DeckDetailDragState {
  return {
    dragActiveSetId: null,
    dragActiveGroupId: null,
    dragActiveBackFaceId: null,
    dragActiveFrontFaceId: null,
    dragActiveEntryId: null,
    dragTargetGroupId: null,
    backFaceDropGroupId: null,
    backFaceDropIndex: null,
    isBackFaceNewGroupEdgeTarget: false,
    groupDropIndex: null,
    setDropIndex: null,
    setDropGroupId: null,
    entryDropIndex: null,
    isGroupDropOver: false,
    isFrontDropOver: false,
    isEntriesDropOver: false,
    isRemoveZone: false,
    isBackFaceDragActive: false,
    isFrontFaceDragActive: false,
    isEntryDragActive: false,
    isGroupDragActive: false,
    isSetDragActive: false,
    faceDropSucceeded: false,
    finalizingEntryId: null,
    finalizingSetId: null,
    finalizingFrontFaceId: null,
    finalizingBackFaceId: null,
    ...overrides,
  };
}

describe("DeckDragOverlay face drop animation behavior", () => {
  beforeEach(() => {
    mockDragOverlay.mockClear();
  });

  it("sets dropAnimation to null for back-face drag", () => {
    render(
      <DeckDragOverlay
        drag={buildDragState({ dragActiveBackFaceId: "back-1", isBackFaceDragActive: true })}
        setById={new Map()}
        deckEntryThumb={() => null}
        deckSetThumb={() => null}
        backPanelThumb={() => null}
      />,
    );

    const call = mockDragOverlay.mock.calls.at(-1)?.[0] as { dropAnimation?: unknown };
    expect(call.dropAnimation).toBeNull();
  });

  it("sets dropAnimation to null for front-face drag", () => {
    render(
      <DeckDragOverlay
        drag={buildDragState({ dragActiveFrontFaceId: "front-1", isFrontFaceDragActive: true })}
        setById={new Map()}
        deckEntryThumb={() => null}
        deckSetThumb={() => null}
        backPanelThumb={() => null}
      />,
    );

    const call = mockDragOverlay.mock.calls.at(-1)?.[0] as { dropAnimation?: unknown };
    expect(call.dropAnimation).toBeNull();
  });

  it("sets dropAnimation to null for set drag", () => {
    render(
      <DeckDragOverlay
        drag={buildDragState({ dragActiveSetId: "set-1", isSetDragActive: true })}
        setById={new Map()}
        deckEntryThumb={() => null}
        deckSetThumb={() => null}
        backPanelThumb={() => null}
      />,
    );

    const call = mockDragOverlay.mock.calls.at(-1)?.[0] as { dropAnimation?: unknown };
    expect(call.dropAnimation).toBeNull();
  });
});

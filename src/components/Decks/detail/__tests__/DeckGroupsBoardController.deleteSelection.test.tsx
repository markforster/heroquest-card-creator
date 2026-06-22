import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import DeckGroupsBoardController from "@/components/Decks/detail/boards/DeckGroupsBoardController";
import styles from "@/components/Decks/detail/DeckGroupsSection2.module.css";

const mockDeleteSet = jest.fn(async () => {});
const mockReloadStructure = jest.fn(async () => {});
type MockSelectionState = {
  selectedSetId: string | null;
  selectedGroupId: string | null;
  orderedGroups: { id: string; title: string; sortIndex: number }[];
  sets: { id: string; groupId: string; backFaceId: string; sortIndex: number }[];
  setById: Map<string, { id: string; groupId: string; backFaceId: string; sortIndex: number }>;
};

let mockSelectionState: MockSelectionState = {
  selectedSetId: "set-2",
  selectedGroupId: "group-1",
  orderedGroups: [{ id: "group-1", title: "Group 1", sortIndex: 0 }],
  sets: [
    { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 },
    { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 },
    { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 },
  ],
  setById: new Map([
    ["set-1", { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
    ["set-2", { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 }],
    ["set-3", { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 }],
  ]),
};

let capturedRenderTopToolbar: ((args: { setId: string; isDragging: boolean; isGhost: boolean }) => ReactNode) | null =
  null;
let capturedResolveGroupClassName:
  | ((args: {
      boardId: "groups" | "entries" | "source";
      groupId: string;
      isHovered: boolean;
      hasSelectedSet: boolean;
      setCount: number;
    }) => string | null)
  | null = null;
let capturedEmptyMessage: string | null = null;

jest.mock("@/components/Decks/hooks/useDeckMutations", () => ({
  useDeckMutations: () => ({
    deleteSet: mockDeleteSet,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("@/components/Decks/detail/context/DeckDetailSelectionContext", () => ({
  useDeckDetailSelection: () => ({
    ...mockSelectionState,
    selectGroup: jest.fn(),
    selectSet: jest.fn(),
    clearSelection: jest.fn(),
    reloadStructure: mockReloadStructure,
  }),
}));

jest.mock("@/components/Decks/detail/boards/DeckBoardsCore", () => ({
  BOARD_ROUTING_META_BY_ID: { groups: {} },
  BoardInfoPill: () => null,
  DefaultSetThumbnailContent: () => null,
  DeckSortableBoardView: () => <div data-testid="board" />,
  useDeckMockDnd: () => ({
    registerDropHandler: () => () => undefined,
    activeSetId: null,
  }),
  useDeckSortableBoardViewModel: (_boardId: string, _meta: unknown, options: unknown) => {
    const typedOptions = options as {
      renderTopToolbar: typeof capturedRenderTopToolbar;
      resolveGroupClassName: typeof capturedResolveGroupClassName;
      emptyMessage?: string | null;
    };
    capturedRenderTopToolbar = typedOptions.renderTopToolbar;
    capturedResolveGroupClassName = typedOptions.resolveGroupClassName;
    capturedEmptyMessage = typedOptions.emptyMessage ?? null;
    return {};
  },
}));

describe("DeckGroupsBoardController delete selected set behavior", () => {
  const mockRequestDeleteSet = jest.fn(async () => {});
  const mockOpenCardEditor = jest.fn();

  beforeEach(() => {
    mockSelectionState = {
      selectedSetId: "set-2",
      selectedGroupId: "group-1",
      orderedGroups: [{ id: "group-1", title: "Group 1", sortIndex: 0 }],
      sets: [
        { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 },
        { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 },
        { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 },
      ],
      setById: new Map([
        ["set-1", { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
        ["set-2", { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 }],
        ["set-3", { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 }],
      ]),
    };
    capturedRenderTopToolbar = null;
    capturedResolveGroupClassName = null;
    capturedEmptyMessage = null;
    mockDeleteSet.mockClear();
    mockReloadStructure.mockClear();
    mockRequestDeleteSet.mockClear();
    mockOpenCardEditor.mockClear();
  });

  it("routes selected-set delete through request callback instead of immediate mutation", async () => {
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onRequestDeleteSet={mockRequestDeleteSet}
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );

    const toolbar = capturedRenderTopToolbar?.({
      setId: "set:set-2",
      isDragging: false,
      isGhost: false,
    });

    render(<>{toolbar}</>);

    fireEvent.click(screen.getByRole("button", { name: "decks.sets.actions.delete" }));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRequestDeleteSet).toHaveBeenCalledWith("set-2");
    expect(mockDeleteSet).not.toHaveBeenCalled();
    expect(mockReloadStructure).not.toHaveBeenCalled();
    const expandedClassName = capturedResolveGroupClassName?.({
      boardId: "groups",
      groupId: "group:group-1",
      isHovered: false,
      hasSelectedSet: false,
      setCount: 2,
    });
    expect(expandedClassName).toContain(styles.groupVisualExpanded);
    expect(expandedClassName).toContain(styles.groupActiveBorder);
  });

  it("applies ephemeral pulse class to transient empty groups", () => {
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );

    const ephemeralClassName = capturedResolveGroupClassName?.({
      boardId: "groups",
      groupId: "group:groups:N4",
      isHovered: false,
      hasSelectedSet: false,
      setCount: 0,
    });
    expect(ephemeralClassName).toContain(styles.groupVisualExpanded);
    expect(ephemeralClassName).toContain(styles.groupEphemeralPulse);
  });

  it("does not render set-key action when card is already key set", () => {
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId="set-2"
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );

    const toolbar = capturedRenderTopToolbar?.({
      setId: "set:set-2",
      isDragging: false,
      isGhost: false,
    });

    render(<>{toolbar}</>);

    expect(screen.queryByRole("button", { name: "decks.sets.actions.setKeyCard" })).toBeNull();
    expect(screen.getByRole("button", { name: "decks.sets.actions.delete" })).toBeInTheDocument();
  });

  it("does not pass empty-drop hint outside bootstrap empty state", () => {
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );
    expect(capturedEmptyMessage).toBeNull();
  });

  it("passes empty-drop hint in bootstrap empty state", () => {
    mockSelectionState = {
      selectedSetId: null,
      selectedGroupId: "group-1",
      orderedGroups: [{ id: "group-1", title: "Group 1", sortIndex: 0 }],
      sets: [],
      setById: new Map(),
    };
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );
    expect(capturedEmptyMessage).toBe("decks.groups.emptyDropHint");
  });

  it("renders edit button and opens set back-face card editor", () => {
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );
    const toolbar = capturedRenderTopToolbar?.({
      setId: "set:set-2",
      isDragging: false,
      isGhost: false,
    });
    render(<>{toolbar}</>);
    fireEvent.click(screen.getByRole("button", { name: "decks.entries.actions.editCard" }));
    expect(mockOpenCardEditor).toHaveBeenCalledWith("back-2");
  });

  it("does not open card editor when set has no back-face id", () => {
    mockSelectionState = {
      ...mockSelectionState,
      setById: new Map([
        ["set-1", { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
        ["set-2", { id: "set-2", groupId: "group-1", backFaceId: "", sortIndex: 1 }],
        ["set-3", { id: "set-3", groupId: "group-2", backFaceId: "back-3", sortIndex: 0 }],
      ]),
    };
    render(
      <DeckGroupsBoardController
        deckId="deck-1"
        keySetId={null}
        enableFanLayout
        onOpenCardEditor={mockOpenCardEditor}
      />,
    );
    const toolbar = capturedRenderTopToolbar?.({
      setId: "set:set-2",
      isDragging: false,
      isGhost: false,
    });
    render(<>{toolbar}</>);
    fireEvent.click(screen.getByRole("button", { name: "decks.entries.actions.editCard" }));
    expect(mockOpenCardEditor).not.toHaveBeenCalled();
  });

});

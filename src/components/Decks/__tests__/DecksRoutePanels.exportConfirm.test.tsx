import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockResolveDeckExportFaceIds = jest.fn();
const mockStartBulkCardExport = jest.fn();
const mockGetCard = jest.fn();

jest.mock("@/components/Decks/deck-export", () => ({
  resolveDeckExportFaceIds: (...args: unknown[]) => mockResolveDeckExportFaceIds(...args),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getCard: (...args: unknown[]) => mockGetCard(...args),
  },
}));

jest.mock("@/components/Export/hooks/useBulkCardExport", () => ({
  useBulkCardExport: () => ({
    startBulkCardExport: (...args: unknown[]) => mockStartBulkCardExport(...args),
    exportUi: null,
    isExporting: false,
  }),
}));

jest.mock("@/components/Decks/DecksGridPanel", () => {
  const { useDeckExport } = require("@/components/Decks/context/DeckExportContext");
  return function MockDecksGridPanel() {
    const ctx = useDeckExport();
    return (
      <button type="button" onClick={() => void ctx?.exportDeck("deck-1", "decks_grid")}>
        Trigger Deck Export
      </button>
    );
  };
});

jest.mock("@/components/Decks/DeckDetailPanel", () => () => null);
jest.mock("@/components/Stockpile/StockpileMissingAssetsModal", () => () => null);

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({ track: jest.fn() }),
}));

jest.mock("@/components/Providers/AppActionsContext", () => ({
  useAppActions: () => ({ openStockpile: jest.fn() }),
}));

jest.mock("@/components/Decks/hooks/useDeckMutations", () => ({
  useDeckMutations: () => ({
    createSetFromBackFace: jest.fn(),
    reorderEntries: jest.fn(),
    createGroup: jest.fn(),
    reorderGroups: jest.fn(),
    reorderSets: jest.fn(),
    updateSetGroup: jest.fn(),
    deleteSet: jest.fn(),
    deleteGroup: jest.fn(),
    rebuildSetBack: jest.fn(),
    setDeckKeySet: jest.fn(),
    deleteDecks: jest.fn(),
  }),
}));

jest.mock("@/components/Decks/hooks/useDeckDetailState", () => ({
  useDeckDetailState: () => ({
    isDeleteDeckOpen: false,
    setIsDeleteDeckOpen: jest.fn(),
    isDeleteSetOpen: false,
    setIsDeleteSetOpen: jest.fn(),
    isDeleteGroupOpen: false,
    setIsDeleteGroupOpen: jest.fn(),
    pendingDeleteGroup: null,
    setPendingDeleteGroup: jest.fn(),
    pendingDeleteSet: null,
    setPendingDeleteSet: jest.fn(),
    isRebuildConfirmOpen: false,
    setIsRebuildConfirmOpen: jest.fn(),
    pendingRebuildSetId: null,
    setPendingRebuildSetId: jest.fn(),
  }),
}));

jest.mock("@/components/Decks/hooks/useDeckDetailSelectionModel", () => ({
  useDeckDetailSelectionModel: () => ({
    selectedSetId: null,
    selectedEntryId: null,
    orderedGroups: [],
    sets: [],
    groupBySetId: new Map(),
    selectedGroupId: null,
    setById: new Map(),
    selectSet: jest.fn(),
    setSelectedEntryId: jest.fn(),
    setSelectedGroupId: jest.fn(),
    reloadStructure: jest.fn(),
    applyOptimisticSets: jest.fn(),
    clearSelection: jest.fn(),
  }),
}));

jest.mock("@/components/Decks/hooks/useDeckSetEntriesModel", () => ({
  useDeckSetEntriesModel: () => ({
    entries: [],
    entriesSorted: [],
    entryFrontIdByEntryId: new Map(),
    addFront: jest.fn(),
    reorderEntriesOptimistic: jest.fn(),
    refreshEntries: jest.fn(),
  }),
}));

jest.mock("@/components/Decks/hooks/useDecksDragController", () => ({
  useDecksDragController: () => ({
    dragState: {
      isBackFaceDragActive: false,
      isFrontFaceDragActive: false,
      isEntryDragActive: false,
      isGroupDragActive: false,
      isSetDragActive: false,
    },
    dndHandlers: {},
    groupRowRef: jest.fn(),
    entriesRowRef: jest.fn(),
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "decks.exportConfirm.title": "Export deck images?",
        "decks.exportConfirm.summary": "This will export {totalCount} unique images from {setCount} sets.",
        "decks.exportConfirm.breakdown": "Includes {frontCount} front-facing and {backCount} back-facing cards.",
        "decks.exportConfirm.uniqueNotice": "Cards repeated across sets are exported once.",
        "actions.proceedExport": "Proceed with export",
        "actions.cancel": "Cancel",
        "alert.selectCardToExport": "Select a card",
        "alert.noImagesExported": "No images",
      };
      return map[key] ?? key;
    },
  }),
}));

import DecksRoutePanels from "@/components/Decks/DecksRoutePanels";

describe("DecksRoutePanels export confirmation", () => {
  beforeEach(() => {
    mockResolveDeckExportFaceIds.mockReset();
    mockStartBulkCardExport.mockReset();
    mockGetCard.mockReset();
    mockResolveDeckExportFaceIds.mockResolvedValue({
      faceIds: ["back-1", "front-1"],
      setCount: 3,
      totalCount: 2,
      frontCount: 1,
      backCount: 1,
    });
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => ({
      id: params.id,
      name: params.id,
      title: params.id,
      templateId: "hero",
    }));
    mockStartBulkCardExport.mockResolvedValue({ status: "completed", result: { status: "ok" } });
  });

  function renderPanel() {
    return render(
      <MemoryRouter initialEntries={["/decks"]}>
        <Routes>
          <Route path="/decks" element={<DecksRoutePanels />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("opens confirmation modal with unique export counts and does not export before confirm", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Trigger Deck Export" }));

    expect(await screen.findByText("Export deck images?")).toBeInTheDocument();
    expect(
      screen.getByText("This will export 2 unique images from 3 sets."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Includes 1 front-facing and 1 back-facing cards."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cards repeated across sets are exported once.")).toBeInTheDocument();
    expect(mockStartBulkCardExport).not.toHaveBeenCalled();
  });

  it("cancels export when user cancels confirmation", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Trigger Deck Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Export deck images?")).not.toBeInTheDocument();
    });
    expect(mockStartBulkCardExport).not.toHaveBeenCalled();
  });

  it("starts export only after confirm", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Trigger Deck Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Proceed with export" }));

    await waitFor(() => {
      expect(mockStartBulkCardExport).toHaveBeenCalledTimes(1);
    });
  });
});


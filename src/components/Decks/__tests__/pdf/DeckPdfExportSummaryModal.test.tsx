import { forwardRef, useImperativeHandle } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeckPdfExportSummaryModal from "@/components/Decks/pdf/DeckPdfExportSummaryModal";

import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { PrintConfig, SlotPair } from "@/lib/pdf-export";

const mockResolveDeckPdfRunData = jest.fn();
const mockSummarizeDeckPdfRunData = jest.fn();
const mockGetDeck = jest.fn();
const mockGetCard = jest.fn();
const mockBuildAssetCache = jest.fn();
const mockWaitForAssetElements = jest.fn();
const mockWaitForFrame = jest.fn();
const mockCapturedExportRun = jest.fn();
const mockCapturedAlignmentRun = jest.fn();

jest.mock("@/api/client", () => ({
  apiClient: {
    getDeck: (...args: unknown[]) => mockGetDeck(...args),
    getCard: (...args: unknown[]) => mockGetCard(...args),
  },
}));

jest.mock("@/components/Decks/deck-export", () => ({
  createDeckPdfPlaceholderFrontId: (setId: string) => `deck-empty-front:${setId}`,
  parseDeckPdfPlaceholderFrontId: (faceId: string) =>
    faceId.startsWith("deck-empty-front:")
      ? { setId: faceId.slice("deck-empty-front:".length) }
      : null,
  resolveDeckPdfRunData: (...args: unknown[]) => mockResolveDeckPdfRunData(...args),
  summarizeDeckPdfRunData: (...args: unknown[]) => mockSummarizeDeckPdfRunData(...args),
}));

jest.mock("@/components/Decks/pdf/deckPdfFileName", () => ({
  buildDeckPdfFileName: () => "deck.pdf",
  buildDeckPdfAlignmentFileName: () => "alignment.pdf",
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    language: "en",
    t: (key: string, vars?: Record<string, unknown>) =>
      (
        {
          "decks.pdf.modal.title": "Export deck PDF",
          "actions.cancel": "Cancel",
          "decks.untitledDeck": "Untitled deck",
          "alert.selectCardToExport": "Select a card",
          "decks.pdf.errors.layoutCapacity": "Layout capacity error",
          "decks.pdf.errors.noSheets": "No sheets",
          "decks.pdf.summary.layout.label": "Layout",
          "decks.pdf.summary.layout.customize": "Customise layout",
          "decks.pdf.summary.bleedSettings.label": "Bleed settings",
          "decks.pdf.summary.bleedSettings.customize": "Customise bleed settings",
          "decks.pdf.summary.runMode.frontBack": "Front + back",
          "decks.pdf.summary.runMode.frontsOnly": "Fronts only",
          "decks.pdf.summary.includedSets.complete": `Complete sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.all": `All sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.selected": `Selected sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.totalEntryQuantity": `Entries: ${vars?.count ?? ""}`,
          "decks.pdf.summary.exportSlots": `Export slots: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedEmptySets": `Empty placeholder sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.faces": `Exported faces: ${vars?.frontCount ?? ""}/${vars?.backCount ?? ""}/${vars?.totalCount ?? ""}`,
          "decks.pdf.summary.emptyExcluded": `Empty excluded: ${vars?.count ?? ""}`,
          "decks.pdf.summary.noneAvailable": "None available",
          "decks.pdf.orientation.portrait": "Portrait",
          "decks.pdf.orientation.landscape": "Landscape",
          "decks.pdf.duplex.normal": "Normal",
          "decks.pdf.duplex.mirrorX": "Mirror horizontally",
          "decks.pdf.summary.bleed.none": "No bleed",
          "decks.pdf.summary.bleed.amount": `Bleed ${vars?.count ?? ""}px`,
          "decks.pdf.summary.bleed.roundedCorners": "Rounded corners",
          "decks.pdf.summary.bleed.cropMarks": `Crop marks (${vars?.style ?? ""})`,
          "decks.pdf.summary.bleed.cutMarks": "Cut marks",
          "label.cropMarkStyleLines": "Lines",
          "label.cropMarkStyleSquares": "Squares",
          "label.cropMarkStyleTriangles": "Triangles",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { id: "hero", background: "/hero.png" },
  },
}));

jest.mock("@/i18n/getTemplateNameLabel", () => ({
  getTemplateNameLabel: () => "Hero",
}));

jest.mock("@/components/Export/PdfExportShellModal", () => {
  const React = require("react");
  const defaultConfig = {
    paper: "Letter",
    orientation: "portrait",
    marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
    gapMm: { x: 0.5, y: 0.5 },
    cardMm: { width: 63.5, height: 88.9 },
    mode: "frontsOnly",
    bleedMode: "bakedInImage",
    bleedMm: 3,
    duplexPreset: "normal",
  } satisfies PrintConfig;
  const defaultBleedOptions = {
    bleedEnabled: true,
    bleedPx: 18,
    askBeforeExport: false,
    roundedCorners: false,
    cropMarksEnabled: true,
    cropMarkColor: "#00FFFF",
    cropMarkStyle: "squares",
    cutMarksEnabled: true,
    cutMarkColor: "#00FFFF",
  } satisfies ExportOptionsFormState;

  return {
    __esModule: true,
    default: (props: {
      title: string;
      slotPairs: SlotPair[];
      placeholderLookup?: Record<string, { title: string; subtitle?: string; variant: "empty-front" }>;
      summaryContent?: {
        columns: Array<Array<{ text: string; tone?: "default" | "muted" }>>;
        notice?: { text: string; tone?: "default" | "muted" | "blocked" };
      };
      onCancel: () => void;
      onStateChange?: (state: unknown) => void;
      buildExportRun: (state: unknown) => Promise<unknown>;
      buildAlignmentExportRun?: (state: unknown) => Promise<unknown>;
      topContent: React.ReactNode | ((state: unknown) => React.ReactNode);
      children?: React.ReactNode;
    }) => {
      const {
        title,
        slotPairs,
        placeholderLookup,
        summaryContent,
        onCancel,
        onStateChange,
        buildExportRun,
        buildAlignmentExportRun,
        topContent,
        children,
      } = props;
      const [shellState, setShellState] = React.useState({
        config: defaultConfig,
        bleedOptions: defaultBleedOptions,
        layoutMode: "default",
        bleedMode: "default",
        effectiveConfig: defaultConfig,
        effectiveBleedOptions: defaultBleedOptions,
        resolvedBleedOptions: {
          bleedMm: defaultBleedOptions.bleedEnabled ? 1.5 : 0,
          imagePaddingMm: 0,
          bleedPx: defaultBleedOptions.bleedEnabled ? defaultBleedOptions.bleedPx : 0,
          roundedCorners: defaultBleedOptions.roundedCorners,
          cropMarks: {
            enabled: defaultBleedOptions.bleedEnabled
              ? defaultBleedOptions.cropMarksEnabled
              : false,
            color: defaultBleedOptions.cropMarkColor,
            style: defaultBleedOptions.cropMarkStyle,
          },
          cutMarks: {
            enabled: defaultBleedOptions.bleedEnabled ? defaultBleedOptions.cutMarksEnabled : false,
            color: defaultBleedOptions.cutMarkColor,
          },
        },
      });

      React.useEffect(() => {
        onStateChange?.(shellState);
      }, [onStateChange, shellState]);

      const renderedTopContent =
        typeof topContent === "function" ? topContent(shellState) : topContent;

      return (
        <div>
          <div>{title}</div>
          <div data-testid="shell-mode">{shellState.effectiveConfig.mode}</div>
          <div data-testid="shell-slot-pair-count">{slotPairs.length}</div>
          <div data-testid="shell-placeholder-count">{Object.keys(placeholderLookup ?? {}).length}</div>
          <div data-testid="shell-summary-primary">
            {summaryContent?.columns[0]?.map((line) => line.text).join(" | ") ?? ""}
          </div>
          <div data-testid="shell-summary-secondary">
            {summaryContent?.columns[1]?.map((line) => `${line.tone ?? "default"}:${line.text}`).join(" | ") ??
              ""}
          </div>
          <div data-testid="shell-summary-notice">
            {summaryContent?.notice
              ? `${summaryContent.notice.tone ?? "default"}:${summaryContent.notice.text}`
              : ""}
          </div>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              const result = await buildExportRun({
                shellState,
                config: {
                  ...shellState.effectiveConfig,
                  bleedMm: shellState.resolvedBleedOptions.bleedMm,
                },
                layout: { paperMm: { width: 210, height: 297 }, grid: { cols: 2, rows: 1, perPage: 2 }, placements: [] },
              });
              mockCapturedExportRun(result);
            }}
          >
            Run export
          </button>
          <button
            type="button"
            onClick={async () => {
              const result = await buildAlignmentExportRun?.({
                shellState,
                config: {
                  ...shellState.effectiveConfig,
                  bleedMm: shellState.resolvedBleedOptions.bleedMm,
                },
                layout: { paperMm: { width: 210, height: 297 }, grid: { cols: 2, rows: 1, perPage: 2 }, placements: [] },
              });
              mockCapturedAlignmentRun(result);
            }}
          >
            Run alignment export
          </button>
          <button
            type="button"
            onClick={() =>
              setShellState((prev: typeof shellState) => ({
                ...prev,
                config: {
                  ...prev.config,
                  mode: "frontAndBack",
                  orientation: "landscape",
                  duplexPreset: "mirrorX",
                },
                layoutMode: "custom",
                effectiveConfig: {
                  ...prev.effectiveConfig,
                  mode: "frontAndBack",
                  orientation: "landscape",
                  duplexPreset: "mirrorX",
                },
              }))
            }
          >
            Change mode
          </button>
          <div>{renderedTopContent}</div>
          <div data-testid="shell-children">{children ? "present" : "empty"}</div>
        </div>
      );
    },
  };
});

jest.mock("@/components/Decks/pdf/DeckPdfExportPanel", () => ({
  __esModule: true,
  default: ({
    summary,
    setScopeMode,
    selectedSetIds,
    onSetScopeMode,
    onToggleSet,
  }: {
    summary: { includedSetCount: number; totalFaceCount: number; exportSlotQuantity: number } | null;
    setScopeMode: string;
    selectedSetIds: Set<string>;
    onSetScopeMode: (mode: "complete" | "all" | "selected") => void;
    onToggleSet: (setId: string) => void;
  }) => (
    <div>
      <div data-testid="scope-mode">{setScopeMode}</div>
      <div data-testid="selected-size">{selectedSetIds.size}</div>
      <div data-testid="included-count">{summary?.includedSetCount ?? -1}</div>
      <div data-testid="total-faces">{summary?.totalFaceCount ?? -1}</div>
      <div data-testid="slot-count">{summary?.exportSlotQuantity ?? -1}</div>
      <button type="button" onClick={() => onSetScopeMode("selected")}>
        Scope selected
      </button>
      <button type="button" onClick={() => onToggleSet("set-2")}>
        Toggle set 2
      </button>
    </div>
  ),
}));

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      waitForBackgroundLoaded: jest.fn().mockResolvedValue(undefined),
      syncCopyrightContrast: jest.fn().mockResolvedValue(undefined),
      getSvgElement: jest.fn().mockReturnValue(document.createElement("svg")),
      renderToPngBlob: jest.fn().mockResolvedValue(new Blob(["png"], { type: "image/png" })),
    }));
    return <div data-testid="card-preview" />;
  }),
}));

jest.mock("@/components/Stockpile/stockpile-utils", () => ({
  waitForAssetElements: (...args: unknown[]) => mockWaitForAssetElements(...args),
  waitForFrame: (...args: unknown[]) => mockWaitForFrame(...args),
}));

jest.mock("@/lib/export-assets-cache", () => ({
  buildAssetCache: (...args: unknown[]) => mockBuildAssetCache(...args),
}));

jest.mock("@/lib/card-assets", () => ({
  collectCardAssetIds: () => [],
}));

jest.mock("@/lib/card-record-mapper", () => ({
  cardRecordToCardData: () => ({ title: "Card" }),
}));

jest.mock("@/lib/pdf-export", () => ({
  buildSingleSheetAlignmentComposition: () => ({
    sheets: [{ sheetIndex: 0, slots: [{ frontId: "alignment:front:0:1", backId: null }] }],
    totalSlots: 1,
  }),
  parseAlignmentFaceId: (faceId: string) => {
    const match = /^alignment:(front|back):(\d+):(\d+)$/.exec(faceId);
    if (!match) return null;
    return {
      side: match[1],
      sheetIndex: Number(match[2]),
      slotNumber: Number(match[3]),
    };
  },
}));

jest.mock("@/lib/bleed-export", () => ({
  composeBleedCanvas: ({ fullCanvas }: { fullCanvas: HTMLCanvasElement }) => fullCanvas,
}));

beforeEach(() => {
  mockResolveDeckPdfRunData.mockReset();
  mockSummarizeDeckPdfRunData.mockReset();
  mockGetDeck.mockReset();
  mockGetCard.mockReset();
  mockBuildAssetCache.mockReset();
  mockWaitForAssetElements.mockReset();
  mockWaitForFrame.mockReset();
  mockCapturedExportRun.mockReset();
  mockCapturedAlignmentRun.mockReset();

  mockResolveDeckPdfRunData.mockImplementation(
    async (_deckId: string, mode: string, scopeMode: string, selectedSetIds: string[]) => ({
      sets: [
        { setId: "set-1", setTitle: "Set One", backFaceId: "back-1", hasEntries: true, entryCount: 2 },
        { setId: "set-2", setTitle: "Set Two", backFaceId: "back-2", hasEntries: false, entryCount: 0 },
      ],
      selectedSetIds,
      slotPairs:
        scopeMode === "selected" && selectedSetIds.length === 1
          ? [{ slotId: "slot-1", frontId: "front-1", backId: mode === "frontAndBack" ? "back-1" : null }]
          : [
              { slotId: "slot-1", frontId: "front-1", backId: mode === "frontAndBack" ? "back-1" : null },
              { slotId: "slot-2", frontId: "front-2", backId: mode === "frontAndBack" ? "back-2" : null },
            ],
    }),
  );
  mockSummarizeDeckPdfRunData.mockImplementation(
    (runData: { slotPairs: unknown[] }, mode: string, _scopeMode: string, selectedSetIds: Set<string>) => ({
      totalSetCount: 2,
      includedSetCount: selectedSetIds.size || 1,
      includedEmptySetCount: 0,
      excludedEmptySetCount: 1,
      excludedNonEmptySetCount: 0,
      totalEntryQuantity: runData.slotPairs.length,
      exportSlotQuantity: runData.slotPairs.length,
      frontFaceCount: runData.slotPairs.filter((slot) => !String(slot.frontId ?? "").startsWith("deck-empty-front:")).length,
      backFaceCount: mode === "frontAndBack" ? (selectedSetIds.size || 1) : 0,
      totalFaceCount:
        runData.slotPairs.filter((slot) => !String(slot.frontId ?? "").startsWith("deck-empty-front:")).length +
        (mode === "frontAndBack" ? (selectedSetIds.size || 1) : 0),
      sets: [
        { setId: "set-1", setTitle: "Set One", backFaceId: "back-1", hasEntries: true, entryCount: 2 },
        { setId: "set-2", setTitle: "Set Two", backFaceId: "back-2", hasEntries: false, entryCount: 0 },
      ],
    }),
  );
  mockGetDeck.mockResolvedValue({ title: "Deck One" });
  mockGetCard.mockResolvedValue({
    id: "front-1",
    name: "Front 1",
    title: "Front 1",
    templateId: "hero",
  });
  mockBuildAssetCache.mockResolvedValue({ cache: new Map(), clear: jest.fn() });
  window.alert = jest.fn();
});

describe("DeckPdfExportSummaryModal", () => {
  it("initializes deck selection state and passes slot pairs directly to the shell and panel", async () => {
    render(
      <DeckPdfExportSummaryModal isOpen deckId="deck-1" scope="deck_detail" onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-mode")).toHaveTextContent("frontsOnly");
    });
    expect(screen.getByTestId("shell-slot-pair-count")).toHaveTextContent("2");
    expect(screen.getByTestId("included-count")).toHaveTextContent("1");
    expect(screen.getByTestId("selected-size")).toHaveTextContent("1");
    expect(screen.getByTestId("shell-placeholder-count")).toHaveTextContent("2");
    expect(screen.getByTestId("shell-children")).toHaveTextContent("empty");
    expect(screen.getByTestId("shell-summary-primary")).toHaveTextContent(
      "Complete sets: 1 | Entries: 2 | Exported faces: 2/0/2",
    );
    expect(screen.getByTestId("shell-summary-secondary")).toHaveTextContent("muted:Empty excluded: 1");
    expect(mockResolveDeckPdfRunData).toHaveBeenCalledWith("deck-1", "frontsOnly", "complete", []);
  });

  it("recomputes stored slot pairs when selection state and shell mode change", async () => {
    render(
      <DeckPdfExportSummaryModal isOpen deckId="deck-1" scope="deck_detail" onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("scope-mode")).toHaveTextContent("complete");
    });

    fireEvent.click(screen.getByRole("button", { name: "Scope selected" }));

    await waitFor(() => {
      expect(screen.getByTestId("shell-slot-pair-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Change mode" }));

    await waitFor(() => {
      expect(mockResolveDeckPdfRunData).toHaveBeenCalledWith(
        "deck-1",
        "frontAndBack",
        "selected",
        ["set-1"],
      );
    });
  });

  it("narrows normal export to deck-specific metadata only", async () => {
    render(
      <DeckPdfExportSummaryModal isOpen deckId="deck-1" scope="deck_detail" onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-slot-pair-count")).toHaveTextContent("2");
    });

    fireEvent.click(screen.getByRole("button", { name: "Run export" }));

    await waitFor(() => {
      expect(mockCapturedExportRun).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "deck.pdf",
          includeCalibrationPage: true,
        }),
      );
    });
    expect(mockCapturedExportRun.mock.calls[0][0]).not.toHaveProperty("composition");
    expect(mockCapturedExportRun.mock.calls[0][0]).not.toHaveProperty("config");
    expect(mockCapturedExportRun.mock.calls[0][0]).not.toHaveProperty("renderFacePngBytes");
    expect(mockGetDeck).toHaveBeenCalledWith({ params: { deckId: "deck-1" } });
  });

  it("keeps alignment export as a separate callback with synthetic composition", async () => {
    render(
      <DeckPdfExportSummaryModal isOpen deckId="deck-1" scope="deck_detail" onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-slot-pair-count")).toHaveTextContent("2");
    });

    fireEvent.click(screen.getByRole("button", { name: "Run alignment export" }));

    await waitFor(() => {
      expect(mockCapturedAlignmentRun).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "alignment.pdf",
          composition: expect.objectContaining({
            sheets: expect.any(Array),
          }),
        }),
      );
    });
  });

  it("passes a blocked summary notice when no slot pairs are available", async () => {
    const blockedRunData = {
      sets: [
        { setId: "set-1", setTitle: "Set One", backFaceId: "back-1", hasEntries: false, entryCount: 0 },
      ],
      selectedSetIds: [],
      slotPairs: [],
    };
    const blockedSummary = {
      totalSetCount: 1,
      includedSetCount: 0,
      includedEmptySetCount: 0,
      excludedEmptySetCount: 1,
      excludedNonEmptySetCount: 0,
      totalEntryQuantity: 0,
      exportSlotQuantity: 0,
      frontFaceCount: 0,
      backFaceCount: 0,
      totalFaceCount: 0,
      sets: [{ setId: "set-1", setTitle: "Set One", backFaceId: "back-1", hasEntries: false, entryCount: 0 }],
    };
    mockResolveDeckPdfRunData.mockImplementation(async () => blockedRunData);
    mockSummarizeDeckPdfRunData.mockImplementation(() => blockedSummary);

    render(
      <DeckPdfExportSummaryModal isOpen deckId="deck-1" scope="deck_detail" onClose={jest.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("shell-slot-pair-count")).toHaveTextContent("0");
    });

    expect(screen.getByTestId("shell-summary-notice")).toHaveTextContent("blocked:None available");
  });
});

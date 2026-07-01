import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import PdfExportShellModal from "@/components/Export/PdfExportShellModal";

import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { PdfExportAlignmentRun, PdfExportRun } from "@/components/Export/PdfExportShellModal";
import type { PrintConfig, SlotPair } from "@/lib/pdf-export";

const mockGetCard = jest.fn();
const mockComputeLayoutPlan = jest.fn();
const mockComposePrintComposition = jest.fn();
const mockRenderPdf = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:pdf");
const mockRevokeObjectURL = jest.fn();
const mockLinkClick = jest.fn();
const mockWaitForAssetElements = jest.fn();
const mockWaitForFrame = jest.fn();
const mockBuildAssetCache = jest.fn();
let mockExportSettings = {
  bleed: { enabled: true, bleedPx: 18, askBeforeExport: false },
  cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
  cutMarks: { enabled: true, color: "#00FFFF" },
  roundedCorners: true,
  pdf: {
    paper: "Letter",
    orientation: "portrait",
    marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
    gapMm: { x: 0.5, y: 0.5 },
    cardMm: { width: 63.5, height: 88.9 },
    mode: "frontsOnly" as PrintConfig["mode"],
    bleedMode: "bakedInImage" as PrintConfig["bleedMode"],
    bleedMm: 3,
    duplexPreset: "normal" as NonNullable<PrintConfig["duplexPreset"]>,
  },
};

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "status.exportingImages": "Exporting images",
          "status.finalizing": "Finalizing",
          "alert.exportImagesFailed": "Export failed",
          "actions.cancel": "Cancel",
          "actions.cancelling": "Cancelling",
          "actions.exporting": "Exporting",
          "decks.pdf.modal.export": "Export PDF",
          "decks.pdf.modal.exportAlignmentTest": "Export alignment test",
          "decks.pdf.summary.layout.label": "Layout",
          "decks.pdf.summary.layout.customize": "Customise layout",
          "decks.pdf.summary.bleedSettings.label": "Bleed settings",
          "decks.pdf.summary.bleedSettings.customize": "Customise bleed settings",
          "decks.pdf.orientation.portrait": "Portrait",
          "decks.pdf.orientation.landscape": "Landscape",
          "decks.pdf.summary.runMode.frontBack": "Front + back",
          "decks.pdf.summary.runMode.frontsOnly": "Fronts only",
          "decks.pdf.duplex.normal": "Normal",
          "decks.pdf.duplex.mirrorX": "Mirror horizontally",
          "decks.pdf.summary.bleed.none": "No bleed",
          "decks.pdf.summary.bleed.amount": "Bleed 18px",
          "decks.pdf.summary.bleed.roundedCorners": "Rounded corners",
          "decks.pdf.summary.bleed.cropMarks": "Crop marks (lines)",
          "decks.pdf.summary.bleed.cutMarks": "Cut marks",
          "label.cropMarkStyleLines": "Lines",
          "label.cropMarkStyleSquares": "Squares",
          "decks.pdf.errors.layoutCapacity": "Layout capacity error",
          "decks.pdf.errors.noSheets": "No sheets",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Providers/ExportSettingsContext", () => ({
  useExportSettingsState: () => ({
    settings: mockExportSettings,
  }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getCard: (...args: unknown[]) => mockGetCard(...args),
  },
}));

jest.mock("@/components/common/ActionBar", () => ({
  __esModule: true,
  default: ({ right }: { right: ReactNode }) => <div>{right}</div>,
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
    footer,
    onClose,
  }: {
    isOpen: boolean;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <button type="button" onClick={onClose}>
          Close
        </button>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

jest.mock("@/components/Export/PdfExportConfigForm", () => ({
  __esModule: true,
  default: ({
    config,
    hiddenFields,
    onChange,
  }: {
    config: PrintConfig;
    hiddenFields?: { mode?: boolean; duplexPreset?: boolean };
    onChange: (next: PrintConfig) => void;
  }) => (
    <div data-testid="pdf-config-form">
      <div data-testid="pdf-config-hidden-mode">{String(Boolean(hiddenFields?.mode))}</div>
      <div data-testid="pdf-config-hidden-duplex">{String(Boolean(hiddenFields?.duplexPreset))}</div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...config,
            mode: "frontAndBack",
            orientation: "landscape",
            duplexPreset: "mirrorX",
          })
        }
      >
        Set duplex layout
      </button>
    </div>
  ),
}));

jest.mock("@/components/Export/ExportOptionsForm", () => ({
  __esModule: true,
  default: ({
    onChange,
  }: {
    onChange: (next: Partial<ExportOptionsFormState>) => void;
  }) => (
    <div data-testid="bleed-options-form">
      <button
        type="button"
        onClick={() =>
          onChange({
            bleedEnabled: false,
            bleedPx: 0,
            cropMarksEnabled: false,
            cutMarksEnabled: false,
          })
        }
      >
        Disable bleed
      </button>
    </div>
  ),
}));

jest.mock("@/components/Export/PdfExportProgressModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    progress,
    total,
    onCancel,
  }: {
    isOpen: boolean;
    progress: number;
    total: number;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="progress-modal">
        <div data-testid="progress">
          {progress}/{total}
        </div>
        <button type="button" onClick={onCancel}>
          Cancel export
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/Cards/CardPreview", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        waitForBackgroundLoaded: jest.fn().mockResolvedValue(undefined),
        syncCopyrightContrast: jest.fn().mockResolvedValue(undefined),
        getSvgElement: jest.fn().mockReturnValue(document.createElement("svg")),
        renderToPngBlob: jest.fn().mockResolvedValue(new Blob(["png"], { type: "image/png" })),
      }));
      return <div data-testid="card-preview" />;
    }),
  };
});

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

jest.mock("@/data/card-templates", () => ({
  cardTemplatesById: {
    hero: { id: "hero", background: "/hero.png" },
  },
}));

jest.mock("@/i18n/getTemplateNameLabel", () => ({
  getTemplateNameLabel: () => "Hero",
}));

jest.mock("@/lib/bleed-export", () => ({
  composeBleedCanvas: ({ fullCanvas }: { fullCanvas: HTMLCanvasElement }) => fullCanvas,
}));

jest.mock("@/components/Export/pdfExportBleed", () => ({
  resolvePdfExportBleedOptions: (source: ExportOptionsFormState) => ({
    bleedMm: source.bleedEnabled ? 1.5 : 0,
    imagePaddingMm: 0,
    bleedPx: source.bleedEnabled ? source.bleedPx : 0,
    roundedCorners: source.roundedCorners,
    cropMarks: {
      enabled: source.bleedEnabled ? source.cropMarksEnabled : false,
      color: source.cropMarkColor,
      style: source.cropMarkStyle,
    },
    cutMarks: {
      enabled: source.bleedEnabled ? source.cutMarksEnabled : false,
      color: source.cutMarkColor,
    },
  }),
}));

jest.mock("@/lib/pdf-export", () => ({
  DEFAULT_PDF_PRINT_CONFIG: {
    paper: "A4",
    orientation: "landscape",
    marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
    gapMm: { x: 0.5, y: 0.5 },
    cardMm: { width: 63.5, height: 88.9 },
    mode: "frontAndBack",
    bleedMode: "bakedInImage",
    bleedMm: 3,
    duplexPreset: "mirrorX",
  },
  normalizePdfPrintConfig: (next: PrintConfig) => next,
  getPdfFooterReserveMm: () => 0,
  computeLayoutPlan: (...args: unknown[]) => mockComputeLayoutPlan(...args),
  composePrintComposition: (...args: unknown[]) => mockComposePrintComposition(...args),
  renderPdf: (...args: unknown[]) => mockRenderPdf(...args),
}));

const config: PrintConfig = {
  paper: "Letter",
  orientation: "portrait",
  marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
  gapMm: { x: 0.5, y: 0.5 },
  cardMm: { width: 63.5, height: 88.9 },
  mode: "frontsOnly",
  bleedMode: "bakedInImage",
  bleedMm: 3,
  duplexPreset: "normal",
};

const slotPairs: SlotPair[] = [{ slotId: "slot-1", frontId: "front-1", backId: null }];

function makeRun(): PdfExportRun {
  return {
    fileName: "cards.pdf",
    includeCalibrationPage: true,
    renderFacePngBytes: async () => new Uint8Array([1, 2, 3]),
  };
}

function makeAlignmentRun(): PdfExportAlignmentRun {
  return {
    ...makeRun(),
    composition: {
      sheets: [{ sheetIndex: 0, slots: [{ frontId: "alignment:front:0:1", backId: null }] }],
      totalSlots: 1,
    },
  };
}

beforeEach(() => {
  mockGetCard.mockReset();
  mockExportSettings = {
    bleed: { enabled: true, bleedPx: 18, askBeforeExport: false },
    cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
    cutMarks: { enabled: true, color: "#00FFFF" },
    roundedCorners: true,
    pdf: {
      paper: "Letter",
      orientation: "portrait",
      marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
      gapMm: { x: 0.5, y: 0.5 },
      cardMm: { width: 63.5, height: 88.9 },
      mode: "frontsOnly",
      bleedMode: "bakedInImage",
      bleedMm: 3,
      duplexPreset: "normal",
    },
  };
  mockComputeLayoutPlan.mockReset();
  mockComposePrintComposition.mockReset();
  mockRenderPdf.mockReset();
  mockWaitForAssetElements.mockReset();
  mockWaitForFrame.mockReset();
  mockBuildAssetCache.mockReset();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
  mockLinkClick.mockClear();

  mockComputeLayoutPlan.mockReturnValue({
    paperMm: { width: 210, height: 297 },
    grid: { cols: 1, rows: 1, perPage: 1 },
    placements: [],
  });
  mockComposePrintComposition.mockImplementation((pairs: unknown[]) => ({
    sheets: [{ sheetIndex: 0, slots: pairs }],
    totalSlots: Array.isArray(pairs) ? pairs.length : 0,
  }));
  mockGetCard.mockResolvedValue({
    id: "front-1",
    name: "Front 1",
    title: "Front 1",
    templateId: "hero",
  });
  mockBuildAssetCache.mockResolvedValue({ cache: new Map(), clear: jest.fn() });
  mockRenderPdf.mockResolvedValue({
    status: "success",
    blob: new Blob(["pdf"], { type: "application/pdf" }),
    fileName: "cards.pdf",
    renderedFaces: 1,
    skippedFaces: 0,
    pageCount: 1,
  });
  window.alert = jest.fn();

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: mockCreateObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: mockRevokeObjectURL,
  });

  const realCreateElement = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const element = realCreateElement(tagName);
    if (tagName === "a") {
      Object.defineProperty(element, "click", {
        configurable: true,
        value: mockLinkClick,
      });
    }
    if (tagName === "canvas") {
      Object.defineProperty(element, "getContext", {
        configurable: true,
        value: jest.fn(() => ({
          fillStyle: "",
          strokeStyle: "",
          lineWidth: 1,
          textAlign: "center",
          textBaseline: "middle",
          font: "",
          fillRect: jest.fn(),
          beginPath: jest.fn(),
          roundRect: jest.fn(),
          stroke: jest.fn(),
          fillText: jest.fn(),
        })),
      });
      Object.defineProperty(element, "toBlob", {
        configurable: true,
        value: (callback: (blob: { arrayBuffer: () => Promise<ArrayBuffer> } | null) => void) =>
          callback({
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          }),
      });
    }
    return element;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PdfExportShellModal", () => {
  it("renders top content, seeds internal state, hides custom forms, and disables export when no slot pairs exist", () => {
    const onStateChange = jest.fn();

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={[]}
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={jest.fn()}
        buildAlignmentExportRun={jest.fn()}
        summaryContent={{
          columns: [
            [{ text: "Primary line" }],
            [{ text: "Secondary line", tone: "muted" }],
          ],
          notice: { text: "Nothing available", tone: "blocked" },
        }}
        topContent={(state) => <div>Mode: {state.effectiveConfig.mode}</div>}
      />,
    );

    expect(screen.getByText("Export shell")).toBeInTheDocument();
    expect(screen.getByText("Mode: frontsOnly")).toBeInTheDocument();
    expect(screen.getByText("Primary line")).toBeInTheDocument();
    expect(screen.getByText("Secondary line")).toBeInTheDocument();
    expect(screen.getByText("Nothing available")).toHaveClass("deckPdfSummaryBlocked");
    expect(screen.getByText("Letter, Portrait, Fronts only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export alignment test" })).toBeDisabled();
    expect(screen.queryByTestId("pdf-config-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bleed-options-form")).not.toBeInTheDocument();
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layoutMode: "default",
        bleedMode: "default",
        effectiveConfig: expect.objectContaining({ mode: "frontsOnly" }),
      }),
    );
  });

  it("omits the summary area when no summary payload is provided", () => {
    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        buildExportRun={jest.fn()}
      />,
    );

    expect(screen.queryByText("Primary line")).not.toBeInTheDocument();
    expect(screen.queryByText("Secondary line")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing available")).not.toBeInTheDocument();
  });

  it("re-emits shell state when reopened with unchanged internal settings", () => {
    const onStateChange = jest.fn();
    const { rerender } = render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={jest.fn()}
      />,
    );

    expect(onStateChange).toHaveBeenCalledTimes(1);

    rerender(
      <PdfExportShellModal
        isOpen={false}
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={jest.fn()}
      />,
    );

    rerender(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={jest.fn()}
      />,
    );

    expect(onStateChange).toHaveBeenCalledTimes(2);
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        effectiveConfig: expect.objectContaining({ mode: "frontsOnly" }),
      }),
    );
  });

  it("owns custom layout and bleed state and builds normal export composition from slot pairs", async () => {
    const buildExportRun = jest.fn(() => makeRun());
    const buildAlignmentExportRun = jest.fn(() => makeAlignmentRun());

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        buildExportRun={buildExportRun}
        buildAlignmentExportRun={buildAlignmentExportRun}
      />,
    );

    fireEvent.click(screen.getByLabelText("Customise layout"));
    fireEvent.click(screen.getByLabelText("Customise bleed settings"));
    expect(screen.getByTestId("pdf-config-form")).toBeInTheDocument();
    expect(screen.getByTestId("bleed-options-form")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set duplex layout" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable bleed" }));
    fireEvent.click(screen.getByRole("button", { name: "Export alignment test" }));
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(buildAlignmentExportRun).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            mode: "frontAndBack",
            orientation: "landscape",
            duplexPreset: "mirrorX",
          }),
          shellState: expect.objectContaining({
            layoutMode: "custom",
            bleedMode: "custom",
            effectiveBleedOptions: expect.objectContaining({
              bleedEnabled: false,
              bleedPx: 0,
            }),
          }),
          layout: expect.objectContaining({
            grid: expect.objectContaining({ perPage: 1 }),
          }),
        }),
      );
    });
    expect(buildExportRun).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ mode: "frontAndBack" }),
        layout: expect.objectContaining({
          grid: expect.objectContaining({ perPage: 1 }),
        }),
      }),
    );
    expect(mockComposePrintComposition).toHaveBeenCalledWith(slotPairs, 1);
    expect(mockRenderPdf).toHaveBeenCalledTimes(2);
  });

  it("renders normal export faces inside the shell for real cards and placeholders", async () => {
    mockRenderPdf.mockImplementation(
      async ({ renderFacePngBytes }: { renderFacePngBytes: (faceId: string) => Promise<Uint8Array | null> }) => {
        await renderFacePngBytes("front-1");
        await renderFacePngBytes("placeholder-1");
        await renderFacePngBytes("missing-placeholder");
        return {
          status: "success",
          blob: new Blob(["pdf"], { type: "application/pdf" }),
          fileName: "cards.pdf",
          renderedFaces: 2,
          skippedFaces: 1,
          pageCount: 1,
        };
      },
    );

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={[
          { slotId: "slot-1", frontId: "front-1", backId: null },
          { slotId: "slot-2", frontId: "placeholder-1", backId: null },
          { slotId: "slot-3", frontId: "missing-placeholder", backId: null },
        ]}
        placeholderLookup={{
          "placeholder-1": { variant: "empty-front", title: "EMPTY FRONT", subtitle: "Set One" },
        }}
        onCancel={jest.fn()}
        buildExportRun={() => makeRun()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(mockGetCard).toHaveBeenCalledWith({ params: { id: "front-1" } });
    });
    expect(mockGetCard).toHaveBeenCalledWith({ params: { id: "missing-placeholder" } });
  });

  it("applies forced mode and duplex values over export settings defaults", async () => {
    mockExportSettings = {
      ...mockExportSettings,
      pdf: {
        ...mockExportSettings.pdf,
        mode: "frontAndBack",
        duplexPreset: "mirrorX",
      },
    };
    const onStateChange = jest.fn();
    const buildExportRun = jest.fn(() => makeRun());

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        shellPolicy={{
          mode: { forcedValue: "frontsOnly" },
          duplexPreset: { forcedValue: "normal" },
        }}
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={buildExportRun}
      />,
    );

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveConfig: expect.objectContaining({
            mode: "frontsOnly",
            duplexPreset: "normal",
          }),
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(buildExportRun).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            mode: "frontsOnly",
            duplexPreset: "normal",
          }),
        }),
      );
    });
  });

  it("passes hidden mode and duplex policy into the config form", () => {
    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        shellPolicy={{
          mode: { hidden: true, forcedValue: "frontsOnly" },
          duplexPreset: { hidden: true, forcedValue: "normal" },
        }}
        onCancel={jest.fn()}
        buildExportRun={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Customise layout"));

    expect(screen.getByTestId("pdf-config-form")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-config-hidden-mode")).toHaveTextContent("true");
    expect(screen.getByTestId("pdf-config-hidden-duplex")).toHaveTextContent("true");
  });

  it("hides the alignment export action when policy disables it", () => {
    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        shellPolicy={{ alignmentExportHidden: true }}
        onCancel={jest.fn()}
        buildExportRun={jest.fn()}
        buildAlignmentExportRun={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Export alignment test" })).not.toBeInTheDocument();
  });

  it("shows progress and supports cancel during export", async () => {
    let resolveRender: ((value: { status: "cancelled" }) => void) | null = null;
    mockRenderPdf.mockImplementation(
      ({ shouldCancel, onProgress }: { shouldCancel: () => boolean; onProgress?: (progress: { completedFaces: number; totalFaces: number }) => void }) =>
        new Promise((resolve) => {
          onProgress?.({ completedFaces: 1, totalFaces: 1 });
          resolveRender = () => resolve({ status: shouldCancel() ? "cancelled" : "cancelled" });
        }),
    );

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        slotPairs={slotPairs}
        onCancel={jest.fn()}
        buildExportRun={() => makeRun()}
        buildAlignmentExportRun={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await waitFor(() => {
      expect(screen.getByTestId("progress-modal")).toBeInTheDocument();
      expect(screen.getByTestId("progress")).toHaveTextContent("1/1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel export" }));

    await act(async () => {
      resolveRender?.({ status: "cancelled" });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("progress-modal")).not.toBeInTheDocument();
    });
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import PdfExportShellModal from "@/components/Export/PdfExportShellModal";

import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { PdfExportRun } from "@/components/Export/PdfExportShellModal";
import type { PrintConfig } from "@/lib/pdf-export";

const mockRenderPdf = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:pdf");
const mockRevokeObjectURL = jest.fn();
const mockLinkClick = jest.fn();

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
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Providers/ExportSettingsContext", () => ({
  useExportSettingsState: () => ({
    settings: {
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
    },
  }),
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
    onChange,
  }: {
    config: PrintConfig;
    onChange: (next: PrintConfig) => void;
  }) => (
    <div data-testid="pdf-config-form">
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

const bleedOptions: ExportOptionsFormState = {
  bleedEnabled: true,
  bleedPx: 18,
  askBeforeExport: false,
  roundedCorners: true,
  cropMarksEnabled: true,
  cropMarkColor: "#00FFFF",
  cropMarkStyle: "lines",
  cutMarksEnabled: true,
  cutMarkColor: "#00FFFF",
};

function makeRun(runConfig: PrintConfig): PdfExportRun {
  return {
    composition: {
      sheets: [{ sheetIndex: 0, slots: [{ frontId: "front-1", backId: null }] }],
      totalSlots: 1,
    },
    config: runConfig,
    fileName: "cards.pdf",
    includeCalibrationPage: true,
    layout: {
      paperMm: { width: 210, height: 297 },
      grid: { cols: 1, rows: 1, perPage: 1 },
      placements: [],
    },
    renderFacePngBytes: async () => new Uint8Array([1, 2, 3]),
  };
}

beforeEach(() => {
  mockRenderPdf.mockReset();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
  mockLinkClick.mockClear();

  mockRenderPdf.mockResolvedValue({
    status: "success",
    blob: new Blob(["pdf"], { type: "application/pdf" }),
    fileName: "cards.pdf",
    renderedFaces: 1,
    skippedFaces: 0,
    pageCount: 1,
  });

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
    return element;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("PdfExportShellModal", () => {
  it("renders top content, seeds internal state, and hides custom forms by default", () => {
    const onStateChange = jest.fn();

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        hasExportableContent
        onCancel={jest.fn()}
        onStateChange={onStateChange}
        buildExportRun={jest.fn()}
        buildAlignmentExportRun={jest.fn()}
        topContent={(state) => <div>Mode: {state.effectiveConfig.mode}</div>}
      />,
    );

    expect(screen.getByText("Export shell")).toBeInTheDocument();
    expect(screen.getByText("Mode: frontsOnly")).toBeInTheDocument();
    expect(screen.getByText("Letter, Portrait, Fronts only")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.className === "deckPdfSummaryInlineSummary" &&
          (element.textContent?.includes("Bleed 18px") ?? false),
      ),
    ).toBeInTheDocument();
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

  it("owns custom layout and bleed state and passes current settings into export builders", async () => {
    const buildExportRun = jest.fn((state) => makeRun(state.effectiveConfig));
    const buildAlignmentExportRun = jest.fn((state) => makeRun(state.effectiveConfig));

    render(
      <PdfExportShellModal
        isOpen
        title="Export shell"
        hasExportableContent
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
          layoutMode: "custom",
          bleedMode: "custom",
          effectiveConfig: expect.objectContaining({
            mode: "frontAndBack",
            orientation: "landscape",
            duplexPreset: "mirrorX",
          }),
          effectiveBleedOptions: expect.objectContaining({
            bleedEnabled: false,
            bleedPx: 0,
          }),
        }),
      );
    });
    expect(buildExportRun).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveConfig: expect.objectContaining({ mode: "frontAndBack" }),
      }),
    );
    expect(mockRenderPdf).toHaveBeenCalledTimes(2);
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
        hasExportableContent
        onCancel={jest.fn()}
        buildExportRun={() => makeRun(config)}
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

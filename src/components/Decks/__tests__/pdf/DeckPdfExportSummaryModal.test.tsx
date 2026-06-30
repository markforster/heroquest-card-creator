import { useState, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import DeckPdfExportSummaryModal from "@/components/Decks/pdf/DeckPdfExportSummaryModal";

import type { DeckPdfExportSummary } from "@/components/Decks/deck-export";
import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import type { PrintConfig } from "@/lib/pdf-export";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      (
        {
          "decks.pdf.modal.title": "Export deck PDF",
          "decks.pdf.modal.exportAlignmentTest": "Export alignment test",
          "decks.pdf.modal.export": "Export PDF",
          "actions.cancel": "Cancel",
          "actions.exporting": "Exporting",
          "decks.pdf.summary.scope.label": "Sets to include",
          "decks.pdf.summary.scope.complete": "Complete deck",
          "decks.pdf.summary.scope.all": "All sets",
          "decks.pdf.summary.scope.selected": "Selected sets",
          "decks.pdf.summary.selection.label": "Select sets",
          "decks.pdf.summary.selection.help.complete": "Include only sets that have entries.",
          "decks.pdf.summary.selection.help.all":
            "Include all sets, even sets with no entries. Empty sets export their back face with a single front placeholder.",
          "decks.pdf.summary.selection.help.selected":
            "Select sets to include. Empty sets export their back face with a single front placeholder.",
          "decks.pdf.summary.hideEmpty.label": "Hide empty sets",
          "decks.pdf.summary.hideEmpty.hidden": `Hide empty sets (${vars?.count ?? ""} hidden)`,
          "decks.pdf.summary.hideUnselected.label": "Hide unselected sets",
          "decks.pdf.summary.hideUnselected.hidden": `Hide unselected sets (${vars?.count ?? ""} hidden)`,
          "decks.pdf.summary.entryCount.one": `${vars?.count ?? ""} entry`,
          "decks.pdf.summary.entryCount.other": `${vars?.count ?? ""} entries`,
          "decks.pdf.summary.layout.label": "Layout",
          "decks.pdf.summary.layout.customize": "Customise layout",
          "decks.pdf.summary.bleedSettings.label": "Bleed settings",
          "decks.pdf.summary.bleedSettings.customize": "Customise bleed settings",
          "decks.pdf.orientation.portrait": "Portrait",
          "decks.pdf.orientation.landscape": "Landscape",
          "decks.pdf.duplex.normal": "Normal",
          "decks.pdf.duplex.mirrorX": "Mirror horizontally",
          "decks.pdf.duplex.rotate180": "Rotate 180°",
          "decks.pdf.duplex.mirrorXRotate180": "Mirror + rotate 180°",
          "decks.pdf.summary.bleed.none": "No bleed",
          "decks.pdf.summary.bleed.amount": `Bleed ${vars?.count ?? ""}px`,
          "decks.pdf.summary.bleed.roundedCorners": "Rounded corners",
          "decks.pdf.summary.bleed.cropMarks": `Crop marks (${vars?.style ?? ""})`,
          "decks.pdf.summary.bleed.cutMarks": "Cut marks",
          "decks.pdf.summary.includedSets.complete": `Complete sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.all": `All sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.selected": `Selected sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.totalEntryQuantity": `Entries: ${vars?.count ?? ""}`,
          "decks.pdf.summary.exportSlots": `Export slots: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedEmptySets": `Empty placeholder sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.faces": `Faces: ${vars?.totalCount ?? ""}`,
          "decks.pdf.summary.runMode.frontBack": "Front + back",
          "decks.pdf.summary.runMode.frontsOnly": "Fronts only",
          "decks.pdf.summary.runSettings": "Run settings",
          "decks.pdf.summary.emptyExcluded": `Empty excluded: ${vars?.count ?? ""}`,
          "decks.pdf.summary.noneAvailable": "None available",
          "label.cropMarkStyleLines": "Lines",
          "label.cropMarkStyleSquares": "Squares",
          "ui.loading": "Loading",
        } as Record<string, string>
      )[key] ?? key,
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
  }: {
    isOpen: boolean;
    title: ReactNode;
    children: ReactNode;
    footer: ReactNode;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

jest.mock("@/components/common/CardThumbnail", () => ({
  __esModule: true,
  default: () => <div data-testid="card-thumbnail" />,
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: () => null,
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
      <div>Paper</div>
      <div>Orientation</div>
      <label>
        Mode
        <select
          aria-label="Mode"
          value={config.mode}
          onChange={(event) =>
            onChange({ ...config, mode: event.target.value as PrintConfig["mode"] })
          }
        >
          <option value="frontAndBack">Front + back</option>
          <option value="frontsOnly">Fronts only</option>
        </select>
      </label>
      <label>
        Duplex preset
        <select
          aria-label="Duplex preset"
          value={config.duplexPreset ?? "normal"}
          onChange={(event) =>
            onChange({ ...config, duplexPreset: event.target.value as PrintConfig["duplexPreset"] })
          }
        >
          <option value="normal">Normal</option>
          <option value="mirrorX">Mirror horizontally</option>
          <option value="rotate180">Rotate 180°</option>
          <option value="mirrorXRotate180">Mirror + rotate 180°</option>
        </select>
      </label>
    </div>
  ),
}));

jest.mock("@/components/Export/ExportOptionsForm", () => ({
  __esModule: true,
  default: ({
    bleedEnabled,
    bleedPx,
    onChange,
  }: {
    bleedEnabled: boolean;
    bleedPx: number;
    onChange: (next: Partial<ExportOptionsFormState>) => void;
  }) => (
    <div data-testid="bleed-options-form">
      <label>
        Export with bleed
        <input
          type="checkbox"
          aria-label="Export with bleed"
          checked={bleedEnabled}
          onChange={(event) => onChange({ bleedEnabled: event.target.checked })}
        />
      </label>
      <label>
        Bleed per edge (mm)
        <input
          aria-label="Bleed per edge (mm)"
          value={bleedPx}
          onChange={(event) => onChange({ bleedPx: Number(event.target.value) })}
        />
      </label>
    </div>
  ),
}));

const config: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
  gapMm: { x: 0.5, y: 0.5 },
  cardMm: { width: 63.5, height: 88.9 },
  mode: "frontAndBack",
  bleedMode: "bakedInImage",
  bleedMm: 3,
  duplexPreset: "mirrorX",
};

const bleedOptions: ExportOptionsFormState = {
  bleedEnabled: false,
  bleedPx: 0,
  askBeforeExport: false,
  roundedCorners: true,
  cropMarksEnabled: false,
  cropMarkColor: "#00FFFF",
  cropMarkStyle: "lines",
  cutMarksEnabled: false,
  cutMarkColor: "#00FFFF",
};

const defaultConfig: PrintConfig = {
  ...config,
  paper: "Letter",
  orientation: "portrait",
  mode: "frontsOnly",
  duplexPreset: "normal",
};

const defaultBleedOptions: ExportOptionsFormState = {
  ...bleedOptions,
  roundedCorners: false,
  bleedEnabled: true,
  bleedPx: 18,
  cropMarksEnabled: true,
  cropMarkStyle: "squares",
  cutMarksEnabled: true,
};

const summary: DeckPdfExportSummary = {
  totalSetCount: 2,
  includedSetCount: 1,
  includedEmptySetCount: 0,
  excludedEmptySetCount: 1,
  excludedNonEmptySetCount: 0,
  totalEntryQuantity: 8,
  exportSlotQuantity: 8,
  frontFaceCount: 8,
  backFaceCount: 8,
  totalFaceCount: 16,
  sets: [
    {
      setId: "set-1",
      setTitle: "Set One",
      backFaceId: "back-1",
      hasEntries: true,
      entryCount: 2,
    },
    {
      setId: "set-2",
      setTitle: "Set Two",
      backFaceId: "back-2",
      hasEntries: false,
      entryCount: 0,
    },
  ],
};

function expectTextContent(text: string) {
  expect(
    screen.queryAllByText((_, element) => (element?.textContent ?? "").includes(text)).length,
  ).toBeGreaterThan(0);
}

describe("DeckPdfExportSummaryModal", () => {
  it("keeps layout inside the main PDF settings surface and only reveals custom controls when selected", () => {
    render(
      <DeckPdfExportSummaryModal
        isOpen
        isExporting={false}
        summary={summary}
        config={config}
        defaultConfig={defaultConfig}
        bleedOptions={bleedOptions}
        defaultBleedOptions={defaultBleedOptions}
        setScopeMode="complete"
        layoutMode="default"
        bleedMode="default"
        selectedSetIds={new Set(["set-1"])}
        onCancel={jest.fn()}
        onSetScopeMode={jest.fn()}
        onLayoutMode={jest.fn()}
        onBleedMode={jest.fn()}
        onToggleSet={jest.fn()}
        onConfigChange={jest.fn()}
        onBleedOptionsChange={jest.fn()}
        onExport={jest.fn()}
        onExportAlignmentTest={jest.fn()}
      />,
    );

    expectTextContent("Layout:");
    expectTextContent("Letter, Portrait, Fronts only");
    expectTextContent("Bleed 18px");
    expectTextContent("Crop marks (squares)");
    expectTextContent("Cut marks");
    expect(screen.getByLabelText("Customise layout")).not.toBeChecked();
    expect(screen.getByLabelText("Customise bleed settings")).not.toBeChecked();
    expect(screen.queryByTestId("pdf-config-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bleed-options-form")).not.toBeInTheDocument();
    expect(screen.getByText("Complete sets: 1")).toBeInTheDocument();
    expect(screen.getByText("Empty excluded: 1")).toBeInTheDocument();
  });

  it("shows a read-only tray in complete mode and dims incomplete sets", () => {
    render(
      <DeckPdfExportSummaryModal
        isOpen
        isExporting={false}
        summary={summary}
        config={config}
        defaultConfig={defaultConfig}
        bleedOptions={bleedOptions}
        defaultBleedOptions={defaultBleedOptions}
        setScopeMode="complete"
        layoutMode="default"
        bleedMode="default"
        selectedSetIds={new Set(["set-1"])}
        onCancel={jest.fn()}
        onSetScopeMode={jest.fn()}
        onLayoutMode={jest.fn()}
        onBleedMode={jest.fn()}
        onToggleSet={jest.fn()}
        onConfigChange={jest.fn()}
        onBleedOptionsChange={jest.fn()}
        onExport={jest.fn()}
        onExportAlignmentTest={jest.fn()}
      />,
    );

    const completeSet = screen.getByRole("button", { name: /set one/i });
    const incompleteSet = screen.getByRole("button", { name: /set two/i });
    const hideEmptyCheckbox = screen.getByLabelText("Hide empty sets");

    expect(screen.getByText("Include only sets that have entries.")).toBeInTheDocument();
    expect(hideEmptyCheckbox).not.toBeChecked();
    expect(completeSet).toHaveAttribute("data-included", "true");
    expect(completeSet).toHaveAttribute("data-interactive", "false");
    expect(completeSet).not.toBeDisabled();
    expect(screen.getByText("2 entries")).toBeInTheDocument();
    expect(incompleteSet).toHaveAttribute("data-included", "false");
    expect(incompleteSet).toHaveAttribute("data-disabled", "true");
    expect(incompleteSet).toBeDisabled();
    expect(screen.getByText("0 entries")).toHaveClass("deckPdfEntryCountZero");

    fireEvent.click(hideEmptyCheckbox);

    expect(screen.getByLabelText("Hide empty sets (1 hidden)")).toBeChecked();
    expect(screen.queryByRole("button", { name: /set two/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set one/i })).toBeInTheDocument();
  });

  it("shows all sets as included in all mode without the hide-sets filter", () => {
    render(
      <DeckPdfExportSummaryModal
        isOpen
        isExporting={false}
        summary={summary}
        config={config}
        defaultConfig={defaultConfig}
        bleedOptions={bleedOptions}
        defaultBleedOptions={defaultBleedOptions}
        setScopeMode="all"
        layoutMode="default"
        bleedMode="default"
        selectedSetIds={new Set(["set-1"])}
        onCancel={jest.fn()}
        onSetScopeMode={jest.fn()}
        onLayoutMode={jest.fn()}
        onBleedMode={jest.fn()}
        onToggleSet={jest.fn()}
        onConfigChange={jest.fn()}
        onBleedOptionsChange={jest.fn()}
        onExport={jest.fn()}
        onExportAlignmentTest={jest.fn()}
      />,
    );

    const completeSet = screen.getByRole("button", { name: /set one/i });
    const incompleteSet = screen.getByRole("button", { name: /set two/i });

    expect(
      screen.getByText(
        "Include all sets, even sets with no entries. Empty sets export their back face with a single front placeholder.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("All sets: 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Hide empty sets")).not.toBeInTheDocument();
    expect(completeSet).toHaveAttribute("data-included", "true");
    expect(completeSet).toHaveAttribute("data-interactive", "false");
    expect(incompleteSet).toHaveAttribute("data-included", "true");
    expect(incompleteSet).toHaveAttribute("data-disabled", "false");
    expect(incompleteSet).not.toBeDisabled();
    expect(screen.queryByText("Empty excluded: 1")).not.toBeInTheDocument();
  });

  it("renders set selection content within the scope section and hides newly unselected sets when enabled", () => {
    const selectedEmptySummary: DeckPdfExportSummary = {
      ...summary,
      includedSetCount: 2,
      includedEmptySetCount: 1,
    };

    function StatefulSelectedModal() {
      const [selectedSetIds, setSelectedSetIds] = useState(new Set(["set-1", "set-2"]));

      return (
        <DeckPdfExportSummaryModal
          isOpen
          isExporting={false}
          summary={selectedEmptySummary}
          config={config}
          defaultConfig={defaultConfig}
          bleedOptions={bleedOptions}
          defaultBleedOptions={defaultBleedOptions}
          setScopeMode="selected"
          layoutMode="default"
          bleedMode="default"
          selectedSetIds={selectedSetIds}
          onCancel={jest.fn()}
          onSetScopeMode={jest.fn()}
          onLayoutMode={jest.fn()}
          onBleedMode={jest.fn()}
          onToggleSet={(setId) =>
            setSelectedSetIds((prev) => {
              const next = new Set(prev);
              if (next.has(setId)) next.delete(setId);
              else next.add(setId);
              return next;
            })
          }
          onConfigChange={jest.fn()}
          onBleedOptionsChange={jest.fn()}
          onExport={jest.fn()}
          onExportAlignmentTest={jest.fn()}
        />
      );
    }

    render(<StatefulSelectedModal />);

    expect(screen.getByLabelText("Sets to include")).toHaveValue("selected");
    expect(screen.getByLabelText("Hide unselected sets")).not.toBeChecked();
    expect(
      screen.getByText(
        "Select sets to include. Empty sets export their back face with a single front placeholder.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Selected sets: 2")).toBeInTheDocument();
    expect(screen.getAllByTestId("card-thumbnail")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /set one/i })).toHaveAttribute("data-included", "true");
    expect(screen.getByRole("button", { name: /set two/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set two/i })).toHaveAttribute("data-included", "true");
    expect(screen.getByRole("button", { name: /set one/i })).toHaveAttribute("data-interactive", "true");
    expect(screen.queryByText("Empty excluded: 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Hide unselected sets"));

    expect(screen.getByLabelText("Hide unselected sets (0 hidden)")).toBeChecked();
    expect(screen.getByRole("button", { name: /set one/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set two/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /set two/i }));

    expect(screen.getByLabelText("Hide unselected sets (1 hidden)")).toBeChecked();
    expect(screen.getByRole("button", { name: /set one/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set two/i })).not.toBeInTheDocument();
  });

  it("renders the PDF config form when layout is custom", () => {
    render(
      <DeckPdfExportSummaryModal
        isOpen
        isExporting={false}
        summary={summary}
        config={config}
        defaultConfig={defaultConfig}
        bleedOptions={bleedOptions}
        defaultBleedOptions={defaultBleedOptions}
        setScopeMode="complete"
        layoutMode="custom"
        bleedMode="default"
        selectedSetIds={new Set(["set-1"])}
        onCancel={jest.fn()}
        onSetScopeMode={jest.fn()}
        onLayoutMode={jest.fn()}
        onBleedMode={jest.fn()}
        onToggleSet={jest.fn()}
        onConfigChange={jest.fn()}
        onBleedOptionsChange={jest.fn()}
        onExport={jest.fn()}
        onExportAlignmentTest={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Customise layout")).toBeChecked();
    expectTextContent("A4, Landscape, Front + back, Mirror horizontally");
    expect(screen.getByTestId("pdf-config-form")).toBeInTheDocument();
    expect(screen.getByText("Paper")).toBeInTheDocument();
    expect(screen.getByText("Orientation")).toBeInTheDocument();
    expect(screen.getByText("Mode")).toBeInTheDocument();
  });

  it("renders bleed options within the bleed settings section when bleed mode is custom", () => {
    render(
      <DeckPdfExportSummaryModal
        isOpen
        isExporting={false}
        summary={summary}
        config={config}
        defaultConfig={defaultConfig}
        bleedOptions={bleedOptions}
        defaultBleedOptions={defaultBleedOptions}
        setScopeMode="complete"
        layoutMode="default"
        bleedMode="custom"
        selectedSetIds={new Set(["set-1"])}
        onCancel={jest.fn()}
        onSetScopeMode={jest.fn()}
        onLayoutMode={jest.fn()}
        onBleedMode={jest.fn()}
        onToggleSet={jest.fn()}
        onConfigChange={jest.fn()}
        onBleedOptionsChange={jest.fn()}
        onExport={jest.fn()}
        onExportAlignmentTest={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Customise bleed settings")).toBeChecked();
    expectTextContent("No bleed, Rounded corners");
    expect(screen.getByTestId("bleed-options-form")).toBeInTheDocument();
  });

  it("toggles layout and bleed switches to reveal their custom sections and reverts summaries to defaults", () => {
    function StatefulSummaryModal() {
      const [layoutMode, setLayoutMode] = useState<"default" | "custom">("default");
      const [bleedMode, setBleedMode] = useState<"default" | "custom">("default");
      const [draftConfig, setDraftConfig] = useState(config);
      const [draftBleedOptions, setDraftBleedOptions] = useState(bleedOptions);

      return (
        <DeckPdfExportSummaryModal
          isOpen
          isExporting={false}
          summary={summary}
          config={draftConfig}
          defaultConfig={defaultConfig}
          bleedOptions={draftBleedOptions}
          defaultBleedOptions={defaultBleedOptions}
          setScopeMode="complete"
          layoutMode={layoutMode}
          bleedMode={bleedMode}
          selectedSetIds={new Set(["set-1"])}
          onCancel={jest.fn()}
          onSetScopeMode={jest.fn()}
          onLayoutMode={setLayoutMode}
          onBleedMode={setBleedMode}
          onToggleSet={jest.fn()}
          onConfigChange={setDraftConfig}
          onBleedOptionsChange={(next) =>
            setDraftBleedOptions((prev) => ({ ...prev, ...next }))
          }
          onExport={jest.fn()}
          onExportAlignmentTest={jest.fn()}
        />
      );
    }

    render(<StatefulSummaryModal />);

    const customizeLayout = screen.getByLabelText("Customise layout");
    const customizeBleed = screen.getByLabelText("Customise bleed settings");

    expect(customizeLayout).not.toBeChecked();
    expect(customizeBleed).not.toBeChecked();
    expectTextContent("Letter, Portrait, Fronts only");
    expectTextContent("Bleed 18px");
    expectTextContent("Crop marks (squares)");
    expectTextContent("Cut marks");
    expect(screen.queryByTestId("pdf-config-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bleed-options-form")).not.toBeInTheDocument();

    fireEvent.click(customizeLayout);
    fireEvent.click(customizeBleed);

    expect(screen.getByLabelText("Customise layout")).toBeChecked();
    expect(screen.getByLabelText("Customise bleed settings")).toBeChecked();
    expect(screen.getByTestId("pdf-config-form")).toBeInTheDocument();
    expect(screen.getByTestId("bleed-options-form")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "frontsOnly" },
    });
    fireEvent.change(screen.getByLabelText("Duplex preset"), {
      target: { value: "rotate180" },
    });
    fireEvent.click(screen.getByLabelText("Export with bleed"));
    fireEvent.change(screen.getByLabelText("Bleed per edge (mm)"), {
      target: { value: "4.5" },
    });

    expectTextContent("A4, Landscape, Fronts only");
    expect(screen.queryByText(/A4, Landscape, Fronts only, /)).not.toBeInTheDocument();
    expectTextContent("Bleed 4.5px, Rounded corners");

    fireEvent.click(customizeLayout);
    fireEvent.click(customizeBleed);

    expect(screen.getByLabelText("Customise layout")).not.toBeChecked();
    expect(screen.getByLabelText("Customise bleed settings")).not.toBeChecked();
    expectTextContent("Letter, Portrait, Fronts only");
    expectTextContent("Bleed 18px");
    expectTextContent("Crop marks (squares)");
    expectTextContent("Cut marks");
    expect(screen.queryByTestId("pdf-config-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bleed-options-form")).not.toBeInTheDocument();
  });
});

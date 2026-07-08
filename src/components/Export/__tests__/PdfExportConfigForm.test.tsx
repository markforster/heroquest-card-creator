import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";

import type { PrintConfig } from "@/lib/pdf-export";

jest.mock("@/components/common/FormSelect", () => ({
  __esModule: true,
  default: ({
    options,
    value,
    onChange,
    disabled,
    inputId,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    inputId?: string;
  }) => (
    <select
      data-testid={`mock-form-select-${inputId ?? "unknown"}`}
      id={inputId}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "decks.pdf.mode": "Mode",
          "decks.pdf.mode.fronts": "Fronts only",
          "decks.pdf.mode.frontBack": "Front + back",
          "decks.pdf.paper": "Paper",
          "decks.pdf.orientation": "Orientation",
          "decks.pdf.orientation.portrait": "Portrait",
          "decks.pdf.orientation.landscape": "Landscape",
          "decks.pdf.bleedSource": "PDF bleed source",
          "decks.pdf.bleedSource.bakedInImage": "Image includes bleed",
          "decks.pdf.bleedSource.layoutBleed": "Image has no bleed (trim only)",
          "decks.pdf.bleedPerEdge": "Bleed per edge (mm)",
          "decks.pdf.duplex": "Duplex preset",
          "decks.pdf.duplex.normal": "Normal",
          "decks.pdf.duplex.mirrorX": "Mirror horizontally",
          "decks.pdf.duplex.rotate180": "Rotate 180°",
          "decks.pdf.duplex.mirrorXRotate180": "Mirror + rotate 180°",
          "decks.pdf.duplex.helpTitle": "How duplex presets work",
          "decks.pdf.duplex.help.normal": "Print backs in the same slot position as fronts.",
          "decks.pdf.duplex.help.mirrorX": "Flip back positions left-to-right across the sheet.",
          "decks.pdf.duplex.help.rotate180": "Rotate backs 180 degrees in their current slot positions.",
          "decks.pdf.duplex.help.mirrorXRotate180":
            "Flip back positions left-to-right and rotate them 180 degrees.",
          "decks.pdf.cardSize": "Card size",
          "label.moreInfo": "More info",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

const baseConfig: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
  gapMm: { x: 0, y: 0 },
  cardMm: { width: 63.5, height: 88.9 },
  mode: "frontAndBack",
  bleedMode: "bakedInImage",
  bleedMm: 3,
  duplexPreset: "mirrorX",
};

function Harness({ initialConfig = baseConfig }: { initialConfig?: PrintConfig }) {
  const [config, setConfig] = useState(initialConfig);
  return <PdfExportConfigForm config={config} onChange={setConfig} />;
}

describe("PdfExportConfigForm", () => {
  it("hides the card size controls", () => {
    render(<Harness />);

    expect(screen.queryByText("Card size")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Card size")).not.toBeInTheDocument();
  });

  it("shows page setup before output in the visual form order", () => {
    const { container } = render(<Harness />);
    const content = container.textContent ?? "";

    expect(content.indexOf("Paper")).toBeGreaterThanOrEqual(0);
    expect(content.indexOf("Orientation")).toBeGreaterThan(content.indexOf("Paper"));
    expect(content.indexOf("Mode")).toBeGreaterThan(content.indexOf("Orientation"));
  });

  it("updates mode and disables duplex controls when fronts-only is selected", () => {
    render(<Harness />);

    fireEvent.change(screen.getByTestId("mock-form-select-pdf-mode"), {
      target: { value: "frontsOnly" },
    });

    expect(screen.getByTestId("mock-form-select-pdf-mode")).toHaveValue("frontsOnly");
    expect(screen.getByTestId("mock-form-select-pdf-duplex")).toBeDisabled();
    expect(screen.getByRole("button", { name: "More info" })).toBeInTheDocument();
  });

  it("updates paper and orientation through the standard dropdowns", () => {
    render(<Harness />);

    fireEvent.change(screen.getByTestId("mock-form-select-pdf-paper"), {
      target: { value: "Letter" },
    });
    fireEvent.change(screen.getByTestId("mock-form-select-pdf-orientation"), {
      target: { value: "portrait" },
    });

    expect(screen.getByTestId("mock-form-select-pdf-paper")).toHaveValue("Letter");
    expect(screen.getByTestId("mock-form-select-pdf-orientation")).toHaveValue("portrait");
  });

  it("orders the common orientation and mode options first", () => {
    render(<Harness />);

    const orientationOptions = screen
      .getByTestId("mock-form-select-pdf-orientation")
      .querySelectorAll("option");
    const modeOptions = screen.getByTestId("mock-form-select-pdf-mode").querySelectorAll("option");

    expect(Array.from(orientationOptions).map((option) => option.textContent)).toEqual([
      "Landscape",
      "Portrait",
    ]);
    expect(Array.from(modeOptions).map((option) => option.textContent)).toEqual([
      "Front + back",
      "Fronts only",
    ]);
  });

  it("updates bleed source and bleed amount with the compact controls", () => {
    render(<Harness />);

    fireEvent.change(screen.getByTestId("mock-form-select-pdf-bleed-source"), {
      target: { value: "layoutBleed" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Bleed per edge (mm)" }), {
      target: { value: "4.5" },
    });

    expect(screen.getByTestId("mock-form-select-pdf-bleed-source")).toHaveValue("layoutBleed");
    expect(screen.getByRole("spinbutton", { name: "Bleed per edge (mm)" })).toHaveValue(4.5);
  });

  it("updates duplex preset through the dropdown", () => {
    render(<Harness />);

    fireEvent.change(screen.getByTestId("mock-form-select-pdf-duplex"), {
      target: { value: "rotate180" },
    });

    expect(screen.getByTestId("mock-form-select-pdf-duplex")).toHaveValue("rotate180");
  });

  it("shows duplex help copy and closes it on escape", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "More info" }));

    expect(screen.getByText("How duplex presets work")).toBeInTheDocument();
    expect(screen.getByText("Print backs in the same slot position as fronts.")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByText("How duplex presets work")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";

import { formatPdfExportBleedSummary } from "@/components/Export/pdfExportSummaryText";

describe("formatPdfExportBleedSummary", () => {
  it("includes the triangle crop mark label when selected", () => {
    const summary = formatPdfExportBleedSummary(
      {
        bleedEnabled: true,
        bleedPx: 18,
        roundedCorners: false,
        cropMarksEnabled: true,
        cropMarkColor: "#00FFFF",
        cropMarkStyle: "triangles",
        cutMarksEnabled: false,
        cutMarkColor: "#FF00FF",
        cutMarkStyle: "solid",
      },
      ((key: string, options?: Record<string, unknown>) =>
        (
          {
            "decks.pdf.summary.bleed.amount": `Bleed ${options?.count ?? ""}px`,
            "decks.pdf.summary.bleed.cropMarks": `Crop marks (${options?.style ?? ""})`,
            "label.cropMarkStyleTriangles": "Triangles",
          } as Record<string, string>
        )[key] ?? key) as never,
    );

    render(<div>{summary}</div>);

    expect(screen.getByText(/Crop marks \(triangles\)/i)).toBeInTheDocument();
  });

  it("includes the cut mark style label when selected", () => {
    const summary = formatPdfExportBleedSummary(
      {
        bleedEnabled: true,
        bleedPx: 18,
        roundedCorners: false,
        cropMarksEnabled: false,
        cropMarkColor: "#00FFFF",
        cropMarkStyle: "lines",
        cutMarksEnabled: true,
        cutMarkColor: "#FF00FF",
        cutMarkStyle: "ticks",
      },
      ((key: string) =>
        (
          {
            "decks.pdf.summary.bleed.cutMarks": "Cut marks",
            "label.cutMarkStyleTicks": "Ticks",
          } as Record<string, string>
        )[key] ?? key) as never,
    );

    render(<div>{summary}</div>);

    expect(screen.getByText(/Cut marks \(ticks\)/i)).toBeInTheDocument();
  });

  it("includes the long-dashed cut mark style label when selected", () => {
    const summary = formatPdfExportBleedSummary(
      {
        bleedEnabled: true,
        bleedPx: 18,
        roundedCorners: false,
        cropMarksEnabled: false,
        cropMarkColor: "#00FFFF",
        cropMarkStyle: "lines",
        cutMarksEnabled: true,
        cutMarkColor: "#FF00FF",
        cutMarkStyle: "long-dashed",
      },
      ((key: string) =>
        (
          {
            "decks.pdf.summary.bleed.cutMarks": "Cut marks",
            "label.cutMarkStyleLongDashed": "Long dashed",
          } as Record<string, string>
        )[key] ?? key) as never,
    );

    render(<div>{summary}</div>);

    expect(screen.getByText(/Cut marks \(long dashed\)/i)).toBeInTheDocument();
  });
});

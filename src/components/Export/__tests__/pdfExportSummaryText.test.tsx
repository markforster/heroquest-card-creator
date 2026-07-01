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
});

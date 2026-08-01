import { render } from "@testing-library/react";

import {
  formatDeckPdfBleedSummary,
  formatDeckPdfLayoutSummary,
} from "@/components/Decks/pdf/deckPdfSummaryText";
import { DEFAULT_PDF_PRINT_CONFIG } from "@/lib/pdf-export";

const t = (key: never, options?: Record<string, unknown>) =>
  options?.count == null ? String(key) : `${String(key)}:${options.count}`;

describe("deck PDF summary text", () => {
  it("formats layout and duplex configuration", () => {
    expect(formatDeckPdfLayoutSummary(DEFAULT_PDF_PRINT_CONFIG, t)).toContain(
      "decks.pdf.summary.runMode.frontBack",
    );
    expect(formatDeckPdfLayoutSummary(DEFAULT_PDF_PRINT_CONFIG, t)).toContain(
      "decks.pdf.duplex.mirrorX",
    );
  });

  it("formats disabled and enabled bleed details", () => {
    const disabled = render(
      <div>
        {formatDeckPdfBleedSummary({ bleedEnabled: false, roundedCorners: true } as never, t)}
      </div>,
    );
    expect(disabled.container.textContent).toContain("decks.pdf.summary.bleed.none");
    disabled.unmount();

    const enabled = render(
      <div>
        {formatDeckPdfBleedSummary(
          {
            bleedEnabled: true,
            bleedPx: 12,
            roundedCorners: false,
            cropMarksEnabled: true,
            cropMarkStyle: "triangles",
            cropMarkColor: "#112233",
            cutMarksEnabled: true,
            cutMarkStyle: "dotted",
            cutMarkColor: "#445566",
          } as never,
          t,
        )}
      </div>,
    );
    expect(enabled.container.textContent).toContain("decks.pdf.summary.bleed.amount:12");
    expect(enabled.container.textContent).toContain("decks.pdf.summary.bleed.cropMarks");
    expect(enabled.container.textContent).toContain("label.cutmarkstyledotted");
    expect(enabled.container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});

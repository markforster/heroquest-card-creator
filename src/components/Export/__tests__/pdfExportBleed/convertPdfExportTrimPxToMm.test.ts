import { convertPdfExportTrimPxToMm } from "@/components/Export/pdfExportBleed";
import { CARD_WIDTH } from "@/config/card-canvas";
import { DEFAULT_PDF_PRINT_CONFIG } from "@/lib/pdf-export/default-config";

describe("convertPdfExportTrimPxToMm", () => {
  it("converts trim pixels using the configured card width", () => {
    expect(convertPdfExportTrimPxToMm(CARD_WIDTH)).toBe(DEFAULT_PDF_PRINT_CONFIG.cardMm.width);
    expect(convertPdfExportTrimPxToMm(0)).toBe(0);
  });
});

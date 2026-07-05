import { PrintScaling } from "pdf-lib";
import type { PDFDocument } from "pdf-lib";

type ApplyPdfViewerPreferencesOptions = {
  pdf: PDFDocument;
};

export function applyPdfViewerPreferences({
  pdf,
}: ApplyPdfViewerPreferencesOptions): void {
  const viewerPreferences = pdf.catalog.getOrCreateViewerPreferences();
  viewerPreferences.setPrintScaling(PrintScaling.None);
  viewerPreferences.setDisplayDocTitle(true);
}

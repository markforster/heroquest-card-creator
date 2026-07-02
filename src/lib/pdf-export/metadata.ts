import type { PDFDocument } from "pdf-lib";

import { APP_VERSION } from "@/version";

import type { PdfExportSourceType, PrintConfig } from "@/lib/pdf-export/types";

type ApplyPdfMetadataOptions = {
  pdf: PDFDocument;
  fileName: string;
  sourceType: PdfExportSourceType;
  config: Pick<PrintConfig, "mode">;
  now?: Date;
};

const PDF_CREATOR = "HeroQuest Card Creator";

function stripPdfExtension(fileName: string): string {
  return fileName.replace(/\.pdf$/i, "");
}

function getPdfMetadataSubject(sourceType: PdfExportSourceType): string {
  switch (sourceType) {
    case "deck":
      return "Printable deck export";
    case "collection":
      return "Printable collection export";
    case "alignment":
      return "PDF alignment test";
  }
}

function getPrintModeKeyword(mode: PrintConfig["mode"]): string {
  return mode === "frontAndBack" ? "print-mode:front-and-back" : "print-mode:fronts-only";
}

export function applyPdfMetadata({
  pdf,
  fileName,
  sourceType,
  config,
  now = new Date(),
}: ApplyPdfMetadataOptions): void {
  pdf.setTitle(stripPdfExtension(fileName));
  pdf.setSubject(getPdfMetadataSubject(sourceType));
  pdf.setAuthor("");
  pdf.setCreator(PDF_CREATOR);
  pdf.setProducer(`${PDF_CREATOR} ${APP_VERSION}`);
  pdf.setKeywords([
    "HeroQuest",
    "CardCreator",
    `source:${sourceType}`,
    getPrintModeKeyword(config.mode),
  ]);
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);
}

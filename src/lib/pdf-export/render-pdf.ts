import { PDFDocument } from "pdf-lib";

import { applyDuplexPreset } from "@/lib/pdf-export/duplex";
import { mmToPt } from "@/lib/pdf-export/units";

import type { LayoutPlan, PdfExportResult, PrintComposition, PrintConfig } from "@/lib/pdf-export/types";

type RenderPdfOptions = {
  config: PrintConfig;
  layout: LayoutPlan;
  composition: PrintComposition;
  fileName: string;
  renderFacePngBytes: (faceId: string) => Promise<Uint8Array | null>;
  shouldCancel?: () => boolean;
  onPhase?: (phase: "rendering" | "finalizing") => void;
  onProgress?: (progress: {
    completedFaces: number;
    totalFaces: number;
    side: "front" | "back";
    sheetIndex: number;
    slotIndex: number;
  }) => void;
};

function mmRectToPdfRect(
  pageMm: { width: number; height: number },
  rectMm: { xMm: number; yMm: number; wMm: number; hMm: number },
): { x: number; y: number; width: number; height: number } {
  const x = mmToPt(rectMm.xMm);
  const y = mmToPt(pageMm.height - rectMm.yMm - rectMm.hMm);
  const width = mmToPt(rectMm.wMm);
  const height = mmToPt(rectMm.hMm);
  return { x, y, width, height };
}

export async function renderPdf(options: RenderPdfOptions): Promise<PdfExportResult> {
  const { config, layout, composition, fileName, renderFacePngBytes, shouldCancel, onPhase, onProgress } = options;
  const pdf = await PDFDocument.create();
  const pageWidthPt = mmToPt(layout.paperMm.width);
  const pageHeightPt = mmToPt(layout.paperMm.height);

  const embeddedByFaceId = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  let renderedFaces = 0;
  let skippedFaces = 0;
  const totalFaces = composition.sheets.reduce((sum, sheet) => {
    for (const slot of sheet.slots) {
      if (slot.frontId) sum += 1;
      if (config.mode === "frontAndBack" && slot.backId) sum += 1;
    }
    return sum;
  }, 0);

  onPhase?.("rendering");

  for (const sheet of composition.sheets) {
    if (shouldCancel?.()) {
      return {
        status: "cancelled",
        renderedFaces,
        skippedFaces,
        pageCount: pdf.getPageCount(),
      };
    }
    const frontPage = pdf.addPage([pageWidthPt, pageHeightPt]);

    for (let slotIndex = 0; slotIndex < sheet.slots.length; slotIndex += 1) {
      if (shouldCancel?.()) {
        return {
          status: "cancelled",
          renderedFaces,
          skippedFaces,
          pageCount: pdf.getPageCount(),
        };
      }
      const slot = sheet.slots[slotIndex];
      const placement = layout.placements[slotIndex];
      if (!placement || !slot.frontId) {
        skippedFaces += 1;
        continue;
      }

      let image = embeddedByFaceId.get(slot.frontId);
      if (!image) {
        const bytes = await renderFacePngBytes(slot.frontId);
        if (!bytes) {
          skippedFaces += 1;
          continue;
        }
        image = await pdf.embedPng(bytes);
        embeddedByFaceId.set(slot.frontId, image);
      }

      const rect = mmRectToPdfRect(layout.paperMm, placement);
      frontPage.drawImage(image, rect);
      renderedFaces += 1;
      onProgress?.({
        completedFaces: renderedFaces,
        totalFaces,
        side: "front",
        sheetIndex: sheet.sheetIndex,
        slotIndex,
      });
    }

    if (config.mode !== "frontAndBack") {
      continue;
    }

    const backPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    const preset = config.duplexPreset ?? "normal";
    for (let slotIndex = 0; slotIndex < sheet.slots.length; slotIndex += 1) {
      if (shouldCancel?.()) {
        return {
          status: "cancelled",
          renderedFaces,
          skippedFaces,
          pageCount: pdf.getPageCount(),
        };
      }
      const slot = sheet.slots[slotIndex];
      const frontPlacement = layout.placements[slotIndex];
      if (!frontPlacement || !slot.backId) {
        skippedFaces += 1;
        continue;
      }

      const transformed = applyDuplexPreset(frontPlacement, layout.paperMm, preset);
      let image = embeddedByFaceId.get(slot.backId);
      if (!image) {
        const bytes = await renderFacePngBytes(slot.backId);
        if (!bytes) {
          skippedFaces += 1;
          continue;
        }
        image = await pdf.embedPng(bytes);
        embeddedByFaceId.set(slot.backId, image);
      }

      const rect = mmRectToPdfRect(layout.paperMm, transformed);
      backPage.drawImage(image, rect);
      renderedFaces += 1;
      onProgress?.({
        completedFaces: renderedFaces,
        totalFaces,
        side: "back",
        sheetIndex: sheet.sheetIndex,
        slotIndex,
      });
    }
  }

  if (shouldCancel?.()) {
    return {
      status: "cancelled",
      renderedFaces,
      skippedFaces,
      pageCount: pdf.getPageCount(),
    };
  }

  onPhase?.("finalizing");
  const bytes = await pdf.save();
  return {
    status: "success",
    blob: new Blob([bytes], { type: "application/pdf" }),
    fileName,
    renderedFaces,
    skippedFaces,
    pageCount: pdf.getPageCount(),
  };
}

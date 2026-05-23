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
  const { config, layout, composition, fileName, renderFacePngBytes } = options;
  const pdf = await PDFDocument.create();
  const pageWidthPt = mmToPt(layout.paperMm.width);
  const pageHeightPt = mmToPt(layout.paperMm.height);

  const embeddedByFaceId = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  let renderedFaces = 0;
  let skippedFaces = 0;

  for (const sheet of composition.sheets) {
    const frontPage = pdf.addPage([pageWidthPt, pageHeightPt]);

    for (let slotIndex = 0; slotIndex < sheet.slots.length; slotIndex += 1) {
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
    }

    if (config.mode !== "frontAndBack") {
      continue;
    }

    const backPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    const preset = config.duplexPreset ?? "normal";
    for (let slotIndex = 0; slotIndex < sheet.slots.length; slotIndex += 1) {
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
    }
  }

  const bytes = await pdf.save();
  return {
    blob: new Blob([bytes], { type: "application/pdf" }),
    fileName,
    renderedFaces,
    skippedFaces,
    pageCount: pdf.getPageCount(),
  };
}

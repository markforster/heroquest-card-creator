import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, grayscale } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

import { embeddedImagesByFileName } from "@/generated/embeddedAssets";
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

const PDF_ATTRIBUTION_TEXT_SIZE_PT = 8;
const PDF_ATTRIBUTION_MARGIN_MM = 3;
const PDF_ATTRIBUTION_QR_SIZE_MM = 16;
const PDF_ATTRIBUTION_TEXT_GAP_MM = 2;
const PDF_ATTRIBUTION_LINK_URL = "https://mark-forster.itch.io/heroquest-card-creator";
const PDF_ATTRIBUTION_LINK_TEXT = "HeroQuest Card Creator";
const PDF_ATTRIBUTION_QR_KEY = "thqcc-qr.jpg";

function decodeBase64Payload(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const maybeBuffer = (globalThis as { Buffer?: { from: (input: string, encoding: string) => Uint8Array } }).Buffer;
  if (maybeBuffer?.from) {
    return Uint8Array.from(maybeBuffer.from(base64, "base64"));
  }

  throw new Error("Base64 decoding is unavailable in this runtime.");
}

function decodeImageDataUrlBytes(dataUrl: string): Uint8Array {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/.exec(dataUrl);
  if (!match?.[1]) {
    throw new Error("Unsupported QR image data URL format in embedded assets.");
  }
  return decodeBase64Payload(match[1]);
}

function drawPdfAttributionFooter(
  page: PDFPage,
  pageWidthPt: number,
  text: string,
  font: PDFFont,
  qrImage: Awaited<ReturnType<PDFDocument["embedJpg"]>>,
): void {
  const marginPt = mmToPt(PDF_ATTRIBUTION_MARGIN_MM);
  const qrSizePt = mmToPt(PDF_ATTRIBUTION_QR_SIZE_MM);
  const textGapPt = mmToPt(PDF_ATTRIBUTION_TEXT_GAP_MM);
  const qrX = pageWidthPt - marginPt - qrSizePt;
  const qrY = marginPt;
  const textX = marginPt;
  const textY = qrY + (qrSizePt - PDF_ATTRIBUTION_TEXT_SIZE_PT) / 2;
  const textMaxWidth = Math.max(0, qrX - textX - textGapPt);

  page.drawText(text, {
    x: textX,
    y: textY,
    size: PDF_ATTRIBUTION_TEXT_SIZE_PT,
    font,
    color: grayscale(0.35),
    maxWidth: textMaxWidth,
  });

  const linkStart = text.indexOf(PDF_ATTRIBUTION_LINK_TEXT);
  if (linkStart >= 0) {
    const prefix = text.slice(0, linkStart);
    const linkX = textX + font.widthOfTextAtSize(prefix, PDF_ATTRIBUTION_TEXT_SIZE_PT);
    const linkWidth = font.widthOfTextAtSize(PDF_ATTRIBUTION_LINK_TEXT, PDF_ATTRIBUTION_TEXT_SIZE_PT);
    const linkY = textY;
    const linkHeight = PDF_ATTRIBUTION_TEXT_SIZE_PT + 2;
    addPageUriLinkAnnotation(page, linkX, linkY, linkWidth, linkHeight, PDF_ATTRIBUTION_LINK_URL);
  }

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSizePt, height: qrSizePt });
}

function addPageUriLinkAnnotation(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  url: string,
): void {
  const doc = page.doc;
  const rect = [x, y, x + width, y + height];
  const linkAnnotation = doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: rect,
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    },
  });
  const linkRef = doc.context.register(linkAnnotation);
  const annotsKey = PDFName.of("Annots");
  const existing = page.node.lookupMaybe(annotsKey, PDFArray);
  if (existing) {
    existing.push(linkRef);
    return;
  }

  const annots = doc.context.obj([linkRef]);
  page.node.set(annotsKey, annots);
}

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
  const footerFont = await pdf.embedFont(StandardFonts.Helvetica);

  const embeddedByFaceId = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  let renderedFaces = 0;
  let skippedFaces = 0;
  const qrDataUrl = embeddedImagesByFileName[PDF_ATTRIBUTION_QR_KEY];
  if (!qrDataUrl) {
    throw new Error(`Missing embedded image asset for ${PDF_ATTRIBUTION_QR_KEY}. Run generate:embedded-assets.`);
  }
  const qrImage = await pdf.embedJpg(decodeImageDataUrlBytes(qrDataUrl));
  const attributionText = `Made using ${PDF_ATTRIBUTION_LINK_TEXT} - Mark Forster ${new Date().getFullYear()}`;
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
    drawPdfAttributionFooter(frontPage, pageWidthPt, attributionText, footerFont, qrImage);

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
    drawPdfAttributionFooter(backPage, pageWidthPt, attributionText, footerFont, qrImage);
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

import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, grayscale, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

import { embeddedImagesByFileName } from "@/generated/embeddedAssets";
import { applyDuplexPreset } from "@/lib/pdf-export/duplex";
import {
  PDF_ATTRIBUTION_MARGIN_MM,
  PDF_ATTRIBUTION_QR_SIZE_MM,
  PDF_ATTRIBUTION_TEXT_GAP_MM,
  PDF_ATTRIBUTION_TEXT_SIZE_PT,
} from "@/lib/pdf-export/footer";
import { applyPdfMetadata } from "@/lib/pdf-export/metadata";
import { mmToPt } from "@/lib/pdf-export/units";

import type {
  LayoutPlan,
  MmRect,
  PdfExportResult,
  PdfExportSourceType,
  PrintComposition,
  PrintConfig,
  SlotPlacementMm,
} from "@/lib/pdf-export/types";

type RenderPdfOptions = {
  config: PrintConfig;
  layout: LayoutPlan;
  composition: PrintComposition;
  fileName: string;
  sourceType: PdfExportSourceType;
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
  includeCalibrationPage?: boolean;
};

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
  qrImage:
    | Awaited<ReturnType<PDFDocument["embedJpg"]>>
    | Awaited<ReturnType<PDFDocument["embedPng"]>>,
): void {
  const marginPt = mmToPt(PDF_ATTRIBUTION_MARGIN_MM);
  const qrSizePt = mmToPt(PDF_ATTRIBUTION_QR_SIZE_MM);
  const textGapPt = mmToPt(PDF_ATTRIBUTION_TEXT_GAP_MM);
  const qrX = pageWidthPt - marginPt - qrSizePt;
  const qrY = marginPt;
  const textX = marginPt;
  const textY = qrY + (qrSizePt - PDF_ATTRIBUTION_TEXT_SIZE_PT) / 2;
  const textMaxWidth = Math.max(0, qrX - textX - textGapPt);

  const linkStart = text.indexOf(PDF_ATTRIBUTION_LINK_TEXT);
  if (linkStart >= 0) {
    const prefix = text.slice(0, linkStart);
    const suffix = text.slice(linkStart + PDF_ATTRIBUTION_LINK_TEXT.length);
    const prefixWidth = font.widthOfTextAtSize(prefix, PDF_ATTRIBUTION_TEXT_SIZE_PT);
    const linkWidth = font.widthOfTextAtSize(PDF_ATTRIBUTION_LINK_TEXT, PDF_ATTRIBUTION_TEXT_SIZE_PT);
    const suffixWidth = font.widthOfTextAtSize(suffix, PDF_ATTRIBUTION_TEXT_SIZE_PT);
    const fullWidth = prefixWidth + linkWidth + suffixWidth;
    const scale = fullWidth > 0 ? Math.min(1, textMaxWidth / fullWidth) : 1;
    const size = PDF_ATTRIBUTION_TEXT_SIZE_PT * scale;
    const scaledPrefixWidth = font.widthOfTextAtSize(prefix, size);
    const scaledLinkWidth = font.widthOfTextAtSize(PDF_ATTRIBUTION_LINK_TEXT, size);
    const linkY = textY;

    page.drawText(prefix, {
      x: textX,
      y: textY,
      size,
      font,
      color: grayscale(0.35),
    });
    page.drawText(PDF_ATTRIBUTION_LINK_TEXT, {
      x: textX + scaledPrefixWidth,
      y: textY,
      size,
      font,
      color: rgb(0.1, 0.35, 0.85),
    });
    page.drawText(suffix, {
      x: textX + scaledPrefixWidth + scaledLinkWidth,
      y: textY,
      size,
      font,
      color: grayscale(0.35),
    });

    const underlineY = linkY - Math.max(0.8, size * 0.12);
    page.drawLine({
      start: { x: textX + scaledPrefixWidth, y: underlineY },
      end: { x: textX + scaledPrefixWidth + scaledLinkWidth, y: underlineY },
      color: rgb(0.1, 0.35, 0.85),
      thickness: 0.7,
    });

    const linkHeight = size + 2;
    addPageUriLinkAnnotation(
      page,
      textX + scaledPrefixWidth,
      linkY,
      scaledLinkWidth,
      linkHeight,
      PDF_ATTRIBUTION_LINK_URL,
    );
  } else {
    page.drawText(text, {
      x: textX,
      y: textY,
      size: PDF_ATTRIBUTION_TEXT_SIZE_PT,
      font,
      color: grayscale(0.35),
      maxWidth: textMaxWidth,
    });
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
  rectMm: MmRect,
): { x: number; y: number; width: number; height: number } {
  const x = mmToPt(rectMm.xMm);
  const y = mmToPt(pageMm.height - rectMm.yMm - rectMm.hMm);
  const width = mmToPt(rectMm.wMm);
  const height = mmToPt(rectMm.hMm);
  return { x, y, width, height };
}

const CALIBRATION_PAGE_MARGIN_MM = 10;
const CALIBRATION_TITLE_TOP_MM = 12;
const CALIBRATION_SECTIONS_TOP_MM = 22;
const CALIBRATION_SECTION_GAP_MM = 6;
const CALIBRATION_PANEL_PADDING_MM = 3;
const CALIBRATION_PANEL_TITLE_HEIGHT_MM = 7;
const CALIBRATION_PANEL_TOP_RULER_HEIGHT_MM = 10;
const CALIBRATION_PANEL_LEFT_RULER_WIDTH_MM = 12;
const CALIBRATION_PANEL_LEGEND_HEIGHT_MM = 14;
const CALIBRATION_CM_MINOR_STEP_MM = 1;
const CALIBRATION_CM_MAJOR_STEP_MM = 10;
const CALIBRATION_INCH_MINOR_STEP_MM = 25.4 / 8;
const CALIBRATION_INCH_MAJOR_STEP_MM = 25.4;
const CALIBRATION_LABEL_EPSILON_MM = 0.001;
const CALIBRATION_SECTION_LABEL_SIZE_PT = 8;
const CALIBRATION_RULER_LABEL_SIZE_PT = 5.5;
const CALIBRATION_RULER_UNIT_SIZE_PT = 5.5;
const CALIBRATION_INSTRUCTION_TITLE_SIZE_PT = 8;
const CALIBRATION_INSTRUCTION_TEXT_SIZE_PT = 6.25;
const CALIBRATION_INSTRUCTION_LINE_HEIGHT_MM = 3.9;
const CALIBRATION_INSTRUCTION_GAP_MM = 6;
const CALIBRATION_INSTRUCTION_OFFSET_X_MM = 3;
const CALIBRATION_INSTRUCTION_OFFSET_Y_MM = 8;

const CALIBRATION_PRINT_INSTRUCTION_LINES = [
  "Print this page correctly",
  "Use these print settings:",
  "- Print at 100% or Actual size",
  "- Do not use Fit to page",
  "  or Shrink to fit",
  "- Match the paper size to this PDF",
  "Then check after printing:",
  "- 1 inch guide = exactly 1 inch",
  "- 1 cm guide = exactly 1 cm",
] as const;

type CalibrationSectionLayout = {
  title: string;
  panelRectMm: MmRect;
  content: "inchSquare" | "cmSquare" | "cardTarget";
};

function drawCalibrationSectionFrame(
  page: PDFPage,
  pageMm: { width: number; height: number },
  panelRectMm: MmRect,
  title: string,
): void {
  const panelRectPt = mmRectToPdfRect(pageMm, panelRectMm);
  page.drawRectangle({
    x: panelRectPt.x,
    y: panelRectPt.y,
    width: panelRectPt.width,
    height: panelRectPt.height,
    borderColor: grayscale(0.75),
    borderWidth: 0.8,
  });
  page.drawText(title, {
    x: mmToPt(panelRectMm.xMm + CALIBRATION_PANEL_PADDING_MM),
    y: mmToPt(pageMm.height - panelRectMm.yMm - CALIBRATION_PANEL_PADDING_MM - 4.5),
    size: CALIBRATION_SECTION_LABEL_SIZE_PT,
    color: grayscale(0.12),
  });
}

function getCalibrationPanelContentRect(panelRectMm: MmRect): MmRect {
  const xMm =
    panelRectMm.xMm +
    CALIBRATION_PANEL_PADDING_MM +
    CALIBRATION_PANEL_LEFT_RULER_WIDTH_MM;
  const yMm =
    panelRectMm.yMm +
    CALIBRATION_PANEL_PADDING_MM +
    CALIBRATION_PANEL_TITLE_HEIGHT_MM +
    CALIBRATION_PANEL_TOP_RULER_HEIGHT_MM;
  const wMm =
    panelRectMm.wMm -
    CALIBRATION_PANEL_PADDING_MM * 2 -
    CALIBRATION_PANEL_LEFT_RULER_WIDTH_MM;
  const hMm =
    panelRectMm.hMm -
    CALIBRATION_PANEL_PADDING_MM * 2 -
    CALIBRATION_PANEL_TITLE_HEIGHT_MM -
    CALIBRATION_PANEL_TOP_RULER_HEIGHT_MM;

  return { xMm, yMm, wMm, hMm };
}

function getCalibrationSectionLayouts(pageMm: { width: number; height: number }): CalibrationSectionLayout[] {
  const usableWidthMm = pageMm.width - CALIBRATION_PAGE_MARGIN_MM * 2;
  const usableHeightMm = pageMm.height - CALIBRATION_SECTIONS_TOP_MM - CALIBRATION_PAGE_MARGIN_MM;
  const isLandscape = pageMm.width >= pageMm.height;

  if (isLandscape) {
    const utilityColumnWidthMm = Math.max(48, Math.min(60, usableWidthMm * 0.28));
    const cardPanelWidthMm = usableWidthMm - utilityColumnWidthMm - CALIBRATION_SECTION_GAP_MM;
    const utilityPanelHeightMm = (usableHeightMm - CALIBRATION_SECTION_GAP_MM) / 2;
    return [
      {
        title: "1 inch square",
        content: "inchSquare",
        panelRectMm: {
          xMm: CALIBRATION_PAGE_MARGIN_MM,
          yMm: CALIBRATION_SECTIONS_TOP_MM,
          wMm: utilityColumnWidthMm,
          hMm: utilityPanelHeightMm,
        },
      },
      {
        title: "1 cm square",
        content: "cmSquare",
        panelRectMm: {
          xMm: CALIBRATION_PAGE_MARGIN_MM,
          yMm: CALIBRATION_SECTIONS_TOP_MM + utilityPanelHeightMm + CALIBRATION_SECTION_GAP_MM,
          wMm: utilityColumnWidthMm,
          hMm: utilityPanelHeightMm,
        },
      },
      {
        title: "Trim / bleed card target",
        content: "cardTarget",
        panelRectMm: {
          xMm: CALIBRATION_PAGE_MARGIN_MM + utilityColumnWidthMm + CALIBRATION_SECTION_GAP_MM,
          yMm: CALIBRATION_SECTIONS_TOP_MM,
          wMm: cardPanelWidthMm,
          hMm: usableHeightMm,
        },
      },
    ];
  }

  const utilityPanelWidthMm = (usableWidthMm - CALIBRATION_SECTION_GAP_MM) / 2;
  const utilityPanelHeightMm = Math.max(44, Math.min(60, usableHeightMm * 0.24));
  return [
    {
      title: "1 inch square",
      content: "inchSquare",
      panelRectMm: {
        xMm: CALIBRATION_PAGE_MARGIN_MM,
        yMm: CALIBRATION_SECTIONS_TOP_MM,
        wMm: utilityPanelWidthMm,
        hMm: utilityPanelHeightMm,
      },
    },
    {
      title: "1 cm square",
      content: "cmSquare",
      panelRectMm: {
        xMm: CALIBRATION_PAGE_MARGIN_MM + utilityPanelWidthMm + CALIBRATION_SECTION_GAP_MM,
        yMm: CALIBRATION_SECTIONS_TOP_MM,
        wMm: utilityPanelWidthMm,
        hMm: utilityPanelHeightMm,
      },
    },
    {
      title: "Trim / bleed card target",
      content: "cardTarget",
      panelRectMm: {
        xMm: CALIBRATION_PAGE_MARGIN_MM,
        yMm: CALIBRATION_SECTIONS_TOP_MM + utilityPanelHeightMm + CALIBRATION_SECTION_GAP_MM,
        wMm: usableWidthMm,
        hMm: usableHeightMm - utilityPanelHeightMm - CALIBRATION_SECTION_GAP_MM,
      },
    },
  ];
}

function isMajorStep(valueMm: number, stepMm: number): boolean {
  const ratio = valueMm / stepMm;
  return Math.abs(ratio - Math.round(ratio)) < CALIBRATION_LABEL_EPSILON_MM;
}

function drawDualUnitRulers(
  page: PDFPage,
  pageMm: { width: number; height: number },
  panelRectMm: MmRect,
  contentRectMm: MmRect,
): void {
  const topBaselineMm = panelRectMm.yMm + CALIBRATION_PANEL_PADDING_MM + CALIBRATION_PANEL_TITLE_HEIGHT_MM;
  const leftBaselineMm = panelRectMm.xMm + CALIBRATION_PANEL_PADDING_MM;
  const originXmm = contentRectMm.xMm;
  const originYmm = contentRectMm.yMm;
  const topMetricBaselineMm = originYmm - 1.8;
  const topImperialBaselineMm = originYmm - 5.8;
  const leftMetricBaselineMm = originXmm - 1.8;
  const leftImperialBaselineMm = originXmm - 5.8;

  page.drawText("Metric (cm/mm)", {
    x: mmToPt(originXmm),
    y: mmToPt(pageMm.height - (topBaselineMm + 2.1)),
    size: CALIBRATION_RULER_UNIT_SIZE_PT,
    color: rgb(0.1, 0.45, 0.18),
  });
  page.drawText("Imperial (in)", {
    x: mmToPt(originXmm + 34),
    y: mmToPt(pageMm.height - (topBaselineMm + 6.3)),
    size: CALIBRATION_RULER_UNIT_SIZE_PT,
    color: rgb(0.15, 0.25, 0.7),
  });

  for (
    let offsetMm = 0;
    offsetMm <= contentRectMm.wMm + CALIBRATION_LABEL_EPSILON_MM;
    offsetMm += CALIBRATION_CM_MINOR_STEP_MM
  ) {
    const clampedOffsetMm = Math.min(offsetMm, contentRectMm.wMm);
    const isMajor = isMajorStep(clampedOffsetMm, CALIBRATION_CM_MAJOR_STEP_MM);
    const tickLengthMm = isMajor ? 3.2 : 1.6;
    const xPt = mmToPt(originXmm + clampedOffsetMm);
    const y1Pt = mmToPt(pageMm.height - topMetricBaselineMm);
    const y2Pt = mmToPt(pageMm.height - originYmm);
    page.drawLine({
      start: { x: xPt, y: y1Pt },
      end: { x: xPt, y: y2Pt },
      thickness: isMajor ? 0.8 : 0.35,
      color: rgb(0.1, 0.45, 0.18),
    });
    if (isMajor) {
      const labelValue = Math.round(clampedOffsetMm / CALIBRATION_CM_MAJOR_STEP_MM);
      page.drawText(String(labelValue), {
        x: xPt + mmToPt(0.5),
        y: mmToPt(pageMm.height - (topMetricBaselineMm + 4.8)),
        size: CALIBRATION_RULER_LABEL_SIZE_PT,
        color: rgb(0.1, 0.45, 0.18),
      });
    }
  }

  for (
    let offsetMm = 0;
    offsetMm <= contentRectMm.wMm + CALIBRATION_LABEL_EPSILON_MM;
    offsetMm += CALIBRATION_INCH_MINOR_STEP_MM
  ) {
    const clampedOffsetMm = Math.min(offsetMm, contentRectMm.wMm);
    const isMajor = isMajorStep(clampedOffsetMm, CALIBRATION_INCH_MAJOR_STEP_MM);
    const isHalfMajor = !isMajor && isMajorStep(clampedOffsetMm, CALIBRATION_INCH_MAJOR_STEP_MM / 2);
    const tickLengthMm = isMajor ? 3.2 : isHalfMajor ? 2.3 : 1.3;
    const xPt = mmToPt(originXmm + clampedOffsetMm);
    const y1Pt = mmToPt(pageMm.height - topImperialBaselineMm);
    const y2Pt = mmToPt(pageMm.height - originYmm);
    page.drawLine({
      start: { x: xPt, y: y1Pt },
      end: { x: xPt, y: y2Pt },
      thickness: isMajor ? 0.8 : 0.35,
      color: rgb(0.15, 0.25, 0.7),
    });
    if (isMajor) {
      const labelValue = Math.round(clampedOffsetMm / CALIBRATION_INCH_MAJOR_STEP_MM);
      page.drawText(String(labelValue), {
        x: xPt + mmToPt(0.5),
        y: mmToPt(pageMm.height - (topImperialBaselineMm + 4.2)),
        size: CALIBRATION_RULER_LABEL_SIZE_PT,
        color: rgb(0.15, 0.25, 0.7),
      });
    }
  }

  for (
    let offsetMm = 0;
    offsetMm <= contentRectMm.hMm + CALIBRATION_LABEL_EPSILON_MM;
    offsetMm += CALIBRATION_CM_MINOR_STEP_MM
  ) {
    const clampedOffsetMm = Math.min(offsetMm, contentRectMm.hMm);
    const isMajor = isMajorStep(clampedOffsetMm, CALIBRATION_CM_MAJOR_STEP_MM);
    const tickLengthMm = isMajor ? 3.2 : 1.6;
    const yPt = mmToPt(pageMm.height - (originYmm + clampedOffsetMm));
    const x1Pt = mmToPt(leftMetricBaselineMm);
    const x2Pt = mmToPt(originXmm);
    page.drawLine({
      start: { x: x1Pt, y: yPt },
      end: { x: x2Pt, y: yPt },
      thickness: isMajor ? 0.8 : 0.35,
      color: rgb(0.1, 0.45, 0.18),
    });
    if (isMajor) {
      const labelValue = Math.round(clampedOffsetMm / CALIBRATION_CM_MAJOR_STEP_MM);
      page.drawText(String(labelValue), {
        x: mmToPt(leftBaselineMm),
        y: yPt - mmToPt(0.9),
        size: CALIBRATION_RULER_LABEL_SIZE_PT,
        color: rgb(0.1, 0.45, 0.18),
      });
    }
  }

  for (
    let offsetMm = 0;
    offsetMm <= contentRectMm.hMm + CALIBRATION_LABEL_EPSILON_MM;
    offsetMm += CALIBRATION_INCH_MINOR_STEP_MM
  ) {
    const clampedOffsetMm = Math.min(offsetMm, contentRectMm.hMm);
    const isMajor = isMajorStep(clampedOffsetMm, CALIBRATION_INCH_MAJOR_STEP_MM);
    const isHalfMajor = !isMajor && isMajorStep(clampedOffsetMm, CALIBRATION_INCH_MAJOR_STEP_MM / 2);
    const tickLengthMm = isMajor ? 3.2 : isHalfMajor ? 2.3 : 1.3;
    const yPt = mmToPt(pageMm.height - (originYmm + clampedOffsetMm));
    const x1Pt = mmToPt(leftImperialBaselineMm);
    const x2Pt = mmToPt(originXmm);
    page.drawLine({
      start: { x: x1Pt, y: yPt },
      end: { x: x2Pt, y: yPt },
      thickness: isMajor ? 0.8 : 0.35,
      color: rgb(0.15, 0.25, 0.7),
    });
    if (isMajor) {
      const labelValue = Math.round(clampedOffsetMm / CALIBRATION_INCH_MAJOR_STEP_MM);
      page.drawText(String(labelValue), {
        x: mmToPt(leftBaselineMm + 4.4),
        y: yPt - mmToPt(0.9),
        size: CALIBRATION_RULER_LABEL_SIZE_PT,
        color: rgb(0.15, 0.25, 0.7),
      });
    }
  }
}

function drawCalibrationLegendLine(
  page: PDFPage,
  pageMm: { width: number; height: number },
  contentRectMm: MmRect,
  lineIndex: number,
  text: string,
  color: ReturnType<typeof rgb>,
): void {
  page.drawText(text, {
    x: mmToPt(contentRectMm.xMm),
    y: mmToPt(pageMm.height - (contentRectMm.yMm + contentRectMm.hMm - 4 - lineIndex * 4.2)),
    size: 6.5,
    color,
  });
}

function drawCalibrationPrintInstructions(
  page: PDFPage,
  pageMm: { width: number; height: number },
  contentRectMm: MmRect,
  occupiedWidthMm: number,
): void {
  const availableWidthMm = contentRectMm.wMm - occupiedWidthMm - CALIBRATION_INSTRUCTION_GAP_MM;
  if (availableWidthMm < 38) {
    return;
  }

  const xMm =
    contentRectMm.xMm +
    occupiedWidthMm +
    CALIBRATION_INSTRUCTION_GAP_MM +
    CALIBRATION_INSTRUCTION_OFFSET_X_MM;
  const topYmm = contentRectMm.yMm + CALIBRATION_INSTRUCTION_OFFSET_Y_MM;

  CALIBRATION_PRINT_INSTRUCTION_LINES.forEach((line, index) => {
    const isTitle = index === 0;
    const isSectionLabel = index === 1 || index === 6;
    page.drawText(line, {
      x: mmToPt(xMm),
      y: mmToPt(pageMm.height - (topYmm + index * CALIBRATION_INSTRUCTION_LINE_HEIGHT_MM)),
      size: isTitle ? CALIBRATION_INSTRUCTION_TITLE_SIZE_PT : CALIBRATION_INSTRUCTION_TEXT_SIZE_PT,
      color: isTitle
        ? grayscale(0.12)
        : isSectionLabel
          ? grayscale(0.22)
          : grayscale(0.35),
      maxWidth: mmToPt(availableWidthMm),
    });
  });
}

function drawCenteredCalibrationSquare(
  page: PDFPage,
  pageMm: { width: number; height: number },
  contentRectMm: MmRect,
  sizeMm: number,
  borderColor: ReturnType<typeof rgb>,
  label: string,
): void {
  const rectMm: MmRect = {
    xMm: contentRectMm.xMm,
    yMm: contentRectMm.yMm,
    wMm: sizeMm,
    hMm: sizeMm,
  };
  const rectPt = mmRectToPdfRect(pageMm, rectMm);
  page.drawRectangle({
    x: rectPt.x,
    y: rectPt.y,
    width: rectPt.width,
    height: rectPt.height,
    borderColor,
    borderWidth: 1,
  });
  page.drawText(label, {
    x: mmToPt(contentRectMm.xMm),
    y: mmToPt(pageMm.height - (contentRectMm.yMm + sizeMm + 4)),
    size: 7,
    color: borderColor,
  });
}

function drawCalibrationCardTarget(
  page: PDFPage,
  pageMm: { width: number; height: number },
  contentRectMm: MmRect,
  config: PrintConfig,
  placement?: SlotPlacementMm,
): void {
  const bleedMm = Math.max(0, config.bleedMm ?? 0);
  const innerW = placement?.innerRectMm.wMm ?? config.cardMm.width;
  const innerH = placement?.innerRectMm.hMm ?? config.cardMm.height;
  const outerW = placement?.outerRectMm.wMm ?? innerW + bleedMm * 2;
  const outerH = placement?.outerRectMm.hMm ?? innerH + bleedMm * 2;
  const imageW = placement?.imageRectMm.wMm ?? outerW;
  const imageH = placement?.imageRectMm.hMm ?? outerH;
  const showImageRect =
    Math.abs(imageW - outerW) > CALIBRATION_LABEL_EPSILON_MM ||
    Math.abs(imageH - outerH) > CALIBRATION_LABEL_EPSILON_MM;

  const originX = contentRectMm.xMm;
  const originY = contentRectMm.yMm;

  if (showImageRect) {
    const imageRectPt = mmRectToPdfRect(pageMm, {
      xMm: originX,
      yMm: originY,
      wMm: imageW,
      hMm: imageH,
    });
    page.drawRectangle({
      x: imageRectPt.x,
      y: imageRectPt.y,
      width: imageRectPt.width,
      height: imageRectPt.height,
      borderColor: rgb(0.1, 0.2, 0.8),
      borderWidth: 1,
    });
  }

  const outerRectMm: MmRect = {
    xMm: originX + (imageW - outerW) / 2,
    yMm: originY + (imageH - outerH) / 2,
    wMm: outerW,
    hMm: outerH,
  };
  const outerRectPt = mmRectToPdfRect(pageMm, outerRectMm);
  page.drawRectangle({
    x: outerRectPt.x,
    y: outerRectPt.y,
    width: outerRectPt.width,
    height: outerRectPt.height,
    borderColor: rgb(0.75, 0.1, 0.1),
    borderWidth: 1,
  });

  const innerInsetX = (outerW - innerW) / 2;
  const innerInsetY = (outerH - innerH) / 2;
  const innerRectPt = mmRectToPdfRect(pageMm, {
    xMm: outerRectMm.xMm + innerInsetX,
    yMm: outerRectMm.yMm + innerInsetY,
    wMm: innerW,
    hMm: innerH,
  });
  page.drawRectangle({
    x: innerRectPt.x,
    y: innerRectPt.y,
    width: innerRectPt.width,
    height: innerRectPt.height,
    borderColor: rgb(0.1, 0.6, 0.2),
    borderWidth: 1,
  });

  drawCalibrationLegendLine(
    page,
    pageMm,
    contentRectMm,
    0,
    `Trim: ${innerW.toFixed(2)} x ${innerH.toFixed(2)} mm`,
    rgb(0.1, 0.6, 0.2),
  );
  drawCalibrationLegendLine(
    page,
    pageMm,
    contentRectMm,
    1,
    `Bleed: ${outerW.toFixed(2)} x ${outerH.toFixed(2)} mm`,
    rgb(0.75, 0.1, 0.1),
  );
  if (showImageRect) {
    drawCalibrationLegendLine(
      page,
      pageMm,
      contentRectMm,
      2,
      `Rendered image: ${imageW.toFixed(2)} x ${imageH.toFixed(2)} mm`,
      rgb(0.1, 0.2, 0.8),
    );
  }

  drawCalibrationPrintInstructions(page, pageMm, contentRectMm, imageW);
}

function drawCalibrationSection(
  page: PDFPage,
  pageMm: { width: number; height: number },
  section: CalibrationSectionLayout,
  config: PrintConfig,
  placement?: SlotPlacementMm,
): void {
  drawCalibrationSectionFrame(page, pageMm, section.panelRectMm, section.title);
  const contentRectMm = getCalibrationPanelContentRect(section.panelRectMm);
  drawDualUnitRulers(page, pageMm, section.panelRectMm, contentRectMm);

  if (section.content === "inchSquare") {
    drawCenteredCalibrationSquare(
      page,
      pageMm,
      contentRectMm,
      25.4,
      rgb(0.1, 0.3, 0.8),
      "1 inch square (25.4 mm)",
    );
    return;
  }

  if (section.content === "cmSquare") {
    drawCenteredCalibrationSquare(
      page,
      pageMm,
      contentRectMm,
      10,
      rgb(0.1, 0.55, 0.2),
      "1 cm square (10 mm)",
    );
    return;
  }

  drawCalibrationCardTarget(page, pageMm, contentRectMm, config, placement);
}

function drawCalibrationPage(
  page: PDFPage,
  pageMm: { width: number; height: number },
  config: PrintConfig,
  placement?: SlotPlacementMm,
): void {
  const pageHeightPt = mmToPt(pageMm.height);

  page.drawText("PDF Calibration", {
    x: mmToPt(CALIBRATION_PAGE_MARGIN_MM),
    y: pageHeightPt - mmToPt(CALIBRATION_TITLE_TOP_MM),
    size: 14,
    color: grayscale(0.1),
  });

  const sections = getCalibrationSectionLayouts(pageMm);
  for (const section of sections) {
    drawCalibrationSection(page, pageMm, section, config, placement);
  }
}

export async function renderPdf(options: RenderPdfOptions): Promise<PdfExportResult> {
  const {
    config,
    layout,
    composition,
    fileName,
    sourceType,
    renderFacePngBytes,
    shouldCancel,
    onPhase,
    onProgress,
    includeCalibrationPage = false,
  } = options;
  const pdf = await PDFDocument.create({ updateMetadata: false });
  applyPdfMetadata({ pdf, fileName, sourceType, config });
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
  let qrImage: Awaited<ReturnType<PDFDocument["embedJpg"]>> | Awaited<ReturnType<PDFDocument["embedPng"]>>;
  const qrBytes = decodeImageDataUrlBytes(qrDataUrl);
  try {
    qrImage = await pdf.embedJpg(qrBytes);
  } catch {
    qrImage = await pdf.embedPng(qrBytes);
  }
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

      // Trim-only exports draw into the physical trim rect. Baked-image exports
      // draw the full rendered PNG, which may include crop/cut mark padding
      // beyond the bleed rect.
      const frontRectMm =
        config.bleedMode === "bakedInImage" ? placement.imageRectMm : placement.innerRectMm;
      const rect = mmRectToPdfRect(layout.paperMm, frontRectMm);
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

      const backBaseRectMm =
        config.bleedMode === "bakedInImage"
          ? frontPlacement.imageRectMm
          : frontPlacement.innerRectMm;
      const transformed = applyDuplexPreset(backBaseRectMm, layout.paperMm, preset);
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
  if (includeCalibrationPage) {
    const calibrationPage = pdf.addPage([pageWidthPt, pageHeightPt]);
    drawCalibrationPage(calibrationPage, layout.paperMm, config, layout.placements[0]);
  }
  const bytes = await pdf.save();
  const pdfBytes = new Uint8Array(bytes.byteLength);
  pdfBytes.set(bytes);
  return {
    status: "success",
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    fileName,
    renderedFaces,
    skippedFaces,
    pageCount: pdf.getPageCount(),
  };
}

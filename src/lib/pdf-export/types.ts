export type Mm = number;
export type Pt = number;
export type MmRect = { xMm: Mm; yMm: Mm; wMm: Mm; hMm: Mm };

export type PaperSize = "A4" | "Letter";
export type Orientation = "portrait" | "landscape";

export type DuplexPreset = "normal" | "mirrorX" | "rotate180" | "mirrorXRotate180";

export type PrintConfig = {
  paper: PaperSize;
  orientation: Orientation;
  marginsMm: { top: Mm; right: Mm; bottom: Mm; left: Mm };
  gapMm: { x: Mm; y: Mm };
  cardMm: { width: Mm; height: Mm };
  mode: "frontsOnly" | "frontAndBack";
  bleedMode: "bakedInImage" | "layoutBleed";
  bleedMm?: Mm;
  duplexPreset?: DuplexPreset;
};

export type SlotPair = {
  slotId: string;
  frontId: string | null;
  backId: string | null;
};

export type SheetComposition = {
  sheetIndex: number;
  slots: SlotPair[];
};

export type PrintComposition = {
  sheets: SheetComposition[];
  totalSlots: number;
};

export type SlotPlacementMm = {
  slotIndex: number;
  /**
   * Physical trim bounds (63.5mm x 88.9mm for poker cards by default).
   * Trim-only images must be drawn into this rect.
   */
  innerRectMm: MmRect;
  /**
   * Physical bleed bounds. Baked-bleed artwork must cover this rect.
   */
  outerRectMm: MmRect;
  /**
   * Actual rendered image bounds on the PDF page. In baked-image mode this may
   * be larger than the bleed rect when crop/cut marks add extra padding around
   * the card image.
   */
  imageRectMm: MmRect;
};

export type LayoutPlan = {
  paperMm: { width: Mm; height: Mm };
  grid: { cols: number; rows: number; perPage: number };
  placements: SlotPlacementMm[];
};

export type PdfExportSuccessResult = {
  status: "success";
  blob: Blob;
  fileName: string;
  renderedFaces: number;
  skippedFaces: number;
  pageCount: number;
};

export type PdfExportCancelledResult = {
  status: "cancelled";
  renderedFaces: number;
  skippedFaces: number;
  pageCount: number;
};

export type PdfExportResult = PdfExportSuccessResult | PdfExportCancelledResult;

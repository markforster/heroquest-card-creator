export type Mm = number;
export type Pt = number;

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
  xMm: Mm;
  yMm: Mm;
  wMm: Mm;
  hMm: Mm;
};

export type LayoutPlan = {
  paperMm: { width: Mm; height: Mm };
  grid: { cols: number; rows: number; perPage: number };
  placements: SlotPlacementMm[];
};

export type PdfExportResult = {
  blob: Blob;
  fileName: string;
  renderedFaces: number;
  skippedFaces: number;
  pageCount: number;
};

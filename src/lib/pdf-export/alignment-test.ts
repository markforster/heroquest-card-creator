import type { PrintComposition } from "@/lib/pdf-export/types";

export type AlignmentSide = "front" | "back";

export function buildAlignmentTestComposition(base: PrintComposition, includeBacks: boolean): PrintComposition {
  return {
    totalSlots: base.totalSlots,
    sheets: base.sheets.map((sheet) => ({
      sheetIndex: sheet.sheetIndex,
      slots: sheet.slots.map((slot, slotIndex) => ({
        ...slot,
        frontId: `align-front-${sheet.sheetIndex}-${slotIndex}`,
        backId: includeBacks ? `align-back-${sheet.sheetIndex}-${slotIndex}` : null,
      })),
    })),
  };
}

export function buildSingleSheetAlignmentComposition(
  perPage: number,
  includeBacks: boolean,
): PrintComposition {
  if (perPage <= 0) {
    return { totalSlots: 0, sheets: [] };
  }

  return {
    totalSlots: perPage,
    sheets: [
      {
        sheetIndex: 0,
        slots: Array.from({ length: perPage }, (_, slotIndex) => ({
          slotId: `align-slot-${slotIndex}`,
          frontId: `align-front-0-${slotIndex}`,
          backId: includeBacks ? `align-back-0-${slotIndex}` : null,
        })),
      },
    ],
  };
}

export function parseAlignmentFaceId(faceId: string): {
  side: AlignmentSide;
  sheetIndex: number;
  slotIndex: number;
  slotNumber: number;
} | null {
  const match = /^align-(front|back)-(\d+)-(\d+)$/.exec(faceId);
  if (!match) return null;
  const side = match[1] as AlignmentSide;
  const sheetIndex = Number(match[2]);
  const slotIndex = Number(match[3]);
  if (!Number.isFinite(sheetIndex) || !Number.isFinite(slotIndex)) return null;
  return {
    side,
    sheetIndex,
    slotIndex,
    slotNumber: slotIndex + 1,
  };
}

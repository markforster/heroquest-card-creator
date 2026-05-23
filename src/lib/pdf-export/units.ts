import type { Mm, PaperSize, Pt } from "@/lib/pdf-export/types";

export function mmToPt(mm: Mm): Pt {
  return (mm * 72) / 25.4;
}

export function ptToMm(pt: Pt): Mm {
  return (pt * 25.4) / 72;
}

export const PAPER_SIZE_MM: Record<PaperSize, { width: Mm; height: Mm }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

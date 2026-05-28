import type { DuplexPreset, MmRect } from "@/lib/pdf-export/types";

function rotate180(rect: MmRect, pageMm: { width: number; height: number }): MmRect {
  return {
    ...rect,
    xMm: pageMm.width - rect.xMm - rect.wMm,
    yMm: pageMm.height - rect.yMm - rect.hMm,
  };
}

function mirrorX(rect: MmRect, pageMm: { width: number; height: number }): MmRect {
  return {
    ...rect,
    xMm: pageMm.width - rect.xMm - rect.wMm,
  };
}

export function applyDuplexPreset(
  rect: MmRect,
  pageMm: { width: number; height: number },
  preset: DuplexPreset,
): MmRect {
  if (preset === "normal") return rect;
  if (preset === "mirrorX") return mirrorX(rect, pageMm);
  if (preset === "rotate180") return rotate180(rect, pageMm);
  return rotate180(mirrorX(rect, pageMm), pageMm);
}

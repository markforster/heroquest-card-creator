import type { DuplexPreset, SlotPlacementMm } from "@/lib/pdf-export/types";

function rotate180(
  placement: SlotPlacementMm,
  pageMm: { width: number; height: number },
): SlotPlacementMm {
  return {
    ...placement,
    xMm: pageMm.width - placement.xMm - placement.wMm,
    yMm: pageMm.height - placement.yMm - placement.hMm,
  };
}

function mirrorX(
  placement: SlotPlacementMm,
  pageMm: { width: number; height: number },
): SlotPlacementMm {
  return {
    ...placement,
    xMm: pageMm.width - placement.xMm - placement.wMm,
  };
}

export function applyDuplexPreset(
  placement: SlotPlacementMm,
  pageMm: { width: number; height: number },
  preset: DuplexPreset,
): SlotPlacementMm {
  if (preset === "normal") return placement;
  if (preset === "mirrorX") return mirrorX(placement, pageMm);
  if (preset === "rotate180") return rotate180(placement, pageMm);
  return rotate180(mirrorX(placement, pageMm), pageMm);
}

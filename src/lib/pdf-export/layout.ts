import type { LayoutPlan, PrintConfig, SlotPlacementMm } from "@/lib/pdf-export/types";
import { PAPER_SIZE_MM } from "@/lib/pdf-export/units";

function resolvePaperMm(config: Pick<PrintConfig, "paper" | "orientation">): {
  width: number;
  height: number;
} {
  const base = PAPER_SIZE_MM[config.paper];
  if (config.orientation === "landscape") {
    return { width: base.height, height: base.width };
  }
  return base;
}

export function computeLayoutPlan(config: PrintConfig): LayoutPlan {
  const paperMm = resolvePaperMm(config);

  const cardW = config.cardMm.width;
  const cardH = config.cardMm.height;
  const gapX = Math.max(0, config.gapMm.x);
  const gapY = Math.max(0, config.gapMm.y);

  const usableW = paperMm.width - config.marginsMm.left - config.marginsMm.right;
  const usableH = paperMm.height - config.marginsMm.top - config.marginsMm.bottom;

  const cols = Math.max(0, Math.floor((usableW + gapX) / (cardW + gapX)));
  const rows = Math.max(0, Math.floor((usableH + gapY) / (cardH + gapY)));
  const perPage = cols * rows;

  const placements: SlotPlacementMm[] = [];

  for (let slotIndex = 0; slotIndex < perPage; slotIndex += 1) {
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    placements.push({
      slotIndex,
      xMm: config.marginsMm.left + col * (cardW + gapX),
      yMm: config.marginsMm.top + row * (cardH + gapY),
      wMm: cardW,
      hMm: cardH,
    });
  }

  return {
    paperMm,
    grid: { cols, rows, perPage },
    placements,
  };
}

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
  const bleedMm = Math.max(0, config.bleedMm ?? 0);
  const slotW = cardW + bleedMm * 2;
  const slotH = cardH + bleedMm * 2;
  const gapX = Math.max(0, config.gapMm.x);
  const gapY = Math.max(0, config.gapMm.y);

  const usableW = paperMm.width - config.marginsMm.left - config.marginsMm.right;
  const usableH = paperMm.height - config.marginsMm.top - config.marginsMm.bottom;

  const cols = Math.max(0, Math.floor((usableW + gapX) / (slotW + gapX)));
  const rows = Math.max(0, Math.floor((usableH + gapY) / (slotH + gapY)));
  const perPage = cols * rows;
  const consumedW = cols > 0 ? cols * slotW + (cols - 1) * gapX : 0;
  const consumedH = rows > 0 ? rows * slotH + (rows - 1) * gapY : 0;
  const centerOffsetX = Math.max(0, (usableW - consumedW) / 2);
  const centerOffsetY = Math.max(0, (usableH - consumedH) / 2);

  const placements: SlotPlacementMm[] = [];

  for (let slotIndex = 0; slotIndex < perPage; slotIndex += 1) {
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const outerX = config.marginsMm.left + centerOffsetX + col * (slotW + gapX);
    const outerY = config.marginsMm.top + centerOffsetY + row * (slotH + gapY);
    placements.push({
      slotIndex,
      outerRectMm: {
        xMm: outerX,
        yMm: outerY,
        wMm: slotW,
        hMm: slotH,
      },
      innerRectMm: {
        xMm: outerX + bleedMm,
        yMm: outerY + bleedMm,
        wMm: cardW,
        hMm: cardH,
      },
    });
  }

  return {
    paperMm,
    grid: { cols, rows, perPage },
    placements,
  };
}

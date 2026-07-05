import type { LayoutPlan, PrintConfig, SlotPlacementMm } from "@/lib/pdf-export/types";
import { PAPER_SIZE_MM } from "@/lib/pdf-export/units";

type LayoutPlanOptions = {
  imagePaddingMm?: number;
  reservedBottomMm?: number;
};

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

export function computeLayoutPlan(
  config: PrintConfig,
  options: LayoutPlanOptions = {},
): LayoutPlan {
  const paperMm = resolvePaperMm(config);

  const cardW = config.cardMm.width;
  const cardH = config.cardMm.height;
  const bleedMm = Math.max(0, config.bleedMm ?? 0);
  const imagePaddingMm = Math.max(bleedMm, options.imagePaddingMm ?? bleedMm);
  const outerW = cardW + bleedMm * 2;
  const outerH = cardH + bleedMm * 2;
  const imageW = cardW + imagePaddingMm * 2;
  const imageH = cardH + imagePaddingMm * 2;
  const gapX = Math.max(0, config.gapMm.x);
  const gapY = Math.max(0, config.gapMm.y);

  const usableW = paperMm.width - config.marginsMm.left - config.marginsMm.right;
  const usableH =
    paperMm.height -
    config.marginsMm.top -
    config.marginsMm.bottom -
    Math.max(0, options.reservedBottomMm ?? 0);

  // Capacity and stepping are based on rendered image bounds so crop/cut mark
  // padding never shrinks the physical trim size or causes slot overlap.
  const cols = Math.max(0, Math.floor((usableW + gapX) / (imageW + gapX)));
  const rows = Math.max(0, Math.floor((usableH + gapY) / (imageH + gapY)));
  const perPage = cols * rows;
  const consumedW = cols > 0 ? cols * imageW + (cols - 1) * gapX : 0;
  const consumedH = rows > 0 ? rows * imageH + (rows - 1) * gapY : 0;
  const centerOffsetX = Math.max(0, (usableW - consumedW) / 2);
  const centerOffsetY = Math.max(0, (usableH - consumedH) / 2);

  const placements: SlotPlacementMm[] = [];

  for (let slotIndex = 0; slotIndex < perPage; slotIndex += 1) {
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const imageX = config.marginsMm.left + centerOffsetX + col * (imageW + gapX);
    const imageY = config.marginsMm.top + centerOffsetY + row * (imageH + gapY);
    const outerX = imageX + imagePaddingMm - bleedMm;
    const outerY = imageY + imagePaddingMm - bleedMm;
    placements.push({
      slotIndex,
      imageRectMm: {
        xMm: imageX,
        yMm: imageY,
        wMm: imageW,
        hMm: imageH,
      },
      outerRectMm: {
        xMm: outerX,
        yMm: outerY,
        wMm: outerW,
        hMm: outerH,
      },
      innerRectMm: {
        xMm: imageX + imagePaddingMm,
        yMm: imageY + imagePaddingMm,
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

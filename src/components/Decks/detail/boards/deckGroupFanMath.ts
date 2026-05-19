export type GroupFanMode = "collapsed" | "partial" | "expanded";

export const FAN_CARD_WIDTH = 112;
export const FAN_CARD_HEIGHT = (FAN_CARD_WIDTH * 1056) / 756;
export const FAN_GROUP_HORIZONTAL_PADDING = 24;

const FAN_PROFILE_BY_MODE: Record<
  GroupFanMode,
  { step: number; maxRotationDeg: number; maxArcLiftPx: number }
> = {
  collapsed: { step: 16, maxRotationDeg: 6, maxArcLiftPx: 6 },
  partial: { step: 28, maxRotationDeg: 3, maxArcLiftPx: 3 },
  expanded: { step: FAN_CARD_WIDTH + 14, maxRotationDeg: 0, maxArcLiftPx: 0 },
};

export type FanFrameInput = {
  fromMode: GroupFanMode;
  toMode: GroupFanMode;
  progress: number;
  count: number;
  cardWidth?: number;
  cardHeight?: number;
  horizontalPadding?: number;
};

export type FanCardFrame = {
  x: number;
  y: number;
  rotateDeg: number;
  zIndex: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type FanFrameOutput = {
  cards: FanCardFrame[];
  requiredWidthPx: number;
  requiredHeightPx: number;
  originOffsetXPx: number;
  originOffsetYPx: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function resolveFanPlacement({
  mode,
  count,
  index,
}: {
  mode: GroupFanMode;
  count: number;
  index: number;
}): { x: number; y: number; rotateDeg: number; zIndex: number } {
  const frame = resolveFanFrame({
    fromMode: mode,
    toMode: mode,
    progress: 1,
    count,
  });
  const card = frame.cards[index];
  if (!card) return { x: 0, y: 0, rotateDeg: 0, zIndex: index + 1 };
  return { x: card.x, y: card.y, rotateDeg: card.rotateDeg, zIndex: card.zIndex };
}

export function resolveFanFrame({
  fromMode,
  toMode,
  progress,
  count,
  cardWidth = FAN_CARD_WIDTH,
  cardHeight = FAN_CARD_HEIGHT,
  horizontalPadding = FAN_GROUP_HORIZONTAL_PADDING,
}: FanFrameInput): FanFrameOutput {
  const t = clamp(progress, 0, 1);
  const fromProfile = FAN_PROFILE_BY_MODE[fromMode];
  const toProfile = FAN_PROFILE_BY_MODE[toMode];
  const step = lerp(fromProfile.step, toProfile.step, t);
  const maxRotationDeg = lerp(fromProfile.maxRotationDeg, toProfile.maxRotationDeg, t);
  const maxArcLiftPx = lerp(fromProfile.maxArcLiftPx, toProfile.maxArcLiftPx, t);
  const halfPad = horizontalPadding / 2;

  if (count <= 0) {
    return {
      cards: [],
      requiredWidthPx: cardWidth + horizontalPadding,
      requiredHeightPx: cardHeight + horizontalPadding,
      originOffsetXPx: halfPad,
      originOffsetYPx: halfPad,
    };
  }

  const baseXByIndex: number[] = [];
  for (let index = 0; index < count; index += 1) {
    baseXByIndex.push(index * step);
  }

  const center = (count - 1) / 2;
  let minLeft = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;
  const cardsPreComp: Array<Omit<FanCardFrame, "x" | "y"> & { baseX: number; baseY: number }> = [];
  const baselineY = cardHeight;

  for (let index = 0; index < count; index += 1) {
    const offsetFromCenter = index - center;
    const maxOffset = Math.max(center, 1);
    const normalizedOffset = offsetFromCenter / maxOffset;
    const rotateDeg = normalizedOffset * maxRotationDeg;
    const centerY = baselineY - Math.abs(normalizedOffset) * maxArcLiftPx;
    const theta = (rotateDeg * Math.PI) / 180;
    const corners = [
      { x: -cardWidth / 2, y: -cardHeight },
      { x: cardWidth / 2, y: -cardHeight },
      { x: cardWidth / 2, y: 0 },
      { x: -cardWidth / 2, y: 0 },
    ];
    const centerX = baseXByIndex[index];
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    corners.forEach((corner) => {
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;
      const px = centerX + rx;
      const py = centerY + ry;
      left = Math.min(left, px);
      right = Math.max(right, px);
      top = Math.min(top, py);
      bottom = Math.max(bottom, py);
    });
    minLeft = Math.min(minLeft, left);
    maxRight = Math.max(maxRight, right);
    minTop = Math.min(minTop, top);
    maxBottom = Math.max(maxBottom, bottom);
    cardsPreComp.push({
      baseX: baseXByIndex[index],
      baseY: centerY,
      rotateDeg,
      zIndex: index + 1,
      left,
      right,
      top,
      bottom,
    });
  }

  const originOffsetXPx = halfPad - minLeft;
  const originOffsetYPx = halfPad - minTop;
  const requiredWidthPx = Math.max(cardWidth + horizontalPadding, maxRight + originOffsetXPx + halfPad);
  const requiredHeightPx = Math.max(cardHeight + horizontalPadding, maxBottom + originOffsetYPx + halfPad);

  return {
    cards: cardsPreComp.map((card) => ({
      ...card,
      x: card.baseX + originOffsetXPx,
      y: card.baseY + originOffsetYPx,
      left: card.left + originOffsetXPx,
      right: card.right + originOffsetXPx,
      top: card.top + originOffsetYPx,
      bottom: card.bottom + originOffsetYPx,
    })),
    requiredWidthPx,
    requiredHeightPx,
    originOffsetXPx,
    originOffsetYPx,
  };
}

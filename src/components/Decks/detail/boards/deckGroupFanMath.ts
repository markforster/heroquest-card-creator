export type GroupFanMode = "collapsed" | "partial" | "expanded";

export const FAN_CARD_WIDTH = 112;
export const FAN_CARD_HEIGHT = (FAN_CARD_WIDTH * 1056) / 756;
export const FAN_GROUP_HORIZONTAL_PADDING = 24;

const FAN_PROFILE_BY_MODE: Record<
  GroupFanMode,
  { angleSpreadDeg: number; radiusPx: number; centerYOffsetPx: number; spreadX: number }
> = {
  // Keep the same radial silhouette for collapsed/partial and only widen in X for partial.
  collapsed: { angleSpreadDeg: 24, radiusPx: 440, centerYOffsetPx: 1, spreadX: 0.76 },
  partial: { angleSpreadDeg: 24, radiusPx: 440, centerYOffsetPx: 1, spreadX: 1.18 },
  expanded: { angleSpreadDeg: 0, radiusPx: 0, centerYOffsetPx: 0, spreadX: 1 },
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
  pivotX: number;
  pivotY: number;
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

function resolveLowCountSpreadDamping(count: number): number {
  if (count <= 2) return 0.76;
  if (count === 3) return 0.84;
  if (count === 4) return 0.92;
  return 1;
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
  return { x: card.pivotX, y: card.pivotY, rotateDeg: card.rotateDeg, zIndex: card.zIndex };
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
  const angleSpreadDeg = lerp(fromProfile.angleSpreadDeg, toProfile.angleSpreadDeg, t);
  const radiusPx = lerp(fromProfile.radiusPx, toProfile.radiusPx, t);
  const centerYOffsetPx = lerp(fromProfile.centerYOffsetPx, toProfile.centerYOffsetPx, t);
  const spreadX = lerp(fromProfile.spreadX, toProfile.spreadX, t);
  const lowCountSpreadDamping = resolveLowCountSpreadDamping(count);
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

  const center = (count - 1) / 2;
  let minLeft = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;
  const cardsPreComp: Array<Omit<FanCardFrame, "x" | "y"> & { basePivotX: number; basePivotY: number }> = [];
  const fanCenterX = 0;
  const fanCenterY = cardHeight + radiusPx + centerYOffsetPx;
  const expandedStep = cardWidth + 14;
  const expandedRowCenterX = ((count - 1) * expandedStep) / 2;

  for (let index = 0; index < count; index += 1) {
    const offsetFromCenter = index - center;
    const maxOffset = Math.max(center, 1);
    const normalizedOffset = maxOffset > 0 ? offsetFromCenter / maxOffset : 0;
    const rotateDeg = normalizedOffset * (angleSpreadDeg / 2);
    const theta = (rotateDeg * Math.PI) / 180;
    // Pivot is the card bottom-center in canvas space.
    const radialPivotX = fanCenterX + Math.sin(theta) * radiusPx * spreadX * lowCountSpreadDamping;
    const radialPivotY = fanCenterY - Math.cos(theta) * radiusPx;
    const expandedPivotX = index * expandedStep - expandedRowCenterX;
    const expandedPivotY = cardHeight;
    const modeBlend = angleSpreadDeg <= 0.001 ? 1 : 0;
    const pivotX = modeBlend ? expandedPivotX : radialPivotX;
    const pivotY = modeBlend ? expandedPivotY : radialPivotY;
    const corners = [
      { x: -cardWidth / 2, y: -cardHeight }, // top-left
      { x: cardWidth / 2, y: -cardHeight }, // top-right
      { x: cardWidth / 2, y: 0 }, // bottom-right
      { x: -cardWidth / 2, y: 0 }, // bottom-left
    ];
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    corners.forEach((corner) => {
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;
      const px = pivotX + rx;
      const py = pivotY + ry;
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
      basePivotX: pivotX,
      basePivotY: pivotY,
      pivotX,
      pivotY,
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
      pivotX: card.basePivotX + originOffsetXPx,
      pivotY: card.basePivotY + originOffsetYPx,
      x: card.basePivotX + originOffsetXPx,
      y: card.basePivotY + originOffsetYPx,
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

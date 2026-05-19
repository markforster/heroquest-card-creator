import {
  FAN_CARD_HEIGHT,
  FAN_CARD_WIDTH,
  FAN_GROUP_HORIZONTAL_PADDING,
  resolveFanFrame,
  resolveFanPlacement,
} from "@/components/Decks/detail/boards/deckGroupFanMath";

describe("deckGroupFanMath", () => {
  it("distributes angles monotonically from left to right", () => {
    const frame = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 5 });
    const angles = frame.cards.map((card) => card.rotateDeg);
    expect(angles[0]).toBeLessThan(angles[1]);
    expect(angles[1]).toBeLessThan(angles[2]);
    expect(angles[2]).toBeLessThan(angles[3]);
    expect(angles[3]).toBeLessThan(angles[4]);
  });

  it("applies rotation and arc only in fan states", () => {
    const collapsedLeft = resolveFanPlacement({ mode: "collapsed", count: 3, index: 0 });
    const partialLeft = resolveFanPlacement({ mode: "partial", count: 3, index: 0 });
    const expandedLeft = resolveFanPlacement({ mode: "expanded", count: 3, index: 0 });

    expect(collapsedLeft.rotateDeg).not.toBe(0);
    expect(partialLeft.rotateDeg).not.toBe(0);
    expect(Math.abs(collapsedLeft.rotateDeg)).toBeLessThan(Math.abs(partialLeft.rotateDeg));
    expect(expandedLeft.rotateDeg).toBeCloseTo(0, 8);
    expect(expandedLeft.y).toBeCloseTo(
      resolveFanPlacement({ mode: "expanded", count: 3, index: 1 }).y,
      8,
    );
  });

  it("forms a radial fan where top spread is wider than bottom spread", () => {
    const frame = resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 5 });
    const leftCard = frame.cards[0];
    const rightCard = frame.cards[4];
    const topWidth = rightCard.right - leftCard.left;
    const bottomWidth = rightCard.pivotX - leftCard.pivotX;

    expect(topWidth).toBeGreaterThan(bottomWidth);
  });

  it("expanded mode is a flat row with equal bottom pivots", () => {
    const frame = resolveFanFrame({ fromMode: "expanded", toMode: "expanded", progress: 1, count: 4 });
    const y0 = frame.cards[0].pivotY;
    frame.cards.forEach((card) => {
      expect(card.rotateDeg).toBeCloseTo(0, 8);
      expect(card.pivotY).toBeCloseTo(y0, 8);
    });
    const stepA = frame.cards[1].pivotX - frame.cards[0].pivotX;
    const stepB = frame.cards[2].pivotX - frame.cards[1].pivotX;
    expect(stepA).toBeCloseTo(stepB, 8);
    expect(stepA).toBeGreaterThan(FAN_CARD_WIDTH);
  });

  it("computes required width from projected card bounds plus padding", () => {
    const frame = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 3 });
    const minLeft = Math.min(...frame.cards.map((card) => card.left));
    const maxRight = Math.max(...frame.cards.map((card) => card.right));

    expect(Math.round(minLeft)).toBeGreaterThanOrEqual(11);
    expect(Math.round(frame.requiredWidthPx)).toBe(
      Math.round(maxRight + FAN_GROUP_HORIZONTAL_PADDING / 2),
    );
  });

  it("computes required height from projected card bounds plus padding", () => {
    const frame = resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 5 });
    const minTop = Math.min(...frame.cards.map((card) => card.top));
    const maxBottom = Math.max(...frame.cards.map((card) => card.bottom));

    expect(Math.round(minTop)).toBeGreaterThanOrEqual(11);
    expect(Math.round(frame.requiredHeightPx)).toBe(Math.round(maxBottom + FAN_GROUP_HORIZONTAL_PADDING / 2));
    expect(frame.requiredHeightPx).toBeGreaterThan(FAN_CARD_HEIGHT + FAN_GROUP_HORIZONTAL_PADDING);
  });

  it("returns wider footprint for less-overlapped state and higher card count", () => {
    expect(
      resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 3 }).requiredWidthPx,
    ).toBeLessThan(
      resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 3 }).requiredWidthPx,
    );
    expect(
      resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 4 }).requiredWidthPx,
    ).toBeGreaterThan(
      resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 2 }).requiredWidthPx,
    );
  });

  it("transition frame width progresses toward target width", () => {
    const start = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0, count: 3 }).requiredWidthPx;
    const mid = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0.5, count: 3 }).requiredWidthPx;
    const end = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 1, count: 3 }).requiredWidthPx;

    expect(mid).toBeGreaterThan(start);
    expect(end).toBeGreaterThan(mid);
  });
});

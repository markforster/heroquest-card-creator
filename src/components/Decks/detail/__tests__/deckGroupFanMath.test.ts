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
    expect(collapsedLeft.rotateDeg).toBeCloseTo(partialLeft.rotateDeg, 8);
    expect(expandedLeft.rotateDeg).toBeCloseTo(0, 8);
    expect(expandedLeft.y).toBeCloseTo(
      resolveFanPlacement({ mode: "expanded", count: 3, index: 1 }).y,
      8,
    );
  });

  it("keeps fan silhouette fixed between collapsed and partial", () => {
    const collapsed = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 5 });
    const partial = resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 5 });

    collapsed.cards.forEach((card, index) => {
      expect(card.rotateDeg).toBeCloseTo(partial.cards[index].rotateDeg, 8);
      expect(card.pivotY).toBeCloseTo(partial.cards[index].pivotY, 8);
    });
    expect(collapsed.requiredHeightPx).toBeCloseTo(partial.requiredHeightPx, 8);
    expect(partial.requiredWidthPx).toBeGreaterThan(collapsed.requiredWidthPx);
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

  it("applies low-count damping so small collapsed fans do not flare too wide", () => {
    const collapsed2 = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 2 });
    const collapsed3 = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 3 });
    const collapsed4 = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 4 });
    const collapsed5 = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 5 });
    const collapsed10 = resolveFanFrame({ fromMode: "collapsed", toMode: "collapsed", progress: 1, count: 10 });

    expect(collapsed2.requiredWidthPx).toBeLessThan(collapsed3.requiredWidthPx);
    expect(collapsed3.requiredWidthPx).toBeLessThan(collapsed4.requiredWidthPx);
    expect(collapsed4.requiredWidthPx).toBeLessThan(collapsed5.requiredWidthPx);
    expect(collapsed3.requiredWidthPx).toBeLessThan(
      resolveFanFrame({ fromMode: "partial", toMode: "partial", progress: 1, count: 3 }).requiredWidthPx,
    );
  });

  it("transition frame width progresses toward target width", () => {
    const start = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0, count: 3 }).requiredWidthPx;
    const mid = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0.5, count: 3 }).requiredWidthPx;
    const end = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 1, count: 3 }).requiredWidthPx;

    expect(mid).toBeGreaterThan(start);
    expect(end).toBeGreaterThan(mid);
  });

  it("collapsed-to-partial transition changes only horizontal spread", () => {
    const start = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0, count: 5 });
    const mid = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 0.5, count: 5 });
    const end = resolveFanFrame({ fromMode: "collapsed", toMode: "partial", progress: 1, count: 5 });

    start.cards.forEach((card, index) => {
      expect(mid.cards[index].rotateDeg).toBeCloseTo(card.rotateDeg, 8);
      expect(end.cards[index].rotateDeg).toBeCloseTo(card.rotateDeg, 8);
      expect(mid.cards[index].pivotY).toBeCloseTo(card.pivotY, 8);
      expect(end.cards[index].pivotY).toBeCloseTo(card.pivotY, 8);
    });
    expect(mid.requiredHeightPx).toBeCloseTo(start.requiredHeightPx, 8);
    expect(end.requiredHeightPx).toBeCloseTo(start.requiredHeightPx, 8);
  });
});

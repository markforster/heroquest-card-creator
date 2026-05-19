import {
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
    expect(collapsedLeft.y).toBeLessThan(
      resolveFanPlacement({ mode: "collapsed", count: 3, index: 1 }).y,
    );
    expect(partialLeft.rotateDeg).not.toBe(0);
    expect(partialLeft.y).toBeLessThan(
      resolveFanPlacement({ mode: "partial", count: 3, index: 1 }).y,
    );
    expect(expandedLeft.rotateDeg).toBeCloseTo(0, 8);
    expect(expandedLeft.y).toBeCloseTo(
      resolveFanPlacement({ mode: "expanded", count: 3, index: 1 }).y,
      8,
    );
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

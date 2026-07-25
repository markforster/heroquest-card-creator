import { computeHeroBackLogoScale, getHeroBackLogoPlacement } from "@/lib/hero-back-logo-layout";

function getQuarterTurnBounds({
  centerX,
  centerY,
  width,
  height,
}: {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}) {
  const corners = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ].map(({ x, y }) => ({ x: centerX + y, y: centerY - x }));
  const xs = corners.map(({ x }) => x);
  const ys = corners.map(({ y }) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

describe("hero-back-logo-layout", () => {
  const bounds = { x: 10, y: 20, width: 200, height: 60 };

  it("fits a wide logo by height first when width remains within bounds", () => {
    expect(
      computeHeroBackLogoScale({
        bounds,
        imageWidth: 300,
        imageHeight: 90,
      }),
    ).toBeCloseTo(60 / 90);
  });

  it("clamps a very wide logo by width when height-first fit would overflow", () => {
    expect(
      computeHeroBackLogoScale({
        bounds,
        imageWidth: 500,
        imageHeight: 100,
      }),
    ).toBeCloseTo(200 / 500);
  });

  it("centers the rendered logo within the slot bounds", () => {
    expect(
      getHeroBackLogoPlacement({
        bounds,
        imageWidth: 320,
        imageHeight: 80,
      }),
    ).toMatchObject({
      renderedWidth: 200,
      renderedHeight: 50,
      visibleBounds: { x: 10, y: 25, width: 200, height: 50 },
      imageBox: { x: 10, y: 25, width: 200, height: 50 },
    });
  });

  it("fits and centers a logo using its visible dimensions after a quarter turn", () => {
    const placement = getHeroBackLogoPlacement({
      bounds: { x: 218, y: 70, width: 322, height: 898 },
      imageWidth: 586,
      imageHeight: 210,
      rotation: -90,
    });

    expect(placement).toMatchObject({
      renderedWidth: 898,
      visibleBounds: { y: 70, height: 898 },
      imageBox: { x: 0, y: 0, width: 1 },
    });
    expect(placement.renderedHeight).toBeCloseTo(321.81);
    expect(placement.visibleBounds.x).toBeCloseTo(218.1);
    expect(placement.visibleBounds.width).toBeCloseTo(321.81);
    expect(placement.imageBox.height).toBeCloseTo(210 / 586);
    expect(placement.imageBox.transform).toBe(
      "translate(379 519) rotate(-90) scale(898) translate(-0.5 -0.17918088737201365)",
    );

    const transformedCorners = getQuarterTurnBounds({
      centerX: 379,
      centerY: 519,
      width: placement.renderedWidth,
      height: placement.renderedHeight,
    });
    expect(placement.visibleBounds.x).toBeCloseTo(transformedCorners.x);
    expect(placement.visibleBounds.y).toBeCloseTo(transformedCorners.y);
    expect(placement.visibleBounds.width).toBeCloseTo(transformedCorners.width);
    expect(placement.visibleBounds.height).toBeCloseTo(transformedCorners.height);
  });

  it("contain-fits wide and tall custom logos after rotation", () => {
    const wide = getHeroBackLogoPlacement({
      bounds: { width: 210, height: 586 },
      imageWidth: 1000,
      imageHeight: 200,
      rotation: -90,
    });
    const tall = getHeroBackLogoPlacement({
      bounds: { width: 210, height: 586 },
      imageWidth: 200,
      imageHeight: 1000,
      rotation: -90,
    });

    expect(wide.renderedWidth).toBeCloseTo(586);
    expect(wide.renderedHeight).toBeCloseTo(117.2);
    expect(tall.renderedWidth).toBeCloseTo(42);
    expect(tall.renderedHeight).toBeCloseTo(210);
    expect(wide.imageBox).toMatchObject({ x: 0, y: 0, width: 1, height: 0.2 });
    expect(tall.imageBox).toMatchObject({ x: 0, y: 0, width: 0.2, height: 1 });
  });

  it("keeps oversized quarter-turn source viewports inside the SVG canvas", () => {
    const placement = getHeroBackLogoPlacement({
      bounds: { x: 218, y: 70, width: 322, height: 898 },
      imageWidth: 12000,
      imageHeight: 3000,
      rotation: 90,
    });

    expect(placement.imageBox.x).toBeGreaterThanOrEqual(0);
    expect(placement.imageBox.y).toBeGreaterThanOrEqual(0);
    expect(placement.imageBox.x + placement.imageBox.width).toBeLessThanOrEqual(750);
    expect(placement.imageBox.y + placement.imageBox.height).toBeLessThanOrEqual(1050);
    expect(placement.visibleBounds.x).toBeGreaterThanOrEqual(218);
    expect(placement.visibleBounds.y).toBeGreaterThanOrEqual(70);
    expect(placement.visibleBounds.x + placement.visibleBounds.width).toBeLessThanOrEqual(540);
    expect(placement.visibleBounds.y + placement.visibleBounds.height).toBeLessThanOrEqual(968);
  });

  it("keeps the safe scale fallback for invalid image dimensions", () => {
    expect(
      computeHeroBackLogoScale({
        bounds,
        imageWidth: 0,
        imageHeight: 0,
        rotation: -90,
      }),
    ).toBe(1);
  });
});

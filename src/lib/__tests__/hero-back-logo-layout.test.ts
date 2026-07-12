import { computeHeroBackLogoScale, getHeroBackLogoPlacement } from "@/lib/hero-back-logo-layout";

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
      x: 10,
      y: 25,
    });
  });
});

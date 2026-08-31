import { getStagePointFromClientCoordinates } from "@/components/Cards/CardPreview/cardPreviewPointer";

describe("getStagePointFromClientCoordinates", () => {
  it("uses the inverse screen transform when SVG matrix APIs are available", () => {
    const inverse = jest.fn(() => ({ matrix: "inverse" }));
    const matrixTransform = jest.fn(() => ({ x: 12, y: 34 }));
    const point = { x: 0, y: 0, matrixTransform };
    const svg = {
      getScreenCTM: () => ({ inverse }),
      createSVGPoint: () => point,
    } as unknown as SVGSVGElement;

    expect(getStagePointFromClientCoordinates({ svg, clientX: 100, clientY: 200 })).toEqual({
      x: 12,
      y: 34,
    });
    expect(point).toMatchObject({ x: 100, y: 200 });
    expect(matrixTransform).toHaveBeenCalledWith({ matrix: "inverse" });
  });

  it("maps client coordinates through the live SVG view box", () => {
    const svg = {
      viewBox: { baseVal: { x: 10, y: 20, width: 200, height: 100 } },
      getBoundingClientRect: () => ({ left: 50, top: 100, width: 400, height: 200 }),
      getAttribute: jest.fn(),
    } as unknown as SVGSVGElement;

    expect(getStagePointFromClientCoordinates({ svg, clientX: 250, clientY: 200 })).toEqual({
      x: 110,
      y: 70,
    });
  });

  it("parses an SVG viewBox attribute when live dimensions are unavailable", () => {
    const svg = {
      viewBox: { baseVal: { x: 0, y: 0, width: 0, height: 0 } },
      getAttribute: () => "5, 10, 20, 40",
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 20, height: 40 }),
    } as unknown as SVGSVGElement;

    expect(getStagePointFromClientCoordinates({ svg, clientX: 10, clientY: 20 })).toEqual({
      x: 15,
      y: 30,
    });
  });

  it("uses unit dimensions when neither layout nor viewBox dimensions are available", () => {
    const svg = {
      getAttribute: () => null,
      getBoundingClientRect: () => ({ left: 4, top: 6, width: 0, height: 0 }),
    } as unknown as SVGSVGElement;

    expect(getStagePointFromClientCoordinates({ svg, clientX: 5, clientY: 8 })).toEqual({
      x: 1,
      y: 2,
    });
  });
});
